import React, { useState, useEffect, useMemo } from 'react';
import FloatingInput from './FloatingInput';
import { boqAPI, projectsAPI, partsAPI } from '../../services/api';

const ProjectBudgetForm = ({ budget, onSubmit, onCancel, showNotification, showError }) => {
  const [formData, setFormData] = useState({
    financialYear: '',
    projectName: '',
    customerName: '',
    siteLocation: '',
    quotedPrice: '',
    negotiatedPrice: '',
    amountSpent: '',
    netProfitLoss: '',
    overallBusinessImpact: 'Medium',
    projectExpenditures: [{
      typeOfWork: '',
      partName: '',
      quantityToBeOrdered: '',
      unit: 'nos',
      quantityOrderedActual: '',
      price: '',
      totalPrice: ''
    }],
    logisticExpenditures: [{
      purpose: '',
      vehicleType: '',
      transporterName: '',
      from: '',
      to: '',
      kmTravelled: '',
      totalPrice: ''
    }]
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [boqProjects, setBoqProjects] = useState([]);
  const [selectedBoqProject, setSelectedBoqProject] = useState(null);
  const [loadingBoqProjects, setLoadingBoqProjects] = useState(false);
  const [parts, setParts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Popup states
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showLogisticPopup, setShowLogisticPopup] = useState(false);
  const [tempProjectExpenditures, setTempProjectExpenditures] = useState([]);
  const [tempLogisticExpenditures, setTempLogisticExpenditures] = useState([]);

  // Memoized project options from projects API
  const projectOptions = useMemo(() => {
    if (loadingProjects) {
      return [{ value: '', label: 'Loading projects...' }];
    }
    
    if (!Array.isArray(projects) || projects.length === 0) {
      return [
        { value: '', label: 'Select Project' },
        { value: '', label: 'No projects available' }
      ];
    }
    
    return [
      { value: '', label: 'Select Project' },
      ...projects.map((project) => ({
        value: project.projectName || project._id,
        label: project.projectName || 'Unknown Project',
        key: `project-${project._id || project.projectName}`
      }))
    ];
  }, [projects, loadingProjects]);

  // Initialize form data when budget prop changes
  useEffect(() => {
    if (budget) {
      setFormData(prev => ({
        ...prev,
        financialYear: budget.financialYear || '',
        projectName: budget.projectName || '',
        customerName: budget.customerName || '',
        siteLocation: budget.siteLocation || '',
        quotedPrice: budget.quotedPrice ?? '',
        negotiatedPrice: budget.negotiatedPrice ?? '',
        amountSpent: budget.amountSpent ?? '',
        netProfitLoss: budget.netProfitLoss ?? '',
        overallBusinessImpact: budget.overallBusinessImpact || 'Medium',
        projectExpenditures: (budget.projectExpenditures && budget.projectExpenditures.length > 0)
          ? budget.projectExpenditures.map(exp => ({ ...exp, totalPrice: exp.totalPrice ?? '' }))
          : prev.projectExpenditures,
        logisticExpenditures: (budget.logisticExpenditures && budget.logisticExpenditures.length > 0)
          ? budget.logisticExpenditures.map(l => ({ ...l, totalPrice: l.totalPrice ?? '' }))
          : prev.logisticExpenditures
      }));
    }
  }, [budget]);

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
    fetchBOQProjects();
  }, []);

  // Match loaded budget with BOQ project
  useEffect(() => {
    if (budget && budget.projectName && boqProjects.length > 0) {
      const matchingBOQProject = boqProjects.find(project => 
        project.customer && project.customer === budget.projectName
      );
      if (matchingBOQProject) {
        setSelectedBoqProject(matchingBOQProject);
      }
    }
  }, [budget, boqProjects]);

  // Fetch projects from projects API
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await projectsAPI.getAll();
      const projectsData = response.data || [];
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showError && showError('Failed to fetch projects');
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch BOQ projects
  const fetchBOQProjects = async () => {
    try {
      setLoadingBoqProjects(true);
      const response = await boqAPI.getAll();
      
      let projects = [];
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          projects = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          projects = response.data.data;
        } else if (typeof response.data === 'object') {
          projects = [response.data];
        }
      } else if (Array.isArray(response)) {
        projects = response;
      } else if (response && typeof response === 'object') {
        projects = [response];
      }
      
      const validProjects = projects.filter(project => {
        const hasValidData = project && typeof project === 'object';
        const hasRequiredFields = project._id || project.id;
        return hasValidData && hasRequiredFields;
      });
      
      setBoqProjects(validProjects);
    } catch (error) {
      console.error('Error fetching BOQ projects:', error);
      showError && showError('Failed to fetch BOQ projects');
      setBoqProjects([]);
    } finally {
      setLoadingBoqProjects(false);
    }
  };

  // Handle part selection and auto-fill from BOQ data
  const handlePartSelect = (index, partName) => {
    const selectedPart = parts.find(part => part.partName === partName);
    if (selectedPart) {
      setTempProjectExpenditures(prev => {
        const newExpenditures = [...prev];
        newExpenditures[index] = {
          ...newExpenditures[index],
          partName: partName,
          quantityToBeOrdered: selectedPart.numberOfUnits || selectedPart.quantity || '',
          price: selectedPart.unitPrice || '',
          unit: selectedPart.unitType || 'nos'
        };
        
        // Calculate total price
        const quantity = parseFloat(newExpenditures[index].quantityOrderedActual) || 0;
        const price = parseFloat(newExpenditures[index].price) || 0;
        newExpenditures[index].totalPrice = (quantity * price).toFixed(2);
        
        return newExpenditures;
      });
    }
  };

  // Handle project selection
  const handleProjectSelect = async (projectName) => {
    const selectedProject = projects.find(p => p.projectName === projectName);
    
    if (selectedProject) {
      // First, update basic project information
      setFormData(prev => ({
        ...prev,
        projectName: selectedProject.projectName || '',
        customerName: selectedProject.customerName || '',
        siteLocation: selectedProject.siteLocation || ''
      }));
      
      // Try to fetch BOQ data for this project
      try {
        const boqResponse = await boqAPI.getAll();
        let boqProjects = [];
        
        if (boqResponse && boqResponse.data) {
          if (Array.isArray(boqResponse.data)) {
            boqProjects = boqResponse.data;
          } else if (boqResponse.data.data && Array.isArray(boqResponse.data.data)) {
            boqProjects = boqResponse.data.data;
          }
        }
        
        // Find BOQ matching this project name
        const matchingBOQ = boqProjects.find(boq => 
          boq.projectName === projectName || 
          boq.customer === selectedProject.customerName
        );
        
        if (matchingBOQ) {
          // Auto-populate quoted price from BOQ
          const quotedPrice = matchingBOQ.totalWithGST || matchingBOQ.finalTotalWithoutGST || 0;
          
          // Auto-populate project expenditures from BOQ items
          const projectExpenditures = matchingBOQ.items && matchingBOQ.items.length > 0
            ? matchingBOQ.items.map(item => ({
                typeOfWork: matchingBOQ.scopeOfWork ? matchingBOQ.scopeOfWork.join(', ') : '',
                partName: item.partName || '',
                quantityToBeOrdered: item.numberOfUnits || 0,
                unit: item.unitType || 'nos',
                quantityOrderedActual: 0, // To be filled by user
                price: item.unitPrice || 0,
                totalPrice: 0 // Will be calculated when quantityOrderedActual is entered
              }))
            : [{
                typeOfWork: '',
                partName: '',
                quantityToBeOrdered: '',
                unit: 'nos',
                quantityOrderedActual: '',
                price: '',
                totalPrice: ''
              }];
          
          setFormData(prev => ({
            ...prev,
            quotedPrice: quotedPrice,
            projectExpenditures: projectExpenditures
          }));
          
          // Set parts from BOQ items for dropdown
          setParts(matchingBOQ.items || []);
          setSelectedBoqProject(matchingBOQ);
          
          showNotification && showNotification('BOQ data loaded successfully! Parts and quoted price have been auto-populated.');
        } else {
          // No BOQ found, fetch parts from parts API
          try {
            const partsResponse = await partsAPI.getAll();
            const allParts = partsResponse.data || [];
            setParts(allParts);
          } catch (error) {
            console.error('Error fetching parts:', error);
            setParts([]);
          }
          setSelectedBoqProject(null);
        }
      } catch (error) {
        console.error('Error fetching BOQ data:', error);
        // Fallback to parts API
        try {
          const partsResponse = await partsAPI.getAll();
          const allParts = partsResponse.data || [];
          setParts(allParts);
        } catch (partsError) {
          console.error('Error fetching parts:', partsError);
          setParts([]);
        }
        setSelectedBoqProject(null);
      }
    } else {
      setParts([]);
      setSelectedBoqProject(null);
    }
  };

  // Handle BOQ project selection (for backward compatibility)
  const handleBOQProjectSelect = (projectId) => {
    const selectedProject = boqProjects.find(project => {
      const projectIdToMatch = project._id || project.id;
      return projectIdToMatch === projectId;
    });
    
    if (selectedProject) {
      setSelectedBoqProject(selectedProject);
      
      // Extract parts from BOQ project items
      const boqParts = selectedProject.items || [];
      setParts(boqParts);
      
      setFormData(prev => ({
        ...prev,
        projectName: selectedProject.customer || selectedProject._id || 'Unknown Project',
        customerName: selectedProject.customer || selectedProject._id || 'Unknown Customer',
        quotedPrice: selectedProject.totalWithGST || selectedProject.finalTotalWithoutGST || 0,
        siteLocation: ''
      }));
    } else {
      setSelectedBoqProject(null);
      setParts([]);
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Nested field handling
    if (name.includes('.')) {
      const partsName = name.split('.');
      const parent = partsName[0];
      const index = parseInt(partsName[1], 10);
      const field = partsName[2];

      if (['projectExpenditures', 'logisticExpenditures'].includes(parent) && !isNaN(index)) {
        setFormData(prev => {
          const newArray = [...prev[parent]];
          newArray[index] = {
            ...newArray[index],
            [field]: value
          };

          // Auto-calculate totals
          if (parent === 'projectExpenditures' && (field === 'quantityOrderedActual' || field === 'price')) {
            const quantity = parseFloat(newArray[index].quantityOrderedActual) || 0;
            const price = parseFloat(newArray[index].price) || 0;
            newArray[index].totalPrice = (quantity * price).toFixed(2);
          }

          if (parent === 'logisticExpenditures' && field === 'kmTravelled') {
            const km = parseFloat(newArray[index].kmTravelled || value) || 0;
            newArray[index].totalPrice = (km * 10).toFixed(2);
          }

          return {
            ...prev,
            [parent]: newArray
          };
        });
      }
    } else {
      // Simple fields
      setFormData(prev => {
        const updated = { ...prev, [name]: value };

        // Update net profit/loss when negotiated price changes
        if (name === 'negotiatedPrice') {
          const negotiated = parseFloat(value) || 0;
          const amountSpent = parseFloat(prev.amountSpent) || 0;
          // Only calculate netProfitLoss if there is actual spending
          if (amountSpent > 0) {
            updated.netProfitLoss = (negotiated - amountSpent).toFixed(2);
          } else {
            updated.netProfitLoss = '0.00';
          }
        }

        return updated;
      });
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Derived totals
  const projectExpendituresTotal = useMemo(() => {
    return formData.projectExpenditures
      .map(e => parseFloat(e.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [formData.projectExpenditures]);

  const logisticExpendituresTotal = useMemo(() => {
    return formData.logisticExpenditures
      .map(l => parseFloat(l.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [formData.logisticExpenditures]);

  // Update amountSpent and netProfitLoss when totals change
  useEffect(() => {
    const totalAmountSpent = projectExpendituresTotal + logisticExpendituresTotal;
    setFormData(prev => {
      const negotiated = parseFloat(prev.negotiatedPrice) || 0;
      // Only calculate netProfitLoss if there is actual spending
      const netProfitLoss = totalAmountSpent > 0 
        ? (negotiated - totalAmountSpent).toFixed(2)
        : '0.00';
      return {
        ...prev,
        amountSpent: totalAmountSpent.toFixed(2),
        netProfitLoss: netProfitLoss
      };
    });
  }, [projectExpendituresTotal, logisticExpendituresTotal]);

  // Popup management functions
  const openProjectPopup = () => {
    setTempProjectExpenditures([...formData.projectExpenditures]);
    setShowProjectPopup(true);
  };

  const openLogisticPopup = () => {
    setTempLogisticExpenditures([...formData.logisticExpenditures]);
    setShowLogisticPopup(true);
  };

  const closeProjectPopup = () => {
    setShowProjectPopup(false);
  };

  const closeLogisticPopup = () => {
    setShowLogisticPopup(false);
  };

  const saveProjectExpenditures = () => {
    setFormData(prev => ({
      ...prev,
      projectExpenditures: tempProjectExpenditures
    }));
    setShowProjectPopup(false);
  };

  const saveLogisticExpenditures = () => {
    setFormData(prev => ({
      ...prev,
      logisticExpenditures: tempLogisticExpenditures
    }));
    setShowLogisticPopup(false);
  };

  const addProjectRow = () => {
    setTempProjectExpenditures(prev => [
      ...prev,
      {
        typeOfWork: '',
        partName: '',
        quantityToBeOrdered: '',
        unit: 'nos',
        quantityOrderedActual: '',
        price: '',
        totalPrice: ''
      }
    ]);
  };

  const addLogisticRow = () => {
    setTempLogisticExpenditures(prev => [
      ...prev,
      {
        purpose: '',
        vehicleType: '',
        transporterName: '',
        from: '',
        to: '',
        kmTravelled: '',
        totalPrice: ''
      }
    ]);
  };

  const removeProjectRow = (index) => {
    setTempProjectExpenditures(prev => prev.filter((_, i) => i !== index));
  };

  const removeLogisticRow = (index) => {
    setTempLogisticExpenditures(prev => prev.filter((_, i) => i !== index));
  };

  const updateTempProjectExpenditure = (index, field, value) => {
    setTempProjectExpenditures(prev => {
      const newExpenditures = [...prev];
      newExpenditures[index] = {
        ...newExpenditures[index],
        [field]: value
      };

      if (field === 'quantityOrderedActual' || field === 'price') {
        const quantity = parseFloat(newExpenditures[index].quantityOrderedActual) || 0;
        const price = parseFloat(newExpenditures[index].price) || 0;
        newExpenditures[index].totalPrice = (quantity * price).toFixed(2);
      }

      return newExpenditures;
    });
  };

  const updateTempLogisticExpenditure = (index, field, value) => {
    setTempLogisticExpenditures(prev => {
      const newExpenditures = [...prev];
      newExpenditures[index] = {
        ...newExpenditures[index],
        [field]: value
      };

      if (field === 'kmTravelled') {
        const km = parseFloat(value) || 0;
        newExpenditures[index].totalPrice = (km * 10).toFixed(2);
      }

      return newExpenditures;
    });
  };

  // Calculate popup totals
  const tempProjectTotal = useMemo(() => {
    return tempProjectExpenditures
      .map(e => parseFloat(e.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [tempProjectExpenditures]);

  const tempLogisticTotal = useMemo(() => {
    return tempLogisticExpenditures
      .map(l => parseFloat(l.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [tempLogisticExpenditures]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.financialYear) newErrors.financialYear = 'Financial year is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.siteLocation) newErrors.siteLocation = 'Site location is required';
    if (!formData.quotedPrice || parseFloat(formData.quotedPrice) <= 0) newErrors.quotedPrice = 'Valid quoted price is required';
    if (!formData.negotiatedPrice || parseFloat(formData.negotiatedPrice) <= 0) newErrors.negotiatedPrice = 'Valid negotiated price is required';


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Additional validation
    if (!formData.financialYear || !formData.projectName || !formData.customerName || !formData.siteLocation) {
      showError && showError('Please fill in all required fields: Financial Year, Project Name, Customer Name, and Site Location');
      return;
    }

    if (!formData.quotedPrice || parseFloat(formData.quotedPrice) <= 0) {
      showError && showError('Please enter a valid quoted price');
      return;
    }

    if (!formData.negotiatedPrice || parseFloat(formData.negotiatedPrice) <= 0) {
      showError && showError('Please enter a valid negotiated price');
      return;
    }

    setLoading(true);
    try {
      const projectTotal = projectExpendituresTotal;
      const logisticTotal = logisticExpendituresTotal;
      const totalAmountSpent = projectTotal + logisticTotal;

      const projectExpenditures = formData.projectExpenditures
        .filter(exp => exp.typeOfWork && exp.partName && exp.quantityToBeOrdered)
        .map(exp => ({
          typeOfWork: exp.typeOfWork,
          partName: exp.partName,
          quantityToBeOrdered: parseFloat(exp.quantityToBeOrdered) || 0,
          unit: exp.unit || 'nos',
          quantityOrderedActual: parseFloat(exp.quantityOrderedActual) || 0,
          price: parseFloat(exp.price) || 0,
          totalPrice: parseFloat(exp.totalPrice) || 0
        }));

      const logisticExpenditures = formData.logisticExpenditures
        .filter(log => log.purpose && log.vehicleType && log.transporterName)
        .map(log => ({
          purpose: log.purpose,
          vehicleType: log.vehicleType,
          transporterName: log.transporterName,
          from: log.from || '',
          to: log.to || '',
          kmTravelled: parseFloat(log.kmTravelled) || 0,
          totalPrice: parseFloat(log.totalPrice) || 0
        }));

      // Calculate netProfitLoss - only if there is actual spending
      const negotiatedPrice = parseFloat(formData.negotiatedPrice) || 0;
      const netProfitLoss = totalAmountSpent > 0 
        ? negotiatedPrice - totalAmountSpent 
        : 0;

      const submitData = {
        financialYear: formData.financialYear,
        projectName: formData.projectName,
        customerName: formData.customerName,
        siteLocation: formData.siteLocation,
        quotedPrice: parseFloat(formData.quotedPrice) || 0,
        negotiatedPrice: negotiatedPrice,
        amountSpent: totalAmountSpent,
        netProfitLoss: netProfitLoss,
        overallBusinessImpact: totalAmountSpent === 0 ? 'Medium' : (netProfitLoss > 0.01 ? 'Low' : netProfitLoss < -0.01 ? 'High' : 'Medium'),
        projectExpenditures: projectExpenditures,
        logisticExpenditures: logisticExpenditures
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit error:', error);
      showError && showError(error.message || 'Failed to save project budget');
    } finally {
      setLoading(false);
    }
  };

  // UI configuration
  const currentYear = new Date().getFullYear();
  const financialYearOptions = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`,
    `${currentYear - 3}-${currentYear - 2}`
  ].map(year => ({ value: year, label: year }));



  return (
    <div className="h-full flex flex-col max-h-[80vh] min-h-[600px]">
     

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Basic Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Financial Year"
                name="financialYear"
                value={formData.financialYear}
                onChange={handleChange}
                error={errors.financialYear}
                type="select"
                required={true}
                options={financialYearOptions}
              />

              <FloatingInput
                label="Project Name"
                name="projectName"
                value={formData.projectName}
                onChange={(e) => {
                  handleChange(e);
                  const selectedValue = e.target.value;
                  if (selectedValue) {
                    handleProjectSelect(selectedValue);
                  }
                }}
                error={errors.projectName}
                type="select"
                required={true}
                options={projectOptions}
                disabled={loadingProjects}
              />

              <FloatingInput
                label="Client Name"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                error={errors.customerName}
                required={true}
                readOnly={!!selectedBoqProject}
              />

              <FloatingInput
                label="Site Location"
                name="siteLocation"
                value={formData.siteLocation}
                onChange={handleChange}
                error={errors.siteLocation}
                required={true}
              />
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Quoted Price (₹)"
                name="quotedPrice"
                value={formData.quotedPrice}
                onChange={handleChange}
                error={errors.quotedPrice}
                type="number"
                step="0.01"
                min="0"
                readOnly={!!selectedBoqProject}
              />

              <FloatingInput
                label="Negotiated Price (₹)"
                name="negotiatedPrice"
                value={formData.negotiatedPrice}
                onChange={handleChange}
                error={errors.negotiatedPrice}
                type="number"
                step="0.01"
                min="0"
              />

              <FloatingInput
                label="Amount Spent (₹)"
                name="amountSpent"
                value={formData.amountSpent}
                onChange={handleChange}
                error={errors.amountSpent}
                type="number"
                step="0.01"
                min="0"
                readOnly={true}
              />

              <FloatingInput
                label="Net Profit/Loss (₹)"
                name="netProfitLoss"
                value={formData.netProfitLoss}
                onChange={handleChange}
                type="number"
                step="0.01"
                readOnly={true}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Business Impact
                </label>
                <div
                  className={`px-4 py-3 rounded-lg text-sm font-semibold text-center ${
                    parseFloat(formData.amountSpent || 0) === 0
                      ? 'bg-gray-100 text-gray-600 border border-gray-200'
                      : parseFloat(formData.netProfitLoss || 0) > 0.01
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : parseFloat(formData.netProfitLoss || 0) < -0.01
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  {parseFloat(formData.amountSpent || 0) === 0
                    ? 'No Expenditure Yet'
                    : parseFloat(formData.netProfitLoss || 0) > 0.01
                    ? 'Low Impact (Profit)'
                    : parseFloat(formData.netProfitLoss || 0) < -0.01
                    ? 'High Impact (Loss)'
                    : 'Medium Impact (Break Even)'}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Form Footer with Action Buttons */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectBudgetForm;
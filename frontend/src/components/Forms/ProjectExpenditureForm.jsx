import React, { useState, useEffect, useMemo } from 'react';
import FloatingInput from './FloatingInput';
import { boqAPI, projectBudgetsAPI, customersAPI, projectsAPI } from '../../services/api';

const ProjectExpenditureForm = ({ 
  initialData = [],
  onSave,
  onCancel,
  showNotification,
  showError,
  financialYear,
  customerName,
  projectName
}) => {
  const [expenditures, setExpenditures] = useState(
    initialData.length > 0 
      ? initialData 
      : [{
          typeOfWork: '',
          partName: '',
          quantityToBeOrdered: '',
          unit: 'nos',
          quantityOrderedActual: '',
          price: '',
          totalPrice: ''
        }]
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasFetchedFinancialYears, setHasFetchedFinancialYears] = useState(false);
  
  // Master data states
  const [financialYears, setFinancialYears] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  
  // Selected masters
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(financialYear || '');
  const [selectedCustomer, setSelectedCustomer] = useState(customerName || '');
  const [selectedProject, setSelectedProject] = useState(projectName || '');
  
  // Validation constants
  const VALIDATION_RULES = {
    TYPE_OF_WORK: {
      MAX_LENGTH: 50,
      PATTERN: /^[a-zA-Z0-9\s\-_.,/&()]+$/ // Allows letters, numbers, spaces, and common punctuation
    },
    PART_NAME: {
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z0-9\s\-_.,/&()]+$/
    },
    PRICE: {
      MAX_LENGTH: 30,
      MAX_DIGITS: 8,
      MAX_DECIMALS: 2,
      PATTERN: /^\d{1,8}(\.\d{1,2})?$/
    },
    QUANTITY: {
      MAX_LENGTH: 30,
      PATTERN: /^\d{1,10}(\.\d{1,3})?$/
    }
  };
  
  // Update expenditures when initialData changes (for edit mode)
  useEffect(() => {
    console.log('initialData changed:', initialData);
    if (initialData && initialData.length > 0) {
      console.log('Setting expenditures from initialData:', initialData);
      setExpenditures(initialData);
    }
  }, [initialData]);
  
  // Fetch master data on component mount
  useEffect(() => {
    if (!hasFetchedFinancialYears) {
      fetchFinancialYears();
      setHasFetchedFinancialYears(true);
    }
  }, [hasFetchedFinancialYears]);

  // Fetch project budgets when financial year changes
  useEffect(() => {
    if (selectedFinancialYear) {
      fetchProjectBudgets(selectedFinancialYear);
    } else {
      setProjectBudgets([]);
      setCustomers([]);
      setProjects([]);
      setParts([]);
    }
  }, [selectedFinancialYear]);

  // Fetch projects when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      fetchProjects(selectedCustomer);
    } else {
      setProjects([]);
      setParts([]);
    }
  }, [selectedCustomer]);

  // Fetch parts when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchParts(selectedProject);
    } else {
      setParts([]);
    }
  }, [selectedProject]);

  // Fetch financial years
  const fetchFinancialYears = async () => {
    try {
      console.log('Fetching financial years from API...');
      const response = await projectBudgetsAPI.getFinancialYears();
      console.log('Financial years API response:', response);
      console.log('Financial years response status:', response?.status);
      console.log('Financial years response data:', response?.data);
      
      if (response?.status !== 200) {
        console.error('Unexpected response status:', response?.status);
        showError && showError('Failed to load financial years: Invalid response');
        return;
      }
      
      const years = response?.data?.financialYears || [];
      console.log('Extracted years:', years);
      const yearOptions = years.map(year => ({ value: year, label: year }));
      console.log('Year options:', yearOptions);
      setFinancialYears(yearOptions);
    } catch (error) {
      console.error('Error fetching financial years:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      showError && showError('Failed to load financial years');
    }
  };

  // Fetch project budgets by financial year
  const fetchProjectBudgets = async (financialYear) => {
    try {
      setLoading(true);
      const response = await projectBudgetsAPI.getAll({ financialYear });
      const budgets = response?.data?.budgets || response?.budgets || [];
      
      setProjectBudgets(budgets);
      
      // Extract unique customers from budgets
      const uniqueCustomers = [...new Set(budgets.map(budget => budget.customerName))];
      setCustomers(uniqueCustomers.map(customerName => ({
        value: customerName,
        label: customerName
      })));
    } catch (error) {
      console.error('Error fetching project budgets:', error);
      showError && showError('Failed to load project budgets');
      setProjectBudgets([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (customerName) => {
    try {
      setLoading(true);
      // Filter project budgets by customer name
      const customerBudgets = projectBudgets.filter(budget => budget.customerName === customerName);
      
      // Extract unique projects for this customer
      const uniqueProjects = [...new Set(customerBudgets.map(budget => budget.projectName))];
      setProjects(uniqueProjects.map(projectName => ({
        value: projectName,
        label: projectName
      })));
    } catch (error) {
      console.error('Error fetching projects:', error);
      showError && showError('Failed to load projects');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch parts for selected project from BOQ data only
  const fetchParts = async (projectName) => {
    try {
      setLoading(true);
      console.log('Fetching BOQ parts for project:', projectName);
      
      // Fetch BOQ data for the selected project
      console.log('Calling boqAPI.getAll with projectName:', projectName);
      const response = await boqAPI.getAll({ projectName });
      console.log('BOQ API response:', response);
      console.log('BOQ API request params:', { projectName });
      
      const boqData = response?.data?.data || [];
      console.log('BOQ data extracted:', boqData);
      console.log('Number of BOQ records found:', boqData.length);
      
      // Validate that boqData is an array
      if (!Array.isArray(boqData)) {
        console.error('BOQ data is not an array:', boqData);
        setParts([]);
        return;
      }
      
      // Check if any BOQ records were found for this project
      if (boqData.length === 0) {
        console.warn('No BOQ records found for project:', projectName);
        setParts([]);
        return;
      }
      
      // Verify that the returned BOQ records are for the requested project
      const projectsInResponse = [...new Set(boqData.map(boq => boq.projectName))];
      console.log('Projects found in BOQ response:', projectsInResponse);
      console.log('Requested project:', projectName);
      
      // Filter BOQ records to ensure they match the requested project
      const filteredBoqData = boqData.filter(boq => boq.projectName === projectName);
      console.log('Filtered BOQ data for project:', filteredBoqData.length, 'records');
      
      // Extract parts from BOQ items - only saved parts from BOQ
      const boqParts = [];
      filteredBoqData.forEach((boq, boqIndex) => {
        console.log(`Processing BOQ ${boqIndex}:`, boq);
        if (boq.items && Array.isArray(boq.items)) {
          console.log(`BOQ ${boqIndex} has ${boq.items.length} items`);
          boq.items.forEach((item, itemIndex) => {
            console.log(`Processing item ${itemIndex}:`, item);
            // Only add parts that have valid part names
            if (item.partName && item.partName.trim() !== '') {
              boqParts.push({
                partName: item.partName.trim(),
                numberOfUnits: item.numberOfUnits || 0,
                unitType: item.unitType || 'nos',
                unitPrice: item.unitPrice || 0
              });
              console.log(`Added part: ${item.partName}`);
            }
          });
        } else {
          console.log(`BOQ ${boqIndex} has no items or items is not an array`);
        }
      });
      
      console.log('Total extracted BOQ parts:', boqParts);
      console.log('Total unique parts found:', boqParts.length);
    
    // Remove duplicates based on partName
    const uniqueParts = boqParts.reduce((acc, current) => {
      const exists = acc.find(item => item.partName === current.partName);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    console.log('Setting parts from BOQ:', uniqueParts);
    console.log('Final unique parts count:', uniqueParts.length);
      
      if (uniqueParts.length === 0) {
        console.warn('No parts found in BOQ for project:', projectName);
        showError && showError(`No BOQ parts found for project "${projectName}". Please ensure BOQ data exists for this project.`);
      }
      
      setParts(uniqueParts);
  } catch (error) {
      console.error('Error fetching BOQ parts:', error);
      console.error('BOQ API error response:', error.response);
      console.error('BOQ API error status:', error.response?.status);
      console.error('BOQ API error message:', error.message);
      
      let errorMessage = 'Failed to load parts from BOQ';
      if (error.response?.status === 404) {
        errorMessage = 'No BOQ data found for this project';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error while loading BOQ data';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showError && showError(errorMessage);
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateTypeOfWork = (value) => {
    if (!value || value === '') return { isValid: true, message: '' };
    
    if (value.length > VALIDATION_RULES.TYPE_OF_WORK.MAX_LENGTH) {
      return {
        isValid: false,
        message: `Maximum ${VALIDATION_RULES.TYPE_OF_WORK.MAX_LENGTH} characters allowed`
      };
    }
    
    if (!VALIDATION_RULES.TYPE_OF_WORK.PATTERN.test(value)) {
      return {
        isValid: false,
        message: 'Only letters, numbers, spaces, and basic punctuation allowed'
      };
    }
    
    return { isValid: true, message: '' };
  };

  const validatePrice = (value) => {
    if (!value || value === '') return { isValid: true, message: '' };
    
    const strValue = value.toString();
    
    // Check max length
    if (strValue.length > VALIDATION_RULES.PRICE.MAX_LENGTH) {
      return {
        isValid: false,
        message: `Maximum ${VALIDATION_RULES.PRICE.MAX_LENGTH} characters allowed`
      };
    }
    
    // Check if it's a valid number
    if (isNaN(parseFloat(value))) {
      return {
        isValid: false,
        message: 'Please enter a valid number'
      };
    }
    
    // Remove leading zeros for pattern matching
    const trimmedValue = strValue.replace(/^0+/, '') || '0';
    
    // Check pattern for digits and decimals
    if (!VALIDATION_RULES.PRICE.PATTERN.test(trimmedValue)) {
      const [integerPart, decimalPart] = trimmedValue.split('.');
      
      if (integerPart.length > VALIDATION_RULES.PRICE.MAX_DIGITS) {
        return {
          isValid: false,
          message: `Maximum ${VALIDATION_RULES.PRICE.MAX_DIGITS} digits before decimal`
        };
      }
      
      if (decimalPart && decimalPart.length > VALIDATION_RULES.PRICE.MAX_DECIMALS) {
        return {
          isValid: false,
          message: `Maximum ${VALIDATION_RULES.PRICE.MAX_DECIMALS} decimal places`
        };
      }
      
      return {
        isValid: false,
        message: 'Invalid format. Use up to 8 digits and 2 decimal places'
      };
    }
    
    // Additional check for maximum value
    const numValue = parseFloat(value);
    const maxValue = Math.pow(10, VALIDATION_RULES.PRICE.MAX_DIGITS) - 0.01;
    if (numValue > maxValue) {
      return {
        isValid: false,
        message: `Maximum value is ${maxValue.toLocaleString()}`
      };
    }
    
    return { isValid: true, message: '' };
  };

  const validateQuantity = (value) => {
    if (!value || value === '') return { isValid: true, message: '' };
    
    const strValue = value.toString();
    
    // Check max length
    if (strValue.length > VALIDATION_RULES.QUANTITY.MAX_LENGTH) {
      return {
        isValid: false,
        message: `Maximum ${VALIDATION_RULES.QUANTITY.MAX_LENGTH} characters allowed`
      };
    }
    
    // Check if it's a valid number
    if (isNaN(parseFloat(value))) {
      return {
        isValid: false,
        message: 'Please enter a valid number'
      };
    }
    
    // Check if it's positive
    const numValue = parseFloat(value);
    if (numValue <= 0) {
      return {
        isValid: false,
        message: 'Value must be greater than 0'
      };
    }
    
    // Check pattern for quantity
    if (!VALIDATION_RULES.QUANTITY.PATTERN.test(strValue)) {
      return {
        isValid: false,
        message: 'Invalid format. Use up to 10 digits and 3 decimal places'
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Handle master selection changes
  const handleFinancialYearChange = (e) => {
    setSelectedFinancialYear(e.target.value);
  };

  const handleCustomerChange = (e) => {
    setSelectedCustomer(e.target.value);
    setSelectedProject('');
    setExpenditures([{
      typeOfWork: '',
      partName: '',
      quantityToBeOrdered: '',
      unit: 'nos',
      quantityOrderedActual: '',
      price: '',
      totalPrice: ''
    }]);
  };

  const handleProjectChange = (e) => {
    setSelectedProject(e.target.value);
  };

  // Handle part selection and auto-fill from BOQ data
  const handlePartSelect = (index, partName) => {
    const selectedPart = parts.find(part => part.partName === partName);
    if (selectedPart) {
      console.log('Selected part:', selectedPart);
      setExpenditures(prev => {
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
        
        console.log('Updated expenditure with unit type:', newExpenditures[index]);
        return newExpenditures;
      });
    }
  };

  // Handle expenditure changes with validation
  const handleExpenditureChange = (index, field, value) => {
    // Clear previous error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`expenditures.${index}.${field}`];
      return newErrors;
    });
    
    // Validate based on field type
    let validationResult = { isValid: true, message: '' };
    
    if (field === 'typeOfWork') {
      validationResult = validateTypeOfWork(value);
    } else if (field === 'price') {
      validationResult = validatePrice(value);
    } else if (field === 'quantityOrderedActual' || field === 'quantityToBeOrdered') {
      validationResult = validateQuantity(value);
    }
    
    if (!validationResult.isValid) {
      setErrors(prev => ({
        ...prev,
        [`expenditures.${index}.${field}`]: validationResult.message
      }));
      return; // Don't update if validation fails
    }
    
    setExpenditures(prev => {
      const newExpenditures = [...prev];
      newExpenditures[index] = {
        ...newExpenditures[index],
        [field]: value
      };

      // Auto-calculate totals
      if (field === 'quantityOrderedActual' || field === 'price') {
        const quantity = parseFloat(newExpenditures[index].quantityOrderedActual) || 0;
        const price = parseFloat(newExpenditures[index].price) || 0;
        newExpenditures[index].totalPrice = (quantity * price).toFixed(2);
        
        // Validate the calculated total
        if (newExpenditures[index].totalPrice !== '0.00') {
          const totalValidation = validatePrice(newExpenditures[index].totalPrice);
          if (!totalValidation.isValid) {
            // If total is invalid, clear the problematic field
            if (field === 'price') {
              newExpenditures[index].price = '';
              newExpenditures[index].totalPrice = '';
            } else if (field === 'quantityOrderedActual') {
              newExpenditures[index].quantityOrderedActual = '';
              newExpenditures[index].totalPrice = '';
            }
          }
        }
      }

      return newExpenditures;
    });
  };

  // Add new row
  const addRow = () => {
    setExpenditures(prev => [
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

  // Remove row
  const removeRow = (index) => {
    if (expenditures.length > 1) {
      setExpenditures(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Calculate total
  const total = useMemo(() => {
    return expenditures
      .map(e => parseFloat(e.totalPrice) || 0)
      .reduce((s, v) => s + v, 0);
  }, [expenditures]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!selectedFinancialYear) {
      newErrors.financialYear = 'Financial year is required';
    }
    if (!selectedCustomer) {
      newErrors.customer = 'Customer is required';
    }
    if (!selectedProject) {
      newErrors.project = 'Project is required';
    }

    // Validate expenditures
    const hasAnyExpenditure = expenditures.some(exp => 
      exp.typeOfWork || exp.partName || exp.quantityToBeOrdered || exp.price
    );
    
    if (!hasAnyExpenditure) {
      newErrors.expenditures = 'At least one expenditure entry is required';
    }
    
    expenditures.forEach((exp, index) => {
      if (exp.typeOfWork || exp.partName || exp.quantityToBeOrdered || exp.price) {
        // Validate type of work
        if (!exp.typeOfWork) {
          newErrors[`expenditures.${index}.typeOfWork`] = 'Type of work is required';
        } else {
          const typeOfWorkValidation = validateTypeOfWork(exp.typeOfWork);
          if (!typeOfWorkValidation.isValid) {
            newErrors[`expenditures.${index}.typeOfWork`] = typeOfWorkValidation.message;
          }
        }
        
        // Validate part name
        if (!exp.partName) {
          newErrors[`expenditures.${index}.partName`] = 'Item name is required';
        }
        
        // Validate quantity to be ordered
        if (!exp.quantityToBeOrdered) {
          newErrors[`expenditures.${index}.quantityToBeOrdered`] = 'Quantity is required';
        } else {
          const quantityValidation = validateQuantity(exp.quantityToBeOrdered);
          if (!quantityValidation.isValid) {
            newErrors[`expenditures.${index}.quantityToBeOrdered`] = quantityValidation.message;
          }
        }
        
        // Validate price
        if (!exp.price) {
          newErrors[`expenditures.${index}.price`] = 'Price is required';
        } else {
          const priceValidation = validatePrice(exp.price);
          if (!priceValidation.isValid) {
            newErrors[`expenditures.${index}.price`] = priceValidation.message;
          }
        }
        
        // Validate total price
        if (exp.totalPrice && exp.totalPrice !== '0.00') {
          const totalValidation = validatePrice(exp.totalPrice);
          if (!totalValidation.isValid) {
            newErrors[`expenditures.${index}.totalPrice`] = totalValidation.message;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    console.log('Form validation passed, preparing data for submission...');

    try {
      setLoading(true);

      // Find customer and project IDs from the project budgets
      const customerLabel = customers.find(c => c.value === selectedCustomer)?.label || selectedCustomer;
      const projectLabel = projects.find(p => p.value === selectedProject)?.label || selectedProject;

      if (!customerLabel || !projectLabel) {
        console.error('Customer or project label not found');
        showError && showError('Please select valid customer and project');
        return;
      }

      console.log('Looking up customer:', customerLabel);
      console.log('Looking up project:', projectLabel);

      // Fetch the actual Customer document by name to get its ObjectId
      let customerId = null;
      try {
        const customersResponse = await customersAPI.getAll({ customerName: customerLabel });
        console.log('Customers API response:', customersResponse);
        const customersList = customersResponse?.data || [];
        const matchingCustomer = customersList.find(c => c.customerName === customerLabel);
        
        if (matchingCustomer) {
          customerId = matchingCustomer._id;
          console.log('Found customer ID:', customerId);
        } else {
          console.error('Customer not found in database:', customerLabel);
          showError && showError(`Customer "${customerLabel}" not found in database. Please ensure the customer exists.`);
          return;
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        showError && showError('Failed to fetch customer information');
        return;
      }

      // Fetch the actual Project document by name to get its ObjectId
      let projectId = null;
      let projectNumber = 'N/A';
      try {
        const projectsResponse = await projectsAPI.getAll({ projectName: projectLabel });
        console.log('Projects API response:', projectsResponse);
        const projectsList = projectsResponse?.data || [];
        const matchingProject = projectsList.find(p => p.projectName === projectLabel);
        
        if (matchingProject) {
          projectId = matchingProject._id;
          projectNumber = matchingProject.projectNumber || 'N/A';
          console.log('Found project ID:', projectId);
          console.log('Project number:', projectNumber);
        } else {
          console.error('Project not found in database:', projectLabel);
          showError && showError(`Project "${projectLabel}" not found in database. Please ensure the project exists.`);
          return;
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        showError && showError('Failed to fetch project information');
        return;
      }

      if (!customerId || !projectId) {
        console.error('Customer or project ID not found');
        showError && showError('Invalid customer or project reference');
        return;
      }

      // Map expenditures to the backend expected format (items array)
      const validExpenditures = expenditures
        .filter(exp => exp.typeOfWork && exp.partName && exp.quantityToBeOrdered)
        .map(exp => {
          console.log('Processing expenditure:', exp);
          return {
            description: exp.partName.trim(),
            typeOfWork: exp.typeOfWork.trim(),
            quantity: parseFloat(exp.quantityOrderedActual) || parseFloat(exp.quantityToBeOrdered) || 0,
            unit: exp.unit || 'nos',
            rate: parseFloat(exp.price) || 0,
            amount: parseFloat(exp.totalPrice) || 0,
            remarks: `Qty to Order: ${exp.quantityToBeOrdered}, Qty Actual: ${exp.quantityOrderedActual || 0}`
          };
        });

      if (validExpenditures.length === 0) {
        console.error('No valid expenditures to save');
        showError && showError('Please fill in at least one complete expenditure entry');
        return;
      }

      console.log('Valid expenditures (items):', validExpenditures);
      console.log('Total calculated:', total);

      // Build the form data according to backend model
      const formData = {
        financialYear: selectedFinancialYear.trim(),
        customer: customerId,
        customerName: customerLabel.trim(),
        project: projectId,
        projectName: projectLabel.trim(),
        items: validExpenditures,
        totalAmount: total
      };

      console.log('Form data being submitted:', formData);

      onSave(formData);
    } catch (error) {
      console.error('Error preparing form data:', error);
      showError && showError('Error preparing form data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Master Data Section */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Project Expenditure Master Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FloatingInput
            label="Financial Year"
            value={selectedFinancialYear}
            onChange={handleFinancialYearChange}
            error={errors.financialYear}
            type="select"
            required={true}
            options={financialYears}
          />

          <FloatingInput
            label="Client Name"
            value={selectedCustomer}
            onChange={handleCustomerChange}
            error={errors.customer}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Customer' },
              ...customers
            ]}
            disabled={loading}
          />

          <FloatingInput
            label="Project"
            value={selectedProject}
            onChange={handleProjectChange}
            error={errors.project}
            type="select"
            required={true}
            options={[
              { value: '', label: 'Select Project' },
              ...projects
            ]}
            disabled={!selectedCustomer || loading}
          />
        </div>
      </div>

      {/* Expenditures Table */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Expenditure Details
          </h3>
          <button
            type="button"
            onClick={addRow}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            disabled={!selectedProject}
          >
            + Add Row
          </button>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full divide-y divide-gray-300 text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-3 py-2">Type of Work</th>
                <th className="px-3 py-2">Item Name</th>
                <th className="px-3 py-2">Qty to Order</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Qty Actual</th>
                <th className="px-3 py-2">Price (₹)</th>
                <th className="px-3 py-2">Total (₹)</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {expenditures.map((exp, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className={`w-full px-2 py-1 border rounded bg-white ${
                        errors[`expenditures.${index}.typeOfWork`] ? 'border-red-500' : ''
                      }`}
                      value={exp.typeOfWork}
                      onChange={(e) => handleExpenditureChange(index, 'typeOfWork', e.target.value)}
                      placeholder="Enter type of work"
                      maxLength={VALIDATION_RULES.TYPE_OF_WORK.MAX_LENGTH}
                      disabled={!selectedProject}
                    />
                    {errors[`expenditures.${index}.typeOfWork`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.typeOfWork`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2">
                    <select
                      value={exp.partName}
                      onChange={(e) => handlePartSelect(index, e.target.value)}
                      className={`w-full px-2 py-1 border rounded bg-white ${
                        errors[`expenditures.${index}.partName`] ? 'border-red-500' : ''
                      }`}
                      disabled={!selectedProject}
                      title={parts.length === 0 ? "No BOQ parts available for this project" : "Select part from BOQ"}
                    >
                      <option value="">{parts.length === 0 ? "No BOQ Parts Available" : "Select Part from BOQ"}</option>
                      {parts.map((part, i) => (
                        <option key={i} value={part.partName}>
                          {part.partName}
                        </option>
                      ))}
                    </select>
                    {errors[`expenditures.${index}.partName`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.partName`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`w-full px-2 py-1 border rounded bg-white ${
                        errors[`expenditures.${index}.quantityToBeOrdered`] ? 'border-red-500' : ''
                      }`}
                      value={exp.quantityToBeOrdered}
                      onChange={(e) => handleExpenditureChange(index, 'quantityToBeOrdered', e.target.value)}
                      onBlur={(e) => {
                        // Format to 3 decimal places on blur
                        if (e.target.value && !isNaN(parseFloat(e.target.value))) {
                          const formattedValue = parseFloat(e.target.value).toFixed(3);
                          handleExpenditureChange(index, 'quantityToBeOrdered', formattedValue);
                        }
                      }}
                    
                      maxLength={VALIDATION_RULES.QUANTITY.MAX_LENGTH}
                      step="0.001"
                      min="0"
                      disabled={!selectedProject}
                    />
                    {errors[`expenditures.${index}.quantityToBeOrdered`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.quantityToBeOrdered`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border rounded bg-gray-100"
                      value={exp.unit}
                      readOnly
                      disabled={!selectedProject}
                      title="Unit type fetched from BOQ data"
                    />
                  </td>
                  
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`w-full px-2 py-1 border rounded bg-white ${
                        errors[`expenditures.${index}.quantityOrderedActual`] ? 'border-red-500' : ''
                      }`}
                      value={exp.quantityOrderedActual}
                      onChange={(e) => handleExpenditureChange(index, 'quantityOrderedActual', e.target.value)}
                      onBlur={(e) => {
                        // Format to 3 decimal places on blur
                        if (e.target.value && !isNaN(parseFloat(e.target.value))) {
                          const formattedValue = parseFloat(e.target.value).toFixed(3);
                          handleExpenditureChange(index, 'quantityOrderedActual', formattedValue);
                        }
                      }}

                      maxLength={VALIDATION_RULES.QUANTITY.MAX_LENGTH}
                      step="0.001"
                      min="0"
                      disabled={!selectedProject}
                    />
                    {errors[`expenditures.${index}.quantityOrderedActual`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.quantityOrderedActual`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className={`w-full px-2 py-1 border rounded bg-white ${
                        errors[`expenditures.${index}.price`] ? 'border-red-500' : ''
                      }`}
                      value={exp.price}
                      onChange={(e) => handleExpenditureChange(index, 'price', e.target.value)}
                      onBlur={(e) => {
                        // Format to 2 decimal places on blur
                        if (e.target.value && !isNaN(parseFloat(e.target.value))) {
                          const formattedValue = parseFloat(e.target.value).toFixed(2);
                          handleExpenditureChange(index, 'price', formattedValue);
                        }
                      }}
                      placeholder="0.00"
                      maxLength={VALIDATION_RULES.PRICE.MAX_LENGTH}
                      step="0.01"
                      min="0"
                      disabled={!selectedProject}
                    />
                    {errors[`expenditures.${index}.price`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.price`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2">
                    <input
                      readOnly
                      className={`w-full px-2 py-1 border rounded bg-gray-100 ${
                        errors[`expenditures.${index}.totalPrice`] ? 'border-red-500' : ''
                      }`}
                      value={exp.totalPrice}
                    />
                    {errors[`expenditures.${index}.totalPrice`] && (
                      <div className="text-red-500 text-xs mt-1">
                        {errors[`expenditures.${index}.totalPrice`]}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-3 py-2 text-center">
                    {expenditures.length > 1 && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
                        onClick={() => removeRow(index)}
                        aria-label="Delete row"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a2 2 0 012-2h2a2 2 0 012 2v2"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total and Actions */}
      <div className="flex justify-between items-center border-t pt-4">
        <div className="text-xl font-bold">
          Total: ₹{total.toFixed(2)}
        </div>
        <div className="space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={!selectedProject || loading}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectExpenditureForm;
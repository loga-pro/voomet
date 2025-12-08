import React, { useState, useEffect } from 'react';
import { projectsAPI, partsAPI, customersAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import useNotification from '../../hooks/useNotification';

const ProjectForm = ({ project, onSubmit, onCancel, existingProjects = [] }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    enquiryDate: '',
    scopeOfWork: [],
    stage: '',
    totalProjectValue: '',
    projectName: ''
  });
  const [scopeOptions, setScopeOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [projectType, setProjectType] = useState(project ? 'existing' : 'new');
  const [stageWarning, setStageWarning] = useState('');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [isCustomerSyncing, setIsCustomerSyncing] = useState(false);
  const [originalCustomerName, setOriginalCustomerName] = useState('');
  const [customerData, setCustomerData] = useState([]);
  const { showSuccess, showError } = useNotification();


  const stageOptions = [
    { value: 'rfq', label: 'RFQ' },
    { value: 'boq', label: 'BOQ' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'under_execution', label: 'Under Execution' },
    { value: 'completed', label: 'Completed' },
    { value: 'post_implementation', label: 'Post Implementation' }
  ];

  // Stage validation function - SIMPLIFIED
  const validateStageSequence = (stage, projectType) => {
    // For existing projects, allow any stage selection - NO RESTRICTIONS
    if (projectType === 'existing') {
      return { isValid: true };
    }

    // For new projects, restrict certain stages
    const restrictedStages = ['under_execution', 'completed', 'post_implementation'];
    if (restrictedStages.includes(stage)) {
      return {
        isValid: false,
        message: `Cannot set stage to ${stage.replace('_', ' ')} for new projects. Allowed stages: RFQ, BOQ, Awarded`
      };
    }

    return { isValid: true };
  };

  // Format scope of work display name - CORRECTED VERSION
  const formatScopeName = (scope) => {
    // Define specific mappings for known scope values
    const scopeMappings = {
      'electrical_fire_safety': 'Electrical, Fire and Safety',
      'fire_safety': 'Fire and Safety',
      'electrical': 'Electrical',
      'mechanical': 'Mechanical',
      'civil': 'Civil',
      'plumbing': 'Plumbing',
      'hvac': 'HVAC',
      // Add more mappings as needed based on your actual scope values
    };

    // Return mapped value if exists
    const lowerCaseScope = scope.toLowerCase();
    if (scopeMappings[lowerCaseScope]) {
      return scopeMappings[lowerCaseScope];
    }

    // Fallback: Handle the specific case from your image
    if (scope.includes('Fire') && scope.includes('And') && scope.includes('safety')) {
      return 'Fire and safety';
    }

    // General case: replace underscores with spaces and capitalize each word
    return scope
      .split('_')
      .map(word => {
        // Skip empty words and common conjunctions
        if (!word || word.toLowerCase() === 'and') {
          return '';
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .filter(word => word !== '') // Remove empty strings
      .join(' and ');
  };

  // Fetch customer data first (on mount)
  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const response = await customersAPI.getAll();
        const modifiedCustomerData = response.data.map(({ customerName, _id }) => {
          return { value: _id, label: customerName };
        });
        setCustomerData(modifiedCustomerData);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };
    fetchCustomerData();
  }, []);

  // Set form data after customerData is loaded
  useEffect(() => {
    fetchScopeOptions();
    fetchAvailableProjects();
    
    // Only set form data if we have a project to edit AND customerData is loaded
    if (project && customerData && customerData.length > 0) {
      // Find the customerId from customerName if customerId is not present
      let customerId = project.customerId || '';
      
      // If customerId is missing but customerName exists, find it from customerData
      if (!customerId && project.customerName) {
        const matchingCustomer = customerData.find(c => c.label === project.customerName);
        if (matchingCustomer) {
          customerId = matchingCustomer.value;
        }
      }
      
      console.log('Setting form data for edit:', {
        projectCustomerId: project.customerId,
        projectCustomerName: project.customerName,
        resolvedCustomerId: customerId,
        customerDataLength: customerData.length
      });
      
      setFormData({
        customerId: customerId,
        customerName: project.customerName || '',
        enquiryDate: project.enquiryDate ? new Date(project.enquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        scopeOfWork: project.scopeOfWork || [],
        stage: project.stage || 'rfq',
        totalProjectValue: project.totalProjectValue || '',
        projectName: project.projectName || ''
      });
      setOriginalCustomerName(project.customerName || '');
    } else if (project && (!customerData || customerData.length === 0)) {
      // If project exists but customerData not loaded yet, set form data anyway
      // The dropdown will show the customerId temporarily until customerData loads
      setFormData({
        customerId: project.customerId || '',
        customerName: project.customerName || '',
        enquiryDate: project.enquiryDate ? new Date(project.enquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        scopeOfWork: project.scopeOfWork || [],
        stage: project.stage || 'rfq',
        totalProjectValue: project.totalProjectValue || '',
        projectName: project.projectName || ''
      });
      setOriginalCustomerName(project.customerName || '');
    }
  }, [project, customerData]);

  // Auto-sync customer to customer master when customer name is entered
  useEffect(() => {
    let customerSyncTimeout;
    
  
    
    return () => {
      if (customerSyncTimeout) {
        clearTimeout(customerSyncTimeout);
      }
    };
  }, [formData.customerName]);

  useEffect(() => {
    // Only reset form data when switching to new project type AND not editing an existing project
    if (projectType === 'new' && !project) {
      setFormData(prev => ({
        ...prev,
        customerId: '',
        customerName: '',
        enquiryDate: '',
        scopeOfWork: [],
        stage: 'rfq',
        totalProjectValue: '',
        projectName: ''
      }));
      // Clear errors when switching tabs
      setErrors({});
    } else if (projectType === 'existing' && !project) {
      setFormData(prev => ({
        ...prev,
        customerId: '',
        customerName: '',
        enquiryDate: '',
        scopeOfWork: [],
        stage: 'rfq',
        totalProjectValue: '',
        projectName: ''
      }));
      // Clear errors when switching tabs
      setErrors({});
    }
  }, [projectType, project]);

  const fetchScopeOptions = async () => {
    try {
      const response = await partsAPI.getAll();
      const scopes = [...new Set(response.data.map(part => part.scopeOfWork))];
      setScopeOptions(scopes);
    } catch (error) {
      console.error('Error fetching scope options:', error);
    }
  };

  const fetchAvailableProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setAvailableProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchCustomerData = async (customerName) => {
    try {
      const response = await customersAPI.getAll();
      // Handle different response structures
      const customers = response.data || response || [];
      
      if (!Array.isArray(customers)) {
        console.warn('Unexpected response format from customersAPI.getAll():', response);
        return null;
      }
      
      const foundCustomer = customers.find(c => c.customerName === customerName);
      console.log(`Customer search for "${customerName}": ${foundCustomer ? 'Found' : 'Not found'}`, foundCustomer);
      return foundCustomer;
    } catch (error) {
      console.error('Error fetching customer data:', error);
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'stage') {
      const validation = validateStageSequence(value, projectType);
      if (!validation.isValid) {
        setStageWarning(validation.message);
        setErrors(prev => ({ ...prev, stage: validation.message }));
      } else {
        setStageWarning('');
        setErrors(prev => ({ ...prev, stage: '' }));
      }
    }


    if (name === 'projectName') {
      if (/^[a-zA-Z\s]*$/.test(value) && value.length <= 30) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'customerName') {
      if (/^[a-zA-Z\s]*$/.test(value) && value.length <= 30) {
        setFormData(prev => {
          const newFormData = { ...prev, [name]: value };
          
          
          return newFormData;
        });
      }
    } else if (name === 'totalProjectValue') {
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === 'customerId') {
      setFormData(prev => {
        // Find the selected customer from customerData to get the customerName
        const selectedCustomer = customerData?.find(customer => customer.value === value);
        const newFormData = { 
          ...prev, 
          customerId: value,
          customerName: selectedCustomer ? selectedCustomer.label : ''
        };
        return newFormData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name] && name !== 'stage') {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleScopeChange = (scope) => {
    setFormData(prev => ({
      ...prev,
      scopeOfWork: prev.scopeOfWork.includes(scope)
        ? prev.scopeOfWork.filter(s => s !== scope)
        : [...prev.scopeOfWork, scope]
    }));
    
    // Clear scope error when user selects at least one scope
    if (errors.scopeOfWork) {
      setErrors(prev => ({ ...prev, scopeOfWork: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerId) newErrors.customerId = 'Customer name is required';
    else if (formData.customerId === "") newErrors.customerId = 'Customer name is Required';
    
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    else if (formData.projectName.length > 30) newErrors.projectName = 'Project name cannot exceed 30 characters';
    else if (!/^[a-zA-Z\s]+$/.test(formData.projectName)) newErrors.projectName = 'Project name can only contain letters and spaces';
    
    if (!formData.enquiryDate) newErrors.enquiryDate = 'Enquiry date is required';
    if (!formData.stage) newErrors.stage = 'Stage is required';
    
    if (!formData.totalProjectValue) newErrors.totalProjectValue = 'Project value is required';
    else if (isNaN(formData.totalProjectValue) || parseFloat(formData.totalProjectValue) <= 0) {
      newErrors.totalProjectValue = 'Project value must be a valid number greater than 0';
    }
    
    if (formData.scopeOfWork.length === 0) newErrors.scopeOfWork = 'At least one scope of work is required';

    // Stage validation - only validate for new projects
    if (projectType === 'new') {
      const stageValidation = validateStageSequence(formData.stage, projectType);
      if (!stageValidation.isValid) {
        newErrors.stage = stageValidation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Ensure customer is synced to customer master before saving project
      // if (formData.customerName) {
      //   const syncResult = await syncCustomerToMaster(formData.customerName, true, originalCustomerName);
      //   if (!syncResult.success) {
      //     showError(`Failed to sync customer: ${syncResult.message}`);
      //     return;
      //   }
      // }

      const submitData = {
        ...formData,
        totalProjectValue: parseFloat(formData.totalProjectValue),
        projectType: projectType

      };

      if (project) {
        await projectsAPI.update(project._id, submitData);
      } else {
        await projectsAPI.create(submitData);
      }
      
      // Update original customer name after successful submission
      // setOriginalCustomerName(formData.customerName);
      
      onSubmit();
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine button text and disabled states
  const isEditingExistingProject = !!project;
  const isCreatingNewProject = !project && projectType === 'new';
  const isCreatingExistingProject = !project && projectType === 'existing';
  
  // Fix: For creating existing projects, button should say "Create", not "Update"
  const submitButtonText = loading 
    ? 'Saving...' 
    : isEditingExistingProject 
      ? 'Update' 
      : 'Create';

  // Check if form has any validation errors (excluding submit error)
  const hasValidationErrors = Object.keys(errors).some(key => errors[key] && key !== 'submit');

  return (
    <div className="flex flex-col h-full">

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Project Type Tabs - Only show for new projects (not editing existing) */}
          {!project && (
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setProjectType('new')}
                  className={`${projectType === 'new'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  New Project
                </button>
                <button
                  type="button"
                  onClick={() => setProjectType('existing')}
                  className={`${projectType === 'existing'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  Existing Project
                </button>
              </nav>
            </div>
          )}

          {/* Stage Warning - Only show for new projects */}
          {stageWarning && projectType === 'new' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{stageWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Project Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Project Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Project Name"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                error={errors.projectName}
                required
                disabled={false}
              />

              <div className="relative">
                <FloatingInput
                  label="Customer Name"
                  name="customerId"
                  type="select"
                  value={formData.customerId}
                  onChange={handleChange}
                  options={customerData}
                  error={errors.customerId}
                  required
                  disabled={!!project}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Enquiry Date"
                name="enquiryDate"
                type="date"
                value={formData.enquiryDate}
                onChange={handleChange}
                error={errors.enquiryDate}
                required
              />

              <FloatingInput
                label="Stage"
                name="stage"
                type="select"
                value={formData.stage}
                onChange={handleChange}
                options={stageOptions}
                error={errors.stage}
                required
              />
            </div>

            <FloatingInput
              label="Total Project Value (₹)"
              name="totalProjectValue"
              type="number"
              value={formData.totalProjectValue}
              onChange={handleChange}
              error={errors.totalProjectValue}
              step="0.01"
              min="0"
              max="99999999.99"
              required
            />
          </div>

          {/* Scope of Work Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Scope of Work
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Scope of Work * {errors.scopeOfWork && <span className="text-red-600 text-sm">- {errors.scopeOfWork}</span>}
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {scopeOptions.map(scope => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => handleScopeChange(scope)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${formData.scopeOfWork.includes(scope)
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {formatScopeName(scope)}
                  </button>
                ))}
              </div>
              {formData.scopeOfWork.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 font-medium">Selected ({formData.scopeOfWork.length}):</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.scopeOfWork.map(scope => (
                      <span
                        key={scope}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {formatScopeName(scope)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || hasValidationErrors}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {submitButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
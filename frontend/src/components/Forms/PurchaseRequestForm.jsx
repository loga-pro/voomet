import React, { useState, useEffect } from 'react';
import { PlusCircleIcon, MinusCircleIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import FloatingInput from './FloatingInput';
import { purchaseRequestsAPI, partsAPI, inhouseMilestonesAPI } from '../../services/api';

const scopeOptions = [
  { value: '', label: 'Select Scope' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'data', label: 'Data' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'partition', label: 'Partition' },
  { value: 'fire_and_safety', label: 'Fire and Safety' },
  { value: 'access', label: 'Access' }
];

const PurchaseRequestForm = ({ purchaseRequest, customers = [], projects = [], onSubmit, onCancel, showSuccess, showError }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    projectName: '',
    milestoneStartDate: '',
    milestoneEndDate: '',
    startDate: '',
    endDate: '',
    items: [
      {
        sNo: 1,
        scopeOfWork: '',
        partName: '',
        quantityRequired: '',
        purpose: '',
        unitType: '',
        estimatedCost: ''
      }
    ],
    remarks: '',
    status: 'pending'
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableParts, setAvailableParts] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [filteredParts, setFilteredParts] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [inhouseMilestones, setInhouseMilestones] = useState([]);
  const [inhouseCustomers, setInhouseCustomers] = useState([]);

  // Validation constants
  const VALIDATION_RULES = {
    REMARKS: {
      maxLength: 200,
      allowNumbers: true,
      allowSpecialChars: true
    },
    PURPOSE: {
      maxLength: 100
    },
    QUANTITY_REQUIRED: {
      maxDigits: 8,
      allowDecimal: false,
      minValue: 1,
      maxValue: 99999999
    },
    ESTIMATED_COST: {
      maxValue: 9999999999.99,
      decimalPlaces: 2
    }
  };

  // Helper function to format date for date input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize form with existing data
  useEffect(() => {
    if (purchaseRequest) {
      setFormData({
        customerName: purchaseRequest.customerName || '',
        projectName: purchaseRequest.projectName || '',
        milestoneStartDate: purchaseRequest.milestoneStartDate ? formatDateForInput(purchaseRequest.milestoneStartDate) : '',
        milestoneEndDate: purchaseRequest.milestoneEndDate ? formatDateForInput(purchaseRequest.milestoneEndDate) : '',
        startDate: purchaseRequest.startDate ? formatDateForInput(purchaseRequest.startDate) : '',
        endDate: purchaseRequest.endDate ? formatDateForInput(purchaseRequest.endDate) : '',
        items: purchaseRequest.items?.length > 0 
          ? purchaseRequest.items.map((item, index) => ({
              sNo: index + 1,
              scopeOfWork: item.scopeOfWork || '',
              partName: item.partName || '',
              quantityRequired: item.quantityRequired || '',
              purpose: item.purpose || '',
              unitType: item.unitType || '',
              estimatedCost: item.estimatedCost || ''
            }))
          : [{
              sNo: 1,
              scopeOfWork: '',
              partName: '',
              quantityRequired: '',
              purpose: '',
              unitType: '',
              estimatedCost: ''
            }],
        remarks: purchaseRequest.remarks || '',
        status: purchaseRequest.status || 'pending'
      });
    }
  }, [purchaseRequest]);

  // Fetch inhouseMilestones and populate customers
  useEffect(() => {
    const fetchInhouseMilestones = async () => {
      try {
        const milestonesRes = await inhouseMilestonesAPI.getAll();
        const milestones = milestonesRes.data?.milestones || milestonesRes.data || [];
        setInhouseMilestones(milestones);
        
        // Extract unique customers from inhouseMilestones
        const uniqueCustomers = [...new Set(milestones.map(m => m.customer).filter(Boolean))];
        setInhouseCustomers(uniqueCustomers.map(c => ({ customerName: c })));
      } catch (error) {
        console.error('Error fetching inhouse milestones:', error);
      }
    };
    fetchInhouseMilestones();
  }, []);

  // Filter projects by selected customer from inhouseMilestones
  useEffect(() => {
    if (formData.customerName) {
      const customerMilestones = inhouseMilestones.filter(milestone => 
        milestone.customer === formData.customerName
      );
      // Extract unique project names
      const uniqueProjects = [...new Set(customerMilestones.map(m => m.projectName).filter(Boolean))];
      setFilteredProjects(uniqueProjects.map(p => ({ projectName: p })));
    } else {
      setFilteredProjects([]);
    }
  }, [formData.customerName, inhouseMilestones]);

  // Auto-populate milestone dates when project is selected (read-only)
  useEffect(() => {
    if (formData.customerName && formData.projectName) {
      const selectedMilestone = inhouseMilestones.find(
        m => m.customer === formData.customerName && m.projectName === formData.projectName
      );
      
      if (selectedMilestone) {
        setFormData(prev => ({
          ...prev,
          milestoneStartDate: selectedMilestone.startDate ? formatDateForInput(selectedMilestone.startDate) : '',
          milestoneEndDate: selectedMilestone.endDate ? formatDateForInput(selectedMilestone.endDate) : ''
        }));
      }
    }
  }, [formData.customerName, formData.projectName, inhouseMilestones]);

  // Fetch parts based on scope of work
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const partsResponse = await partsAPI.getAll();
        if (partsResponse.data) {
          setAvailableParts(partsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching parts:', error);
      }
    };
    fetchParts();
  }, []);

  // Filter parts by scope of work for each item
  useEffect(() => {
    const filtered = {};
    formData.items.forEach((item, index) => {
      if (item.scopeOfWork) {
        filtered[index] = availableParts.filter(part => 
          part.scopeOfWork === item.scopeOfWork
        );
      }
    });
    setFilteredParts(filtered);
  }, [formData.items, availableParts]);

  // Validation functions
  const validateRemarks = (value, fieldName = 'Remarks') => {
    const rules = VALIDATION_RULES.REMARKS;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `${fieldName} cannot exceed ${rules.maxLength} characters`;
    }
    
    return '';
  };

  const validatePurpose = (value) => {
    const rules = VALIDATION_RULES.PURPOSE;
    
    if (!value) return 'Purpose is required';
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    return '';
  };

  const validateQuantityRequired = (value) => {
    if (!value) return 'Quantity is required';
    
    // Check if it's a valid integer
    if (!/^\d+$/.test(value)) {
      return 'Only whole numbers are allowed (no decimals)';
    }
    
    const numValue = parseInt(value, 10);
    
    // Check if value is within range
    if (numValue < 1) {
      return `Minimum value is 1`;
    }
    
    if (numValue > 99999999) {
      return `Maximum value is 99,999,999`;
    }
    
    return '';
  };

  const validateEstimatedCost = (value) => {
    const rules = VALIDATION_RULES.ESTIMATED_COST;
    
    if (!value) return ''; // Optional field
    
    // Check if it's a valid number with optional 2 decimal places
    if (!/^\d+(\.\d{0,2})?$/.test(value)) {
      return 'Must be a valid number with up to 2 decimal places';
    }
    
    const numValue = parseFloat(value);
    
    if (numValue > rules.maxValue) {
      return `Maximum value is ${rules.maxValue.toLocaleString()}`;
    }
    
    // Check decimal places
    const decimalPart = value.split('.')[1];
    if (decimalPart && decimalPart.length > rules.decimalPlaces) {
      return `Maximum ${rules.decimalPlaces} decimal places allowed`;
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let validatedValue = value;
    
    // Apply validation rules based on field type
    if (name === 'remarks') {
      if (value.length <= VALIDATION_RULES.REMARKS.maxLength) {
        validatedValue = value;
      } else {
        return; // Don't update if exceeds max length
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Reset project name and dates if customer changes
    if (name === 'customerName') {
      setFormData(prev => ({
        ...prev,
        projectName: '',
        milestoneStartDate: '',
        milestoneEndDate: '',
        startDate: '',
        endDate: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    let validatedValue = value;
    
    if (field === 'quantityRequired') {
      // Allow only digits, remove non-digit characters
      validatedValue = value.replace(/[^\d]/g, '');
      
      // Remove leading zeros
      validatedValue = validatedValue.replace(/^0+/, '') || '0';
      
      updatedItems[index][field] = validatedValue;
      
      // Calculate estimated cost if part price is available
      if (field === 'quantityRequired' && updatedItems[index].partName) {
        const selectedPart = availableParts.find(part => 
          part.partName === updatedItems[index].partName
        );
        if (selectedPart && selectedPart.partPrice) {
          const quantity = parseInt(validatedValue) || 0;
          updatedItems[index].estimatedCost = (quantity * selectedPart.partPrice).toFixed(2);
        }
      }
    } else if (field === 'partName') {
      updatedItems[index][field] = value;
      
      // Auto-fill unit type and calculate estimated cost
      const selectedPart = availableParts.find(part => part.partName === value);
      if (selectedPart) {
        updatedItems[index].unitType = selectedPart.unitType || '';
        if (selectedPart.partPrice && updatedItems[index].quantityRequired) {
          const quantity = parseInt(updatedItems[index].quantityRequired) || 0;
          updatedItems[index].estimatedCost = (quantity * selectedPart.partPrice).toFixed(2);
        }
      }
    } else if (field === 'purpose') {
      if (value.length <= VALIDATION_RULES.PURPOSE.maxLength) {
        updatedItems[index][field] = value;
      } else {
        return; // Don't update if exceeds max length
      }
    } else if (field === 'estimatedCost') {
      // Allow only numbers and up to 2 decimal places
      validatedValue = value.replace(/[^\d.]/g, '');
      
      // Ensure only one decimal point
      const parts = validatedValue.split('.');
      if (parts.length > 2) {
        validatedValue = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Limit decimal places to 2
      if (parts[1] && parts[1].length > 2) {
        validatedValue = parts[0] + '.' + parts[1].slice(0, 2);
      }
      
      updatedItems[index][field] = validatedValue;
    } else {
      updatedItems[index][field] = value;
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Clear error for this field
    if (errors.items && errors.items[index] && errors.items[index][field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors.items[index][field];
      if (Object.keys(updatedErrors.items[index]).length === 0) {
        delete updatedErrors.items[index];
      }
      setErrors(updatedErrors);
    }
  };

  const addItem = () => {
    const newSNo = formData.items.length + 1;
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sNo: newSNo,
          scopeOfWork: '',
          partName: '',
          quantityRequired: '',
          purpose: '',
          unitType: '',
          estimatedCost: ''
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const updatedItems = [...formData.items];
      updatedItems.splice(index, 1);
      
      // Update serial numbers
      updatedItems.forEach((item, idx) => {
        item.sNo = idx + 1;
      });
      
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));

      if (errors.items && errors.items[index]) {
        const updatedErrors = { ...errors };
        updatedErrors.items.splice(index, 1);
        setErrors(updatedErrors);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.projectName) {
      newErrors.projectName = 'Project name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.startDate = 'Start date must be before end date';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    // Validate remarks
    const remarksError = validateRemarks(formData.remarks);
    if (remarksError) {
      newErrors.remarks = remarksError;
    }

    // Validate items
    const itemErrors = [];
    let hasValidItems = false;
    
    formData.items.forEach((item, index) => {
      const itemError = {};
      
      if (!item.scopeOfWork) {
        itemError.scopeOfWork = 'Scope of work is required';
      }
      
      if (!item.partName) {
        itemError.partName = 'Part name is required';
      }
      
      // Validate quantity
      const quantityError = validateQuantityRequired(item.quantityRequired);
      if (quantityError) {
        itemError.quantityRequired = quantityError;
      }
      
      // Validate purpose
      const purposeError = validatePurpose(item.purpose);
      if (purposeError) {
        itemError.purpose = purposeError;
      }
      
      // Validate estimated cost
      const costError = validateEstimatedCost(item.estimatedCost);
      if (costError) {
        itemError.estimatedCost = costError;
      }
      
      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      } else {
        hasValidItems = true;
      }
    });

    if (itemErrors.length > 0) {
      newErrors.items = itemErrors;
    }

    if (!hasValidItems) {
      newErrors.items = newErrors.items || {};
      newErrors.items.general = 'At least one valid item is required';
    }

    setErrors(newErrors);
    setShowValidation(true);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalEstimatedCost = () => {
    return formData.items.reduce((total, item) => {
      const cost = parseFloat(item.estimatedCost) || 0;
      return total + cost;
    }, 0).toFixed(2);
  };

  const calculateTotalQuantity = () => {
    return formData.items.reduce((total, item) => {
      return total + (parseInt(item.quantityRequired) || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    
    try {
      // Prepare data for submission (exclude milestone fields - they're only for display)
      const { milestoneStartDate, milestoneEndDate, ...dataToSubmit } = formData;
      
      const submitData = {
        ...dataToSubmit,
        items: formData.items.map(item => ({
          scopeOfWork: item.scopeOfWork,
          partName: item.partName,
          quantityRequired: parseInt(item.quantityRequired),
          purpose: item.purpose,
          unitType: item.unitType,
          estimatedCost: parseFloat(item.estimatedCost) || 0
        }))
      };

      if (purchaseRequest) {
        // Update existing request
        await purchaseRequestsAPI.update(purchaseRequest._id, submitData);
        showSuccess('Purchase request updated successfully');
      } else {
        // Create new request
        await purchaseRequestsAPI.create(submitData);
        showSuccess('Purchase request created successfully');
      }
      
      onSubmit(); // This will close the modal and refresh the list
    } catch (error) {
      console.error('Error submitting purchase request:', error);
      
      // Handle validation errors from backend
      if (error.response?.status === 400) {
        if (error.response?.data?.errors) {
          const backendErrors = {};
          error.response.data.errors.forEach(err => {
            if (err.path) {
              const field = err.path;
              if (field.includes('items')) {
                // Handle nested item errors
                const match = field.match(/items\[(\d+)\]\.(\w+)/);
                if (match) {
                  const [, index, fieldName] = match;
                  if (!backendErrors.items) backendErrors.items = [];
                  if (!backendErrors.items[index]) backendErrors.items[index] = {};
                  backendErrors.items[index][fieldName] = err.msg;
                }
              } else {
                backendErrors[field] = err.msg;
              }
            }
          });
          setErrors(backendErrors);
        } else if (error.response?.data?.message) {
          showError(error.response.data.message);
        }
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Helper function to format date as "DD-MM-YYYY" for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* FORM HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {purchaseRequest ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
          </h2>
        </div>
        
        {/* Customer and Project Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FloatingInput
            label="Customer name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            type="select"
            options={[
              { value: '', label: 'Select Customer' },
              ...inhouseCustomers.map(c => ({ value: c.customerName, label: c.customerName }))
            ]}
            error={showValidation && errors.customerName}
            required
            size="medium"
          />

          <FloatingInput
            label="Project Name"
            name="projectName"
            value={formData.projectName}
            onChange={handleChange}
            type="select"
            options={[
              { value: '', label: 'Select Project' },
              ...filteredProjects.map(p => ({ value: p.projectName, label: p.projectName }))
            ]}
            error={showValidation && errors.projectName}
            required
            size="medium"
          />
        </div>
        
        {/* Milestone Dates Row (Read-only from InhouseMilestone using FloatingInput) */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FloatingInput
            label="Project Start Date"
            name="milestoneStartDate"
            value={formData.milestoneStartDate}
            onChange={() => {}}
            type="date"
            error={showValidation && errors.milestoneStartDate}
            size="medium"
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />

          <FloatingInput
            label="Project End Date"
            name="milestoneEndDate"
            value={formData.milestoneEndDate}
            onChange={() => {}}
            type="date"
            error={showValidation && errors.milestoneEndDate}
            size="medium"
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
        
        {/* Purchase Request Dates Row (Editable) */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FloatingInput
            label="Production Request Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.startDate}
            required
            size="medium"
          />

          <FloatingInput
            label="Production Request End Date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.endDate}
            required
            size="medium"
          />
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-hidden p-4">
        {errors.submit && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {/* Add Row Button - Placed above the table */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircleIcon className="h-4 w-4 mr-2" />
            Add Row
          </button>
        </div>

        {/* Main Table Container with Fixed Header and Scrollable Body */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full max-h-[400px]">
          {/* Fixed Table Header */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-8 gap-4 px-4 py-3">
              <div className="text-sm font-medium text-gray-700">s.no</div>
              <div className="text-sm font-medium text-gray-700">Scope of Work</div>
              <div className="text-sm font-medium text-gray-700">Part name</div>
              <div className="text-sm font-medium text-gray-700">Quantity Required</div>
              <div className="text-sm font-medium text-gray-700">Purpose</div>
              <div className="text-sm font-medium text-gray-700">Unit</div>
              <div className="text-sm font-medium text-gray-700">Action</div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          <div className="flex-1 overflow-y-auto">
            {formData.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No items added. Click "Add Row" to add items.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <div key={index} className="px-4 py-4 hover:bg-gray-50 grid grid-cols-8 gap-4">
                    {/* S.No with proper spacing */}
                    <div className="flex items-center">
                      <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100">
                        <span className="text-sm font-medium text-gray-900">{item.sNo}</span>
                      </div>
                    </div>

                    {/* Scope of Work with more width */}
                    <div>
                      <FloatingInput
                        value={item.scopeOfWork}
                        onChange={(e) => handleItemChange(index, 'scopeOfWork', e.target.value)}
                        type="select"
                        options={scopeOptions}
                        error={showValidation && errors.items?.[index]?.scopeOfWork}
                        required
                        size="small"
                        hideLabel
                        placeholder="Select Scope"
                        className="w-full"
                      />
                    </div>

                    {/* Part Name with more width */}
                    <div>
                      <FloatingInput
                        value={item.partName}
                        onChange={(e) => handleItemChange(index, 'partName', e.target.value)}
                        type="select"
                        options={[
                          { value: '', label: 'Select Part' },
                          ...(filteredParts[index] || []).map(part => ({
                            value: part.partName,
                            label: part.partName
                          }))
                        ]}
                        error={showValidation && errors.items?.[index]?.partName}
                        required
                        size="small"
                        hideLabel
                        placeholder="Select Part"
                        className="w-full"
                      />
                    </div>

                    {/* Quantity Required with proper spacing */}
                    <div>
                      <FloatingInput
                        value={item.quantityRequired}
                        onChange={(e) => handleItemChange(index, 'quantityRequired', e.target.value)}
                        type="text"
                        inputMode="numeric"
                        error={showValidation && errors.items?.[index]?.quantityRequired}
                        required
                        size="small"
                        hideLabel
                        className="w-full"
                      />
                    </div>

                    {/* Purpose with more width */}
                    <div>
                      <FloatingInput
                        value={item.purpose}
                        onChange={(e) => handleItemChange(index, 'purpose', e.target.value)}
                        type="text"
                        error={showValidation && errors.items?.[index]?.purpose}
                        required
                        size="small"
                        hideLabel
                        maxLength={VALIDATION_RULES.PURPOSE.maxLength}
                        className="w-full"
                      />
                    </div>

                    {/* Unit Type */}
                    <div>
                      <FloatingInput
                        value={item.unitType}
                        onChange={(e) => handleItemChange(index, 'unitType', e.target.value)}
                        type="text"
                        size="small"
                        hideLabel
                        readOnly={!!item.partName}
                        className="w-full"
                      />
                    </div>

                    {/* Action - Delete Button */}
                    <div className="flex items-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Row"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Remarks Section */}
        <div className="mt-6 relative">
          <FloatingInput
            label="Remarks (Optional)"
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            type="textarea"
            error={errors.remarks}
            size="medium"
            rows={3}
            placeholder="Enter any additional remarks or notes..."
            maxLength={VALIDATION_RULES.REMARKS.maxLength}
          />
          {formData.remarks && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {formData.remarks.length}/{VALIDATION_RULES.REMARKS.maxLength}
            </div>
          )}
        </div>

        {/* Status (for editing only) */}
        {purchaseRequest && (
          <div className="mt-6">
            <FloatingInput
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              type="select"
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'completed', label: 'Completed' }
              ]}
              error={errors.status}
              size="medium"
            />
          </div>
        )}

        {/* Validation summary */}
        {showValidation && errors.items?.general && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-600">{errors.items.general}</p>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM BUTTONS */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {purchaseRequest ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                {purchaseRequest ? 'Update Purchase Requisition' : 'Create Purchase Requisition'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PurchaseRequestForm;
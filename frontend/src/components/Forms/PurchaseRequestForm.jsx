import React, { useState, useEffect } from 'react';
import { PlusCircleIcon, MinusCircleIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import FloatingInput from './FloatingInput';
import { purchaseRequestsAPI, partsAPI } from '../../services/api';

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
    startDate: '',
    endDate: '',
    overallProduction: '',
    items: [
      {
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
  const [formSteps, setFormSteps] = useState(1);
  const [showValidation, setShowValidation] = useState(false);

  // Validation constants
  const VALIDATION_RULES = {
    PRODUCTION_QUANTITY: {
      maxDigits: 8,
      allowDecimal: false,
      minValue: 1,
      maxValue: 99999999
    },
    REMARKS: {
      maxLength: 200,
      allowNumbers: true,
      allowSpecialChars: true
    },
    OVERALL_PRODUCTION: {
      maxLength: 200
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

  // Initialize form with existing data
  useEffect(() => {
    if (purchaseRequest) {
      setFormData({
        customerName: purchaseRequest.customerName || '',
        projectName: purchaseRequest.projectName || '',
        startDate: purchaseRequest.startDate ? purchaseRequest.startDate.split('T')[0] : '',
        endDate: purchaseRequest.endDate ? purchaseRequest.endDate.split('T')[0] : '',
        overallProduction: purchaseRequest.overallProduction || '',
        items: purchaseRequest.items?.length > 0 
          ? purchaseRequest.items.map(item => ({
              scopeOfWork: item.scopeOfWork || '',
              partName: item.partName || '',
              quantityRequired: item.quantityRequired || '',
              purpose: item.purpose || '',
              unitType: item.unitType || '',
              estimatedCost: item.estimatedCost || ''
            }))
          : [{
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

  // Filter projects by selected customer
  useEffect(() => {
    if (formData.customerName) {
      const customerProjects = projects.filter(project => 
        project.customerName === formData.customerName
      );
      setFilteredProjects(customerProjects);
    } else {
      setFilteredProjects(projects);
    }
  }, [formData.customerName, projects]);

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
  const validateProductionQuantity = (value, fieldName = 'Quantity') => {
    const rules = VALIDATION_RULES.PRODUCTION_QUANTITY;
    
    if (!value) return `${fieldName} is required`;
    
    // Check if it's a valid integer
    if (!/^\d+$/.test(value)) {
      return 'Only whole numbers are allowed (no decimals)';
    }
    
    const numValue = parseInt(value, 10);
    
    // Check if value is within range
    if (numValue < rules.minValue) {
      return `Minimum value is ${rules.minValue}`;
    }
    
    if (numValue > rules.maxValue) {
      return `Maximum value is ${rules.maxValue}`;
    }
    
    // Check digit limit
    if (value.length > rules.maxDigits) {
      return `Maximum ${rules.maxDigits} digits allowed`;
    }
    
    return '';
  };

  const validateRemarks = (value, fieldName = 'Remarks') => {
    const rules = VALIDATION_RULES.REMARKS;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `${fieldName} cannot exceed ${rules.maxLength} characters`;
    }
    
    return '';
  };

  const validateOverallProduction = (value) => {
    const rules = VALIDATION_RULES.OVERALL_PRODUCTION;
    
    if (!value) return 'Overall production description is required';
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
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
    return validateProductionQuantity(value, 'Quantity required');
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
    if (name === 'overallProduction') {
      if (value.length <= VALIDATION_RULES.OVERALL_PRODUCTION.maxLength) {
        validatedValue = value;
      } else {
        return; // Don't update if exceeds max length
      }
    } else if (name === 'remarks') {
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

    // Reset project name if customer changes
    if (name === 'customerName') {
      setFormData(prev => ({
        ...prev,
        projectName: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    
    let validatedValue = value;
    
    if (field === 'quantityRequired') {
      // Allow only digits, remove non-digit characters
      validatedValue = value.replace(/[^\d]/g, '');
      
      // Limit to 8 digits
      if (validatedValue.length > VALIDATION_RULES.PRODUCTION_QUANTITY.maxDigits) {
        validatedValue = validatedValue.slice(0, VALIDATION_RULES.PRODUCTION_QUANTITY.maxDigits);
      }
      
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
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
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

    // Validate overall production
    const overallProductionError = validateOverallProduction(formData.overallProduction);
    if (overallProductionError) {
      newErrors.overallProduction = overallProductionError;
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

  const nextStep = () => {
    // Validate current step
    if (formSteps === 1) {
      const stepErrors = {};
      if (!formData.customerName) stepErrors.customerName = 'Customer name is required';
      if (!formData.projectName) stepErrors.projectName = 'Project name is required';
      if (!formData.startDate) stepErrors.startDate = 'Start date is required';
      if (!formData.endDate) stepErrors.endDate = 'End date is required';
      
      const overallProductionError = validateOverallProduction(formData.overallProduction);
      if (overallProductionError) {
        stepErrors.overallProduction = overallProductionError;
      }
      
      if (Object.keys(stepErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...stepErrors }));
        return;
      }
    }
    
    setFormSteps(prev => prev + 1);
  };

  const prevStep = () => {
    setFormSteps(prev => prev - 1);
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
      // Prepare data for submission
      const submitData = {
        ...formData,
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

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <p className="text-sm text-blue-700">
              Fill in the basic project information and production timeline.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              • Overall Production: Max {VALIDATION_RULES.OVERALL_PRODUCTION.maxLength} characters
              <br />
              • Remarks: Max {VALIDATION_RULES.REMARKS.maxLength} characters
            </p>
          </div>
        </div>
      </div>

      {/* Customer and Project Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FloatingInput
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          type="select"
          options={[
            { value: '', label: 'Select Customer' },
            ...customers.map(c => ({ value: c.customerName, label: c.customerName }))
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

      {/* Production Timeline Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FloatingInput
          label="Start Date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          type="date"
          error={showValidation && errors.startDate}
          required
          size="medium"
        />

        <FloatingInput
          label="End Date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          type="date"
          error={showValidation && errors.endDate}
          required
          size="medium"
        />

        <div className="relative">
          <FloatingInput
            label="Overall Production"
            name="overallProduction"
            value={formData.overallProduction}
            onChange={handleChange}
            type="text"
            error={showValidation && errors.overallProduction}
            placeholder="e.g., Electrical wiring and CCTV installation"
            required
            size="medium"
          />
          {formData.overallProduction && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {formData.overallProduction.length}/{VALIDATION_RULES.OVERALL_PRODUCTION.maxLength}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <p className="text-sm text-blue-700">
              Add all the items required for this purchase request. You can add multiple items.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              • Quantity Required: Whole numbers only, max {VALIDATION_RULES.QUANTITY_REQUIRED.maxDigits} digits
              <br />
              • Purpose: Max {VALIDATION_RULES.PURPOSE.maxLength} characters
              <br />
              • Estimated Cost: Up to 2 decimal places
            </p>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Requested Items</h3>
            <p className="text-sm text-gray-500">Add all parts and materials needed</p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Item
          </button>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-700">Item {index + 1}</h4>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Remove Item"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <FloatingInput
                  label="Scope of Work"
                  value={item.scopeOfWork}
                  onChange={(e) => handleItemChange(index, 'scopeOfWork', e.target.value)}
                  type="select"
                  options={scopeOptions}
                  error={showValidation && errors.items?.[index]?.scopeOfWork}
                  required
                  size="small"
                />
              </div>

              <div className="md:col-span-2">
                <FloatingInput
                  label="Part Name"
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
                />
              </div>

              <div className="relative">
                <FloatingInput
                  label="Quantity"
                  value={item.quantityRequired}
                  onChange={(e) => handleItemChange(index, 'quantityRequired', e.target.value)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  error={showValidation && errors.items?.[index]?.quantityRequired}
                  required
                  size="small"
                />
                {item.quantityRequired && (
                  <div className="absolute right-2 top-2 text-xs text-gray-400">
                    {item.quantityRequired.length}/{VALIDATION_RULES.QUANTITY_REQUIRED.maxDigits}
                  </div>
                )}
              </div>

              <div>
                <FloatingInput
                  label="Unit"
                  value={item.unitType}
                  onChange={(e) => handleItemChange(index, 'unitType', e.target.value)}
                  type="text"
                  placeholder="e.g., pcs, meters, kg"
                  size="small"
                />
              </div>

              <div className="md:col-span-2 relative">
                <FloatingInput
                  label="Purpose"
                  value={item.purpose}
                  onChange={(e) => handleItemChange(index, 'purpose', e.target.value)}
                  type="text"
                  error={showValidation && errors.items?.[index]?.purpose}
                  placeholder="e.g., Main panel installation"
                  required
                  size="small"
                />
                {item.purpose && (
                  <div className="absolute right-2 top-2 text-xs text-gray-400">
                    {item.purpose.length}/{VALIDATION_RULES.PURPOSE.maxLength}
                  </div>
                )}
              </div>

              <div>
                <FloatingInput
                  label="Estimated Cost (₹)"
                  value={item.estimatedCost}
                  onChange={(e) => handleItemChange(index, 'estimatedCost', e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  size="small"
                  error={showValidation && errors.items?.[index]?.estimatedCost}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Total Cost Summary */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700">Total Items: {formData.items.length}</p>
              <p className="text-sm text-gray-500">Total estimated cost</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                ₹{calculateTotalEstimatedCost()}
              </p>
            </div>
          </div>
        </div>

        {showValidation && errors.items?.general && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-600">{errors.items.general}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
        <div className="flex">
          <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3" />
          <div>
            <p className="text-sm text-green-700">
              Review all information before submitting the purchase request.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer:</span>
              <span className="text-sm font-medium text-gray-900">{formData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Project:</span>
              <span className="text-sm font-medium text-gray-900">{formData.projectName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Timeline:</span>
              <span className="text-sm font-medium text-gray-900">
                {formData.startDate} to {formData.endDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Overall Production:</span>
              <span className="text-sm font-medium text-gray-900">{formData.overallProduction}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Items:</span>
              <span className="text-sm font-medium text-gray-900">{formData.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Quantity:</span>
              <span className="text-sm font-medium text-gray-900">
                {formData.items.reduce((sum, item) => sum + (parseInt(item.quantityRequired) || 0), 0)}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-700">Total Estimated Cost:</span>
                <span className="text-2xl font-bold text-green-600">₹{calculateTotalEstimatedCost()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Summary Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Items Summary</h3>
        <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50 sticky top-0 z-10">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Part Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Purpose</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Estimated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.partName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.scopeOfWork}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.quantityRequired}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.unitType}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.purpose}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{item.estimatedCost || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks */}
      <div className="relative">
        <FloatingInput
          label="Additional Remarks (Optional)"
          name="remarks"
          value={formData.remarks}
          onChange={handleChange}
          type="textarea"
          error={errors.remarks}
          size="medium"
          rows={3}
          placeholder="Any additional notes or special instructions..."
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
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Update</h3>
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
    </div>
  );

  // Navigation buttons for each step
  const renderStepNavigation = () => {
    if (formSteps === 1) {
      return (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            Next: Add Items
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>
      );
    } else if (formSteps === 2) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back: Project Details
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
          >
            Next: Review & Submit
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </button>
        </div>
      );
    } else if (formSteps === 3) {
      return (
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back: Add Items
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : purchaseRequest ? 'Update Request' : 'Submit Request'}
          </button>
        </div>
      </div>
    );
  }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* Step Indicator - Fixed at top */}
      <div className="flex-shrink-0 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
              Project Details
            </div>
          </div>
          
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
              Add Items
            </div>
          </div>
          
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${formSteps >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
            <div className={`ml-2 text-sm font-medium ${formSteps >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>
              Review & Submit
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-180px)] px-1 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        {errors.submit && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {/* Form Steps Content */}
        {formSteps === 1 && renderStep1()}
        {formSteps === 2 && renderStep2()}
        {formSteps === 3 && renderStep3()}
      </div>

      {/* FIXED BOTTOM BUTTONS */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-4 mt-4">
        {renderStepNavigation()}
      </div>
    </form>
  );
};

export default PurchaseRequestForm;
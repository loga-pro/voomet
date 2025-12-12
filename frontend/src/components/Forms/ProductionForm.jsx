import React, { useState, useEffect } from 'react';
import { customersAPI, partsAPI, inhouseMilestonesAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import { 
  PlusCircleIcon, 
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ProductionForm = ({ production, onSubmit, onCancel, showSuccess, showError }) => {
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
        date: '',
        partName: '',
        productionQuantityPlan: '',
        actualProduction: '',
        gap: '',
        reasonForDelay: '',
        remarks: ''
      }
    ]
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parts, setParts] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [inhouseMilestones, setInhouseMilestones] = useState([]);

  // Validation constants
  const VALIDATION_RULES = {
    PRODUCTION_QUANTITY: {
      maxDigits: 8,
      allowDecimal: false,
      minValue: 1,
      maxValue: 99999999
    },
    REASON_FOR_DELAY: {
      maxLength: 200
    },
    REMARKS: {
      maxLength: 200
    },
    GAP: {
      maxDigits: 8,
      allowDecimal: false,
      minValue: -99999999,
      maxValue: 99999999
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
    if (production) {
      setFormData({
        customerName: production.customerName || '',
        projectName: production.projectName || '',
        milestoneStartDate: production.milestoneStartDate ? formatDateForInput(production.milestoneStartDate) : '',
        milestoneEndDate: production.milestoneEndDate ? formatDateForInput(production.milestoneEndDate) : '',
        startDate: production.startDate ? formatDateForInput(production.startDate) : '',
        endDate: production.endDate ? formatDateForInput(production.endDate) : '',
        items: production.items?.length > 0 
          ? production.items.map((item, index) => ({
              sNo: index + 1,
              date: item.date ? formatDateForInput(item.date) : '',
              partName: item.partName || '',
              productionQuantityPlan: item.productionQuantityPlan || '',
              actualProduction: item.actualProduction || '',
              gap: item.gap || '',
              reasonForDelay: item.reasonForDelay || '',
              remarks: item.remarks || ''
            }))
          : [{
              sNo: 1,
              date: '',
              partName: '',
              productionQuantityPlan: '',
              actualProduction: '',
              gap: '',
              reasonForDelay: '',
              remarks: ''
            }]
      });
    }
  }, [production]);

  // Fetch inhouseMilestones and parts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [milestonesRes, partsRes] = await Promise.all([
          inhouseMilestonesAPI.getAll(),
          partsAPI.getAll()
        ]);
        
        const milestones = milestonesRes.data?.milestones || milestonesRes.data || [];
        setInhouseMilestones(milestones);
        
        // Extract unique customers from inhouseMilestones
        const uniqueCustomers = [...new Set(milestones.map(m => m.customer).filter(Boolean))];
        setCustomers(uniqueCustomers.map(c => ({ customerName: c })));
        
        setParts(partsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Filter projects based on selected customer from inhouseMilestones
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

  // Calculate gap when plan or actual changes
  useEffect(() => {
    const updatedItems = formData.items.map(item => {
      const plan = parseInt(item.productionQuantityPlan) || 0;
      const actual = parseInt(item.actualProduction) || 0;
      return {
        ...item,
        gap: (plan - actual).toString()
      };
    });
    
    // Only update if there's a change
    if (JSON.stringify(updatedItems) !== JSON.stringify(formData.items)) {
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  }, [formData.items.map(item => `${item.productionQuantityPlan}-${item.actualProduction}`).join(',')]);

  // Validation functions
  const validateProductionQuantity = (value, fieldName = 'Production quantity') => {
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

  const validateDate = (value, fieldName = 'Date') => {
    if (!value) return `${fieldName} is required`;
    
    const date = new Date(value);
    const today = new Date();
    
    if (date > today) {
      return 'Date cannot be in the future';
    }
    
    return '';
  };

  const validateReasonForDelay = (value) => {
    const rules = VALIDATION_RULES.REASON_FOR_DELAY;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    return '';
  };

  const validateRemarks = (value) => {
    const rules = VALIDATION_RULES.REMARKS;
    
    if (!value) return ''; // Optional field
    
    if (value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    
    if (field === 'productionQuantityPlan' || field === 'actualProduction') {
      // Allow only digits, remove non-digit characters
      validatedValue = value.replace(/[^\d]/g, '');
      
      // Remove leading zeros
      validatedValue = validatedValue.replace(/^0+/, '') || '0';
      
      updatedItems[index][field] = validatedValue;
    } else if (field === 'reasonForDelay' || field === 'remarks') {
      if (value.length <= VALIDATION_RULES.REASON_FOR_DELAY.maxLength) {
        updatedItems[index][field] = value;
      } else {
        return; // Don't update if exceeds max length
      }
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
          date: '',
          partName: '',
          productionQuantityPlan: '',
          actualProduction: '',
          gap: '',
          reasonForDelay: '',
          remarks: ''
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

    // Validate main fields
    if (!formData.customerName) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.projectName) {
      newErrors.projectName = 'Project name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.startDate = 'Start date must be before end date';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    // Validate items
    const itemErrors = [];
    let hasValidItems = false;
    
    formData.items.forEach((item, index) => {
      const itemError = {};
      
      // Date validation
      const dateError = validateDate(item.date, 'Date');
      if (dateError) {
        itemError.date = dateError;
      }
      
      // Part name validation
      if (!item.partName) {
        itemError.partName = 'Part name is required';
      }
      
      // Production quantity plan validation
      const planError = validateProductionQuantity(item.productionQuantityPlan, 'Plan quantity');
      if (planError) {
        itemError.productionQuantityPlan = planError;
      }
      
      // Actual production validation
      const actualError = validateProductionQuantity(item.actualProduction, 'Actual production');
      if (actualError) {
        itemError.actualProduction = actualError;
      }
      
      // Reason for delay validation
      const reasonError = validateReasonForDelay(item.reasonForDelay);
      if (reasonError) {
        itemError.reasonForDelay = reasonError;
      }
      
      // Remarks validation
      const remarksError = validateRemarks(item.remarks);
      if (remarksError) {
        itemError.remarks = remarksError;
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

  // Calculate summary statistics
  const calculateSummary = () => {
    const totalPlan = formData.items.reduce((sum, item) => 
      sum + (parseInt(item.productionQuantityPlan) || 0), 0
    );
    
    const totalActual = formData.items.reduce((sum, item) => 
      sum + (parseInt(item.actualProduction) || 0), 0
    );
    
    const totalGap = formData.items.reduce((sum, item) => 
      sum + (parseInt(item.gap) || 0), 0
    );
    
    const efficiency = totalPlan > 0 ? ((totalActual / totalPlan) * 100) : 0;
    
    return {
      totalPlan,
      totalActual,
      totalGap,
      efficiency: parseFloat(efficiency.toFixed(2))
    };
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
      const { milestoneStartDate, milestoneEndDate, items, ...dataToSubmit } = formData;
      
      const submitData = {
        ...dataToSubmit,
        productionDetails: formData.items.map(item => ({
          date: item.date,
          partName: item.partName,
          productionQuantityPlan: parseInt(item.productionQuantityPlan),
          actualProduction: parseInt(item.actualProduction),
          gap: parseInt(item.gap) || 0,
          reasonForDelay: item.reasonForDelay,
          remarks: item.remarks
        }))
      };

      // Pass data to parent component for API call
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting production:', error);
      
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

  const summary = calculateSummary();

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* FORM HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {production ? 'Edit Production' : 'Create Production'}
          </h2>
        </div>
        
        {/* Customer and Project Row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <FloatingInput
            label="Customer name"
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
            className="w-full"
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
            className="w-full"
          />
        </div>

        {/* Milestone Dates Row (Read-only from InhouseMilestone using FloatingInput) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
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

        {/* Production Dates Row (Editable) */}
        <div className="grid grid-cols-2 gap-6">
          <FloatingInput
            label="Production Start Date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.startDate}
            required
            size="medium"
            className="w-full"
          />

          <FloatingInput
            label="Production End Date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            type="date"
            error={showValidation && errors.endDate}
            required
            size="medium"
            className="w-full"
          />
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-hidden p-6">
        {errors.submit && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-lg">
            {errors.submit}
          </div>
        )}

        {/* Add Row Button */}
        <div className="mb-6 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Production Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Add Row
          </button>
        </div>

        {/* Main Table Container */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full max-h-[500px]">
          {/* Fixed Table Header */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-6 px-6 py-4">
              <div className="col-span-1 text-sm font-semibold text-gray-700">S.No</div>
              <div className="col-span-2 text-sm font-semibold text-gray-700">Date</div>
              <div className="col-span-2 text-sm font-semibold text-gray-700">Part Name</div>
              <div className="col-span-2 text-sm font-semibold text-gray-700">Production Quantity</div>
              <div className="col-span-1 text-sm font-semibold text-gray-700">Gap</div>
              <div className="col-span-2 text-sm font-semibold text-gray-700">Reason for Delay</div>
              <div className="col-span-1 text-sm font-semibold text-gray-700">Remarks</div>
              <div className="col-span-1 text-sm font-semibold text-gray-700 text-center">Action</div>
            </div>
          </div>

          {/* Scrollable Table Body */}
          <div className="flex-1 overflow-y-auto">
            {formData.items.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="mb-4">
                  <PlusCircleIcon className="h-12 w-12 text-gray-300 mx-auto" />
                </div>
                <p className="text-lg font-medium">No items added</p>
                <p className="text-sm mt-1">Click "Add Row" to add production items</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <div key={index} className="px-6 py-4 hover:bg-gray-50 grid grid-cols-12 gap-6">
                    {/* S.No */}
                    <div className="col-span-1 flex items-center">
                      <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100">
                        <span className="text-base font-medium text-gray-900">{item.sNo}</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-2">
                      <FloatingInput
                        value={item.date}
                        onChange={(e) => handleItemChange(index, 'date', e.target.value)}
                        type="date"
                        error={showValidation && errors.items?.[index]?.date}
                        required
                        size="medium"
                        hideLabel
                        placeholder="Select date"
                        className="w-full"
                      />
                    </div>

                    {/* Part Name */}
                    <div className="col-span-2">
                      <FloatingInput
                        value={item.partName}
                        onChange={(e) => handleItemChange(index, 'partName', e.target.value)}
                        type="select"
                        options={[
                          { value: '', label: 'Select Part' },
                          ...parts.map(part => ({ 
                            value: part.partName, 
                            label: part.partName 
                          }))
                        ]}
                        error={showValidation && errors.items?.[index]?.partName}
                        required
                        size="medium"
                        hideLabel
                        placeholder="Select part"
                        className="w-full"
                      />
                    </div>

                    {/* Production Quantity */}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <FloatingInput
                          label="Plan"
                          value={item.productionQuantityPlan}
                          onChange={(e) => handleItemChange(index, 'productionQuantityPlan', e.target.value)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          error={showValidation && errors.items?.[index]?.productionQuantityPlan}
                          required
                          size="medium"
                          hideLabel
                          placeholder="Plan"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <FloatingInput
                          label="Actual"
                          value={item.actualProduction}
                          onChange={(e) => handleItemChange(index, 'actualProduction', e.target.value)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          error={showValidation && errors.items?.[index]?.actualProduction}
                          required
                          size="medium"
                          hideLabel
                          placeholder="Actual"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Gap */}
                    <div className="col-span-1 flex items-center">
                      <div className={`px-3 py-2.5 w-full text-center rounded-lg ${
                        parseInt(item.gap) > 0 ? 'bg-red-100 text-red-700 border border-red-200' :
                        parseInt(item.gap) < 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        <span className="text-base font-medium">{item.gap || '0'}</span>
                      </div>
                    </div>

                    {/* Reason for Delay */}
                    <div className="col-span-2">
                      <div className="relative">
                        <FloatingInput
                          value={item.reasonForDelay}
                          onChange={(e) => handleItemChange(index, 'reasonForDelay', e.target.value)}
                          type="text"
                          size="medium"
                          hideLabel
                          placeholder="Reason"
                          maxLength={VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
                          error={showValidation && errors.items?.[index]?.reasonForDelay}
                          className="w-full"
                        />
                        {item.reasonForDelay && (
                          <div className="absolute right-2 top-2 text-xs text-gray-400">
                            {item.reasonForDelay.length}/{VALIDATION_RULES.REASON_FOR_DELAY.maxLength}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="col-span-1">
                      <div className="relative">
                        <FloatingInput
                          value={item.remarks}
                          onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                          type="text"
                          size="medium"
                          hideLabel
                          placeholder="Remarks"
                          maxLength={VALIDATION_RULES.REMARKS.maxLength}
                          error={showValidation && errors.items?.[index]?.remarks}
                          className="w-full"
                        />
                        {item.remarks && (
                          <div className="absolute right-2 top-2 text-xs text-gray-400">
                            {item.remarks.length}/{VALIDATION_RULES.REMARKS.maxLength}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="col-span-1 flex items-center justify-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-10 h-10 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
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

        {/* Validation summary */}
        {showValidation && errors.items?.general && (
          <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-600">{errors.items.general}</p>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM BUTTONS */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {formData.items.length} item{formData.items.length !== 1 ? 's' : ''} added
          </div>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-base font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-base font-medium"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {production ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {production ? 'Save Production' : 'Create Production'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProductionForm;
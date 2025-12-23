import React, { useState, useEffect } from 'react';
import {
  PlusCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
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

const PurchaseRequestForm = ({ purchaseRequest, onSubmit, onCancel, showSuccess, showError }) => {
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

  const VALIDATION_RULES = {
    REMARKS: { maxLength: 200 },
    PURPOSE: { maxLength: 100 },
    QUANTITY_REQUIRED: { maxDigits: 8, allowDecimal: false, minValue: 1, maxValue: 99999999 },
    ESTIMATED_COST: { maxValue: 9999999999.99, decimalPlaces: 2 }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

  useEffect(() => {
    const fetchInhouseMilestones = async () => {
      try {
        const milestonesRes = await inhouseMilestonesAPI.getAll();
        const milestones = milestonesRes.data?.milestones || milestonesRes.data || [];
        setInhouseMilestones(milestones);
        const uniqueCustomers = [...new Set(milestones.map(m => m.customer).filter(Boolean))];
        setInhouseCustomers(uniqueCustomers.map(c => ({ customerName: c })));
      } catch (error) {
        console.error('Error fetching inhouse milestones:', error);
      }
    };
    fetchInhouseMilestones();
  }, []);

  useEffect(() => {
    if (formData.customerName) {
      const customerMilestones = inhouseMilestones.filter(milestone => milestone.customer === formData.customerName);
      const uniqueProjects = [...new Set(customerMilestones.map(m => m.projectName).filter(Boolean))];
      setFilteredProjects(uniqueProjects.map(p => ({ projectName: p })));
    } else {
      setFilteredProjects([]);
    }
  }, [formData.customerName, inhouseMilestones]);

  useEffect(() => {
    if (formData.customerName && formData.projectName) {
      const selectedMilestone = inhouseMilestones.find(m => m.customer === formData.customerName && m.projectName === formData.projectName);
      if (selectedMilestone) {
        setFormData(prev => ({
          ...prev,
          milestoneStartDate: selectedMilestone.startDate ? formatDateForInput(selectedMilestone.startDate) : '',
          milestoneEndDate: selectedMilestone.endDate ? formatDateForInput(selectedMilestone.endDate) : ''
        }));
      }
    }
  }, [formData.customerName, formData.projectName, inhouseMilestones]);

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

  useEffect(() => {
    const filtered = {};
    formData.items.forEach((item, index) => {
      if (item.scopeOfWork) {
        filtered[index] = availableParts.filter(part => part.scopeOfWork === item.scopeOfWork);
      }
    });
    setFilteredParts(filtered);
  }, [formData.items, availableParts]);

  const validateRemarks = (value, fieldName = 'Remarks') => {
    const rules = VALIDATION_RULES.REMARKS;
    if (!value) return '';
    if (value.length > rules.maxLength) return `${fieldName} cannot exceed ${rules.maxLength} characters`;
    return '';
  };

  const validatePurpose = (value) => {
    const rules = VALIDATION_RULES.PURPOSE;
    if (!value) return 'Purpose is required';
    if (value.length > rules.maxLength) return `Maximum ${rules.maxLength} characters allowed`;
    return '';
  };

  const validateQuantityRequired = (value) => {
    if (!value) return 'Quantity is required';
    if (!/^\d+$/.test(value)) return 'Only whole numbers are allowed (no decimals)';
    const numValue = parseInt(value, 10);
    if (numValue < 1) return `Minimum value is 1`;
    if (numValue > 99999999) return `Maximum value is 99,999,999`;
    return '';
  };

  const validateEstimatedCost = (value) => {
    const rules = VALIDATION_RULES.ESTIMATED_COST;
    if (!value) return '';
    if (!/^\d+(\.\d{0,2})?$/.test(value)) return 'Must be a valid number with up to 2 decimal places';
    const numValue = parseFloat(value);
    if (numValue > rules.maxValue) return `Maximum value is ${rules.maxValue.toLocaleString()}`;
    const decimalPart = value.split('.')[1];
    if (decimalPart && decimalPart.length > rules.decimalPlaces) return `Maximum ${rules.decimalPlaces} decimal places allowed`;
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;
    if (name === 'remarks') {
      if (value.length <= VALIDATION_RULES.REMARKS.maxLength) validatedValue = value;
      else return;
    }
    setFormData(prev => ({ ...prev, [name]: validatedValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    if (name === 'customerName') {
      setFormData(prev => ({ ...prev, projectName: '', milestoneStartDate: '', milestoneEndDate: '', startDate: '', endDate: '' }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    let validatedValue = value;

    if (field === 'quantityRequired') {
      validatedValue = value.replace(/[^\d]/g, '');
      validatedValue = validatedValue.replace(/^0+/, '') || '0';
      updatedItems[index][field] = validatedValue;
    } else if (field === 'partName') {
      updatedItems[index][field] = value;
    } else if (field === 'purpose') {
      if (value.length <= VALIDATION_RULES.PURPOSE.maxLength) updatedItems[index][field] = value;
      else return;
    } else if (field === 'estimatedCost') {
      validatedValue = value.replace(/[^\d.]/g, '');
      const parts = validatedValue.split('.');
      if (parts.length > 2) validatedValue = parts[0] + '.' + parts.slice(1).join('');
      if (parts[1] && parts[1].length > 2) validatedValue = parts[0] + '.' + parts[1].slice(0, 2);
      updatedItems[index][field] = validatedValue;
    } else {
      updatedItems[index][field] = value;
    }

    setFormData(prev => ({ ...prev, items: updatedItems }));

    if (errors.items && errors.items[index] && errors.items[index][field]) {
      const updatedErrors = { ...errors };
      delete updatedErrors.items[index][field];
      if (Object.keys(updatedErrors.items[index] || {}).length === 0) delete updatedErrors.items[index];
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

  // UPDATED: delete behavior now always shows a delete button.
  // - If multiple rows: remove the row and reindex.
  // - If single row: reset fields of that row (keeps the empty row visible).
  const removeItem = (index) => {
    const currentItems = [...formData.items];
    if (currentItems.length > 1) {
      currentItems.splice(index, 1);
      currentItems.forEach((item, idx) => { item.sNo = idx + 1; });
      setFormData(prev => ({ ...prev, items: currentItems }));

      if (errors.items && errors.items[index]) {
        const updatedErrors = { ...errors };
        updatedErrors.items.splice(index, 1);
        setErrors(updatedErrors);
      }
    } else {
      // Reset the single row to defaults instead of removing it
      const resetRow = {
        sNo: 1,
        scopeOfWork: '',
        partName: '',
        quantityRequired: '',
        purpose: '',
        unitType: '',
        estimatedCost: ''
      };
      setFormData(prev => ({ ...prev, items: [resetRow] }));

      // Clear any item errors
      if (errors.items) {
        const updatedErrors = { ...errors };
        delete updatedErrors.items;
        setErrors(updatedErrors);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';

    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    else if (new Date(formData.startDate) > new Date(formData.endDate)) newErrors.startDate = 'Start date must be before end date';

    if (!formData.endDate) newErrors.endDate = 'End date is required';

    const remarksError = validateRemarks(formData.remarks);
    if (remarksError) newErrors.remarks = remarksError;

    const itemErrors = [];
    let hasValidItems = false;

    formData.items.forEach((item, index) => {
      const itemError = {};
      if (!item.scopeOfWork) itemError.scopeOfWork = 'Scope of work is required';
      if (!item.partName) itemError.partName = 'Item name is required';
      const quantityError = validateQuantityRequired(item.quantityRequired);
      if (quantityError) itemError.quantityRequired = quantityError;
      const purposeError = validatePurpose(item.purpose);
      if (purposeError) itemError.purpose = purposeError;
      const costError = validateEstimatedCost(item.estimatedCost);
      if (costError) itemError.estimatedCost = costError;

      if (Object.keys(itemError).length > 0) itemErrors[index] = itemError;
      else hasValidItems = true;
    });

    if (itemErrors.length > 0) newErrors.items = itemErrors;
    if (!hasValidItems) {
      newErrors.items = newErrors.items || {};
      newErrors.items.general = 'At least one valid item is required';
    }

    setErrors(newErrors);
    setShowValidation(true);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotalEstimatedCost = () =>
    formData.items.reduce((total, item) => total + (parseFloat(item.estimatedCost) || 0), 0).toFixed(2);

  const calculateTotalQuantity = () =>
    formData.items.reduce((total, item) => total + (parseInt(item.quantityRequired) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showError('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
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
        await purchaseRequestsAPI.update(purchaseRequest._id, submitData);
        showSuccess('Purchase request updated successfully');
      } else {
        await purchaseRequestsAPI.create(submitData);
        showSuccess('Purchase request created successfully');
      }

      onSubmit();
    } catch (error) {
      console.error('Error submitting purchase request:', error);
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          if (err.path) {
            const field = err.path;
            if (field.includes('items')) {
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
      } else {
        showError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

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
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900">
            {purchaseRequest ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput
            label="Customer name"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            type="select"
            options={[{ value: '', label: 'Select Customer' }, ...inhouseCustomers.map(c => ({ value: c.customerName, label: c.customerName }))]}
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
            options={[{ value: '', label: 'Select Project' }, ...filteredProjects.map(p => ({ value: p.projectName, label: p.projectName }))]}
            error={showValidation && errors.projectName}
            required
            size="medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <FloatingInput label="Project Start Date" name="milestoneStartDate" value={formData.milestoneStartDate} onChange={() => { }} type="date" readOnly size="small" className="bg-gray-50 cursor-not-allowed" />
          <FloatingInput label="Project End Date" name="milestoneEndDate" value={formData.milestoneEndDate} onChange={() => { }} type="date" readOnly size="small" className="bg-gray-50 cursor-not-allowed" />
          <FloatingInput label="Production Start Date" name="startDate" value={formData.startDate} onChange={handleChange} type="date" error={showValidation && errors.startDate} required size="small" />
          <FloatingInput label="Production End Date" name="endDate" value={formData.endDate} onChange={handleChange} type="date" error={showValidation && errors.endDate} required size="small" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Add parts required for this request</div>
          <div className="flex items-center space-x-2">
            <button type="button" onClick={addItem} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <PlusCircleIcon className="h-4 w-4 mr-2" /> Add Row
            </button>

          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
              <div className="col-span-1 text-sm font-medium text-gray-700">s.no</div>
              <div className="col-span-2 text-sm font-medium text-gray-700">Scope of Work*</div>
              <div className="col-span-3 text-sm font-medium text-gray-700">Item name*</div>
              <div className="col-span-1 text-sm font-medium text-gray-700">Qty*</div>
              <div className="col-span-3 text-sm font-medium text-gray-700">Purpose*</div>
              <div className="col-span-1 text-sm font-medium text-gray-700 text-right">Action</div>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {formData.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">No items added. Click "Add Row" to add items.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 px-4 py-4 items-start">
                    <div className="col-span-1 flex items-center">
                      <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100">
                        <span className="text-sm font-medium text-gray-900">{item.sNo}</span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <FloatingInput
                        value={item.scopeOfWork}
                        onChange={(e) => handleItemChange(index, 'scopeOfWork', e.target.value)}
                        type="select"
                        options={scopeOptions}
                        error={showValidation && errors.items?.[index]?.scopeOfWork}
                        size="small"
                        hideLabel
                        placeholder="Select Scope"
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-3">
                      <FloatingInput
                        value={item.partName}
                        onChange={(e) => handleItemChange(index, 'partName', e.target.value)}
                        type="text"
                        error={showValidation && errors.items?.[index]?.partName}
                        size="small"
                        hideLabel
                        placeholder="Enter Item Name"
                        className="w-full"
                      />
                    </div>

                    <div className="col-span-1">
                      <FloatingInput
                        value={item.quantityRequired}
                        onChange={(e) => handleItemChange(index, 'quantityRequired', e.target.value)}
                        type="text"
                        inputMode="numeric"
                        error={showValidation && errors.items?.[index]?.quantityRequired}
                        size="small"
                        hideLabel
                        className="w-full"
                        placeholder="0"
                      />
                    </div>


                    <div className="col-span-3">
                      <FloatingInput
                        value={item.purpose}
                        onChange={(e) => handleItemChange(index, 'purpose', e.target.value)}
                        type="text"
                        error={showValidation && errors.items?.[index]?.purpose}
                        size="small"
                        hideLabel
                        maxLength={VALIDATION_RULES.PURPOSE.maxLength}
                        className="w-full"
                        placeholder="Purpose / usage"
                      />
                    </div>



                    {/* Action: Delete always visible */}
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-red-600 hover:bg-red-50"
                        title={formData.items.length > 1 ? 'Delete Row' : 'Clear Row'}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            maxLength={VALIDATION_RULES.REMARKS.maxLength}
          />
          {formData.remarks && (
            <div className="absolute right-2 top-2 text-xs text-gray-400">
              {formData.remarks.length}/{VALIDATION_RULES.REMARKS.maxLength}
            </div>
          )}
        </div>

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

        {showValidation && errors.items?.general && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-sm text-red-600">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              <span>{errors.items.general}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading || isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
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

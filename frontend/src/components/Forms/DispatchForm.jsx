import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';

const DispatchForm = ({
  dispatchData = {},
  onSubmit,
  onCancel,
  showNotification,
  showError,
  parts = [],
  customers = [],
  workCategories = [],
  isEditing = false,
  dispatchIndex = null
}) => {
  const initialData = dispatchData || {};
  const [formData, setFormData] = useState({
    date: initialData.date || '',
    dispatchCategory: initialData.dispatchCategory || 'dispatch',
    workCategory: initialData.workCategory || '',
    partName: initialData.partName || '',
    customerName: initialData.customerName || '',
    invoiceNo: initialData.invoiceNo || '',
    invoiceDate: initialData.invoiceDate || '',
    invoiceValueWithoutGST: initialData.invoiceValueWithoutGST || '',
    gstValue: initialData.gstValue || '',
    quantity: initialData.quantity || '',
    unit: initialData.unit || '',
    upload: initialData.upload || '',
    reasonForRejection: initialData.reasonForRejection || '',
  });

  // Auto-calculate GST when invoice value changes
  useEffect(() => {
    if (formData.invoiceValueWithoutGST) {
      const invoiceValue = parseFloat(formData.invoiceValueWithoutGST) || 0;
      const gstValue = invoiceValue * 0.18;
      setFormData(prev => ({
        ...prev,
        gstValue: gstValue.toFixed(2)
      }));
    }
  }, [formData.invoiceValueWithoutGST]);

  // Auto-fill unit, price, and work category when part is selected
  useEffect(() => {
    if (formData.partName) {
      const selectedPart = parts.find(p => p.partName === formData.partName);
      if (selectedPart) {
        const invoiceValue = selectedPart.partPrice || 0;
        const gstValue = invoiceValue * 0.18;
        setFormData(prev => ({
          ...prev,
          workCategory: selectedPart.scopeOfWork || '',
          invoiceValueWithoutGST: invoiceValue,
          gstValue: gstValue.toFixed(2),
          unit: selectedPart.unitType || ''
        }));
      }
    }
  }, [formData.partName, parts]);

  // Clear part name when work category changes
  useEffect(() => {
    if (formData.workCategory && formData.partName) {
      const selectedPart = parts.find(p => p.partName === formData.partName);
      if (selectedPart && selectedPart.scopeOfWork !== formData.workCategory) {
        setFormData(prev => ({
          ...prev,
          partName: ''
        }));
      }
    }
  }, [formData.workCategory]);

  // Clear reason for rejection when dispatch category changes to dispatch
  useEffect(() => {
    if (formData.dispatchCategory === 'dispatch' && formData.reasonForRejection) {
      setFormData(prev => ({
        ...prev,
        reasonForRejection: ''
      }));
    }
  }, [formData.dispatchCategory, formData.reasonForRejection]);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [name]: reader.result
        }));
        showNotification?.(`File "${file.name}" uploaded successfully`);
      };
      
      reader.onerror = () => {
        showError?.('Failed to read file');
      };
      
      reader.readAsDataURL(file);
      return;
    }
    
    // Validate text fields (max 30 characters)
    if (['invoiceNo', 'reasonForRejection', 'workCategory'].includes(name) && value.length > 30) {
      showError?.('Maximum 30 characters allowed');
      return;
    }
    
    // Validate quantity (max 4 digits)
    if (name === 'quantity') {
      const numericValue = value.replace(/[^0-9]/g, '');
      if (numericValue.length > 4) {
        showError?.('Maximum 4 digits allowed for quantity');
        return;
      }
      const num = parseInt(numericValue, 10);
      if (num > 9999) {
        showError?.('Quantity cannot exceed 9999');
        return;
      }
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.partName || !formData.quantity) {
      showError?.('Please fill all required fields');
      return;
    }

    const dispatch = {
      ...formData,
      totalValue: ((parseFloat(formData.invoiceValueWithoutGST) || 0) + 
                  (parseFloat(formData.gstValue) || 0)) * 
                  (parseFloat(formData.quantity) || 1)
    };
    
    try {
      if (isEditing && dispatchData?._id) {
        // Update existing dispatch
        await onSubmit(dispatch, dispatchData._id);
      } else {
        // Create new dispatch
        await onSubmit(dispatch);
      }
    } catch (error) {
      console.error('Error submitting dispatch:', error);
      showError?.('Failed to save dispatch');
    }
  };

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Edit Dispatch' : 'Add New Dispatch'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Date "
          name="date"
          value={formData.date}
          onChange={handleInputChange}
          type="date"
          required
        />
        
        <FloatingInput
          label="Dispatch Category"
          name="dispatchCategory"
          value={formData.dispatchCategory}
          onChange={handleInputChange}
          type="select"
          options={[
            { value: 'dispatch', label: 'Dispatch' },
            { value: 'return', label: 'Return' },
            { value: 'reject', label: 'Reject' }
          ]}
        />
        
        <FloatingInput
          label="Work Category"
          name="workCategory"
          value={formData.workCategory}
          onChange={handleInputChange}
          type="select"
          options={workCategories.map(cat => ({ 
            value: cat, 
            label: cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          }))}
        />
        
        <FloatingInput
          label="Part Name "
          name="partName"
          value={formData.partName}
          onChange={handleInputChange}
          type="select"
          options={parts
            .filter(p => !formData.workCategory || p.scopeOfWork === formData.workCategory)
            .map(p => ({ value: p.partName, label: p.partName }))}
          required
        />
        
        <FloatingInput
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleInputChange}
          type="select"
          options={customers.map(c => ({ value: c.customerName, label: c.customerName }))}
        />

       
        <FloatingInput
          label="Quantity "
          name="quantity"
          value={formData.quantity}
          onChange={handleInputChange}
          type="number"
          min="0"
          max="9999"
          step="1"
          required
        />
        
        <FloatingInput
          label="Unit"
          name="unit"
          value={formData.unit}
          onChange={handleInputChange}
          disabled
        />
        
        <FloatingInput
          label="Upload Document"
          name="upload"
          value={formData.upload}
          onChange={handleInputChange}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
        />
        
        {(formData.dispatchCategory === 'return' || formData.dispatchCategory === 'reject') && (
          <div className="md:col-span-2">
            <FloatingInput
              label="Reason for Rejection/Return"
              name="reasonForRejection"
              value={formData.reasonForRejection}
              onChange={handleInputChange}
              type="textarea"
              rows={3}
              maxLength={30}
            />
          </div>
        )}
      </div>
      
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          {isEditing ? 'Update Dispatch' : 'Add Dispatch'}
        </button>
      </div>
    </form>
  );
};

export default DispatchForm;
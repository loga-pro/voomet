import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { FaEye, FaTrash, FaEdit } from 'react-icons/fa';

const ReceiptForm = ({
  receiptData,
  onSubmit,
  onCancel,
  showNotification,
  showError,
  parts = [],
  vendors = [],
  workCategories = [],
  isEditing = false,
  receiptIndex = null
}) => {
  const initialData = receiptData || {};
  const [formData, setFormData] = useState({
    date: initialData.date || '',
    receiptCategory: initialData.receiptCategory || 'buy',
    workCategory: initialData.workCategory || '',
    partName: initialData.partName || '',
    vendorName: initialData.vendorName || '',
    invoiceNo: initialData.invoiceNo || '',
    invoiceDate: initialData.invoiceDate || '',
    invoiceValueWithoutGST: initialData.invoiceValueWithoutGST || '',
    gstValue: initialData.gstValue || '',
    quantity: initialData.quantity || '',
    unit: initialData.unit || '',
    upload: initialData.upload || '',
    reasonForReturn: initialData.reasonForReturn || '',
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
    if (['invoiceNo', 'reasonForReturn', 'workCategory'].includes(name) && value.length > 30) {
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

    const receipt = {
      ...formData,
      totalValue: ((parseFloat(formData.invoiceValueWithoutGST) || 0) + 
                  (parseFloat(formData.gstValue) || 0)) * 
                  (parseFloat(formData.quantity) || 1)
    };
    
    try {
      if (isEditing && receiptData?._id) {
        // Update existing receipt
        await onSubmit(receipt, receiptData._id);
      } else {
        // Create new receipt
        await onSubmit(receipt);
      }
    } catch (error) {
      console.error('Error submitting receipt:', error);
      showError?.('Failed to save receipt');
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
        {isEditing ? 'Edit Receipt' : 'Add New Receipt'}
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
          label="Receipt Category"
          name="receiptCategory"
          value={formData.receiptCategory}
          onChange={handleInputChange}
          type="select"
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'return', label: 'Return' }
          ]}
        />
        
        <FloatingInput
          label="Work Category"
          name="workCategory"
          value={formData.workCategory}
          onChange={handleInputChange}
          type="select"
          options={workCategories.map(cat => ({ value: cat, label: cat }))}
        />
        
        <FloatingInput
          label="Part Name "
          name="partName"
          value={formData.partName}
          onChange={handleInputChange}
          type="select"
          options={parts.map(p => ({ value: p.partName, label: p.partName }))}
          required
        />
        
        <FloatingInput
          label="Vendor Name"
          name="vendorName"
          value={formData.vendorName}
          onChange={handleInputChange}
          type="select"
          options={vendors.map(v => ({ value: v.vendorName, label: v.vendorName }))}
        />
        
        {formData.receiptCategory === 'buy' && (
          <>
            <FloatingInput
              label="Invoice No"
              name="invoiceNo"
              value={formData.invoiceNo}
              onChange={handleInputChange}
              maxLength={30}
            />
            
            <FloatingInput
              label="Invoice Date"
              name="invoiceDate"
              value={formatDateForInput(formData.invoiceDate)}
              onChange={handleInputChange}
              type="date"
            />
            
            <FloatingInput
              label="Invoice Value without GST (₹)"
              name="invoiceValueWithoutGST"
              value={formData.invoiceValueWithoutGST}
              onChange={handleInputChange}
              type="number"
              min="0"
              step="0.01"
            />
             <FloatingInput
          label="GST Value (₹)"
          name="gstValue"
          value={formData.gstValue}
          onChange={handleInputChange}
          type="number"
          min="0"
          step="0.01"
          disabled
        />
        
          </>
           

        )}
        
       
        <FloatingInput
          label="Quantity"
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
        
        {formData.receiptCategory === 'return' && (
          <div className="md:col-span-2">
            <FloatingInput
              label="Reason for Return"
              name="reasonForReturn"
              value={formData.reasonForReturn}
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
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {isEditing ? 'Update Receipt' : 'Add Receipt'}
        </button>
      </div>
    </form>
  );
};

export default ReceiptForm;
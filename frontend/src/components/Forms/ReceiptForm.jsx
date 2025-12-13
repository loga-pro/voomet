import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { FaEye, FaTrash, FaEdit } from 'react-icons/fa';

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
    date: formatDateForInput(initialData.date),
    receiptCategory: initialData.receiptCategory || 'buy',
    workCategory: initialData.workCategory || '',
    partName: initialData.partName || '',
    category: initialData.category || 'In house',
    vendorNames: initialData.vendorNames || (initialData.vendorName ? [initialData.vendorName] : []),
    invoiceNo: initialData.invoiceNo || '',
    invoiceDate: formatDateForInput(initialData.invoiceDate),
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

  const handleVendorChange = (vendorName) => {
    setFormData(prev => {
      const currentVendors = prev.vendorNames || [];
      const isSelected = currentVendors.includes(vendorName);
      
      let newVendors;
      if (isSelected) {
        newVendors = currentVendors.filter(v => v !== vendorName);
      } else {
        newVendors = [...currentVendors, vendorName];
      }
      
      return {
        ...prev,
        vendorNames: newVendors
      };
    });
  };

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
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          type="select"
          options={[
            { value: 'In house', label: 'In house' },
            { value: 'Bought-out', label: 'Bought-out' }
          ]}
        />

        <div className="relative">
          <label className="text-xs text-gray-500 absolute -top-2 left-2 bg-white px-1 z-10">
            Vendor Names
          </label>
          <details className="w-full group">
            <summary className="w-full h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between list-none">
               <span className="truncate block text-sm text-gray-900">
                 {formData.vendorNames && formData.vendorNames.length > 0
                    ? formData.vendorNames.join(', ')
                    : <span className="text-gray-400">Select vendors...</span>
                  }
               </span>
               <span className="text-gray-400 text-xs">▼</span>
            </summary>
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
               {vendors && vendors.length > 0 ? (
                 vendors.map((vendor) => (
                   <label key={vendor._id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.vendorNames?.includes(vendor.vendorName)}
                        onChange={() => handleVendorChange(vendor.vendorName)}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900">{vendor.vendorName}</span>
                   </label>
                 ))
               ) : (
                 <div className="px-3 py-2 text-sm text-gray-500">No vendors available</div>
               )}
            </div>
          </details>
        </div>
        
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
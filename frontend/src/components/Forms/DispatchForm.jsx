import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { FaTrash, FaPlus } from 'react-icons/fa';

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
  
  // State for individual line items
  const [lineItems, setLineItems] = useState(
    initialData.lineItems?.length > 0 
      ? initialData.lineItems 
      : [{
          workCategory: '',
          partName: '',
          unit: '',
          quantity: '',
          priceWithoutGST: '',
          gstPercentage: 18,
          gstAmount: '',
          total: ''
        }]
  );
  
  const [formData, setFormData] = useState({
    date: initialData.date || '',
    dispatchCategory: initialData.dispatchCategory || 'dispatch',
    customerName: initialData.customerName || '',
    dispatchNo: initialData.dispatchNo || initialData.invoiceNo || '',
    dispatchDate: initialData.dispatchDate || initialData.invoiceDate || '',
    upload: initialData.upload || '',
    reasonForRejection: initialData.reasonForRejection || '',
  });

  // Calculate totals for line items
  useEffect(() => {
    const updatedItems = lineItems.map(item => {
      const price = parseFloat(item.priceWithoutGST) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const gstPercentage = parseFloat(item.gstPercentage) || 18;
      const gstAmount = (price * (gstPercentage / 100)) * quantity;
      const total = (price * quantity) + gstAmount;
      
      return {
        ...item,
        gstAmount: gstAmount.toFixed(2),
        total: total.toFixed(2)
      };
    });
    
    // Only update if there are changes to avoid infinite loop
    if (JSON.stringify(updatedItems) !== JSON.stringify(lineItems)) {
      setLineItems(updatedItems);
    }
  }, [lineItems.map(item => `${item.priceWithoutGST}-${item.quantity}-${item.gstPercentage}`).join('|')]);

  // Clear reason for rejection when dispatch category changes to dispatch
  useEffect(() => {
    if (formData.dispatchCategory === 'dispatch' && formData.reasonForRejection) {
      setFormData(prev => ({
        ...prev,
        reasonForRejection: ''
      }));
    }
  }, [formData.dispatchCategory, formData.reasonForRejection]);

  // Auto-fill unit, price, and work category when part is selected for each line item
  const handlePartChange = (index, partName) => {
    const selectedPart = parts.find(p => p.partName === partName);
    if (selectedPart) {
      const newLineItems = [...lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        partName,
        workCategory: selectedPart.scopeOfWork || '',
        unit: selectedPart.unitType || '',
        priceWithoutGST: selectedPart.partPrice || ''
      };
      setLineItems(newLineItems);
    }
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
    if (['dispatchNo', 'reasonForRejection'].includes(name) && value.length > 30) {
      showError?.('Maximum 30 characters allowed');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...lineItems];
    
    // Validate quantity (max 4 digits)
    if (field === 'quantity') {
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
      newLineItems[index][field] = numericValue;
    } 
    // Validate price (max 10 digits with 2 decimals)
    else if (field === 'priceWithoutGST') {
      const decimalValue = value.replace(/[^0-9.]/g, '');
      const parts = decimalValue.split('.');
      if (parts[0].length > 10) {
        showError?.('Maximum 10 digits before decimal');
        return;
      }
      if (parts[1] && parts[1].length > 2) {
        showError?.('Maximum 2 decimal places');
        return;
      }
      newLineItems[index][field] = decimalValue;
    }
    // Validate GST percentage (0-100)
    else if (field === 'gstPercentage') {
      const numValue = parseFloat(value) || 0;
      if (numValue < 0 || numValue > 100) {
        showError?.('GST percentage must be between 0 and 100');
        return;
      }
      newLineItems[index][field] = value;
    }
    else {
      newLineItems[index][field] = value;
    }
    
    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        workCategory: '',
        partName: '',
        unit: '',
        quantity: '',
        priceWithoutGST: '',
        gstPercentage: 18,
        gstAmount: '',
        total: ''
      }
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newLineItems);
    } else {
      showError?.('At least one line item is required');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.date || !formData.dispatchNo || formData.dispatchNo.trim() === '') {
      showError?.('Please fill all required fields');
      return;
    }

    // Validate all line items
    const hasEmptyFields = lineItems.some(item => 
      !item.workCategory || !item.partName || !item.quantity || !item.priceWithoutGST
    );
    
    if (hasEmptyFields) {
      showError?.('Please fill all required fields in line items');
      return;
    }

    const dispatch = {
      ...formData,
      lineItems,
      totalValue: lineItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0)
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
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleInputChange}
          type="select"
          options={customers.map(c => ({ value: c.customerName, label: c.customerName }))}
        />
        
        <FloatingInput
          label="Dispatch No "
          name="dispatchNo"
          value={formData.dispatchNo}
          onChange={handleInputChange}
          maxLength={30}
          required
        />
        
        <FloatingInput
          label="Dispatch Date"
          name="dispatchDate"
          value={formatDateForInput(formData.dispatchDate)}
          onChange={handleInputChange}
          type="date"
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

      {/* Line Items Section - Only show when dispatch number is entered */}
      {formData.dispatchNo && formData.dispatchNo.trim() !== '' && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-900">Dispatch Items</h4>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700"
            >
              <FaPlus /> Add Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Work Category</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Price without GST (₹)</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">GST Amount (₹)</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Total (₹)</th>
                  <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border-b">
                      <select
                        value={item.workCategory}
                        onChange={(e) => handleLineItemChange(index, 'workCategory', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Work Category</option>
                        {workCategories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 border-b">
                      <select
                        value={item.partName}
                        onChange={(e) => handlePartChange(index, e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Part</option>
                        {parts
                          .filter(p => !item.workCategory || p.scopeOfWork === item.workCategory)
                          .map(p => (
                            <option key={p._id} value={p.partName}>
                              {p.partName}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        className="w-full text-sm bg-gray-50 border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                        min="0"
                        max="9999"
                        step="1"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="number"
                        value={item.priceWithoutGST}
                        onChange={(e) => handleLineItemChange(index, 'priceWithoutGST', e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="number"
                        value={item.gstPercentage}
                        onChange={(e) => handleLineItemChange(index, 'gstPercentage', e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="text"
                        value={item.gstAmount}
                        readOnly
                        className="w-full text-sm bg-gray-50 border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <input
                        type="text"
                        value={item.total}
                        readOnly
                        className="w-full text-sm bg-gray-50 border border-gray-300 rounded px-2 py-1 font-medium"
                      />
                    </td>
                    <td className="py-2 px-3 border-b">
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        disabled={lineItems.length <= 1}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan="7" className="py-2 px-3 text-right font-medium">Grand Total:</td>
                  <td className="py-2 px-3 font-bold text-orange-600">
                    ₹{lineItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      
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
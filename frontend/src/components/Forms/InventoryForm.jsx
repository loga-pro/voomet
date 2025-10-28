import React, { useState, useEffect, useRef, useCallback } from 'react';
import { partsAPI, inventoryAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const InventoryForm = ({ inventory, onSubmit, onCancel, showNotification, showError }) => {
  const [formData, setFormData] = useState({
    scopeOfWork: '',
    partName: '',
    partPrice: '',
    dateOfReceipt: '',
    cumulativeQuantityAtVoomet: 0,
    cumulativePriceValue: 0,
    receipts: [{
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      cumulativeQuantity: 0,
      cumulativePrice: 0 // Hidden but calculated
    }],
    dispatches: [{
      date: '',
      quantity: '',
      cumulativeQuantity: 0,
      cumulativePrice: 0 // Hidden but calculated
    }],
    returns: [{
      date: '',
      quantity: '',
      cumulativeQuantity: 0,
      cumulativePrice: 0 // Hidden but calculated
    }],
    remarks: ''
  });
  
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    if (inventory) {
      // Handle existing inventory data conversion
      const formattedData = {
        scopeOfWork: inventory.scopeOfWork || '',
        partName: inventory.partName || '',
        partPrice: inventory.partPrice || '',
        dateOfReceipt: inventory.dateOfReceipt ? new Date(inventory.dateOfReceipt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        cumulativeQuantityAtVoomet: inventory.cumulativeQuantityAtVoomet || 0,
        cumulativePriceValue: inventory.cumulativePriceValue || 0,
        receipts: inventory.receipts && inventory.receipts.length > 0 ? 
          inventory.receipts.map(receipt => ({
            date: receipt.date ? new Date(receipt.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            quantity: receipt.quantity || '',
            unit: receipt.unit || 'nos',
            total: receipt.total || (receipt.quantity * inventory.partPrice) || 0,
            cumulativeQuantity: receipt.cumulativeQuantity || 0,
            cumulativePrice: receipt.cumulativePrice || 0
          })) : [],
        dispatches: inventory.dispatches && inventory.dispatches.length > 0 ?
          inventory.dispatches.map(dispatch => ({
            date: dispatch.date ? new Date(dispatch.date).toISOString().split('T')[0] : '',
            quantity: dispatch.quantity || '',
            unit: dispatch.unit || 'nos',
            cumulativeQuantity: dispatch.cumulativeQuantity || 0,
            cumulativePrice: dispatch.cumulativePrice || 0
          })) : [],
        returns: inventory.returns && inventory.returns.length > 0 ?
          inventory.returns.map(returnItem => ({
            date: returnItem.date ? new Date(returnItem.date).toISOString().split('T')[0] : '',
            quantity: returnItem.quantity || '',
            unit: returnItem.unit || 'nos',
            cumulativeQuantity: returnItem.cumulativeQuantity || 0,
            cumulativePrice: returnItem.cumulativePrice || 0
          })) : [],
        remarks: inventory.remarks || ''
      };
      setFormData(formattedData);
      
      // Force a calculation of cumulative values after setting form data
      setTimeout(() => {
        const partPrice = parseFloat(formattedData.partPrice) || 0;
        
        // Calculate overall cumulative values
        const totalReceipts = formattedData.receipts.reduce((sum, receipt) => 
          sum + (parseFloat(receipt.quantity) || 0), 0);
        
        const totalDispatches = formattedData.dispatches.reduce((sum, dispatch) => 
          sum + (parseFloat(dispatch.quantity) || 0), 0);
        
        const totalReturns = formattedData.returns.reduce((sum, returnItem) => 
          sum + (parseFloat(returnItem.quantity) || 0), 0);
        
        const cumulativeQuantity = totalReceipts - totalDispatches + totalReturns;
        const cumulativePrice = cumulativeQuantity * partPrice;
        
        setFormData(prev => ({
          ...prev,
          cumulativeQuantityAtVoomet: cumulativeQuantity,
          cumulativePriceValue: cumulativePrice
        }));
      }, 0);
    }
  }, [inventory]);

  useEffect(() => {
    if (formData.scopeOfWork) {
      const filtered = parts.filter(part => part.scopeOfWork === formData.scopeOfWork);
      setFilteredParts(filtered);
    } else {
      setFilteredParts(parts);
    }
  }, [formData.scopeOfWork, parts]);

  // Use a ref to track if we're already calculating to prevent infinite loops
  const isCalculating = useRef(false);
  
  // Use effect to recalculate cumulative values when relevant data changes
  useEffect(() => {
    // Only calculate if we have a part price and we're not already calculating
    if (formData.partPrice && !isCalculating.current) {
      isCalculating.current = true;
      
      // Use setTimeout to break the render cycle
      setTimeout(() => {
        setFormData(prev => {
          const partPrice = parseFloat(prev.partPrice) || 0;
          
          // Calculate cumulative values for receipts
          let cumulativeReceiptQuantity = 0;
          const updatedReceipts = prev.receipts.map(receipt => {
            const quantity = parseFloat(receipt.quantity) || 0;
            if (receipt.date && quantity) {
              cumulativeReceiptQuantity += quantity;
            }
            return {
              ...receipt,
              total: quantity * partPrice,
              unit: receipt.unit || 'nos',
              cumulativeQuantity: cumulativeReceiptQuantity,
              cumulativePrice: cumulativeReceiptQuantity * partPrice
            };
          });
          
          // Calculate cumulative values for dispatches
          let cumulativeDispatchQuantity = 0;
          const updatedDispatches = prev.dispatches.map(dispatch => {
            const quantity = parseFloat(dispatch.quantity) || 0;
            if (dispatch.date && quantity) {
              cumulativeDispatchQuantity += quantity;
            }
            return {
              ...dispatch,
              unit: dispatch.unit || 'nos',
              cumulativeQuantity: cumulativeDispatchQuantity,
              cumulativePrice: cumulativeDispatchQuantity * partPrice
            };
          });
          
          // Calculate cumulative values for returns
          let cumulativeReturnQuantity = 0;
          const updatedReturns = prev.returns.map(returnItem => {
            const quantity = parseFloat(returnItem.quantity) || 0;
            if (returnItem.date && quantity) {
              cumulativeReturnQuantity += quantity;
            }
            return {
              ...returnItem,
              unit: returnItem.unit || 'nos',
              cumulativeQuantity: cumulativeReturnQuantity,
              cumulativePrice: cumulativeReturnQuantity * partPrice
            };
          });
          
          // Calculate overall cumulative values
          const cumulativeQuantity = cumulativeReceiptQuantity - cumulativeDispatchQuantity + cumulativeReturnQuantity;
          const cumulativePrice = cumulativeQuantity * partPrice;
          
          return {
            ...prev,
            receipts: updatedReceipts,
            dispatches: updatedDispatches,
            returns: updatedReturns,
            cumulativeQuantityAtVoomet: cumulativeQuantity,
            cumulativePriceValue: cumulativePrice
          };
        });
        
        isCalculating.current = false;
      }, 100); // Increased timeout to ensure proper state updates
    }
    
  }, [formData.partPrice, formData.receipts, formData.dispatches, formData.returns]); // Watch the actual arrays, not just lengths

  const fetchParts = useCallback(async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data);
      setFilteredParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      if (showError) {
        showError('Error fetching parts data');
      }
    }
  }, [showError]);

  const calculateCumulativeValues = () => {
    const partPrice = parseFloat(formData.partPrice) || 0;
    
    // Calculate cumulative values for receipts
    let cumulativeReceiptQuantity = 0;
    const updatedReceipts = formData.receipts.map(receipt => {
      if (receipt.date && receipt.quantity) {
        const quantity = parseFloat(receipt.quantity) || 0;
        cumulativeReceiptQuantity += quantity;
        const total = quantity * partPrice;
        return {
          ...receipt,
          total: total,
          unit: receipt.unit || 'nos',
          cumulativeQuantity: cumulativeReceiptQuantity,
          cumulativePrice: cumulativeReceiptQuantity * partPrice
        };
      }
      return {
        ...receipt,
        unit: receipt.unit || 'nos',
        total: receipt.total || 0,
        cumulativeQuantity: cumulativeReceiptQuantity,
        cumulativePrice: cumulativeReceiptQuantity * partPrice
      };
    });
    
    // Calculate cumulative values for dispatches
    let cumulativeDispatchQuantity = 0;
    const updatedDispatches = formData.dispatches.map(dispatch => {
      if (dispatch.date && dispatch.quantity) {
        const quantity = parseFloat(dispatch.quantity) || 0;
        cumulativeDispatchQuantity += quantity;
        return {
          ...dispatch,
          unit: dispatch.unit || 'nos',
          cumulativeQuantity: cumulativeDispatchQuantity,
          cumulativePrice: cumulativeDispatchQuantity * partPrice
        };
      }
      return {
        ...dispatch,
        unit: dispatch.unit || 'nos',
        cumulativeQuantity: cumulativeDispatchQuantity,
        cumulativePrice: cumulativeDispatchQuantity * partPrice
      };
    });
    
    // Calculate cumulative values for returns
    let cumulativeReturnQuantity = 0;
    const updatedReturns = formData.returns.map(returnItem => {
      if (returnItem.date && returnItem.quantity) {
        const quantity = parseFloat(returnItem.quantity) || 0;
        cumulativeReturnQuantity += quantity;
        return {
          ...returnItem,
          unit: returnItem.unit || 'nos',
          cumulativeQuantity: cumulativeReturnQuantity,
          cumulativePrice: cumulativeReturnQuantity * partPrice
        };
      }
      return {
        ...returnItem,
        unit: returnItem.unit || 'nos',
        cumulativeQuantity: cumulativeReturnQuantity,
        cumulativePrice: cumulativeReturnQuantity * partPrice
      };
    });
    
    // Calculate overall cumulative values
    const cumulativeQuantity = cumulativeReceiptQuantity - cumulativeDispatchQuantity + cumulativeReturnQuantity;
    const cumulativePrice = cumulativeQuantity * partPrice;
    
    // Update all values at once to prevent multiple re-renders
    setFormData(prev => ({
      ...prev,
      receipts: updatedReceipts,
      dispatches: updatedDispatches,
      returns: updatedReturns,
      cumulativeQuantityAtVoomet: cumulativeQuantity,
      cumulativePriceValue: cumulativePrice
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const parts = name.split('.');
      const parent = parts[0];
      const index = parseInt(parts[1]);
      const field = parts[2];
      
      if (['receipts', 'dispatches', 'returns'].includes(parent) && !isNaN(index)) {
        // Handle array field changes (receipts, dispatches, returns)
        setFormData(prev => {
          const newArray = [...prev[parent]];
          newArray[index] = {
            ...newArray[index],
            [field]: value
          };
          
          return {
            ...prev,
            [parent]: newArray
          };
        });
      } else {
        // Handle nested object changes
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [index]: value
          }
        }));
      }
    } else {
      // Handle simple field changes
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleScopeOfWorkChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      scopeOfWork: value,
      partName: '',
      partPrice: ''
    }));
  };

  const handlePartSelect = (e) => {
    const partName = e.target.value;
    const selectedPart = parts.find(part => part.partName === partName);
    if (selectedPart) {
      setFormData(prev => ({
        ...prev,
        partName: selectedPart.partName,
        partPrice: selectedPart.partPrice
      }));
    }
  };

  const addRow = (type) => {
    setFormData(prev => ({
      ...prev,
      [type]: [
        ...(prev[type] || []),
        {
          date: type === 'receipts' ? new Date().toISOString().split('T')[0] : '',
          quantity: '',
          unit: type === 'receipts' ? 'nos' : '',
          total: 0,
          cumulativeQuantity: 0,
          cumulativePrice: 0
        }
      ]
    }));
  };

  const removeRow = (type, index) => {
    setFormData(prev => {
      console.log(`Removing row: type=${type}, index=${index}, current length=${prev[type].length}`);
      const newArray = prev[type].filter((_, i) => i !== index);
      console.log(`New ${type} array length:`, newArray.length);
      return {
        ...prev,
        [type]: newArray
      };
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scopeOfWork) newErrors.scopeOfWork = 'Scope of work is required';
    if (!formData.partName) newErrors.partName = 'Part name is required';
    if (!formData.partPrice || formData.partPrice <= 0) newErrors.partPrice = 'Valid part price is required';
    if (!formData.dateOfReceipt) newErrors.dateOfReceipt = 'Date of receipt is required';
    
    // Validate receipts - at least one valid receipt is required for new items only
    const validReceipts = formData.receipts.filter(receipt => receipt.date && receipt.quantity && parseFloat(receipt.quantity) > 0);
    if (validReceipts.length === 0 && !inventory) {
      newErrors.receipts = 'At least one valid receipt is required';
    }
    
    // Validate individual transaction rows
    formData.receipts.forEach((receipt, index) => {
      if (receipt.date || receipt.quantity) {
        if (!receipt.date) newErrors[`receipts.${index}.date`] = 'Date is required';
        if (!receipt.quantity || parseFloat(receipt.quantity) <= 0) newErrors[`receipts.${index}.quantity`] = 'Valid quantity is required';
      }
    });
    
    formData.dispatches.forEach((dispatch, index) => {
      if (dispatch.date || dispatch.quantity) {
        if (!dispatch.date) newErrors[`dispatches.${index}.date`] = 'Date is required';
        if (!dispatch.quantity || parseFloat(dispatch.quantity) <= 0) newErrors[`dispatches.${index}.quantity`] = 'Valid quantity is required';
      }
    });
    
    formData.returns.forEach((returnItem, index) => {
      if (returnItem.date || returnItem.quantity) {
        if (!returnItem.date) newErrors[`returns.${index}.date`] = 'Date is required';
        if (!returnItem.quantity || parseFloat(returnItem.quantity) <= 0) newErrors[`returns.${index}.quantity`] = 'Valid quantity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Form data before cleaning:', formData);
      
      // Clean and validate data before submission
      const submitData = {
        ...formData,
        partPrice: parseFloat(formData.partPrice),
        dateOfReceipt: new Date(formData.dateOfReceipt),
        // Filter out empty receipts and ensure proper data types
        receipts: formData.receipts
          .filter(receipt => receipt.date && parseFloat(receipt.quantity) > 0)
          .map(receipt => ({
            ...receipt,
            date: new Date(receipt.date),
            quantity: parseFloat(receipt.quantity) || 0,
            unit: receipt.unit || 'nos',
            total: parseFloat(receipt.quantity) * parseFloat(formData.partPrice) || 0,
            cumulativeQuantity: parseFloat(receipt.cumulativeQuantity) || 0,
            cumulativePrice: parseFloat(receipt.cumulativePrice) || 0
          })),
        // Filter out empty dispatches and ensure proper data types
        dispatches: formData.dispatches
          .filter(dispatch => dispatch.date && parseFloat(dispatch.quantity) > 0)
          .map(dispatch => ({
            ...dispatch,
            date: dispatch.date ? new Date(dispatch.date) : null,
            quantity: parseFloat(dispatch.quantity) || 0,
          cumulativeQuantity: parseFloat(dispatch.cumulativeQuantity) || 0,
          cumulativePrice: parseFloat(dispatch.cumulativePrice) || 0
        })),
        returns: formData.returns
          .filter(returnItem => returnItem.date && parseFloat(returnItem.quantity) > 0)
          .map(returnItem => ({
            ...returnItem,
            date: returnItem.date ? new Date(returnItem.date) : null,
            quantity: parseFloat(returnItem.quantity) || 0,
            cumulativeQuantity: parseFloat(returnItem.cumulativeQuantity) || 0,
            cumulativePrice: parseFloat(returnItem.cumulativePrice) || 0
          }))
      };

      // Ensure we have at least one valid receipt for new items only
      if (submitData.receipts.length === 0 && !inventory) {
        showError('At least one valid receipt with date and quantity is required');
        setErrors({ receipts: 'At least one valid receipt is required' });
        setLoading(false);
        return;
      }

      // Ensure empty arrays are sent as empty arrays, not undefined
      submitData.receipts = submitData.receipts || [];
      submitData.dispatches = submitData.dispatches || [];
      submitData.returns = submitData.returns || [];

      // Ensure all required fields have valid values
      if (!submitData.partPrice || submitData.partPrice <= 0) {
        showError('Part price must be greater than zero');
        setLoading(false);
        return;
      }

      let response;
      console.log('Submitting data:', submitData);
      
      if (inventory) {
        response = await inventoryAPI.update(inventory._id, submitData);
      } else {
        response = await inventoryAPI.create(submitData);
      }
      
      console.log('API response:', response);
      
      // Verify we got a successful response with data
      if (!response || !response.data) {
        throw new Error('No response data received from server');
      }
      
      showNotification(inventory ? 'Inventory item updated successfully' : 'Inventory item added successfully');
      onSubmit();
    } catch (error) {
      console.error('Error saving inventory:', error);
      if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else if (error.message) {
        showError(error.message);
      } else {
        showError('An error occurred while saving inventory data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get unique scope of work options from parts
  const scopeOfWorkOptions = [...new Set(parts.map(part => part.scopeOfWork))]
    .filter(scope => scope)
    .map(scope => ({ value: scope, label: scope }));

  // Get part name options based on selected scope of work
  const partNameOptions = filteredParts.map(part => ({
    value: part.partName,
    label: part.partName
  }));

  const renderTable = (type, title) => {
    const tableTitles = {
      'receipts': 'Receipts',
      'dispatches': 'Dispatches to Site',
      'returns': 'Returns from Site'
    };
    
    return (
      <div className="flex-1 min-w-[350px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">{tableTitles[type]}</h3>
          <button
            type="button"
            onClick={() => addRow(type)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
            title="Add Row"
          >
            + Add
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData[type] && formData[type].length > 0 ? (
                formData[type].map((item, index) => (
                  <tr key={`${type}-${index}-${item.date || ''}-${item.quantity || ''}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        name={`${type}.${index}.date`}
                        value={item.date}
                        onChange={handleChange}
                        type="date"
                        required={type === 'receipts'}
                        className="text-xs w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {errors[`${type}.${index}.date`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`${type}.${index}.date`]}</p>
                      )}
                    </td>
                    
                    <td className="px-3 py-2">
                      <input
                        name={`${type}.${index}.quantity`}
                        value={item.quantity}
                        onChange={handleChange}
                        type="number"
                        step="0.01"
                        min="0"
                        required={type === 'receipts'}
                        className="text-xs w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {errors[`${type}.${index}.quantity`] && (
                        <p className="text-xs text-red-500 mt-1">{errors[`${type}.${index}.quantity`]}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        name={`${type}.${index}.cumulativeQuantity`}
                        value={item.cumulativeQuantity}
                        type="number"
                        readOnly={true}
                        className="text-xs w-full px-2 py-1 border border-gray-300 rounded bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(type, index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Remove Row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-3 py-8 text-center text-gray-500 text-sm">
                    No {type} records. Click "Add" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scope of Work - Read-only when editing, dropdown when creating */}
        {inventory ? (
          <FloatingInput
            label="Scope of Work"
            name="scopeOfWork"
            value={formData.scopeOfWork}
            readOnly={true}
            error={errors.scopeOfWork}
            required={true}
          />
        ) : (
          <FloatingInput
            label="Scope of Work"
            name="scopeOfWork"
            value={formData.scopeOfWork}
            onChange={handleScopeOfWorkChange}
            error={errors.scopeOfWork}
            type="select"
            required={true}
            options={scopeOfWorkOptions}
          />
        )}

        {/* Part Name - Read-only when editing, dropdown when creating */}
        {inventory ? (
          <FloatingInput
            label="Part Name"
            name="partName"
            value={formData.partName}
            readOnly={true}
            error={errors.partName}
            required={true}
          />
        ) : (
          <FloatingInput
            label="Part Name"
            name="partName"
            value={formData.partName}
            onChange={handlePartSelect}
            error={errors.partName}
            type="select"
            required={true}
            options={partNameOptions}
            disabled={!formData.scopeOfWork}
          />
        )}

        {/* Part Price */}
        <FloatingInput
          label="Part Price (₹)"
          name="partPrice"
          value={formData.partPrice}
          onChange={handleChange}
          error={errors.partPrice}
          type="number"
          step="0.01"
          min="0"
          required={true}
          readOnly={true}
        />

        {/* Date of Receipt */}
        <FloatingInput
          label="Date of Receipt"
          name="dateOfReceipt"
          value={formData.dateOfReceipt}
          onChange={handleChange}
          error={errors.dateOfReceipt}
          type="date"
          required={true}
        />

        {/* Cumulative Quantity at Voomet */}
        <FloatingInput
          label="Cumulative Quantity at Voomet"
          name="cumulativeQuantityAtVoomet"
          value={formData.cumulativeQuantityAtVoomet}
          type="number"
          readOnly={true}
        />

        {/* Cumulative Price Value */}
        <FloatingInput
          label="Cumulative Price Value (₹)"
          name="cumulativePriceValue"
          value={formData.cumulativePriceValue.toFixed(2)}
          type="number"
          readOnly={true}
        />
      </div>

      {/* Tables in a row */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Transactions</h3>
        {errors.receipts && (
          <p className="text-red-500 text-sm mb-3">{errors.receipts}</p>
        )}
        <div className="flex flex-col xl:flex-row gap-4">
          {renderTable('receipts')}
          {renderTable('dispatches')}
          {renderTable('returns')}
        </div>
      </div>

      {/* Remarks */}
      <FloatingInput
        label="Remarks"
        name="remarks"
        value={formData.remarks}
        onChange={handleChange}
        type="textarea"
        rows={2}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : inventory ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
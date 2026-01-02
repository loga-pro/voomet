import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { inventoryAPI, dispatchesAPI } from '../../services/api';

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
  const [lineItems, setLineItems] = useState(() => {
    // If editing and lineItems array exists, map the fields correctly
    if (initialData.lineItems?.length > 0) {
      return initialData.lineItems.map(item => ({
        workCategory: item.workCategory || '',
        partName: item.partName || '',
        unit: item.unit || '',
        quantity: item.quantity?.toString() || '',
        priceWithoutGST: (item.priceWithoutGST || item.invoiceValueWithoutGST)?.toString() || '',
        gstPercentage: item.gstPercentage || 18,
        gstAmount: (item.gstAmount || item.gstValue)?.toString() || '',
        total: (item.total || item.totalValue)?.toString() || '',
        availableStock: null,
        stockWarning: ''
      }));
    }
    // If editing a single dispatch (has individual fields), convert to lineItems format
    if (isEditing && initialData.workCategory && initialData.partName) {
      return [{
        workCategory: initialData.workCategory || '',
        partName: initialData.partName || '',
        unit: initialData.unit || '',
        quantity: initialData.quantity?.toString() || '',
        priceWithoutGST: initialData.invoiceValueWithoutGST?.toString() || '',
        gstPercentage: initialData.gstPercentage || 18,
        gstAmount: initialData.gstValue?.toString() || '',
        total: initialData.totalValue?.toString() || '',
        availableStock: null,
        stockWarning: ''
      }];
    }
    // Default empty line item for new dispatches
    return [{
      workCategory: '',
      partName: '',
      unit: '',
      quantity: '',
      priceWithoutGST: '',
      gstPercentage: 18,
      gstAmount: '',
      total: '',
      availableStock: null,
      stockWarning: ''
    }];
  });

  const [formData, setFormData] = useState({
    date: initialData.date || '',
    dispatchCategory: initialData.dispatchCategory || 'dispatch',
    deliveryChalan: initialData.deliveryChalan || '',
    vehicleNo: initialData.vehicleNo || '',
    ewayBill: initialData.ewayBill || '',
    poNo: initialData.poNo || '',
    contactNo: initialData.contactNo || '',
    customerName: initialData.customerName || '',
    dispatchNo: initialData.dispatchNo || initialData.invoiceNo || '',
    dispatchDate: initialData.dispatchDate || initialData.invoiceDate || '',
    upload: initialData.upload || '',
    reasonForRejection: initialData.reasonForRejection || '',
  });

  const [inventory, setInventory] = useState([]);
  const [allDispatches, setAllDispatches] = useState([]);


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

  // Fetch inventory and dispatch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryResponse, dispatchesResponse] = await Promise.all([
          inventoryAPI.getAll(),
          dispatchesAPI.getAll()
        ]);
        setInventory(inventoryResponse.data || []);
        setAllDispatches(dispatchesResponse.data?.data || dispatchesResponse.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Recalculate available stock when customer or dispatch category changes
  useEffect(() => {
    if (lineItems.length > 0 && inventory.length > 0) {
      const updatedItems = lineItems.map(item => {
        if (!item.partName || !item.workCategory) return item;

        let availableStock;
        if (formData.dispatchCategory === 'return') {
          availableStock = getReturnableQuantity(formData.customerName, item.partName, item.workCategory);
        } else {
          availableStock = getAvailableStock(item.partName, item.workCategory);
        }

        // Update warning if quantity exceeds new available stock
        let stockWarning = '';
        if (item.quantity && availableStock !== null && parseInt(item.quantity) > availableStock) {
          if (formData.dispatchCategory === 'return') {
            stockWarning = `⚠️ Only ${availableStock} units can be returned from this customer!`;
          } else {
            stockWarning = `⚠️ Only ${availableStock} units available in receipt!`;
          }
        }

        return {
          ...item,
          availableStock,
          stockWarning
        };
      });

      if (JSON.stringify(updatedItems) !== JSON.stringify(lineItems)) {
        setLineItems(updatedItems);
      }
    }
  }, [formData.customerName, formData.dispatchCategory, inventory, allDispatches]);


  // Helper function to get available stock for a part
  const getAvailableStock = (partName, workCategory) => {
    if (!partName || !workCategory || formData.dispatchCategory === 'return') {
      return null;
    }

    const inventoryItem = inventory.find(
      inv => inv.partName?.toLowerCase() === partName.toLowerCase() &&
        inv.workCategory === workCategory
    );

    if (!inventoryItem) {
      return 0; // No inventory found
    }

    // Use stockAtFactory which represents available stock (received - dispatched - rejected - returned to vendor)
    return inventoryItem.stockAtFactory || 0;
  };

  // Helper function to get returnable quantity (for return dispatches)
  // Can only return what was previously dispatched to this customer
  const getReturnableQuantity = (customerName, partName, workCategory) => {
    if (!customerName || !partName || !workCategory) {
      return 0;
    }

    // Find all dispatches to this customer for this part
    const customerDispatches = allDispatches.filter(
      d => d.customerName === customerName &&
        d.partName?.toLowerCase() === partName.toLowerCase() &&
        d.workCategory === workCategory &&
        d.dispatchCategory === 'dispatch' // Only regular dispatches, not returns or rejects
    );

    // Find all returns from this customer for this part
    const customerReturns = allDispatches.filter(
      d => d.customerName === customerName &&
        d.partName?.toLowerCase() === partName.toLowerCase() &&
        d.workCategory === workCategory &&
        d.dispatchCategory === 'return'
    );

    // Calculate: Total dispatched - Total already returned
    const totalDispatched = customerDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const totalReturned = customerReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);

    return Math.max(0, totalDispatched - totalReturned);
  };

  // Auto-fill unit, price, and work category when part is selected for each line item
  const handlePartChange = (index, partName) => {
    const selectedPart = parts.find(p => p.partName === partName);
    if (selectedPart) {
      const workCategory = selectedPart.scopeOfWork || '';

      // For return dispatches, use returnable quantity; otherwise use available stock
      let availableStock;
      if (formData.dispatchCategory === 'return') {
        availableStock = getReturnableQuantity(formData.customerName, partName, workCategory);
      } else {
        availableStock = getAvailableStock(partName, workCategory);
      }

      const newLineItems = [...lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        partName,
        workCategory,
        unit: selectedPart.unitType || '',
        priceWithoutGST: selectedPart.partPrice || '',
        availableStock,
        stockWarning: ''
      };
      setLineItems(newLineItems);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file' && files && files[0]) {
      const file = files[0];
      try {
        // Upload file to server
        const response = await dispatchesAPI.uploadFile(file);
        const filePath = response.data.data.filePath;

        setFormData(prev => ({
          ...prev,
          [name]: filePath  // Store the server file path
        }));
        showNotification?.(`File "${file.name}" uploaded successfully`);
      } catch (error) {
        console.error('Error uploading file:', error);
        showError?.('Failed to upload file. Please try again.');
      }
      return;
    }

    // Validate text fields (max 30 characters)
    if (['dispatchNo', 'reasonForRejection', 'deliveryChalan', 'vehicleNo', 'ewayBill'].includes(name) && value.length > 30) {
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

      // Check against available stock
      if (newLineItems[index].availableStock !== null) {
        const availableStock = newLineItems[index].availableStock;
        if (num > availableStock) {
          if (formData.dispatchCategory === 'return') {
            newLineItems[index].stockWarning = `⚠️ Only ${availableStock} units can be returned from this customer!`;
          } else {
            newLineItems[index].stockWarning = `⚠️ Only ${availableStock} units available in receipt!`;
          }
        } else {
          newLineItems[index].stockWarning = '';
        }
      }
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
        total: '',
        availableStock: null,
        stockWarning: ''
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

    if (!formData.date || !formData.dispatchNo || formData.dispatchNo.trim() === '' || !formData.customerName || formData.customerName.trim() === '') {
      showError?.('Please fill all required fields (Date, Delivery Chalan No, and Customer Name)');
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

    // Stock warnings are now informational only - they don't block submission
    // Users can intentionally dispatch more than available stock if needed

    try {
      if (isEditing && dispatchData?._id) {
        // For editing, submit all line items (the parent will handle deletion and recreation)
        for (let i = 0; i < lineItems.length; i++) {
          const item = lineItems[i];
          const dispatch = {
            date: formData.date,
            dispatchCategory: formData.dispatchCategory,
            deliveryChalan: formData.deliveryChalan,
            vehicleNo: formData.vehicleNo,
            ewayBill: formData.ewayBill,
            poNo: formData.poNo,
            contactNo: formData.contactNo,
            customerName: formData.customerName,
            invoiceNo: formData.dispatchNo,
            invoiceDate: formData.dispatchDate,
            upload: formData.upload,
            reasonForRejection: formData.reasonForRejection,
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total)
          };

          // Only pass the ID on the first iteration to trigger the edit flow
          await onSubmit(dispatch, i === 0 ? dispatchData._id : null);
        }
        // Show success message and trigger refresh after all items are submitted
        showNotification?.('Dispatch updated successfully');
        onCancel(); // Close the modal
        window.location.reload(); // Refresh the page
      } else {
        // For creating new dispatches, create one dispatch per line item
        // Submit all at once and catch any validation errors
        for (let i = 0; i < lineItems.length; i++) {
          const item = lineItems[i];
          const dispatch = {
            date: formData.date,
            dispatchCategory: formData.dispatchCategory,
            deliveryChalan: formData.deliveryChalan,
            vehicleNo: formData.vehicleNo,
            ewayBill: formData.ewayBill,
            poNo: formData.poNo,
            contactNo: formData.contactNo,
            customerName: formData.customerName,
            invoiceNo: formData.dispatchNo,
            invoiceDate: formData.dispatchDate,
            upload: formData.upload,
            reasonForRejection: formData.reasonForRejection,
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total)
          };

          // This will throw an error if validation fails, which will be caught by the parent
          await onSubmit(dispatch);
        }
        // Show success message and trigger refresh after all items are submitted
        showNotification?.('Dispatch added successfully');
        onCancel(); // Close the modal
        window.location.reload(); // Refresh the page
      }
    } catch (error) {
      // Re-throw the error so it's caught by the parent component
      console.error('Error submitting dispatch:', error);
      throw error;
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


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Date "
          name="date"
          value={formatDateForInput(formData.date)}
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
            { value: 'reject', label: 'Reject' },
            { value: 'site', label: 'Site' }
          ]}
        />


        <FloatingInput
          label="Vehicle No"
          name="vehicleNo"
          value={formData.vehicleNo}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="E-way Bill"
          name="ewayBill"
          value={formData.ewayBill}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="PO No"
          name="poNo"
          value={formData.poNo}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="Customer Name"
          name="customerName"
          value={formData.customerName}
          onChange={handleInputChange}
          type="select"
          options={customers.map(c => ({ value: c.customerName, label: c.customerName }))}
          required
        />

        <FloatingInput
          label="Contact No"
          name="contactNo"
          value={formData.contactNo}
          onChange={handleInputChange}
          maxLength={15}
        />

        <FloatingInput
          label="Delivery Chalan No"
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
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Work Category</th>
                    <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
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
                        <div>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            min="0"
                            max="9999"
                            step="1"
                            className={`w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 ${item.stockWarning
                              ? 'border-red-500 focus:ring-red-500 bg-red-50'
                              : 'border-gray-300 focus:ring-blue-500'
                              }`}
                            required
                          />
                          {item.availableStock !== null && (
                            <div className="text-xs mt-1">
                              <span className="text-gray-600">
                                {formData.dispatchCategory === 'return'
                                  ? `Returnable: ${item.availableStock} units`
                                  : `Available: ${item.availableStock} units`}
                              </span>
                            </div>
                          )}
                          {item.stockWarning && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              {item.stockWarning}
                            </div>
                          )}
                        </div>
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
            </div >
          </div >
        </div >
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
    </form >
  );
};

export default DispatchForm;
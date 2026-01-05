import React, { useState, useEffect, useRef } from 'react';
import FloatingInput from './FloatingInput';
import { FaEye, FaTrash, FaEdit, FaPlus } from 'react-icons/fa';
import { purchasesAPI, receiptsAPI } from '../../services/api';

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

  // State for purchases from purchase orders
  const [purchases, setPurchases] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(
    initialData.vendorNames?.[0] || (initialData.vendorName ? initialData.vendorName : null)
  );
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [selectedVoucherNo, setSelectedVoucherNo] = useState(initialData.voucherNo || null);

  // State for individual line items
  const [lineItems, setLineItems] = useState(() => {
    // If editing and lineItems array exists, map the fields correctly
    if (initialData.lineItems?.length > 0) {
      return initialData.lineItems.map(item => ({
        workCategory: item.workCategory || '',
        partName: item.partName || '',
        unit: item.unit || '',
        actualOrder: item.actualOrder || '',
        quantity: item.quantity?.toString() || '',
        priceWithoutGST: (item.priceWithoutGST || item.invoiceValueWithoutGST)?.toString() || '',
        gstPercentage: item.gstPercentage || 18,
        gstAmount: (item.gstAmount || item.gstValue)?.toString() || '',
        total: (item.total || item.totalValue)?.toString() || '',
        remark: item.remark || '',
        _id: item._id || null
      }));
    }
    // If editing a single receipt (has individual fields), convert to lineItems format
    if (isEditing && initialData.workCategory && initialData.partName) {
      return [{
        workCategory: initialData.workCategory || '',
        partName: initialData.partName || '',
        unit: initialData.unit || '',
        actualOrder: initialData.actualOrder || '',
        quantity: initialData.quantity?.toString() || '',
        priceWithoutGST: initialData.invoiceValueWithoutGST?.toString() || '',
        gstPercentage: initialData.gstPercentage || 18,
        gstAmount: initialData.gstValue?.toString() || '',
        total: initialData.totalValue?.toString() || '',
        remark: initialData.remark || '',
        _id: initialData._id || null
      }];
    }
    // Default empty line item for new receipts
    return [{
      workCategory: '',
      partName: '',
      unit: '',
      actualOrder: '',
      quantity: '',
      priceWithoutGST: '',
      gstPercentage: 18,
      gstAmount: '',
      total: '',
      remark: ''
    }];
  });

  const [deletedIds, setDeletedIds] = useState([]);

  const [formData, setFormData] = useState({
    date: formatDateForInput(initialData.date),
    receiptCategory: initialData.receiptCategory || 'buy',
    category: initialData.category || 'In house',
    vendorNames: initialData.vendorNames || (initialData.vendorName ? [initialData.vendorName] : []),
    voucherNo: initialData.voucherNo || '',
    invoiceNo: initialData.invoiceNo || '',
    invoiceDate: formatDateForInput(initialData.invoiceDate),
    upload: initialData.upload || '',
    reasonForReturn: initialData.reasonForReturn || '',
  });

  // Calculate totals
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

  // Fetch purchases when vendor is selected in bought-out mode
  useEffect(() => {
    const fetchPurchases = async () => {
      if (formData.category === 'Bought-out' && selectedVendor) {
        try {
          const response = await purchasesAPI.getAll();
          const allPurchases = Array.isArray(response) ? response : response.data || [];

          // Filter purchases by selected vendor
          const vendorPurchases = allPurchases.filter(p => p.vendorName === selectedVendor);
          setPurchases(vendorPurchases);

          // Get unique voucher numbers for this vendor
          const uniqueVouchers = [...new Set(vendorPurchases.map(p => p.voucherNo))].filter(Boolean);
          setAvailableVouchers(uniqueVouchers);

        } catch (error) {
          console.error('Error fetching purchases:', error);
        }
      }
    };
    fetchPurchases();
  }, [selectedVendor, formData.category]);

  const isInitialVoucherLoad = useRef(true);
  // Track the last voucher that was used to auto-populate to avoid unwanted resets
  const [lastPopulatedVoucher, setLastPopulatedVoucher] = useState(initialData.voucherNo || null);

  // Populate line items when voucher number is selected
  useEffect(() => {
    const populateFromVoucher = async () => {
      // 1. Basic check: must have a voucher and purchases loaded
      if (formData.category === 'Bought-out' && selectedVoucherNo && purchases.length > 0) {

        // 2. If editing and this is the initial load with the SAME voucher, 
        // just enrich actualOrder without resetting quantities
        if (isEditing && isInitialVoucherLoad.current && selectedVoucherNo === initialData.voucherNo) {
          const enrichedItems = lineItems.map(li => {
            const match = purchases.find(p =>
              p.voucherNo === selectedVoucherNo &&
              p.partName.toLowerCase() === li.partName.toLowerCase()
            );
            return {
              ...li,
              actualOrder: match ? match.quantity?.toString() : li.actualOrder
            };
          });

          if (JSON.stringify(enrichedItems) !== JSON.stringify(lineItems)) {
            setLineItems(enrichedItems);
          }
          isInitialVoucherLoad.current = false;
          setLastPopulatedVoucher(selectedVoucherNo);
          return;
        }

        // 3. If the voucher has actually CHANGED from what we last populated (manual selection)
        // OR if it's a new receipt and we haven't populated yet
        if (selectedVoucherNo !== lastPopulatedVoucher) {
          const voucherPurchases = purchases.filter(p => p.voucherNo === selectedVoucherNo);

          if (voucherPurchases.length > 0) {
            const mappedItems = voucherPurchases.map(item => ({
              workCategory: item.workCategory || '',
              partName: item.partName || '',
              unit: item.unit || '',
              actualOrder: item.quantity?.toString() || '',
              quantity: '', // Clear quantity for new selection
              priceWithoutGST: item.invoiceValueWithoutGST?.toString() || '',
              gstPercentage: item.gstPercentage || 18,
              gstAmount: item.gstValue?.toString() || '',
              total: item.totalValue?.toString() || '',
              remark: item.remark || '',
              _id: null
            }));

            setLineItems(mappedItems);
            setLastPopulatedVoucher(selectedVoucherNo);
            isInitialVoucherLoad.current = false;
          }
        }
      }
    };
    populateFromVoucher();
  }, [selectedVoucherNo, purchases, formData.category, isEditing, initialData.voucherNo, lastPopulatedVoucher]);


  // Auto-fill unit and price when part is selected for each line item
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

  const handleVendorChange = (vendorName) => {
    if (formData.category === 'Bought-out') {
      // Single selection for bought-out
      setSelectedVendor(vendorName);
      setFormData(prev => ({
        ...prev,
        vendorNames: [vendorName]
      }));
    } else {
      // Multiple selection for in-house
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
    }
  };

  const handleInputChange = async (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file' && files && files[0]) {
      const file = files[0];

      try {
        // Upload file to server
        const response = await receiptsAPI.uploadFile(file);

        // Store the file path returned from server
        setFormData(prev => ({
          ...prev,
          [name]: response.data.filePath
        }));

        showNotification?.(`File "${file.name}" uploaded successfully`);
      } catch (error) {
        console.error('Error uploading file:', error);
        showError?.('Failed to upload file');
      }
      return;
    }

    // Validate text fields (max 30 characters for invoiceNo and reasonForReturn)
    if (['invoiceNo', 'reasonForReturn'].includes(name) && value.length > 30) {
      showError?.('Maximum 30 characters allowed');
      return;
    }

    // Reset vendor selection and line items when category changes
    if (name === 'category') {
      setSelectedVendor(null);
      setSelectedVoucherNo(null);
      setAvailableVouchers([]);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        vendorNames: [],
        voucherNo: ''
      }));
      // Reset line items to default
      setLineItems([{
        workCategory: '',
        partName: '',
        unit: '',
        quantity: '',
        priceWithoutGST: '',
        gstPercentage: 18,
        gstAmount: '',
        total: '',
        remark: ''
      }]);
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleVoucherChange = (voucherNo) => {
    setSelectedVoucherNo(voucherNo);
    setFormData(prev => ({
      ...prev,
      voucherNo: voucherNo
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

      // Validate against Actual Order
      const actualOrder = parseFloat(newLineItems[index].actualOrder);
      if (!isNaN(actualOrder) && num > actualOrder) {
        showError?.(`Quantity (${num}) cannot exceed Actual Order (${actualOrder})`);
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
        total: '',
        remark: '',
        _id: null
      }
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const itemToDelete = lineItems[index];
      if (itemToDelete._id) {
        setDeletedIds(prev => [...prev, itemToDelete._id]);
      }
      const newLineItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newLineItems);
    } else {
      showError?.('At least one line item is required');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.date || !formData.invoiceNo) {
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

    try {
      // Handle deletions first
      if (deletedIds.length > 0) {
        try {
          await Promise.all(deletedIds.map(id => receiptsAPI.delete(id)));
        } catch (error) {
          console.error('Error deleting removed items:', error);
          const message = error.response?.data?.message || 'Failed to remove some items. They might be linked to dispatches.';
          showError?.(message);
          return; // Stop submission if deletion fails
        }
      }

      if (isEditing) {
        // For editing, submit all line items in parallel
        const promises = lineItems.map((item, i) => {
          const receipt = {
            date: formData.date,
            receiptCategory: formData.receiptCategory,
            category: formData.category,
            vendorNames: formData.vendorNames,
            invoiceNo: formData.invoiceNo,
            invoiceDate: formData.invoiceDate,
            upload: formData.upload,
            reasonForReturn: formData.reasonForReturn,
            voucherNo: formData.voucherNo || '',
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total),
            remark: item.remark || ''
          };

          // Pass the specific item's _id if it exists
          return onSubmit(receipt, item._id || null);
        });

        // Wait for all submissions to complete in parallel
        await Promise.all(promises);

        showNotification?.('Receipt updated successfully');
        onCancel(); // Close the modal
        // Parent component will handle data refresh
      } else {
        // For creating new receipts, create all receipts in parallel
        const promises = lineItems.map(item => {
          const receipt = {
            date: formData.date,
            receiptCategory: formData.receiptCategory,
            category: formData.category,
            vendorNames: formData.vendorNames,
            voucherNo: formData.voucherNo || '',
            invoiceNo: formData.invoiceNo,
            invoiceDate: formData.invoiceDate,
            upload: formData.upload,
            reasonForReturn: formData.reasonForReturn,
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total),
            remark: item.remark || ''
          };

          return onSubmit(receipt);
        });

        // Wait for all submissions to complete in parallel
        await Promise.all(promises);

        showNotification?.('Receipt added successfully');
        onCancel(); // Close the modal
        // Parent component will handle data refresh
      }
    } catch (error) {
      console.error('Error submitting receipt:', error);
      showError?.('Failed to save receipt');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Only show vendor field for Bought-out category */}
        {formData.category === 'Bought-out' && (
          <>
            <FloatingInput
              label="Vendor Name"
              name="vendorName"
              value={selectedVendor || ''}
              onChange={(e) => handleVendorChange(e.target.value)}
              type="select"
              options={[
                { value: '', label: 'Select Vendor' },
                ...vendors.map(vendor => ({
                  value: vendor.vendorName,
                  label: vendor.vendorName
                }))
              ]}
            />

            {/* Show voucher number dropdown after vendor is selected */}
            {selectedVendor && (
              <FloatingInput
                label="Voucher No"
                name="voucherNo"
                value={selectedVoucherNo || ''}
                onChange={(e) => handleVoucherChange(e.target.value)}
                type="select"
                options={[
                  { value: '', label: 'Select Voucher No' },
                  ...availableVouchers.map(voucher => ({
                    value: voucher,
                    label: voucher
                  }))
                ]}
              />
            )}
          </>
        )}

        {formData.receiptCategory === 'buy' && (
          <>
            <FloatingInput
              label="Invoice No "
              name="invoiceNo"
              value={formData.invoiceNo}
              onChange={handleInputChange}
              maxLength={30}
              required
            />

            <FloatingInput
              label="Invoice Date"
              name="invoiceDate"
              value={formatDateForInput(formData.invoiceDate)}
              onChange={handleInputChange}
              type="date"
            />
          </>
        )}

        {formData.receiptCategory === 'return' && (
          <>
            <FloatingInput
              label="Invoice No "
              name="invoiceNo"
              value={formData.invoiceNo}
              onChange={handleInputChange}
              maxLength={30}
              required
            />

            <FloatingInput
              label="Return Date"
              name="invoiceDate"
              value={formatDateForInput(formData.invoiceDate)}
              onChange={handleInputChange}
              type="date"
            />
          </>
        )}

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

      {/* Line Items Section - Only show when invoice number is entered */}
      {formData.invoiceNo && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-900">Line Items</h4>
            {formData.category !== 'Bought-out' && (
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <FaPlus /> Add Item
              </button>
            )}
          </div>

          <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-[1400px] w-full bg-white">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-56">Work Category</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-56">Item Name</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-32">Unit</th>
                    {formData.category !== 'In house' && (
                      <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-32">Actual Order</th>
                    )}
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-32">Quantity</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-44">Price without GST (₹)</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-24">GST %</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-40">GST Amount (₹)</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-40">Total (₹)</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-64">Remark</th>
                    <th className="py-3 px-4 border-b text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap w-24">Action</th>
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
                          disabled={formData.category === 'Bought-out'}
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
                          disabled={formData.category === 'Bought-out'}
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
                      {formData.category !== 'In house' && (
                        <td className="py-2 px-3 border-b">
                          <input
                            type="text"
                            value={item.actualOrder || ''}
                            readOnly
                            className="w-full text-sm bg-gray-50 border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                      )}
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
                          disabled={formData.category === 'Bought-out'}
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
                          disabled={formData.category === 'Bought-out'}
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
                        <input
                          type="text"
                          value={item.remark}
                          onChange={(e) => handleLineItemChange(index, 'remark', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Remark"
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
                    <td colSpan={formData.category === 'In house' ? 8 : 9} className="py-2 px-3 text-right font-medium">Grand Total:</td>
                    <td className="py-2 px-3 font-bold text-blue-600">
                      ₹{lineItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          {isEditing ? 'Update Receipt' : 'Add Receipt'}
        </button>
      </div>
    </form>
  );
};

export default ReceiptForm;
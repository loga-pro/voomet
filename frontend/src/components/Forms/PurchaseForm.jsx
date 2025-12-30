import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { purchasesAPI, vendorsAPI } from '../../services/api';

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

const PurchaseForm = ({
  purchaseData,
  onSubmit,
  onCancel,
  showNotification,
  showError,
  parts = [],
  workCategories = [],
  isEditing = false,
  purchaseIndex = null
}) => {
  const initialData = purchaseData || {};
  const [allPurchasesForVoucher, setAllPurchasesForVoucher] = useState([]);
  const [vendors, setVendors] = useState([]);

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
        total: (item.total || item.totalValue)?.toString() || ''
      }));
    }
    // If editing a single purchase (has individual fields), convert to lineItems format
    if (isEditing && initialData.workCategory && initialData.partName) {
      return [{
        workCategory: initialData.workCategory || '',
        partName: initialData.partName || '',
        unit: initialData.unit || '',
        quantity: initialData.quantity?.toString() || '',
        priceWithoutGST: initialData.invoiceValueWithoutGST?.toString() || '',
        gstPercentage: initialData.gstPercentage || 18,
        gstAmount: initialData.gstValue?.toString() || '',
        total: initialData.totalValue?.toString() || ''
      }];
    }
    // Default empty line item for new purchases
    return [{
      workCategory: '',
      partName: '',
      unit: '',
      quantity: '',
      priceWithoutGST: '',
      gstPercentage: 18,
      gstAmount: '',
      total: ''
    }];
  });

  const [formData, setFormData] = useState({
    voucherNo: initialData.voucherNo || '',
    date: formatDateForInput(initialData.date),
    modeOfPayment: initialData.modeOfPayment || 'Cash',
    referenceNo: initialData.referenceNo || '',
    referenceDate: formatDateForInput(initialData.referenceDate),
    otherReference: initialData.otherReference || '',
    dispatchedThrough: initialData.dispatchedThrough || '',
    destination: initialData.destination || '',
    termsOfDelivery: initialData.termsOfDelivery || '',
    supplier: initialData.supplier || '',
    vendorName: initialData.vendorName || '',
    cgst: initialData.cgst || '',
    sgst: initialData.sgst || ''
  });

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        const vendorsList = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setVendors(vendorsList);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    fetchVendors();
  }, []);

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

  // Fetch all purchases with the same voucher number when editing
  useEffect(() => {
    const fetchRelatedPurchases = async () => {
      if (isEditing && initialData.voucherNo) {
        try {
          // Fetch all purchases and filter by voucher number
          const response = await purchasesAPI.getAll();
          const allPurchases = Array.isArray(response) ? response : response.data || [];
          const relatedPurchases = allPurchases.filter(p => p.voucherNo === initialData.voucherNo);

          if (relatedPurchases.length > 1) {
            // Multiple line items found - populate form with all of them
            setAllPurchasesForVoucher(relatedPurchases);
            const mappedItems = relatedPurchases.map(item => ({
              workCategory: item.workCategory || '',
              partName: item.partName || '',
              unit: item.unit || '',
              quantity: item.quantity?.toString() || '',
              priceWithoutGST: (item.priceWithoutGST || item.invoiceValueWithoutGST)?.toString() || '',
              gstPercentage: item.gstPercentage || 18,
              gstAmount: (item.gstAmount || item.gstValue)?.toString() || '',
              total: (item.total || item.totalValue)?.toString() || ''
            }));
            setLineItems(mappedItems);
          }
        } catch (error) {
          console.error('Error fetching related purchases:', error);
        }
      }
    };
    fetchRelatedPurchases();
  }, [isEditing, initialData.voucherNo]);

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

  // Handle vendor selection and auto-fill address
  const handleVendorChange = (e) => {
    const selectedVendorName = e.target.value;
    const selectedVendor = vendors.find(v => v.vendorName === selectedVendorName);

    if (selectedVendor) {
      // Format the address from vendor data
      const addressParts = [
        selectedVendor.address,
        selectedVendor.city,
        selectedVendor.state,
        selectedVendor.zipCode,
        selectedVendor.country
      ].filter(Boolean); // Remove empty values

      const formattedAddress = addressParts.join(', ');

      setFormData(prev => ({
        ...prev,
        vendorName: selectedVendorName,
        supplier: formattedAddress
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vendorName: selectedVendorName,
        supplier: ''
      }));
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
    if (['voucherNo', 'referenceNo', 'otherReference', 'dispatchedThrough', 'destination'].includes(name) && value.length > 30) {
      showError?.('Maximum 30 characters allowed');
      return;
    }

    // Validate CGST and SGST (0-100, whole numbers only)
    if (['cgst', 'sgst'].includes(name)) {
      const numValue = parseInt(value);
      if (value !== '' && (numValue < 0 || numValue > 100)) {
        showError?.('Value must be between 0 and 100');
        return;
      }
      // Don't allow decimals
      if (value.includes('.')) {
        showError?.('Only whole numbers allowed');
        return;
      }
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

    if (!formData.voucherNo || !formData.date) {
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
      if (isEditing && purchaseData?._id) {
        // For editing, update all line items with the same voucher number
        // First, delete all existing purchases with this voucher number
        await purchasesAPI.deleteByVoucher(formData.voucherNo);

        // Then create new purchases for each line item
        for (const item of lineItems) {
          const purchase = {
            voucherNo: formData.voucherNo,
            date: formData.date,
            modeOfPayment: formData.modeOfPayment,
            referenceNo: formData.referenceNo,
            referenceDate: formData.referenceDate,
            otherReference: formData.otherReference,
            dispatchedThrough: formData.dispatchedThrough,
            destination: formData.destination,
            termsOfDelivery: formData.termsOfDelivery,
            supplier: formData.supplier,
            vendorName: formData.vendorName,
            ...(formData.cgst !== '' && { cgst: parseFloat(formData.cgst) }),
            ...(formData.sgst !== '' && { sgst: parseFloat(formData.sgst) }),
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstPercentage: parseFloat(item.gstPercentage),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total)
          };

          await purchasesAPI.create(purchase);
        }

        showNotification?.('Purchase updated successfully');
        onCancel(); // Close the modal
        if (onSubmit) onSubmit(); // Trigger parent refresh
      } else {
        // For creating new purchases, check if voucher number already exists
        const voucherCheck = await purchasesAPI.checkVoucher(formData.voucherNo);

        if (voucherCheck.data.exists) {
          showError?.('Voucher number already exists. Please use a unique voucher number.');
          return;
        }

        // Create one purchase per line item
        for (const item of lineItems) {
          const purchase = {
            voucherNo: formData.voucherNo,
            date: formData.date,
            modeOfPayment: formData.modeOfPayment,
            referenceNo: formData.referenceNo,
            referenceDate: formData.referenceDate,
            otherReference: formData.otherReference,
            dispatchedThrough: formData.dispatchedThrough,
            destination: formData.destination,
            termsOfDelivery: formData.termsOfDelivery,
            supplier: formData.supplier,
            vendorName: formData.vendorName,
            ...(formData.cgst !== '' && { cgst: parseFloat(formData.cgst) }),
            ...(formData.sgst !== '' && { sgst: parseFloat(formData.sgst) }),
            workCategory: item.workCategory,
            partName: item.partName,
            unit: item.unit,
            quantity: parseFloat(item.quantity),
            invoiceValueWithoutGST: parseFloat(item.priceWithoutGST),
            gstPercentage: parseFloat(item.gstPercentage),
            gstValue: parseFloat(item.gstAmount),
            totalValue: parseFloat(item.total)
          };

          await purchasesAPI.create(purchase);
        }

        showNotification?.('Purchase added successfully');
        onCancel(); // Close the modal
        if (onSubmit) onSubmit(); // Trigger parent refresh
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      showError?.('Failed to save purchase');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FloatingInput
          label="Vendor Name"
          name="vendorName"
          value={formData.vendorName}
          onChange={handleVendorChange}
          type="select"
          options={[
            { value: '', label: 'Select Vendor' },
            ...vendors.map(vendor => ({
              value: vendor.vendorName,
              label: vendor.vendorName
            }))
          ]}
        />

        <FloatingInput
          label="Voucher No"
          name="voucherNo"
          value={formData.voucherNo}
          onChange={handleInputChange}
          maxLength={30}
          required
        />

        <FloatingInput
          label="Date"
          name="date"
          value={formData.date}
          onChange={handleInputChange}
          type="date"
          required
        />

        <FloatingInput
          label="Mode/Terms of Payment"
          name="modeOfPayment"
          value={formData.modeOfPayment}
          onChange={handleInputChange}
          type="select"
          options={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Credit Card', label: 'Credit Card' },
            { value: 'Bank Transfer', label: 'Bank Transfer' },
            { value: 'Cheque', label: 'Cheque' },
            { value: 'UPI', label: 'UPI' },
            { value: 'Other', label: 'Other' }
          ]}
        />

        <FloatingInput
          label="Reference No"
          name="referenceNo"
          value={formData.referenceNo}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="Reference Date"
          name="referenceDate"
          value={formData.referenceDate}
          onChange={handleInputChange}
          type="date"
        />

        <FloatingInput
          label="Other Reference"
          name="otherReference"
          value={formData.otherReference}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="Dispatched Through"
          name="dispatchedThrough"
          value={formData.dispatchedThrough}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="Destination"
          name="destination"
          value={formData.destination}
          onChange={handleInputChange}
          maxLength={30}
        />

        <FloatingInput
          label="Terms of Delivery"
          name="termsOfDelivery"
          value={formData.termsOfDelivery}
          onChange={handleInputChange}
          type="textarea"
          rows={4}
        />

        <FloatingInput
          label="Supplier (Bill from)"
          name="supplier"
          value={formData.supplier}
          onChange={handleInputChange}
          type="textarea"
          rows={4}
        />

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <FloatingInput
              label="CGST (%)"
              name="cgst"
              value={formData.cgst}
              onChange={handleInputChange}
              type="number"
              min="0"
              max="100"
              step="1"
            />
          </div>
          <div className="flex-1">
            <FloatingInput
              label="SGST (%)"
              name="sgst"
              value={formData.sgst}
              onChange={handleInputChange}
              type="number"
              min="0"
              max="100"
              step="1"
            />
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-semibold text-gray-900">Line Items</h4>
          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <FaPlus /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-48">Work Category</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-48">Item Name</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-24">Unit</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-28">Quantity</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-36">Price without GST (₹)</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-24">GST %</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-32">GST Amount (₹)</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-32">Total (₹)</th>
                <th className="py-2 px-3 border-b text-left text-xs font-medium text-gray-500 uppercase w-20">Action</th>
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
                    <FloatingInput
                      name={`unit-${index}`}
                      value={item.unit}
                      readOnly
                      hideLabel
                      className="bg-gray-50"
                    />
                  </td>
                  <td className="py-2 px-3 border-b">
                    <FloatingInput
                      name={`quantity-${index}`}
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      type="number"
                      min="0"
                      max="9999"
                      step="1"
                      hideLabel
                    />
                  </td>
                  <td className="py-2 px-3 border-b">
                    <FloatingInput
                      name={`priceWithoutGST-${index}`}
                      value={item.priceWithoutGST}
                      onChange={(e) => handleLineItemChange(index, 'priceWithoutGST', e.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      hideLabel
                    />
                  </td>
                  <td className="py-2 px-3 border-b">
                    <FloatingInput
                      name={`gstPercentage-${index}`}
                      value={item.gstPercentage}
                      onChange={(e) => handleLineItemChange(index, 'gstPercentage', e.target.value)}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      hideLabel
                    />
                  </td>
                  <td className="py-2 px-3 border-b">
                    <FloatingInput
                      name={`gstAmount-${index}`}
                      value={item.gstAmount}
                      readOnly
                      hideLabel
                      className="bg-gray-50"
                    />
                  </td>
                  <td className="py-2 px-3 border-b">
                    <FloatingInput
                      name={`total-${index}`}
                      value={item.total}
                      readOnly
                      hideLabel
                      className="bg-gray-50 font-medium"
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
                <td className="py-2 px-3 font-bold text-blue-600">
                  ₹{lineItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0).toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
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
          {isEditing ? 'Update Purchase' : 'Add Purchase'}
        </button>
      </div>
    </form>
  );
};

export default PurchaseForm;
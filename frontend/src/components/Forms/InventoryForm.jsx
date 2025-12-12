import React, { useState, useEffect } from 'react';
import FloatingInput from './FloatingInput';
import { customersAPI, vendorsAPI, partsAPI, inventoryAPI } from '../../services/api';
import { FaEye, FaTrash, FaFileUpload, FaEdit } from 'react-icons/fa';
import InventorySummaryTable from '../Inventory/InventorySummaryTable';

const InventoryForm = ({ 
  inventory, 
  onSubmit, 
  onCancel, 
  showNotification, 
  showError 
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [formData, setFormData] = useState({
    // Summary tab
    workCategory: '',
    partName: '',
    customerVendorName: '',
    reOrderLevel: 0,
    
    // Receipt
    receiptDate: '',
    receiptCategory: 'buy',
    receiptWorkCategory: '',
    receiptPartName: '',
    receiptVendorName: '',
    receiptInvoiceNo: '',
    receiptInvoiceDate: '',
    receiptInvoiceValueWithoutGST: '',
    receiptGSTValue: '',
    receiptQuantity: '',
    receiptUnit: '',
    receiptUpload: '',
    receiptReasonForReturn: '',
    
    // Dispatch
    dispatchDate: '',
    dispatchCategory: '',
    dispatchWorkCategory: '',
    dispatchPartName: '',
    dispatchCustomerName: '',
    dispatchInvoiceNo: '',
    dispatchInvoiceDate: '',
    dispatchInvoiceValueWithoutGST: '',
    dispatchGSTValue: '',
    dispatchQuantity: '',
    dispatchUnit: '',
    dispatchUpload: '',
    dispatchReasonForRejection: '',
    
    remarks: '',
    status: 'active'
  });
  
  const [receipts, setReceipts] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [editingReceiptIndex, setEditingReceiptIndex] = useState(null);
  const [editingDispatchIndex, setEditingDispatchIndex] = useState(null);
  
  // Row-specific data for the summary table
  const [rowData, setRowData] = useState([
    { id: 1, category: 'In house', vendorNames: [] },
    { id: 2, category: 'Bought-out', vendorNames: [] }
  ]);
  
  // Dropdown data states
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [customerVendorOptions, setCustomerVendorOptions] = useState([]);

  // Helper function to validate textarea lines
  const validateTextareaLines = (text, maxLines = 200) => {
    const lines = text.split('\n');
    return lines.length <= maxLines;
  };

  // Fetch customers, vendors, and parts on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [customersRes, vendorsRes, partsRes] = await Promise.all([
          customersAPI.getAll(),
          vendorsAPI.getAll(),
          partsAPI.getAll()
        ]);
        
        setCustomers(customersRes.data || []);
        setVendors(vendorsRes.data || []);
        setParts(partsRes.data || []);
        
        // Combine customers and vendors for the dropdown
        const customerOptions = (customersRes.data || []).map(c => ({
          value: c.customerName,
          label: c.customerName,
          type: 'customer'
        }));
        
        const vendorOptions = (vendorsRes.data || []).map(v => ({
          value: v.vendorName,
          label: v.vendorName,
          type: 'vendor'
        }));
        
        setCustomerVendorOptions([...customerOptions, ...vendorOptions]);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
        showError?.('Failed to load dropdown data');
      }
    };
    
    fetchDropdownData();
  }, []);

  useEffect(() => {
    if (inventory) {
      // Populate form with existing inventory data
      setFormData(prev => ({
        ...prev,
        workCategory: inventory.workCategory || '',
        partName: inventory.partName || '',
        customerVendorName: inventory.customerVendorName || '',
        reOrderLevel: inventory.reOrderLevel || 0,
        remarks: inventory.remarks || '',
        status: inventory.status || 'active'
      }));
      
      // Populate row data if exists
      if (inventory.rowData && Array.isArray(inventory.rowData)) {
        setRowData(inventory.rowData);
      }
      
      if (inventory.receipts) {
        setReceipts(inventory.receipts);
      }
      
      if (inventory.dispatches) {
        setDispatches(inventory.dispatches);
      }
      
      // Calculate summary
      calculateSummary(inventory);
    }
  }, [inventory]);

  const calculateSummary = (invData) => {
    const summary = {
      stockAtFactory: invData.stockAtFactory || 0,
      stockValueAtFactory: invData.stockValueAtFactory || 0,
      stockSentToCustomer: invData.stockSentToCustomer || 0,
      stockValueSentToCustomer: invData.stockValueSentToCustomer || 0,
      stockReturnFromCustomer: invData.stockReturnFromCustomer || 0,
      totalStock: invData.totalStock || 0,
      totalStockValue: invData.totalStockValue || 0,
      inventoryAtFactoryValue: invData.inventoryAtFactoryValue || 0,
      inventoryAtCustomerEndValue: invData.inventoryAtCustomerEndValue || 0,
      inventoryReturnFromCustomerValue: invData.inventoryReturnFromCustomerValue || 0,
      totalInventoryValue: invData.totalInventoryValue || 0
    };
    setSummaryData(summary);
  };

  // Helper function to format date for HTML date input (yyyy-MM-dd)
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '';
      // Format as yyyy-MM-dd
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Helper function to view uploaded files (handles data URLs properly)
  const viewUpload = (uploadUrl) => {
    if (!uploadUrl) return;
    
    // If it's a regular HTTP URL, just open it
    if (uploadUrl.startsWith('http')) {
      window.open(uploadUrl, '_blank');
      return;
    }
    
    // If it's a data URL, convert to blob and open
    if (uploadUrl.startsWith('data:')) {
      try {
        // Extract the base64 data and mime type
        const [header, base64Data] = uploadUrl.split(',');
        const mimeType = header.match(/:(.*?);/)[1];
        
        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and object URL
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new tab
        const newWindow = window.open(blobUrl, '_blank');
        
        // Clean up the blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        if (!newWindow) {
          showError?.('Please allow pop-ups to view the file');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        showError?.('Failed to open file');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    // Handle file uploads - convert to base64 data URL
    if (type === 'file' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          [name]: reader.result // Store base64 data URL
        }));
        showNotification?.(`File "${file.name}" uploaded successfully`);
      };
      
      reader.onerror = () => {
        showError?.('Failed to read file');
      };
      
      reader.readAsDataURL(file);
      return;
    }
    
    // Apply character limit validations
    let processedValue = value;
    
    // Text fields: limit to 30 characters
    const textFields = [
      'receiptInvoiceNo', 'receiptReasonForReturn',
      'dispatchInvoiceNo', 'dispatchReasonForRejection',
      'receiptWorkCategory', 'dispatchWorkCategory'
    ];
    
    if (textFields.includes(name)) {
      if (value.length > 30) {
        showError?.('Maximum 30 characters allowed');
        return;
      }
      processedValue = value;
    }
    
    // Quantity fields: limit to 4 digits (0-9999)
    const quantityFields = ['receiptQuantity', 'dispatchQuantity'];
    
    if (quantityFields.includes(name) && (type === 'number' || name.includes('Quantity'))) {
      // Remove any non-digit characters
      const numericValue = value.replace(/[^0-9]/g, '');
      
      // Check if it's more than 4 digits
      if (numericValue.length > 4) {
        showError?.('Maximum 4 digits allowed for quantity');
        return;
      }
      
      // Don't allow numbers greater than 9999
      const num = parseInt(numericValue, 10);
      if (num > 9999) {
        showError?.('Quantity cannot exceed 9999');
        return;
      }
      
      processedValue = numericValue || '';
    }
    
    // Textarea fields: limit to 200 lines (for remarks and reason fields)
    const textareaFields = ['remarks', 'receiptReasonForReturn', 'dispatchReasonForRejection'];
    
    if (textareaFields.includes(name) && (type === 'textarea' || name.includes('Reason'))) {
      // Count the number of lines
      const lines = value.split('\n');
      if (lines.length > 200) {
        showError?.('Maximum 200 lines allowed');
        return;
      }
      processedValue = value;
    }
    
    // Handle part selection for receipt - auto-fill invoice value, GST, and unit
    if (name === 'receiptPartName' && processedValue) {
      const selectedPart = parts.find(p => p.partName === processedValue);
      if (selectedPart) {
        const invoiceValue = selectedPart.partPrice || 0;
        const gstValue = invoiceValue * 0.18; // Calculate 18% GST
        setFormData(prev => ({
          ...prev,
          [name]: processedValue,
          receiptInvoiceValueWithoutGST: invoiceValue,
          receiptGSTValue: gstValue,
          receiptUnit: selectedPart.unitType || ''
        }));
        return;
      }
    }
    
    // Handle invoice value change for receipt - auto-calculate GST
    if (name === 'receiptInvoiceValueWithoutGST') {
      const invoiceValue = parseFloat(processedValue) || 0;
      const gstValue = invoiceValue * 0.18; // Calculate 18% GST
      setFormData(prev => ({
        ...prev,
        [name]: invoiceValue,
        receiptGSTValue: gstValue
      }));
      return;
    }
    
    // Handle part selection for dispatch - auto-fill invoice value, GST, and unit
    if (name === 'dispatchPartName' && processedValue) {
      const selectedPart = parts.find(p => p.partName === processedValue);
      if (selectedPart) {
        const invoiceValue = selectedPart.partPrice || 0;
        const gstValue = invoiceValue * 0.18; // Calculate 18% GST
        setFormData(prev => ({
          ...prev,
          [name]: processedValue,
          dispatchInvoiceValueWithoutGST: invoiceValue,
          dispatchGSTValue: gstValue,
          dispatchUnit: selectedPart.unitType || ''
        }));
        return;
      }
    }
    
    // Handle invoice value change for dispatch - auto-calculate GST
    if (name === 'dispatchInvoiceValueWithoutGST') {
      const invoiceValue = parseFloat(processedValue) || 0;
      const gstValue = invoiceValue * 0.18; // Calculate 18% GST
      setFormData(prev => ({
        ...prev,
        [name]: invoiceValue,
        dispatchGSTValue: gstValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(processedValue) || 0 : processedValue
    }));
  };

  const addReceipt = () => {
    if (!formData.receiptDate || !formData.receiptPartName || !formData.receiptQuantity) {
      showError('Please fill all required fields for receipt');
      return;
    }

    const receiptData = {
      date: formData.receiptDate,
      workCategory: formData.receiptWorkCategory || formData.workCategory,
      partName: formData.receiptPartName,
      receiptCategory: formData.receiptCategory,
      vendorName: formData.receiptVendorName,
      invoiceNo: formData.receiptInvoiceNo,
      invoiceDate: formData.receiptInvoiceDate,
      invoiceValueWithoutGST: parseFloat(formData.receiptInvoiceValueWithoutGST) || 0,
      gstValue: parseFloat(formData.receiptGSTValue) || 0,
      quantity: parseFloat(formData.receiptQuantity) || 0,
      unit: formData.receiptUnit,
      upload: formData.receiptUpload || (editingReceiptIndex !== null ? receipts[editingReceiptIndex].upload : ''),
      reasonForReturn: formData.receiptReasonForReturn,
      totalValue: ((parseFloat(formData.receiptInvoiceValueWithoutGST) || 0) + 
           (parseFloat(formData.receiptGSTValue) || 0)) * 
           (parseFloat(formData.receiptQuantity) || 1)
    };

    // Auto-populate root fields if empty
    setFormData(prev => ({
      ...prev,
      workCategory: prev.workCategory || receiptData.workCategory,
      partName: prev.partName || receiptData.partName,
      // For customerVendorName, prioritize receipt vendor if available
      customerVendorName: prev.customerVendorName || receiptData.vendorName || receiptData.customerVendorName
    }));

    if (editingReceiptIndex !== null) {
      // Update existing receipt
      setReceipts(prev => prev.map((receipt, idx) => 
        idx === editingReceiptIndex ? receiptData : receipt
      ));
      setEditingReceiptIndex(null);
      showNotification('Receipt updated successfully');
    } else {
      // Add new receipt
      setReceipts(prev => [...prev, receiptData]);
      showNotification('Receipt added successfully');
    }
    
    // Reset receipt form
    setFormData(prev => ({
      ...prev,
      receiptDate: '',
      receiptInvoiceNo: '',
      receiptInvoiceDate: '',
      receiptInvoiceValueWithoutGST: '',
      receiptGSTValue: '',
      receiptQuantity: '',
      receiptUpload: '',
      receiptReasonForReturn: ''
    }));
  };

  const addDispatch = () => {
    if (!formData.dispatchDate || !formData.dispatchPartName || !formData.dispatchQuantity) {
      showError('Please fill all required fields for dispatch');
      return;
    }

    const dispatchData = {
      date: formData.dispatchDate,
      workCategory: formData.dispatchWorkCategory || formData.workCategory,
      partName: formData.dispatchPartName,
      dispatchCategory: formData.dispatchCategory,
      customerName: formData.dispatchCustomerName,
      invoiceNo: formData.dispatchInvoiceNo,
      invoiceDate: formData.dispatchInvoiceDate,
      invoiceValueWithoutGST: parseFloat(formData.dispatchInvoiceValueWithoutGST) || 0,
      gstValue: parseFloat(formData.dispatchGSTValue) || 0,
      quantity: parseFloat(formData.dispatchQuantity) || 0,
      unit: formData.dispatchUnit,
      upload: formData.dispatchUpload || (editingDispatchIndex !== null ? dispatches[editingDispatchIndex].upload : ''),
      reasonForRejection: formData.dispatchReasonForRejection,
      totalValue: ((parseFloat(formData.dispatchInvoiceValueWithoutGST) || 0) + 
           (parseFloat(formData.dispatchGSTValue) || 0)) * 
           (parseFloat(formData.dispatchQuantity) || 1)
    };

    // Auto-populate root fields if empty
    setFormData(prev => ({
      ...prev,
      workCategory: prev.workCategory || dispatchData.workCategory,
      partName: prev.partName || dispatchData.partName,
      // For customerVendorName, prioritize dispatch customer if available
      customerVendorName: prev.customerVendorName || dispatchData.customerName || dispatchData.customerVendorName
    }));

    if (editingDispatchIndex !== null) {
      // Update existing dispatch
      setDispatches(prev => prev.map((dispatch, idx) => 
        idx === editingDispatchIndex ? dispatchData : dispatch
      ));
      setEditingDispatchIndex(null);
      showNotification('Dispatch updated successfully');
    } else {
      // Add new dispatch
      setDispatches(prev => [...prev, dispatchData]);
      showNotification('Dispatch added successfully');
    }
    
    // Reset dispatch form
    setFormData(prev => ({
      ...prev,
      dispatchDate: '',
      dispatchInvoiceNo: '',
      dispatchInvoiceDate: '',
      dispatchInvoiceValueWithoutGST: '',
      dispatchGSTValue: '',
      dispatchQuantity: '',
      dispatchUpload: '',
      dispatchReasonForRejection: ''
    }));
  };

  const removeReceipt = (index) => {
    setReceipts(prev => prev.filter((_, i) => i !== index));
    showNotification('Receipt removed');
  };

  const removeDispatch = (index) => {
    setDispatches(prev => prev.filter((_, i) => i !== index));
    showNotification('Dispatch removed');
  };

  const editReceipt = (index) => {
    const receipt = receipts[index];
    setFormData(prev => ({
      ...prev,
      receiptDate: formatDateForInput(receipt.date),
      receiptCategory: receipt.receiptCategory,
      receiptWorkCategory: receipt.workCategory,
      receiptPartName: receipt.partName,
      receiptVendorName: receipt.vendorName || receipt.customerVendorName,
      receiptInvoiceNo: receipt.invoiceNo,
      receiptInvoiceDate: formatDateForInput(receipt.invoiceDate),
      receiptInvoiceValueWithoutGST: receipt.invoiceValueWithoutGST,
      receiptGSTValue: receipt.gstValue,
      receiptQuantity: receipt.quantity,
      receiptUnit: receipt.unit,
      receiptUpload: '',  // Cannot set file input value for security reasons
      receiptReasonForReturn: receipt.reasonForReturn
    }));
    setEditingReceiptIndex(index);
    showNotification('Editing receipt - modify and click "Update Receipt"');
  };

  const editDispatch = (index) => {
    const dispatch = dispatches[index];
    setFormData(prev => ({
      ...prev,
      dispatchDate: formatDateForInput(dispatch.date),
      dispatchCategory: dispatch.dispatchCategory,
      dispatchWorkCategory: dispatch.workCategory,
      dispatchPartName: dispatch.partName,
      dispatchCustomerName: dispatch.customerName || dispatch.customerVendorName,
      dispatchInvoiceNo: dispatch.invoiceNo,
      dispatchInvoiceDate: formatDateForInput(dispatch.invoiceDate),
      dispatchInvoiceValueWithoutGST: dispatch.invoiceValueWithoutGST,
      dispatchGSTValue: dispatch.gstValue,
      dispatchQuantity: dispatch.quantity,
      dispatchUnit: dispatch.unit,
      dispatchUpload: '',  // Cannot set file input value for security reasons
      dispatchReasonForRejection: dispatch.reasonForRejection
    }));
    setEditingDispatchIndex(index);
    showNotification('Editing dispatch - modify and click "Update Dispatch"');
  };

  // Handler for updating row category
  const handleRowCategoryChange = (rowId, newCategory) => {
    setRowData(prev => prev.map(row => 
      row.id === rowId ? { ...row, category: newCategory } : row
    ));
  };

  // Handler for updating row vendor names (multi-select)
  const handleRowVendorChange = (rowId, vendorName) => {
    setRowData(prev => prev.map(row => {
      if (row.id === rowId) {
        const currentVendors = row.vendorNames || [];
        const isSelected = currentVendors.includes(vendorName);
        
        return {
          ...row,
          vendorNames: isSelected
            ? currentVendors.filter(v => v !== vendorName)
            : [...currentVendors, vendorName]
        };
      }
      return row;
    }));
  };

  // Helper function to get unique work categories from receipts and dispatches
  const getUniqueWorkCategories = () => {
    const categories = new Set();
    receipts.forEach(r => {
      if (r.workCategory) categories.add(r.workCategory);
    });
    dispatches.forEach(d => {
      if (d.workCategory) categories.add(d.workCategory);
    });
    return Array.from(categories);
  };

  // Helper function to get unique part names from receipts and dispatches
  const getUniquePartNames = () => {
    const partNames = new Set();
    receipts.forEach(r => {
      if (r.partName) partNames.add(r.partName);
    });
    dispatches.forEach(d => {
      if (d.partName) partNames.add(d.partName);
    });
    return Array.from(partNames);
  };

  // Helper function to get unique combinations of work category and part name
  const getUniqueCombinations = () => {
    const combinations = new Map();
    
    // Collect from receipts
    receipts.forEach(r => {
      const key = `${r.workCategory || ''}_${r.partName || ''}`;
      if (!combinations.has(key) && (r.workCategory || r.partName)) {
        combinations.set(key, {
          workCategory: r.workCategory || '-',
          partName: r.partName || '-'
        });
      }
    });
    
    // Collect from dispatches
    dispatches.forEach(d => {
      const key = `${d.workCategory || ''}_${d.partName || ''}`;
      if (!combinations.has(key) && (d.workCategory || d.partName)) {
        combinations.set(key, {
          workCategory: d.workCategory || '-',
          partName: d.partName || '-'
        });
      }
    });
    
    return Array.from(combinations.values());
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Auto-populate required fields from receipts/dispatches if missing
    let finalCustomerVendorName = formData.customerVendorName;
    let finalWorkCategory = formData.workCategory;
    let finalPartName = formData.partName;

    if (!finalCustomerVendorName || !finalWorkCategory || !finalPartName) {
      const firstSource = receipts[0] || dispatches[0];
      if (firstSource) {
        finalCustomerVendorName = finalCustomerVendorName || firstSource.vendorName || firstSource.customerName || firstSource.customerVendorName;
        finalWorkCategory = finalWorkCategory || firstSource.workCategory;
        finalPartName = finalPartName || firstSource.partName;
      }
    }

    const inventoryData = {
      ...formData,
      customerVendorName: finalCustomerVendorName,
      workCategory: finalWorkCategory,
      partName: finalPartName,
      receipts,
      dispatches,
      rowData  // Include row-specific data
    };

    try {
      if (inventory) {
        await inventoryAPI.update(inventory._id, inventoryData);
      } else {
        await inventoryAPI.create(inventoryData);
      }
      
      onSubmit();
    } catch (error) {
      console.error('Error saving inventory:', error);
      showError(error.response?.data?.message || 'Failed to save inventory');
    }
  };

  const calculateTotalValue = () => {
    // Separate regular receipts from returns
    const regularReceipts = receipts.filter(r => r.receiptCategory !== 'return');
    const returns = receipts.filter(r => r.receiptCategory === 'return');
    
    // Calculate totals for regular receipts only
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Calculate dispatch totals
    const dispatchesTotal = dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchesQty = dispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate return totals
    const returnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const returnsQuantity = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    return {
      // Stock at Factory: Only regular receipts minus dispatches (NO returns)
      stockAtFactory: Math.max(0, regularReceiptsQty - dispatchesQty),
      stockValueAtFactory: regularReceiptsTotal - dispatchesTotal,
      
      stockSentToCustomer: dispatchesQty,
      stockValueSentToCustomer: dispatchesTotal,
      
      // Returns tracked separately
      stockReturnFromCustomer: returnsQuantity,
      
      // Total stock includes both factory stock and returns
      totalStock: Math.max(0, regularReceiptsQty - dispatchesQty) + returnsQuantity,
      totalStockValue: (regularReceiptsTotal - dispatchesTotal) + returnsTotal,
      
      inventoryAtFactoryValue: regularReceiptsTotal - dispatchesTotal,
      inventoryAtCustomerEndValue: dispatchesTotal,
      inventoryReturnFromCustomerValue: returnsTotal,
      totalInventoryValue: regularReceiptsTotal + returnsTotal
    };
  };

  // Function to calculate reorder level based on dispatch history
  const calculateReorderLevel = () => {
    if (dispatches.length > 0) {
      // Calculate average monthly consumption from dispatches
      const totalDispatched = dispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
      
      // Get date range of dispatches
      const dispatchDates = dispatches.map(d => new Date(d.date)).filter(d => !isNaN(d.getTime()));
      
      if (dispatchDates.length > 0) {
        const oldestDate = new Date(Math.min(...dispatchDates));
        const newestDate = new Date(Math.max(...dispatchDates));
        const daysDiff = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24));
        const monthsDiff = Math.max(1, daysDiff / 30);
        
        // Average monthly consumption
        const avgMonthlyConsumption = totalDispatched / monthsDiff;
        
        // Set reorder level to 30% of average monthly consumption (about 9 days worth)
        return Math.ceil(avgMonthlyConsumption * 0.3);
      }
    } else if (receipts.length > 0) {
      // If no dispatches yet, use 20% of total received as reorder level
      const totalReceived = receipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
      return Math.ceil(totalReceived * 0.2);
    }
    
    return 0;
  };

  // Function to determine reorder status based on current stock and reorder level
  const getReorderStatus = () => {
    if (!summaryData) return null;
    
    const currentStock = summaryData.stockAtFactory || 0;
    const reorderLevel = parseFloat(formData.reOrderLevel) || 0;
    
    // Out of Stock: stock is 0 or negative
    if (currentStock <= 0) {
      return {
        status: 'Out of Stock',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '🚫',
        message: 'Stock is depleted. Immediate reorder required!'
      };
    }
    
    // Low Quantity: stock is at or below reorder level
    if (currentStock <= reorderLevel) {
      return {
        status: 'Low Quantity',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⚠️',
        message: `Stock is at or below reorder level (${reorderLevel}). Consider reordering.`
      };
    }
    
    // Excess Quantity: stock is more than 3x the reorder level
    if (reorderLevel > 0 && currentStock > (reorderLevel * 3)) {
      return {
        status: 'Excess Quantity',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: '📦',
        message: `Stock is significantly above reorder level. Current: ${currentStock}, Reorder Level: ${reorderLevel}`
      };
    }
    
    // Normal: stock is above reorder level but not excessive
    return {
      status: 'Normal',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: '✅',
      message: `Stock levels are healthy. Current: ${currentStock}, Reorder Level: ${reorderLevel}`
    };
  };

  useEffect(() => {
    const calculated = calculateTotalValue();
    setSummaryData(calculated);
    
    // Auto-calculate reorder level when there's no existing reorder level
    if (!inventory || !inventory.reOrderLevel) {
      const calculatedReorderLevel = calculateReorderLevel();
      setFormData(prev => ({
        ...prev,
        reOrderLevel: calculatedReorderLevel
      }));
    }
  }, [receipts, dispatches]);

  // Sync rowData with unique combinations
  useEffect(() => {
    const combinations = getUniqueCombinations();
    
    // If we have combinations, create rows for each
    if (combinations.length > 0) {
      const newRowData = combinations.map((combo, index) => {
        // Try to find existing row data for this combination
        const existingRow = rowData.find(r => r.id === index + 1);
        return {
          id: index + 1,
          workCategory: combo.workCategory,
          partName: combo.partName,
          category: existingRow?.category || 'In house',
          vendorNames: existingRow?.vendorNames || []
        };
      });
      setRowData(newRowData);
    } else {
      // If no combinations, keep default 2 rows
      if (rowData.length === 0 || !rowData[0].workCategory) {
        setRowData([
          { id: 1, category: 'In house', vendorNames: [] },
          { id: 2, category: 'Bought-out', vendorNames: [] }
        ]);
      }
    }
  }, [receipts, dispatches]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'summary'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`py-2 px-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'receipts'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Receipts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dispatches')}
            className={`py-2 px-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'dispatches'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dispatches
          </button>
        </nav>
      </div>

      {/* Summary Tab */}
     {/* Summary Tab */}
{activeTab === 'summary' && (
  <div className="space-y-6">
    {/* Header inputs */}
  

    {/* Summary Table - Exact match to image */}
    <InventorySummaryTable
      rowData={rowData}
      vendors={vendors}
      reOrderLevel={formData.reOrderLevel}
      receipts={receipts}
      dispatches={dispatches}
      onRowCategoryChange={handleRowCategoryChange}
      onRowVendorChange={handleRowVendorChange}
      readOnly={false}
    />

    {/* Remarks section */}
    <div className="mt-6">
      <FloatingInput
        label="Remarks"
        name="remarks"
        value={formData.remarks}
        onChange={handleInputChange}
        type="textarea"
        rows={4}
      />
    </div>
  </div>
)}
      {/* Receipts Tab */}
      {activeTab === 'receipts' && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Receipt</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Date"
                name="receiptDate"
                value={formData.receiptDate}
                onChange={handleInputChange}
                type="date"
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
                name="receiptWorkCategory"
                value={formData.receiptWorkCategory}
                onChange={handleInputChange}
                maxLength={30}
              />
              
              <FloatingInput
                label="Part Name"
                name="receiptPartName"
                value={formData.receiptPartName}
                onChange={handleInputChange}
                type="select"
                options={parts.map(p => ({ value: p.partName, label: p.partName }))}
              />
              
              <FloatingInput
                label="Vendor Name"
                name="receiptVendorName"
                value={formData.receiptVendorName}
                onChange={handleInputChange}
                type="select"
                options={vendors.map(v => ({ value: v.vendorName, label: v.vendorName }))}
              />
              
              {formData.receiptCategory === 'buy' && (
                <>
                  <FloatingInput
                    label="Invoice No"
                    name="receiptInvoiceNo"
                    value={formData.receiptInvoiceNo}
                    onChange={handleInputChange}
                    maxLength={30}
                  />
                  
                  <FloatingInput
                    label="Invoice Date"
                    name="receiptInvoiceDate"
                    value={formData.receiptInvoiceDate}
                    onChange={handleInputChange}
                    type="date"
                  />
                  
                  <FloatingInput
                    label="Invoice Value without GST (₹)"
                    name="receiptInvoiceValueWithoutGST"
                    value={formData.receiptInvoiceValueWithoutGST}
                    onChange={handleInputChange}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </>
              )}
              
              <FloatingInput
                label="GST Value (₹)"
                name="receiptGSTValue"
                value={formData.receiptGSTValue}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                disabled
              />
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <FloatingInput
                  label="Quantity"
                  name="receiptQuantity"
                  value={formData.receiptQuantity}
                  onChange={handleInputChange}
                  type="number"
                  min="0"
                  max="9999"
                  step="1"
                />
                
                <FloatingInput
                  label="Unit"
                  name="receiptUnit"
                  value={formData.receiptUnit}
                  onChange={handleInputChange}
                  disabled
                />
                
                <FloatingInput
                  label="Upload"
                  name="receiptUpload"
                  value={formData.receiptUpload}
                  onChange={handleInputChange}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              
              {formData.receiptCategory === 'return' && (
                <div className="md:col-span-2">
                  <FloatingInput
                    label="Reason for Return"
                    name="receiptReasonForReturn"
                    value={formData.receiptReasonForReturn}
                    onChange={handleInputChange}
                    type="textarea"
                    rows={3}
                    maxLength={30}
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addReceipt}
                className={`mt-4 inline-flex items-center px-4 py-2 ${
                  editingReceiptIndex !== null 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              >
                {editingReceiptIndex !== null ? 'Update Receipt' : 'Add Receipt'}
              </button>
              {editingReceiptIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReceiptIndex(null);
                    setFormData(prev => ({
                      ...prev,
                      receiptDate: '',
                      receiptInvoiceNo: '',
                      receiptInvoiceDate: '',
                      receiptInvoiceValueWithoutGST: '',
                      receiptGSTValue: '',
                      receiptQuantity: '',
                      receiptUpload: '',
                      receiptReasonForReturn: ''
                    }));
                    showNotification('Edit cancelled');
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Receipts List */}
          {receipts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipts List ({receipts.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Upload</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipts.map((receipt, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {new Date(receipt.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 capitalize">
                          {receipt.receiptCategory}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {receipt.partName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {receipt.quantity}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {receipt.unit}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          ₹{receipt.invoiceValueWithoutGST?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          ₹{receipt.gstValue?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                          ₹{(receipt.totalValue || ((receipt.invoiceValueWithoutGST || 0) + (receipt.gstValue || 0)))?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {receipt.upload && (receipt.upload.startsWith('data:') || receipt.upload.startsWith('http')) ? (
                            <button
                              type="button"
                              onClick={() => viewUpload(receipt.upload)}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              title="View Upload"
                            >
                              <FaEye className="text-lg" />
                            </button>
                          ) : receipt.upload ? (
                            <span className="text-orange-500 text-xs flex items-center gap-1" title="Invalid file path - please re-upload">
                              <FaFileUpload className="text-sm" />
                              Re-upload
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No file</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editReceipt(index)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Receipt"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeReceipt(index)}
                              className="text-red-600 hover:text-red-900"
                              title="Remove Receipt"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispatches Tab */}
      {activeTab === 'dispatches' && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Dispatch</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="Date"
                name="dispatchDate"
                value={formData.dispatchDate}
                onChange={handleInputChange}
                type="date"
              />
              
              <FloatingInput
                label="Dispatch Category"
                name="dispatchCategory"
                value={formData.dispatchCategory}
                onChange={handleInputChange}
                type="select"
                options={[
                  { value: 'dispatch', label: 'Dispatch' },
                  { value: 'return', label: 'Return' }
                ]}
              />
              
              <FloatingInput
                label="Work Category"
                name="dispatchWorkCategory"
                value={formData.dispatchWorkCategory}
                onChange={handleInputChange}
                maxLength={30}
              />
              
              <FloatingInput
                label="Part Name"
                name="dispatchPartName"
                value={formData.dispatchPartName}
                onChange={handleInputChange}
                type="select"
                options={parts.map(p => ({ value: p.partName, label: p.partName }))}
              />
              
                <FloatingInput
                  label="Customer Name"
                  name="dispatchCustomerName"
                  value={formData.dispatchCustomerName}
                  onChange={handleInputChange}
                  type="select"
                  options={customers.map(c => ({ value: c.customerName, label: c.customerName }))}
                />
                
              <FloatingInput
                label="GST Value (₹)"
                name="dispatchGSTValue"
                value={formData.dispatchGSTValue}
                onChange={handleInputChange}
                type="number"
                min="0"
                step="0.01"
                disabled
              />
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <FloatingInput
                  label="Quantity"
                  name="dispatchQuantity"
                  value={formData.dispatchQuantity}
                  onChange={handleInputChange}
                  type="number"
                  min="0"
                  max="9999"
                  step="1"
                />
                
                <FloatingInput
                  label="Unit"
                  name="dispatchUnit"
                  value={formData.dispatchUnit}
                  onChange={handleInputChange}
                  disabled
                />
                
                <FloatingInput
                  label="Upload"
                  name="dispatchUpload"
                  value={formData.dispatchUpload}
                  onChange={handleInputChange}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              
              <div className="md:col-span-2">
                <FloatingInput
                  label="Reason for Rejection"
                  name="dispatchReasonForRejection"
                  value={formData.dispatchReasonForRejection}
                  onChange={handleInputChange}
                  type="textarea"
                  rows={3}
                  maxLength={30}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addDispatch}
                className={`mt-4 inline-flex items-center px-4 py-2 ${
                  editingDispatchIndex !== null 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-orange-600 hover:bg-orange-700'
                } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
              >
                {editingDispatchIndex !== null ? 'Update Dispatch' : 'Add Dispatch'}
              </button>
              {editingDispatchIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDispatchIndex(null);
                    setFormData(prev => ({
                      ...prev,
                      dispatchDate: '',
                      dispatchInvoiceNo: '',
                      dispatchInvoiceDate: '',
                      dispatchInvoiceValueWithoutGST: '',
                      dispatchGSTValue: '',
                      dispatchQuantity: '',
                      dispatchUpload: '',
                      dispatchReasonForRejection: ''
                    }));
                    showNotification('Edit cancelled');
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Dispatches List */}
          {dispatches.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispatches List ({dispatches.length})</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Upload</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dispatches.map((dispatch, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {new Date(dispatch.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900 capitalize">
                          {dispatch.dispatchCategory}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {dispatch.partName}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {dispatch.quantity}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {dispatch.unit}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          ₹{dispatch.invoiceValueWithoutGST?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          ₹{dispatch.gstValue?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                          ₹{(dispatch.totalValue || ((dispatch.invoiceValueWithoutGST || 0) + (dispatch.gstValue || 0)))?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {dispatch.upload && (dispatch.upload.startsWith('data:') || dispatch.upload.startsWith('http')) ? (
                            <button
                              type="button"
                              onClick={() => viewUpload(dispatch.upload)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Upload"
                            >
                              <FaEye className="text-lg" />
                            </button>
                          ) : dispatch.upload ? (
                            <span className="text-orange-500 text-xs flex items-center gap-1" title="Invalid file path - please re-upload">
                              <FaFileUpload className="text-sm" />
                              Re-upload
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No file</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editDispatch(index)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Dispatch"
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDispatch(index)}
                              className="text-red-600 hover:text-red-900"
                              title="Remove Dispatch"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          {inventory ? 'Update Inventory' : 'Create Inventory'}
        </button>
      </div>
    </form>
  );
};

export default InventoryForm;
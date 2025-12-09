import React, { useState, useEffect, useRef } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  TableCellsIcon,
  FolderArrowDownIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  ArchiveBoxIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from 'xlsx';
import InventoryForm from "../components/Forms/InventoryForm";
import Modal from "../components/Modals/Modal";
import Notification from "../components/Notifications/Notification";
import useNotification from "../hooks/useNotification";
import api, { inventoryAPI } from "../services/api";

const InventoryManagement = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({
    workCategory: "",
    partName: "",
    customerVendorName: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [uniqueWorkCategories, setUniqueWorkCategories] = useState([]);
  const [uniquePartNames, setUniquePartNames] = useState([]);
  const [uniqueCustomerVendors, setUniqueCustomerVendors] = useState([]);
  
  // Excel Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Ref for dropdown
  const exportMenuRef = useRef(null);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, filters, currentPage, itemsPerPage]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      const items = response.data || response;
      
      if (!Array.isArray(items)) {
        console.error('Expected array but got:', items);
        setInventoryItems([]);
        setFilteredItems([]);
        return;
      }
      
      const processedItems = items.map((item) => ({
        ...item,
        customerVendorName: item.customerVendorName || "",
        reOrderLevel: parseFloat(item.reOrderLevel) || 0,
        stockAtFactory: parseFloat(item.stockAtFactory) || 0,
        stockValueAtFactory: parseFloat(item.stockValueAtFactory) || 0,
        stockSentToCustomer: parseFloat(item.stockSentToCustomer) || 0,
        stockValueSentToCustomer: parseFloat(item.stockValueSentToCustomer) || 0,
        stockReturnFromCustomer: parseFloat(item.stockReturnFromCustomer) || 0,
        totalStock: parseFloat(item.totalStock) || 0,
        totalStockValue: parseFloat(item.totalStockValue) || 0,
        inventoryAtFactoryValue: parseFloat(item.inventoryAtFactoryValue) || 0,
        inventoryAtCustomerEndValue: parseFloat(item.inventoryAtCustomerEndValue) || 0,
        inventoryReturnFromCustomerValue: parseFloat(item.inventoryReturnFromCustomerValue) || 0,
        totalInventoryValue: parseFloat(item.totalInventoryValue) || 0,
        receipts: item.receipts || [],
        dispatches: item.dispatches || [],
        remarks: item.remarks || "",
      }));
      
      setInventoryItems(processedItems);

      const workCategories = [...new Set(processedItems.map((item) => item.workCategory))].filter(Boolean);
      setUniqueWorkCategories(workCategories);

      const partNames = [...new Set(processedItems.map((item) => item.partName))].filter(Boolean);
      setUniquePartNames(partNames);

      const customerVendors = [...new Set(processedItems.map((item) => item.customerVendorName))].filter(Boolean);
      setUniqueCustomerVendors(customerVendors);
      
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      showError("Failed to fetch inventory items");
      setInventoryItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...inventoryItems];

    if (filters.workCategory) {
      filtered = filtered.filter((item) =>
        item.workCategory?.toLowerCase().includes(filters.workCategory.toLowerCase())
      );
    }

    if (filters.partName) {
      filtered = filtered.filter((item) =>
        item.partName?.toLowerCase().includes(filters.partName.toLowerCase())
      );
    }

    if (filters.customerVendorName) {
      filtered = filtered.filter((item) =>
        item.customerVendorName?.toLowerCase().includes(filters.customerVendorName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter((item) => {
        const stockLevel = item.stockAtFactory || 0;
        const reOrderLevel = item.reOrderLevel || 0;

        switch (filters.status) {
          case "in-stock":
            return stockLevel > 0;
          case "low-stock":
            return stockLevel > 0 && stockLevel <= reOrderLevel;
          case "out-of-stock":
            return stockLevel <= 0;
          case "excess-stock":
            return stockLevel > (reOrderLevel * 1.5);
          default:
            return true;
        }
      });
    }

    setFilteredItems(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      workCategory: "",
      partName: "",
      customerVendorName: "",
      status: "",
    });
  };

  const getStockStatus = (item) => {
    const stockLevel = item.stockAtFactory || 0;
    const reOrderLevel = item.reOrderLevel || 0;

    if (stockLevel <= 0) {
      return { status: "Out of Stock", color: "red", bgColor: "bg-red-100", textColor: "text-red-800" };
    } else if (stockLevel <= reOrderLevel) {
      return { status: "Low Stock", color: "yellow", bgColor: "bg-yellow-100", textColor: "text-yellow-800" };
    } else if (reOrderLevel > 0 && stockLevel > (reOrderLevel * 3)) {
      return { status: "Excess Stock", color: "purple", bgColor: "bg-purple-100", textColor: "text-purple-800" };
    } else {
      return { status: "In Stock", color: "green", bgColor: "bg-green-100", textColor: "text-green-800" };
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // View item details
  const handleView = (item) => {
    setSelectedItem(item);
    setViewModal(true);
  };

  // Edit item
  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // Delete item
  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await inventoryAPI.delete(itemToDelete._id);
      showSuccess("Inventory item deleted successfully");
      fetchInventoryItems();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      showError("Failed to delete inventory item");
    }
  };

  // Handle form submission
  const handleFormSubmit = async (isEdit = false) => {
    setShowModal(false);
    setEditingItem(null);
    showSuccess(
      isEdit
        ? "Inventory item updated successfully"
        : "Inventory item added successfully"
    );
    setTimeout(() => {
      fetchInventoryItems();
    }, 500);
  };

  // Calculate KPI totals
  const calculateKPIs = () => {
    const totalItems = inventoryItems.length;
    const totalStockValue = inventoryItems.reduce((sum, item) => sum + (item.totalStockValue || 0), 0);
    const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.totalInventoryValue || 0), 0);
    
    // Count items by stock status
    const outOfStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      return stockLevel <= 0;
    }).length;
    
    const lowStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      const reOrderLevel = item.reOrderLevel || 0;
      // Low stock: stock is above 0, reorder level is set (> 0), and stock is at or below reorder level
      return reOrderLevel > 0 && stockLevel > 0 && stockLevel <= reOrderLevel;
    }).length;
    
    const excessStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      const reOrderLevel = item.reOrderLevel || 0;
      // Excess stock: stock is more than 3x the reorder level
      return reOrderLevel > 0 && stockLevel > (reOrderLevel * 3);
    }).length;

    return {
      totalItems,
      totalStockValue,
      totalInventoryValue,
      lowStockItems,
      outOfStockItems,
      excessStockItems
    };
  };

  // Calculate totals for a specific item
  const calculateItemTotals = (item) => {
    if (!item) return {
      receiptsTotal: 0,
      dispatchesTotal: 0,
      returnsTotal: 0,
      receiptsQuantity: 0,
      dispatchesQuantity: 0,
      returnsQuantity: 0
    };
    
    const receiptsTotal = item.receipts?.reduce((sum, receipt) => sum + (receipt.totalValue || 0), 0) || 0;
    const dispatchesTotal = item.dispatches?.reduce((sum, dispatch) => sum + (dispatch.totalValue || 0), 0) || 0;
    const returnsTotal = item.receipts?.filter(r => r.receiptCategory === 'return')
      .reduce((sum, receipt) => sum + (receipt.totalValue || 0), 0) || 0;
    
    const receiptsQuantity = item.receipts?.reduce((sum, receipt) => sum + (receipt.quantity || 0), 0) || 0;
    const dispatchesQuantity = item.dispatches?.reduce((sum, dispatch) => sum + (dispatch.quantity || 0), 0) || 0;
    const returnsQuantity = item.receipts?.filter(r => r.receiptCategory === 'return')
      .reduce((sum, receipt) => sum + (receipt.quantity || 0), 0) || 0;
    
    return {
      receiptsTotal,
      dispatchesTotal,
      returnsTotal,
      receiptsQuantity,
      dispatchesQuantity,
      returnsQuantity
    };
  };

  // ===================== EXCEL EXPORT FUNCTIONS =====================

  // Helper function to format dates
  const formatDateForExcel = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN'); // DD/MM/YYYY format
    } catch (error) {
      return dateString;
    }
  };

  // Helper function to get formatted timestamp
  const getFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}`;
  };

  // Helper function to format currency for Excel
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "0.00";
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper function to get file type
  const getFileType = (uploadString) => {
    if (!uploadString) return "";
    if (uploadString.startsWith('data:')) {
      const match = uploadString.match(/data:(.*?);/);
      return match ? match[1].split('/')[1]?.toUpperCase() || "UNKNOWN" : "UNKNOWN";
    }
    if (uploadString.startsWith('http')) {
      const extension = uploadString.split('.').pop().toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
        return extension.toUpperCase();
      }
    }
    return "UNKNOWN";
  };

  // 1. Export Summary to Excel
  const exportSummaryToExcel = () => {
    try {
      setExporting(true);
      
      const worksheetData = [
        // Header Row
        [
          "Customer/Vendor Name",
          "Re-order Level",
          "Stock at Factory",
          "Stock Value at Factory (₹)",
          "Stock Sent to Customer",
          "Stock Value Sent to Customer (₹)",
          "Stock Return from Customer",
          "Total Stock",
          "Total Stock Value (₹)",
          "Inventory at Factory Value (₹)",
          "Inventory at Customer End Value (₹)",
          "Inventory Return from Customer Value (₹)",
          "Total Inventory Value (₹)",
          "Stock Status",
          "Remarks"
        ],
      ];

      // Add data rows
      filteredItems.forEach((item) => {
        const stockStatus = getStockStatus(item);
        
        worksheetData.push([
          item.customerVendorName || "N/A",
          item.reOrderLevel,
          item.stockAtFactory,
          formatCurrency(item.stockValueAtFactory),
          item.stockSentToCustomer,
          formatCurrency(item.stockValueSentToCustomer),
          item.stockReturnFromCustomer,
          item.totalStock,
          formatCurrency(item.totalStockValue),
          formatCurrency(item.inventoryAtFactoryValue),
          formatCurrency(item.inventoryAtCustomerEndValue),
          formatCurrency(item.inventoryReturnFromCustomerValue),
          formatCurrency(item.totalInventoryValue),
          stockStatus.status,
          item.remarks || ""
        ]);
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply styles
      const wscols = [
        { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
        { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 12 },
        { wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 28 }, { wch: 22 },
        { wch: 15 }, { wch: 30 },
      ];
      ws['!cols'] = wscols;

      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "2C3E50" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Summary");

      // Generate and download Excel file
      const fileName = `Inventory_Summary_${getFormattedDate()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSuccess("Summary exported to Excel successfully");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      showError("Failed to export to Excel");
    } finally {
      setExporting(false);
    }
  };

  // 2. Export Receipts to Excel
  const exportReceiptsToExcel = () => {
    try {
      setExporting(true);
      
      const allReceipts = [];
      
      // Collect all receipts from filtered items
      filteredItems.forEach((item) => {
        if (item.receipts && item.receipts.length > 0) {
          item.receipts.forEach((receipt) => {
            allReceipts.push({
              ...receipt,
              inventoryId: item._id,
              inventoryPartName: item.partName,
              inventoryCustomerVendor: item.customerVendorName,
              inventoryWorkCategory: item.workCategory,
            });
          });
        }
      });

      if (allReceipts.length === 0) {
        showError("No receipt data available to export");
        setExporting(false);
        return;
      }

      const worksheetData = [
        // Header Row
        [
          "Receipt Date",
          "Receipt Category",
          "Work Category",
          "Part Name",
          "Invoice Number",
          "Invoice Date",
          "Invoice Value without GST (₹)",
          "GST Value (₹)",
          "GST Percentage (%)",
          "Quantity",
          "Unit",
          "Total Receipt Value (₹)",
          "Upload File Status",
          "File Type",
          "Reason for Return"
        ],
      ];

      // Add data rows
      allReceipts.forEach((receipt) => {
        const gstPercentage = receipt.gstValue && receipt.invoiceValueWithoutGST 
          ? ((receipt.gstValue / receipt.invoiceValueWithoutGST) * 100).toFixed(2)
          : "18.00";
        
        const uploadStatus = receipt.upload 
          ? (receipt.upload.startsWith('data:') || receipt.upload.startsWith('http') ? "Available" : "Not Available")
          : "Not Available";
        
        const fileType = receipt.upload ? getFileType(receipt.upload) : "";

        const totalValue = receipt.totalValue || 
          ((receipt.invoiceValueWithoutGST || 0) + (receipt.gstValue || 0)) * (receipt.quantity || 1);

        worksheetData.push([

          formatDateForExcel(receipt.date),
          receipt.receiptCategory || "",
          receipt.workCategory || receipt.inventoryWorkCategory || "",
          receipt.partName || receipt.inventoryPartName || "",
          receipt.invoiceNo || "",
          formatDateForExcel(receipt.invoiceDate),
          formatCurrency(receipt.invoiceValueWithoutGST),
          formatCurrency(receipt.gstValue),
          gstPercentage,
          receipt.quantity || 0,
          receipt.unit || "",
          formatCurrency(totalValue),
          uploadStatus,
          fileType,
          receipt.reasonForReturn || ""
        ]);
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply column widths
      const wscols = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 12 },
        { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 15 },
        { wch: 12 }, { wch: 25 },
      ];
      ws['!cols'] = wscols;

      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "27AE60" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      XLSX.utils.book_append_sheet(wb, ws, "Receipts");

      const fileName = `Inventory_Receipts_${getFormattedDate()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSuccess("Receipts exported to Excel successfully");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error exporting receipts to Excel:", error);
      showError("Failed to export receipts to Excel");
    } finally {
      setExporting(false);
    }
  };

  // 3. Export Dispatches to Excel
  const exportDispatchesToExcel = () => {
    try {
      setExporting(true);
      
      const allDispatches = [];
      
      // Collect all dispatches from filtered items
      filteredItems.forEach((item) => {
        if (item.dispatches && item.dispatches.length > 0) {
          item.dispatches.forEach((dispatch) => {
            allDispatches.push({
              ...dispatch,
              inventoryId: item._id,
              inventoryPartName: item.partName,
              inventoryCustomerVendor: item.customerVendorName,
              inventoryWorkCategory: item.workCategory,
            });
          });
        }
      });

      if (allDispatches.length === 0) {
        showError("No dispatch data available to export");
        setExporting(false);
        return;
      }

      const worksheetData = [
        // Header Row
        [
          "Dispatch Date",
          "Dispatch Category",
          "Work Category",
          "Part Name",
          "GST Value (₹)",
          "GST Percentage (%)",
          "Quantity",
          "Unit",
          "Total Dispatch Value (₹)",
          "Upload File Status",
          "File Type",
          "Reason for Rejection",
        ],
      ];

      // Add data rows
      allDispatches.forEach((dispatch) => {
        const gstPercentage = dispatch.gstValue && dispatch.invoiceValueWithoutGST 
          ? ((dispatch.gstValue / dispatch.invoiceValueWithoutGST) * 100).toFixed(2)
          : "18.00";
        
        const uploadStatus = dispatch.upload 
          ? (dispatch.upload.startsWith('data:') || dispatch.upload.startsWith('http') ? "Available" : "Not Available")
          : "Not Available";
        
        const fileType = dispatch.upload ? getFileType(dispatch.upload) : "";

        const totalValue = dispatch.totalValue || 
          ((dispatch.invoiceValueWithoutGST || 0) + (dispatch.gstValue || 0)) * (dispatch.quantity || 1);

        worksheetData.push([
          formatDateForExcel(dispatch.date),
          dispatch.dispatchCategory || "",
          dispatch.workCategory || dispatch.inventoryWorkCategory || "",
          dispatch.partName || dispatch.inventoryPartName || "",
          formatCurrency(dispatch.gstValue),
          gstPercentage,
          dispatch.quantity || 0,
          dispatch.unit || "",
          formatCurrency(totalValue),
          uploadStatus,
          fileType,
          dispatch.reasonForRejection || "",
        ]);
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply column widths
      const wscols = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 12 },
        { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 15 },
        { wch: 12 }, { wch: 25 }, { wch: 30 },
      ];
      ws['!cols'] = wscols;

      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "E67E22" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      XLSX.utils.book_append_sheet(wb, ws, "Dispatches");

      const fileName = `Inventory_Dispatches_${getFormattedDate()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSuccess("Dispatches exported to Excel successfully");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error exporting dispatches to Excel:", error);
      showError("Failed to export dispatches to Excel");
    } finally {
      setExporting(false);
    }
  };

  // 4. Export Transaction Summary to Excel
  const exportTransactionSummaryToExcel = () => {
    try {
      setExporting(true);
      
      const worksheetData = [
        // Header Row
        [
          "Part Name",
          "Customer/Vendor Name",
          "Total Receipts Count",
          "Total Receipts Quantity",
          "Total Receipts Value (₹)",
          "Total Dispatches Count",
          "Total Dispatches Quantity",
          "Total Dispatches Value (₹)",
          "Returns Count",
          "Returns Quantity",
          "Returns Value (₹)",
          "Current Stock",
          "Stock Value (₹)",
        ],
      ];

      // Add data rows
      filteredItems.forEach((item) => {
        const receiptsCount = item.receipts?.length || 0;
        const dispatchesCount = item.dispatches?.length || 0;
        const returnsCount = item.receipts?.filter(r => r.receiptCategory === 'return').length || 0;
        
        const totals = calculateItemTotals(item);
        
        // Find last transaction date
        let lastTransactionDate = "";
        const allDates = [
          ...(item.receipts || []).map(r => r.date),
          ...(item.dispatches || []).map(d => d.date)
        ].filter(Boolean);
        
        if (allDates.length > 0) {
          lastTransactionDate = formatDateForExcel(new Date(Math.max(...allDates.map(d => new Date(d)))));
        }

        worksheetData.push([
          item.partName || "N/A",
          item.customerVendorName || "N/A",
          receiptsCount,
          totals.receiptsQuantity,
          formatCurrency(totals.receiptsTotal),
          dispatchesCount,
          totals.dispatchesQuantity,
          formatCurrency(totals.dispatchesTotal),
          returnsCount,
          totals.returnsQuantity,
          formatCurrency(totals.returnsTotal),
          item.stockAtFactory,
          formatCurrency(item.stockValueAtFactory),
        ]);
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply column widths
      const wscols = [
        { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 },
      ];
      ws['!cols'] = wscols;

      // Style header row
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[cell_address]) continue;
        ws[cell_address].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "8E44AD" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      XLSX.utils.book_append_sheet(wb, ws, "Transaction Summary");

      const fileName = `Inventory_Transaction_Summary_${getFormattedDate()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSuccess("Transaction summary exported to Excel successfully");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error exporting transaction summary to Excel:", error);
      showError("Failed to export transaction summary to Excel");
    } finally {
      setExporting(false);
    }
  };

  // 5. Export All to Excel (Multiple Sheets in One File)
  const exportAllToExcel = () => {
    try {
      setExporting(true);
      
      const wb = XLSX.utils.book_new();
      const timestamp = getFormattedDate();

      // Sheet 1: Summary
      const summaryData = [
        ["Inventory Summary - Generated on: " + new Date().toLocaleString()],
        [""],
        [
          "Customer/Vendor Name",
          "Re-order Level",
          "Stock at Factory",
          "Stock Value at Factory (₹)",
          "Stock Sent to Customer",
          "Stock Value Sent to Customer (₹)",
          "Stock Return from Customer",
          "Total Stock",
          "Total Stock Value (₹)",
          "Inventory at Factory Value (₹)",
          "Inventory at Customer End Value (₹)",
          "Inventory Return from Customer Value (₹)",
          "Total Inventory Value (₹)",
          "Stock Status",
          "Remarks"
        ],
      ];

      filteredItems.forEach((item) => {
        const stockStatus = getStockStatus(item);
        summaryData.push([
          item.customerVendorName || "N/A",
          item.reOrderLevel,
          item.stockAtFactory,
          formatCurrency(item.stockValueAtFactory),
          item.stockSentToCustomer,
          formatCurrency(item.stockValueSentToCustomer),
          item.stockReturnFromCustomer,
          item.totalStock,
          formatCurrency(item.totalStockValue),
          formatCurrency(item.inventoryAtFactoryValue),
          formatCurrency(item.inventoryAtCustomerEndValue),
          formatCurrency(item.inventoryReturnFromCustomerValue),
          formatCurrency(item.totalInventoryValue),
          stockStatus.status,
          item.remarks || ""
        ]);
      });

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      // Sheet 2: Receipts
      const allReceipts = [];
      filteredItems.forEach((item) => {
        if (item.receipts && item.receipts.length > 0) {
          item.receipts.forEach((receipt) => {
            allReceipts.push({
              ...receipt,
              inventoryId: item._id,
              inventoryPartName: item.partName,
              inventoryCustomerVendor: item.customerVendorName,
              inventoryWorkCategory: item.workCategory,
            });
          });
        }
      });

      if (allReceipts.length > 0) {
        const receiptsData = [
          ["Receipts - Generated on: " + new Date().toLocaleString()],
          [""],
          [
            "Receipt Date",
            "Receipt Category",
            "Work Category",
            "Part Name",
            "Invoice Number",
            "Invoice Date",
            "Invoice Value without GST (₹)",
            "GST Value (₹)",
            "GST Percentage (%)",
            "Quantity",
            "Unit",
            "Total Receipt Value (₹)",
            "Upload File Status",
            "File Type",
            "Reason for Return"
          ],
        ];

        allReceipts.forEach((receipt) => {
          const gstPercentage = receipt.gstValue && receipt.invoiceValueWithoutGST 
            ? ((receipt.gstValue / receipt.invoiceValueWithoutGST) * 100).toFixed(2)
            : "18.00";
          
          const uploadStatus = receipt.upload 
            ? (receipt.upload.startsWith('data:') || receipt.upload.startsWith('http') ? "Available" : "Not Available")
            : "Not Available";
          
          const fileType = receipt.upload ? getFileType(receipt.upload) : "";

          const totalValue = receipt.totalValue || 
            ((receipt.invoiceValueWithoutGST || 0) + (receipt.gstValue || 0)) * (receipt.quantity || 1);

          receiptsData.push([
            formatDateForExcel(receipt.date),
            receipt.receiptCategory || "",
            receipt.workCategory || receipt.inventoryWorkCategory || "",
            receipt.partName || receipt.inventoryPartName || "",
            receipt.invoiceNo || "",
            formatDateForExcel(receipt.invoiceDate),
            formatCurrency(receipt.invoiceValueWithoutGST),
            formatCurrency(receipt.gstValue),
            gstPercentage,
            receipt.quantity || 0,
            receipt.unit || "",
            formatCurrency(totalValue),
            uploadStatus,
            fileType,
            receipt.reasonForReturn || ""
          ]);
        });

        const ws2 = XLSX.utils.aoa_to_sheet(receiptsData);
        XLSX.utils.book_append_sheet(wb, ws2, "Receipts");
      }

      // Sheet 3: Dispatches
      const allDispatches = [];
      filteredItems.forEach((item) => {
        if (item.dispatches && item.dispatches.length > 0) {
          item.dispatches.forEach((dispatch) => {
            allDispatches.push({
              ...dispatch,
              inventoryId: item._id,
              inventoryPartName: item.partName,
              inventoryCustomerVendor: item.customerVendorName,
              inventoryWorkCategory: item.workCategory,
            });
          });
        }
      });

      if (allDispatches.length > 0) {
        const dispatchesData = [
          ["Dispatches - Generated on: " + new Date().toLocaleString()],
          [""],
          [
            "Dispatch Date",
            "Dispatch Category",
            "Work Category",
            "Part Name",
            "Invoice Number",
            "Invoice Date",
            "GST Value (₹)",
            "GST Percentage (%)",
            "Quantity",
            "Unit",
            "Total Dispatch Value (₹)",
            "Upload File Status",
            "File Type",
            "Reason for Rejection",
          ],
        ];

        allDispatches.forEach((dispatch) => {
          const gstPercentage = dispatch.gstValue && dispatch.invoiceValueWithoutGST 
            ? ((dispatch.gstValue / dispatch.invoiceValueWithoutGST) * 100).toFixed(2)
            : "18.00";
          
          const uploadStatus = dispatch.upload 
            ? (dispatch.upload.startsWith('data:') || dispatch.upload.startsWith('http') ? "Available" : "Not Available")
            : "Not Available";
          
          const fileType = dispatch.upload ? getFileType(dispatch.upload) : "";

          const totalValue = dispatch.totalValue || 
            ((dispatch.invoiceValueWithoutGST || 0) + (dispatch.gstValue || 0)) * (dispatch.quantity || 1);

          dispatchesData.push([
            formatDateForExcel(dispatch.date),
            dispatch.dispatchCategory || "",
            dispatch.workCategory || dispatch.inventoryWorkCategory || "",
            dispatch.partName || dispatch.inventoryPartName || "",
            dispatch.invoiceNo || "",
            formatDateForExcel(dispatch.invoiceDate),
            formatCurrency(dispatch.invoiceValueWithoutGST),
            formatCurrency(dispatch.gstValue),
            gstPercentage,
            dispatch.quantity || 0,
            dispatch.unit || "",
            formatCurrency(totalValue),
            uploadStatus,
            fileType,
            dispatch.reasonForRejection || "",
            dispatch.destinationAddress || "Not Specified"
          ]);
        });

        const ws3 = XLSX.utils.aoa_to_sheet(dispatchesData);
        XLSX.utils.book_append_sheet(wb, ws3, "Dispatches");
      }

      // Sheet 4: Transaction Summary
      const transactionData = [
        ["Transaction Summary - Generated on: " + new Date().toLocaleString()],
        [""],
        [
          "Part Name",
          "Customer/Vendor Name",
          "Total Receipts Count",
          "Total Receipts Quantity",
          "Total Receipts Value (₹)",
          "Total Dispatches Count",
          "Total Dispatches Quantity",
          "Total Dispatches Value (₹)",
          "Returns Count",
          "Returns Quantity",
          "Returns Value (₹)",
          "Current Stock",
          "Stock Value (₹)",
        ],
      ];

      filteredItems.forEach((item) => {
        const receiptsCount = item.receipts?.length || 0;
        const dispatchesCount = item.dispatches?.length || 0;
        const returnsCount = item.receipts?.filter(r => r.receiptCategory === 'return').length || 0;
        
        const totals = calculateItemTotals(item);
        
        let lastTransactionDate = "";
        const allDates = [
          ...(item.receipts || []).map(r => r.date),
          ...(item.dispatches || []).map(d => d.date)
        ].filter(Boolean);
        
        if (allDates.length > 0) {
          lastTransactionDate = formatDateForExcel(new Date(Math.max(...allDates.map(d => new Date(d)))));
        }

        transactionData.push([
          item.partName || "N/A",
          item.customerVendorName || "N/A",
          receiptsCount,
          totals.receiptsQuantity,
          formatCurrency(totals.receiptsTotal),
          dispatchesCount,
          totals.dispatchesQuantity,
          formatCurrency(totals.dispatchesTotal),
          returnsCount,
          totals.returnsQuantity,
          formatCurrency(totals.returnsTotal),
          item.stockAtFactory,
          formatCurrency(item.stockValueAtFactory),
        ]);
      });

      const ws4 = XLSX.utils.aoa_to_sheet(transactionData);
      XLSX.utils.book_append_sheet(wb, ws4, "Transaction Summary");

      // Generate and download Excel file
      const fileName = `Inventory_Complete_Report_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showSuccess("Complete inventory report exported to Excel successfully");
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error exporting all to Excel:", error);
      showError("Failed to export complete report to Excel");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = calculateKPIs();

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 overflow-x-hidden">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <div className="w-full max-w-full">

        {/* KPI Cards Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">{kpis.totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₹{kpis.totalStockValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-yellow-200 bg-yellow-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-700">Low Stock Items</p>
                <p className="text-2xl font-semibold text-yellow-900">{kpis.lowStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-red-200 bg-red-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArchiveBoxIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-700">Out of Stock</p>
                <p className="text-2xl font-semibold text-red-900">{kpis.outOfStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-200 bg-purple-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Excess Stock</p>
                <p className="text-2xl font-semibold text-purple-900">{kpis.excessStockItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₹{kpis.totalInventoryValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.partName}
                    onChange={(e) =>
                      handleFilterChange("partName", e.target.value)
                    }
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by part name..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean)
                      ? "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).some(Boolean) && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length}
                    </span>
                  )}
                </button>

                {Object.values(filters).some(Boolean) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear
                  </button>
                )}

                {/* Export Excel Dropdown - SCROLLABLE VERSION */}
                <div className="relative" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exporting}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                        Export Excel
                        {showExportMenu ? (
                          <ChevronUpIcon className="h-4 w-4 ml-1" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 ml-1" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Export Dropdown Menu - SCROLLABLE */}
                  {showExportMenu && !exporting && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-xl z-50 border border-gray-200 overflow-hidden">
                      <div className="py-1">
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <ArrowUpTrayIcon className="h-5 w-5 text-white mr-2" />
                              <span className="text-sm font-semibold text-white">
                                Export to Excel
                              </span>
                            </div>
                            <button
                              onClick={() => setShowExportMenu(false)}
                              className="text-white hover:text-gray-200 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-blue-100 mt-1">
                            Choose export format
                          </p>
                        </div>
                        
                        {/* Scrollable Menu Items */}
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                         
                          
                          <button
                            onClick={exportSummaryToExcel}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 transition-colors duration-150"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">Summary Report</div>
                              <div className="text-xs text-gray-500">Main inventory overview</div>
                            </div>
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                              .xlsx
                            </div>
                          </button>

                          <button
                            onClick={exportReceiptsToExcel}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 border-b border-gray-100 transition-colors duration-150"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <ArrowDownTrayIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">Receipts Data</div>
                              <div className="text-xs text-gray-500">All receipt transactions</div>
                            </div>
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                              .xlsx
                            </div>
                          </button>

                          <button
                            onClick={exportDispatchesToExcel}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 border-b border-gray-100 transition-colors duration-150"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                              <ArrowUpIcon className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">Dispatches Data</div>
                              <div className="text-xs text-gray-500">All dispatch transactions</div>
                            </div>
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                              .xlsx
                            </div>
                          </button>

                          <button
                            onClick={exportTransactionSummaryToExcel}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 border-b border-gray-100 transition-colors duration-150"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <TableCellsIcon className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">Transaction Summary</div>
                              <div className="text-xs text-gray-500">Counts, quantities & totals</div>
                            </div>
                            <div className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">
                              .xlsx
                            </div>
                          </button>

                          {/* Complete Report */}
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-y border-gray-100">
                            COMPLETE REPORT
                          </div>
                          
                          <button
                            onClick={exportAllToExcel}
                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-150"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center mr-3">
                              <FolderArrowDownIcon className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="text-left flex-1">
                              <div className="font-medium">Complete Report</div>
                              <div className="text-xs text-gray-500">All sheets in one file</div>
                            </div>
                            <div className="text-xs font-medium text-white px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded">
                              ALL-IN-ONE
                            </div>
                          </button>

                          {/* Quick Export Stats */}
                          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 mt-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-semibold text-gray-700">
                                  {filteredItems.length}
                                </div>
                                <div className="text-gray-500">Items</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold text-gray-700">
                                  {new Date().toLocaleDateString()}
                                </div>
                                <div className="text-gray-500">Date</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Inventory
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Work Category
                  </label>
                  <select
                    value={filters.workCategory}
                    onChange={(e) =>
                      handleFilterChange("workCategory", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Categories</option>
                    {uniqueWorkCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Part Name
                  </label>
                  <select
                    value={filters.partName}
                    onChange={(e) =>
                      handleFilterChange("partName", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Parts</option>
                    {uniquePartNames.map((partName) => (
                      <option key={partName} value={partName}>
                        {partName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer/Vendor
                  </label>
                  <select
                    value={filters.customerVendorName}
                    onChange={(e) =>
                      handleFilterChange("customerVendorName", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All</option>
                    {uniqueCustomerVendors.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Status</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                    <option value="excess-stock">Excess Stock</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Table */}
          <div className="overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer/Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Re-order Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock at Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Value at Factory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Inventory Value
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    
                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        {/* Customer/Vendor */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {item.customerVendorName || "N/A"}
                          </div>
                        </td>

                        {/* Re-order Level */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.reOrderLevel}
                          </div>
                        </td>

                        {/* Stock at Factory */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {item.stockAtFactory}
                          </div>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
                            {stockStatus.status}
                          </div>
                        </td>

                        {/* Stock Value at Factory */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.stockValueAtFactory.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>

                        {/* Total Inventory Value */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{item.totalInventoryValue.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(item)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {currentItems.map((item) => {
                const stockStatus = getStockStatus(item);
                
                return (
                  <div
                    key={item._id}
                    className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {item.partName || "N/A"}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {item.workCategory} • {item.customerVendorName}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Re-order Level</div>
                        <div className="text-sm font-medium text-gray-900">{item.reOrderLevel}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Stock at Factory</div>
                        <div className="text-sm font-medium text-gray-900">{item.stockAtFactory}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Stock Value</div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{item.stockValueAtFactory.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Total Value</div>
                        <div className="text-sm font-medium text-gray-900">
                          ₹{item.totalInventoryValue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
                          {stockStatus.status}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.receipts?.length || 0} receipts • {item.dispatches?.length || 0} dispatches
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {filteredItems.length > 0 && (
            <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <span className="text-sm text-gray-700 mr-2">
                  Items per page:
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md text-sm p-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, filteredItems.length)} of{" "}
                  {filteredItems.length} results
                </span>

                <nav className="flex space-x-2">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => {
                      const showEllipsis =
                        index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => paginate(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() =>
                      paginate(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No inventory items found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {inventoryItems.length === 0
                  ? "Get started by adding your first inventory item."
                  : "No items match your current filters."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CSS for Custom Scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        }
      `}</style>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
        size="xl"
      >
        <InventoryForm
          inventory={editingItem}
          onSubmit={() => handleFormSubmit(!!editingItem)}
          onCancel={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          showNotification={showSuccess}
          showError={showError}
        />
      </Modal>

      {/* View Modal */}
      <Modal
  isOpen={viewModal}
  onClose={() => {
    setViewModal(false);
    setSelectedItem(null);
  }}
  title="Inventory Item Details"
  size="xl"
>
  {selectedItem && (
    <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedItem.partName || "Part"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedItem.workCategory}
                  </span>
                  {(() => {
                    const stockStatus = getStockStatus(selectedItem);
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.textColor}`}>
                        {stockStatus.status}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <p className="text-sm text-gray-500">Total Inventory Value</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{selectedItem.totalInventoryValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Re-order Level
            </div>
            <div className="text-lg font-bold text-gray-900">
              {selectedItem.reOrderLevel}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Stock at Factory
            </div>
            <div className="text-lg font-bold text-gray-900">
              {selectedItem.stockAtFactory}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Stock Value at Factory
            </div>
            <div className="text-lg font-bold text-gray-900">
              ₹{selectedItem.stockValueAtFactory.toLocaleString()}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Total Stock
            </div>
            <div className="text-lg font-bold text-gray-900">
              {selectedItem.totalStock}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs font-medium text-gray-500 mb-1">
              Total Stock Value
            </div>
            <div className="text-lg font-bold text-gray-900">
              ₹{selectedItem.totalStockValue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Detailed Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Factory Stock */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-500" />
              Factory Inventory
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stock at Factory:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedItem.stockAtFactory}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stock Value at Factory:</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{selectedItem.stockValueAtFactory.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Inventory at Factory Value:</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{selectedItem.inventoryAtFactoryValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Stock */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-orange-500" />
              Customer Inventory
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stock Sent to Customer:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedItem.stockSentToCustomer}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stock Value Sent to Customer:</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{selectedItem.stockValueSentToCustomer.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stock Return from Customer:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedItem.stockReturnFromCustomer}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Inventory at Customer End:</span>
                <span className="text-sm font-medium text-gray-900">
                  ₹{selectedItem.inventoryAtCustomerEndValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CurrencyRupeeIcon className="h-5 w-5 mr-2 text-green-500" />
            Total Values
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-700">Total Stock:</span>
              <span className="text-lg font-bold text-gray-900">
                {selectedItem.totalStock}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-700">Total Stock Value:</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{selectedItem.totalStockValue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-700">Inventory Return from Customer:</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{selectedItem.inventoryReturnFromCustomerValue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
              <span className="text-sm text-gray-700">Total Inventory Value:</span>
              <span className="text-xl font-bold text-green-600">
                ₹{selectedItem.totalInventoryValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="space-y-6">
          {/* Receipts */}
          {selectedItem.receipts && selectedItem.receipts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-green-500" />
                Receipts ({selectedItem.receipts.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Part Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer/Vendor
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Value (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.receipts.map((receipt, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.date ? new Date(receipt.date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 capitalize">
                          {receipt.receiptCategory}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.partName || selectedItem.partName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.customerVendorName || selectedItem.customerVendorName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {receipt.quantity} {receipt.unit}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          ₹{(receipt.totalValue || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dispatches */}
          {selectedItem.dispatches && selectedItem.dispatches.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ArrowUpIcon className="h-5 w-5 mr-2 text-orange-500" />
                Dispatches ({selectedItem.dispatches.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Part Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer/Vendor
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Value (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.dispatches.map((dispatch, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {dispatch.date ? new Date(dispatch.date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {dispatch.dispatchCategory}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {dispatch.partName || selectedItem.partName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {dispatch.customerVendorName || selectedItem.customerVendorName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {dispatch.quantity} {dispatch.unit}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          ₹{(dispatch.totalValue || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        {selectedItem.remarks && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Remarks
            </h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
              {selectedItem.remarks}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
          <button
            onClick={() => setViewModal(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
          <button
            onClick={() => {
              setViewModal(false);
              handleEdit(selectedItem);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Item
          </button>
        </div>
      </div>
    </div>
  )}
</Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Inventory Item
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this inventory item? This action
                cannot be undone.
              </p>
            </div>
          </div>

          {itemToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Work Category:
                  </span>
                  <p className="text-gray-900">
                    {itemToDelete.workCategory || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Part Name:</span>
                  <p className="text-gray-900">
                    {itemToDelete.partName || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Customer/Vendor:
                  </span>
                  <p className="text-gray-900">
                    {itemToDelete.customerVendorName || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Stock at Factory:
                  </span>
                  <p className="text-gray-900">
                    {itemToDelete.stockAtFactory}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Stock Value:
                  </span>
                  <p className="text-gray-900">
                    ₹{itemToDelete.totalStockValue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Inventory Value:
                  </span>
                  <p className="text-gray-900">
                    ₹{itemToDelete.totalInventoryValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
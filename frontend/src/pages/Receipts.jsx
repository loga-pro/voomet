import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  BanknotesIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import ReceiptForm from '../components/Forms/ReceiptForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { receiptsAPI, partsAPI, vendorsAPI } from '../services/api';


const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [filters, setFilters] = useState({
    receiptCategory: '',
    partName: '',
    vendorName: '',
    workCategory: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniquePartNames, setUniquePartNames] = useState([]);
  const [uniqueVendors, setUniqueVendors] = useState([]);
  const [uniqueWorkCategories, setUniqueWorkCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedGroupedReceipt, setSelectedGroupedReceipt] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Status color mapping
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  // Category color mapping
  const categoryColors = {
    buy: 'bg-green-100 text-green-800',
    return: 'bg-red-100 text-red-800',
    exchange: 'bg-purple-100 text-purple-800'
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterReceipts();
  }, [receipts, filters, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receiptsRes, partsRes, vendorsRes] = await Promise.all([
        receiptsAPI.getAll(),
        partsAPI.getAll(),
        vendorsAPI.getAll()
      ]);

      // Handle nested response structure
      const receiptsData = receiptsRes.data?.data || receiptsRes.data || [];
      const partsData = partsRes.data || [];
      const vendorsData = vendorsRes.data || [];

      setReceipts(receiptsData);
      setParts(partsData);
      setVendors(vendorsData);

      // Extract unique values for dropdowns from saved receipts only
      const categories = [...new Set(receiptsData.map(r => r.receiptCategory))].filter(Boolean);
      const partNames = [...new Set(receiptsData.map(r => r.partName))].filter(Boolean);
      const vendorNames = [...new Set(receiptsData.flatMap(r => r.vendorNames || (r.vendorName ? [r.vendorName] : [])))].filter(Boolean);

      // Get work categories from parts master data to show all available categories
      const workCategories = [...new Set(partsData.map(p => p.scopeOfWork))].filter(Boolean);

      setUniqueCategories(categories);
      setUniquePartNames(partNames);
      setUniqueVendors(vendorNames);
      setUniqueWorkCategories(workCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load receipts data');
      // Set empty arrays to prevent errors
      setReceipts([]);
      setParts([]);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const filterReceipts = () => {
    let filtered = receipts;

    // Apply dropdown filters
    if (filters.receiptCategory) {
      filtered = filtered.filter(receipt =>
        receipt.receiptCategory === filters.receiptCategory
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(receipt =>
        receipt.partName === filters.partName
      );
    }

    if (filters.vendorName) {
      filtered = filtered.filter(receipt =>
        (receipt.vendorNames && receipt.vendorNames.includes(filters.vendorName)) ||
        receipt.vendorName === filters.vendorName
      );
    }

    if (filters.workCategory) {
      filtered = filtered.filter(receipt =>
        receipt.workCategory === filters.workCategory
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(receipt => {
        const invoiceNo = receipt.invoiceNo?.toString().toLowerCase() || '';
        const partName = receipt.partName?.toString().toLowerCase() || '';
        const vendorName = (receipt.vendorNames?.join(' ') || receipt.vendorName || '').toLowerCase();
        const workCategory = receipt.workCategory?.toString().toLowerCase() || '';
        const reasonForReturn = receipt.reasonForReturn?.toString().toLowerCase() || '';

        return invoiceNo.includes(searchLower) ||
          partName.includes(searchLower) ||
          vendorName.includes(searchLower) ||
          workCategory.includes(searchLower) ||
          reasonForReturn.includes(searchLower);
      });
    }

    setFilteredReceipts(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const clearFilters = () => {
    setFilters({
      receiptCategory: '',
      partName: '',
      vendorName: '',
      workCategory: ''
    });
    setSearchTerm('');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Pagination logic - Group receipts by invoice number first
  const groupReceiptsByInvoice = (receipts) => {
    const grouped = {};

    receipts.forEach(receipt => {
      const key = `${receipt.invoiceNo}_${receipt.receiptCategory}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...receipt,
          lineItems: [receipt],
          totalQuantity: parseFloat(receipt.quantity) || 0,
          combinedPartNames: [receipt.partName]
        };
      } else {
        grouped[key].lineItems.push(receipt);
        grouped[key].totalQuantity += parseFloat(receipt.quantity) || 0;
        if (!grouped[key].combinedPartNames.includes(receipt.partName)) {
          grouped[key].combinedPartNames.push(receipt.partName);
        }
        // Update total value to sum of all line items
        grouped[key].totalValue = (grouped[key].totalValue || 0) + (receipt.totalValue || 0);
      }
    });

    return Object.values(grouped);
  };

  const groupedReceipts = groupReceiptsByInvoice(filteredReceipts);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = groupedReceipts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(groupedReceipts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = [
      'Date', 'Receipt Category', 'Work Category', 'Item Name', 'Vendor Name',
      'Invoice No', 'Invoice Date', 'Quantity', 'Unit',
      'Invoice Value', 'GST Value', 'Total Value', 'Status'
    ];

    const csvData = filteredReceipts.map(receipt => [
      formatDate(receipt.date),
      receipt.receiptCategory?.toUpperCase() || '',
      receipt.workCategory || '',
      receipt.partName || '',
      receipt.vendorNames?.join(', ') || receipt.vendorName || '',
      receipt.invoiceNo || '',
      formatDate(receipt.invoiceDate),
      receipt.quantity || '0',
      receipt.unit || '',
      formatCurrency(receipt.invoiceValueWithoutGST || 0),
      formatCurrency(receipt.gstValue || 0),
      formatCurrency(receipt.totalValue || 0),
      receipt.status || 'active'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `receipts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showSuccess('Receipts exported to CSV successfully');
  };

  const handleView = (receipt) => {
    setSelectedReceipt(receipt);
    setViewModal(true);
  };

  const handleEdit = (receipt) => {
    // Find all receipts with the same invoice number to group them
    const relatedReceipts = receipts.filter(r =>
      r.invoiceNo === receipt.invoiceNo &&
      r.receiptCategory === receipt.receiptCategory
    );

    // If there are multiple receipts with the same invoice number, group them as line items
    if (relatedReceipts.length > 1) {
      const groupedReceipt = {
        ...receipt, // Use the first receipt's common fields
        lineItems: relatedReceipts.map(r => ({
          _id: r._id, // Keep track of the original receipt ID
          workCategory: r.workCategory || '',
          partName: r.partName || '',
          unit: r.unit || '',
          quantity: r.quantity?.toString() || '',
          priceWithoutGST: r.invoiceValueWithoutGST?.toString() || '',
          gstPercentage: r.gstPercentage || 18,
          gstAmount: r.gstValue?.toString() || '',
          total: r.totalValue?.toString() || ''
        })),
        relatedReceiptIds: relatedReceipts.map(r => r._id) // Store all IDs for deletion/update
      };
      setEditingReceipt(groupedReceipt);
    } else {
      setEditingReceipt(receipt);
    }
    setShowModal(true);
  };

  const handleShowItems = (receipt) => {
    setSelectedGroupedReceipt(receipt);
    setShowItemsModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  const handleDelete = (receipt) => {
    setReceiptToDelete(receipt);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      // Find all receipts with the same invoice number to delete them all at once
      const relatedReceipts = receipts.filter(r =>
        r.invoiceNo === receiptToDelete.invoiceNo &&
        r.receiptCategory === receiptToDelete.receiptCategory
      );

      // Delete all related receipts
      await Promise.all(
        relatedReceipts.map(receipt => receiptsAPI.delete(receipt._id))
      );

      await fetchData();
      showSuccess(`Receipt${relatedReceipts.length > 1 ? 's' : ''} deleted successfully`);
      setShowDeleteModal(false);
      setReceiptToDelete(null);
    } catch (error) {
      console.error('Error deleting receipt:', error);
      showError(error.response?.data?.message || 'Failed to delete receipt');
      setShowDeleteModal(false);
      setReceiptToDelete(null);
    }
  };

  const handleFormSubmit = async (receiptData, receiptId = null) => {
    try {
      if (receiptId) {
        // If editing grouped receipts (has relatedReceiptIds), delete all old ones first
        if (editingReceipt?.relatedReceiptIds && editingReceipt.relatedReceiptIds.length > 0) {
          // Delete all related receipts
          await Promise.all(
            editingReceipt.relatedReceiptIds.map(id => receiptsAPI.delete(id))
          );
          // Create new receipts for each line item (same as new receipt creation)
          await receiptsAPI.create(receiptData);
        } else {
          // Single receipt update
          await receiptsAPI.update(receiptId, receiptData);
        }
      } else {
        // Create new receipt
        await receiptsAPI.create(receiptData);
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      showError(error.response?.data?.message || 'Failed to save receipt');
      throw error; // Re-throw to let the form handle it
    }
  };

  const viewUpload = (uploadUrl) => {
    if (!uploadUrl) {
      showError('No file available to view');
      return;
    }

    if (uploadUrl.startsWith('http') || uploadUrl.startsWith('data:')) {
      window.open(uploadUrl, '_blank');
    } else {
      showError('Invalid file URL');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 lg:p-6">
      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          {/* Header with search and actions */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search receipts by invoice, part, vendor..."
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results Info */}
              {searchTerm && (
                <div className="mt-3 text-sm text-gray-600">
                  Found {filteredReceipts.length} receipt(s) matching "{searchTerm}"
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some(Boolean) || searchTerm
                    ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {(Object.values(filters).some(Boolean) || searchTerm) && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0)}
                    </span>
                  )}
                </button>

                {(Object.values(filters).some(Boolean) || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear
                  </button>
                )}

                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Category</label>
                  <select
                    value={filters.receiptCategory}
                    onChange={(e) => handleFilterChange('receiptCategory', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Category</label>
                  <select
                    value={filters.workCategory}
                    onChange={(e) => handleFilterChange('workCategory', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Work Categories</option>
                    {uniqueWorkCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <select
                    value={filters.partName}
                    onChange={(e) => handleFilterChange('partName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Parts</option>
                    {uniquePartNames.map(part => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <select
                    value={filters.vendorName}
                    onChange={(e) => handleFilterChange('vendorName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Vendors</option>
                    {uniqueVendors.map(vendor => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Receipts Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View Items
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>

                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice No
                      </th>

                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((receipt) => (
                        <tr key={receipt._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(receipt.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[receipt.receiptCategory] || 'bg-gray-100 text-gray-800'}`}>
                              {receipt.receiptCategory?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {receipt.lineItems && receipt.lineItems.length >= 1 && (
                              <button
                                onClick={() => handleShowItems(receipt)}
                                className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
                                title="View Items"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {receipt.vendorNames?.join(', ') || receipt.vendorName || '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {receipt.invoiceNo || '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {receipt.upload && (
                                <button
                                  onClick={() => viewUpload(receipt.upload)}
                                  className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                  title="View Document"
                                >
                                  <DocumentTextIcon className="h-5 w-5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleView(receipt)}
                                className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(receipt)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(receipt)}
                                className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') || searchTerm
                            ? 'No receipts found matching your filters.'
                            : 'No receipts found.'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              {currentItems.length > 0 ? (
                currentItems.map((receipt) => (
                  <div key={receipt._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[receipt.receiptCategory] || 'bg-gray-100 text-gray-800'}`}>
                            {receipt.receiptCategory?.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[receipt.status] || 'bg-gray-100 text-gray-800'}`}>
                            {receipt.status?.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 truncate">{receipt.partName}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {receipt.vendorNames?.join(', ') || receipt.vendorName || '-'} • {formatDate(receipt.date)}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        {receipt.upload && (
                          <button
                            onClick={() => viewUpload(receipt.upload)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Document"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(receipt)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(receipt)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(receipt)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div>
                        <span className="font-medium text-gray-500">Quantity:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {receipt.quantity} {receipt.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Work Category:</span>
                        <span className="ml-1 text-gray-900">{receipt.workCategory || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Invoice:</span>
                        <span className="ml-1 text-gray-900 font-mono">{receipt.invoiceNo || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Total Value:</span>
                        <span className="ml-1 font-bold text-green-600">
                          {formatCurrency(receipt.totalValue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') || searchTerm
                    ? 'No receipts found matching your filters.'
                    : 'No receipts found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredReceipts.length > 0 && (
            <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <span className="text-sm text-gray-700 mr-2">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded-md text-sm p-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, groupedReceipts.length)} of {groupedReceipts.length} results
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
                    .filter(page =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => paginate(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingReceipt(null);
        }}
        title={editingReceipt ? 'Edit Receipt' : 'Add Receipt'}
        size="xl"
      >
        <ReceiptForm
          receiptData={editingReceipt}
          isEditing={!!editingReceipt}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingReceipt(null);
          }}
          parts={parts}
          vendors={vendors}
          workCategories={uniqueWorkCategories}
          showNotification={showSuccess}
          showError={showError}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedReceipt(null);
        }}
        title="Receipt Details"
        size="lg"
        className="font-sans"
      >
        {selectedReceipt && (
          <div className="space-y-6 py-1">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Receipt #{selectedReceipt.invoiceNo || 'N/A'}</h2>
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[selectedReceipt.receiptCategory] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedReceipt.receiptCategory?.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedReceipt.status] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedReceipt.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedReceipt.totalValue || 0)}
                </p>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                Receipt Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</h4>
                  <p className="text-sm text-gray-900 font-medium">{formatDate(selectedReceipt.date)}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Date</h4>
                  <p className="text-sm text-gray-900 font-medium">{formatDate(selectedReceipt.invoiceDate)}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedReceipt.partName}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Work Category</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedReceipt.workCategory || '-'}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedReceipt.vendorName}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedReceipt.quantity} {selectedReceipt.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2 text-green-500" />
                Financial Details
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Invoice Value (without GST):</span>
                  <span className="font-medium">{formatCurrency(selectedReceipt.invoiceValueWithoutGST || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">GST Value (18%):</span>
                  <span className="font-medium">{formatCurrency(selectedReceipt.gstValue || 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Total Value:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(selectedReceipt.totalValue || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {selectedReceipt.reasonForReturn && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-orange-500" />
                  Reason for Return
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {selectedReceipt.reasonForReturn}
                </p>
              </div>
            )}

            {/* Document View */}
            {selectedReceipt.upload && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Attached Document
                </h3>
                <button
                  onClick={() => viewUpload(selectedReceipt.upload)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Document
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setViewModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewModal(false);
                  setEditingReceipt(selectedReceipt);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Edit Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete this receipt{receiptToDelete?.lineItems?.length > 1 ? ' and all its line items' : ''}? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* View Items Modal */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        title="Receipt Line Items"
        size="xl"
      >
        {selectedGroupedReceipt && selectedGroupedReceipt.lineItems && selectedGroupedReceipt.lineItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedGroupedReceipt.lineItems.map((item, index) => (
                  <tr key={item._id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {item.partName}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      {item.unit}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">
                      ₹{(item.invoiceValueWithoutGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-gray-900">
                      ₹{(item.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    Grand Total:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-green-700 text-center">
                    ₹{(selectedGroupedReceipt.totalValue || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No items found
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Receipts;
import React, { useState, useEffect } from 'react';
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
  CreditCardIcon,
  FolderIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,

} from '@heroicons/react/24/outline';
import PurchaseForm from '../components/Forms/PurchaseForm';
import Purchase from '../components/ProformaInvoice/Purchase';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { purchasesAPI, partsAPI } from '../services/api';

const PurchaseOrder = () => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' or 'items'
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [parts, setParts] = useState([]);
  const [workCategories, setWorkCategories] = useState([]);
  const [filters, setFilters] = useState({
    voucherNo: '',
    workCategory: '',
    partName: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Group purchases by voucher number and create summaries
  const getGroupedPurchases = (purchasesList) => {
    const grouped = {};

    purchasesList.forEach(purchase => {
      if (!grouped[purchase.voucherNo]) {
        grouped[purchase.voucherNo] = {
          voucherNo: purchase.voucherNo,
          date: purchase.date,
          vendorName: purchase.vendorName,
          modeOfPayment: purchase.modeOfPayment,
          referenceNo: purchase.referenceNo,
          referenceDate: purchase.referenceDate,
          otherReference: purchase.otherReference,
          dispatchedThrough: purchase.dispatchedThrough,
          destination: purchase.destination,
          termsOfDelivery: purchase.termsOfDelivery,
          supplier: purchase.supplier,
          cgst: purchase.cgst,
          sgst: purchase.sgst,
          firstItem: purchase,
          items: [],
          totalValue: 0,
          totalQuantity: 0
        };
      }
      grouped[purchase.voucherNo].items.push(purchase);
      grouped[purchase.voucherNo].totalValue += (purchase.totalValue || 0);
      grouped[purchase.voucherNo].totalQuantity += (purchase.quantity || 0);
    });

    return Object.values(grouped);
  };

  useEffect(() => {
    fetchPurchases();
    fetchParts();
  }, []);

  useEffect(() => {
    filterPurchases();
  }, [purchases, filters]);

  // Calculate pagination for filtered results
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const groupedPurchases = getGroupedPurchases(filteredPurchases);
  const currentItems = groupedPurchases.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(groupedPurchases.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const fetchPurchases = async (page = 1) => {
    try {
      setLoading(true);
      const response = await purchasesAPI.getAll({ page });
      const list = response || [];

      setPurchases(list);
      setFilteredPurchases(list);
      setPagination({
        current: page,
        pages: Math.max(1, Math.ceil(list.length / 10)),
        total: list.length
      });
      setCurrentPage(1); // Reset to first page when new data is fetched
    } catch (error) {
      console.error('Error fetching purchases:', error);
      showError('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      const partsList = response.data || response || [];
      setParts(partsList);

      // Extract unique work categories from parts
      const uniqueCategories = [...new Set(partsList.map(p => p.scopeOfWork))].filter(Boolean);
      setWorkCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching parts:', error);
    }
  };

  const filterPurchases = () => {
    let filtered = purchases;

    if (filters.voucherNo) {
      filtered = filtered.filter(purchase =>
        purchase.voucherNo.toLowerCase().includes(filters.voucherNo.toLowerCase())
      );
    }

    if (filters.workCategory) {
      filtered = filtered.filter(purchase =>
        purchase.workCategory === filters.workCategory
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(purchase =>
        purchase.partName.toLowerCase().includes(filters.partName.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      voucherNo: '',
      workCategory: '',
      partName: ''
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Voucher No', 'Date', 'Work Category', 'Part Name', 'Unit', 'Quantity',
      'Price without GST', 'GST %', 'GST Amount', 'Total Value', 'Mode of Payment'
    ];

    const csvData = filteredPurchases.map(purchase => [
      purchase.voucherNo || '',
      purchase.date ? new Date(purchase.date).toLocaleDateString() : '',
      purchase.workCategory || '',
      purchase.partName || '',
      purchase.unit || '',
      purchase.quantity ?? '',
      purchase.invoiceValueWithoutGST ?? '',
      purchase.gstPercentage ?? '',
      purchase.gstValue ?? '',
      purchase.totalValue ?? '',
      purchase.modeOfPayment || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    showSuccess('CSV exported successfully!');
  };

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase);
    setShowModal(true);
  };

  const handleView = (purchase, mode = 'full') => {
    setViewingPurchase(purchase);
    setViewMode(mode);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setPurchaseToDelete(id);
    setShowDeleteModal(true);
  };

  const handleGenerateInvoice = (purchase) => {
    // Group all purchases with the same voucher number
    const relatedPurchases = purchases.filter(p => p.voucherNo === purchase.voucherNo);

    // Calculate totals for all related purchases
    const totalInvoiceValue = relatedPurchases.reduce((sum, p) => sum + (p.invoiceValueWithoutGST || 0), 0);
    const totalGstValue = relatedPurchases.reduce((sum, p) => sum + (p.gstValue || 0), 0);
    const cgstAmount = totalGstValue / 2;
    const sgstAmount = totalGstValue / 2;

    // Map related purchases to line items
    const lineItems = relatedPurchases.map(p => ({
      partName: p.partName,
      workCategory: p.workCategory,
      quantity: p.quantity,
      unit: p.unit,
      priceWithoutGST: p.invoiceValueWithoutGST,
      gstPercentage: p.gstPercentage,
      gstAmount: p.gstValue,
      total: p.totalValue
    }));

    // Format data for Purchase (Proforma Invoice) component
    const formattedData = {
      customer: purchase.customer || 'Customer Name',
      projectName: purchase.projectName || 'Project Name',
      projectCost: relatedPurchases.reduce((sum, p) => sum + (p.totalValue || 0), 0),
      invoices: [{
        voucherNo: purchase.voucherNo,
        invoiceNumber: purchase.voucherNo,
        invoiceDate: purchase.date,
        invoiceValue: totalInvoiceValue,
        cgstAmount: cgstAmount,
        sgstAmount: sgstAmount,
        cgst: purchase.cgst || undefined,
        sgst: purchase.sgst || undefined,
        roundOff: 0,
        paymentType: purchase.modeOfPayment || 'advance',
        modeOfPayment: purchase.modeOfPayment || '',
        buyersRef: purchase.referenceNo || 'N/A',
        referenceNo: purchase.referenceNo || '',
        referenceDate: purchase.referenceDate || '',
        otherReference: purchase.otherReference || '',
        dispatchedThrough: purchase.dispatchedThrough || '',
        destination: purchase.destination || '',
        termsForDelivery: purchase.termsOfDelivery || '',
        termsOfDelivery: purchase.termsOfDelivery || '',
        supplier: purchase.supplier || '',
        hsnSac: '998391',
        lineItems: lineItems // Add line items to invoice data
      }]
    };

    setInvoiceData(formattedData);
    setShowInvoiceModal(true);
  };

  const confirmDelete = async () => {
    if (purchaseToDelete) {
      try {
        // Check if purchaseToDelete is a voucher number or an ID
        const isVoucherNumber = purchases.some(p => p.voucherNo === purchaseToDelete);

        if (isVoucherNumber) {
          // Delete by voucher number (deletes all purchases with this voucher)
          await purchasesAPI.deleteByVoucher(purchaseToDelete);
        } else {
          // Delete by ID (single purchase)
          await purchasesAPI.delete(purchaseToDelete);
        }

        showSuccess('Purchase deleted successfully!');
        fetchPurchases();
      } catch (error) {
        console.error('Error deleting purchase:', error);
        showError('Error deleting purchase');
      } finally {
        setShowDeleteModal(false);
        setPurchaseToDelete(null);
      }
    }
  };

  const handleFormSubmit = async () => {
    setShowModal(false);
    setEditingPurchase(null);
    setViewingPurchase(null);
    fetchPurchases();
  };

  const handlePageChange = (page) => {
    fetchPurchases(page);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.voucherNo}
                    onChange={(e) => handleFilterChange('voucherNo', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by voucher number..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some(Boolean)
                    ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
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
                  Add Purchase
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Number</label>
                    <input
                      type="text"
                      value={filters.voucherNo}
                      onChange={(e) => handleFilterChange('voucherNo', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                      placeholder="Search by voucher number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Category</label>
                    <select
                      value={filters.workCategory}
                      onChange={(e) => handleFilterChange('workCategory', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Categories</option>
                      {workCategories.map(category => (
                        <option key={category} value={category}>
                          {category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
                    <input
                      type="text"
                      value={filters.partName}
                      onChange={(e) => handleFilterChange('partName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                      placeholder="Search by part name"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Purchases Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Voucher No
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View Items
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dispatch through
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((group) => (
                        <tr key={group.voucherNo} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">{group.voucherNo || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{group.vendorName || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {group.date ? new Date(group.date).toLocaleDateString() : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleView(group, 'items')}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View Items
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {group.dispatchedThrough || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-green-700">
                              {group.totalValue ? `₹${group.totalValue.toFixed(2).toLocaleString()}` : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleView(group, 'full')}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleGenerateInvoice(group.firstItem)}
                                className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                                title="Generate Proforma Invoice"
                              >
                                <DocumentTextIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(group.firstItem)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(group.voucherNo)}
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
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '')
                            ? 'No purchases found matching your filters.'
                            : 'No purchases found.'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden">
              {currentItems.length > 0 ? (
                currentItems.map((group) => (
                  <div key={group.voucherNo} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{group.voucherNo}</h3>
                        <p className="text-sm text-gray-500 truncate">{group.items.map(item => item.partName).join(', ')}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(group.firstItem)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateInvoice(group.firstItem)}
                          className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                          title="Generate Proforma Invoice"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(group.firstItem)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.voucherNo)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Date:</span> {group.date ? new Date(group.date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Items:</span> {group.items.length}
                      </div>
                      <div>
                        <span className="font-medium">Quantity:</span> {group.totalQuantity}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> ₹{group.totalValue?.toFixed(2)?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '')
                    ? 'No purchases found matching your filters.'
                    : 'No purchases found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Updated Pagination */}
          {groupedPurchases.length > 0 && (
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
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, groupedPurchases.length)} of {groupedPurchases.length} results
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
                      // Add ellipsis for gaps in pagination
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

        {/* view modal */}
        <Modal
          isOpen={showModal || !!viewingPurchase}
          onClose={() => {
            setShowModal(false);
            setEditingPurchase(null);
            setViewingPurchase(null);
          }}
          title={viewingPurchase ? 'Purchase Details' : editingPurchase ? 'Edit Purchase' : 'Add Purchase'}
          size="xl"
          className="font-sans"
        >
          {viewingPurchase ? (
            <div className="p-1">
              <div className="space-y-6">
                <div className="space-y-4">
                  {viewMode === 'full' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-3">
                        <h3 className="text-md font-semibold text-gray-900">Voucher Information</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Voucher No</p>
                          <p className="text-sm text-gray-800">{viewingPurchase.voucherNo}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
                          <p className="text-sm text-gray-600">{viewingPurchase.date ? new Date(viewingPurchase.date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mode of Payment</p>
                          <p className="text-sm text-gray-600">{viewingPurchase.modeOfPayment}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dispatch Through</p>
                          <p className="text-sm text-gray-600">{viewingPurchase.dispatchedThrough || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm overflow-hidden">
                    <div className="flex items-center mb-3">
                      <h3 className="text-md font-semibold text-gray-900">Items List</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Category</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Name</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewingPurchase.items && viewingPurchase.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                                {item.workCategory?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{item.partName}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-center">{item.unit}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                ₹{item.invoiceValueWithoutGST?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                                ₹{item.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {viewMode === 'full' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-3">
                        <h3 className="text-md font-semibold text-gray-900">Financial Summary</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</p>
                          <p className="text-sm font-medium text-gray-800">
                            {viewingPurchase.totalQuantity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">GST (Approx)</p>
                          <p className="text-sm font-medium text-gray-800">
                            ₹{viewingPurchase.items?.reduce((acc, item) => acc + (item.gstValue || 0), 0)?.toFixed(2)?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Value</p>
                          <p className="text-sm font-bold text-green-700">
                            ₹{viewingPurchase.totalValue?.toFixed(2)?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Only show in full view */}
                {viewMode === 'full' && (
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setViewingPurchase(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setEditingPurchase(viewingPurchase);
                        setViewingPurchase(null);
                        setShowModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Purchase
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <PurchaseForm
              purchaseData={editingPurchase}
              parts={parts}
              workCategories={workCategories}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowModal(false);
                setEditingPurchase(null);
              }}
              showNotification={showSuccess}
              showError={showError}
              isEditing={!!editingPurchase}
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setPurchaseToDelete(null);
          }}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete this purchase record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPurchaseToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>

        {/* Proforma Invoice Modal */}
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setInvoiceData(null);
          }}
          title="Purchase Order"
          size="xl"
        >
          {invoiceData && (
            <Purchase invoiceData={invoiceData} hideDownloadButton={false} />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default PurchaseOrder;
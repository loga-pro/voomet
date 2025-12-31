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
  DocumentTextIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  CurrencyRupeeIcon,
  BanknotesIcon,
  HashtagIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import PaymentForm from '../components/Forms/VpaymentForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { FILE_BASE_URL, vendorPaymentsAPI, vendorsAPI } from '../services/api';

const VendorPaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [filters, setFilters] = useState({
    vendor: '',
    projectName: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, filters]);

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await vendorPaymentsAPI.getAll();
      const list = response.payments || response.data || [];
      setPayments(list);
      setFilteredPayments(list);
      
      // Extract unique vendors from saved payment records
      const uniqueVendors = [...new Set(list.map(payment => payment.vendor?.vendorName || payment.vendor))].filter(Boolean);
      const vendorOptions = uniqueVendors.map(name => ({
        _id: name,
        vendorName: name
      }));
      setVendors(vendorOptions);
    } catch (error) {
      console.error('Error fetching payments:', error);
      showError('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (filters.vendor) {
      filtered = filtered.filter(payment => {
        const vendorName = payment.vendor?.vendorName || payment.vendor;
        return vendorName?.toLowerCase().includes(filters.vendor.toLowerCase());
      });
    }

    if (filters.projectName) {
      filtered = filtered.filter(payment =>
        payment.projectName?.toLowerCase().includes(filters.projectName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(payment =>
        payment.status === filters.status
      );
    }

    setFilteredPayments(filtered);
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
      vendor: '',
      projectName: '',
      status: ''
    });
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const exportToCSV = () => {
    const headers = [
      'Vendor', 'Category', 'Invoice Number',
      'Total Invoice Raised', 'Total Payments', 'Balance Amount', 'Status'
    ];

    const csvData = filteredPayments.map(payment => {
      const invoiceNumber = payment.invoices?.[0]?.invoiceNumber || 'N/A';
      return [
      payment.vendor || '',
        payment.vendor?.category === 'vendor' ? 'Vendor' : 'Contractor',
        invoiceNumber,
      payment.totalInvoiceRaised ?? '',
      payment.totalPayments ?? '',
      payment.balanceAmount ?? '',
        payment.status || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vendor_payments.csv';
    link.click();
    window.URL.revokeObjectURL(url);

    showSuccess('CSV exported successfully!');
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setShowModal(true);
  };

  const handleView = (payment) => {
    setViewingPayment(payment);
    setShowModal(true);
  };

  const handleViewPDF = (pdfPath) => {
    window.open(`${FILE_BASE_URL}${pdfPath}`, '_blank');
  };

  const handleDelete = (id) => {
    setPaymentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (paymentToDelete) {
      try {
        await vendorPaymentsAPI.delete(paymentToDelete);
        showSuccess('Payment record deleted successfully!');
        fetchPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
        showError('Error deleting payment record');
      } finally {
        setShowDeleteModal(false);
        setPaymentToDelete(null);
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      if (editingPayment) {
        await vendorPaymentsAPI.update(editingPayment._id, formData);
        showSuccess('Payment record updated successfully');
      } else {
        await vendorPaymentsAPI.create(formData);
        showSuccess('Payment record added successfully');
      }
      setShowModal(false);
      setEditingPayment(null);
      setViewingPayment(null);
      fetchPayments();
    } catch (error) {
      console.error('Error submitting form:', error);
      showError('Failed to save payment record');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (balance) => {
    if (balance === 0) return 'bg-green-100 text-green-800';
    if (balance > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const statusOptions = ['paid', 'pending', 'overdue'];

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.vendor}
                    onChange={(e) => handleFilterChange('vendor', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by vendor..."
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
                  Add Payment
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor</label>
                    <select
                      value={filters.vendor}
                      onChange={(e) => handleFilterChange('vendor', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Vendors</option>
                      {vendors.map(vendor => (
                        <option key={vendor._id} value={vendor.vendorName}>
                          {vendor.vendorName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Vendor Payments Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoices Raised
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Payments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((payment) => {
                        const invoiceNumber = payment.invoices?.[0]?.invoiceNumber || 'N/A';
                        return (
                        <tr key={payment._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{payment.vendor?.vendorName || payment.vendor}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.vendor?.category === 'vendor'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                              }`}>
                              {payment.vendor?.category === 'vendor' ? 'Vendor' : 'Contractor'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{invoiceNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">₹{payment.totalInvoiceRaised?.toFixed(2)?.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">₹{payment.totalPayments?.toFixed(2)?.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.balanceAmount)}`}>
                              ₹{payment.balanceAmount?.toFixed(2)?.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                              {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {/* PDF View Button - Only for vendors with uploaded PDFs */}
                              {payment.vendor?.category === 'vendor' && payment.image && (
                                <button
                                  onClick={() => handleViewPDF(payment.image)}
                                  className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
                                  title="View PDF Document"
                                >
                                  <DocumentTextIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleView(payment)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(payment)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(payment._id)}
                                className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                                title="Delete"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '')
                            ? 'No vendor payments found matching your filters.'
                            : 'No vendor payments found.'
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
                currentItems.map((payment) => {
                  const invoiceNumber = payment.invoices?.[0]?.invoiceNumber || 'N/A';
                  return (
                  <div key={payment._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{payment.vendor?.vendorName || payment.vendor}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${payment.vendor?.category === 'vendor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                            }`}>
                            {payment.vendor?.category === 'vendor' ? 'Vendor' : 'Contractor'}
                          </span>
                            <p className="text-sm text-gray-500 truncate">Invoice: {invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        {/* PDF View Button - Only for vendors with uploaded PDFs */}
                        {payment.vendor?.category === 'vendor' && payment.image && (
                          <button
                            onClick={() => handleViewPDF(payment.image)}
                            className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
                            title="View PDF Document"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(payment)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(payment)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment._id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Invoices Raised:</span> ₹{payment.totalInvoiceRaised?.toFixed(2)?.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Total Payments:</span> ₹{payment.totalPayments?.toFixed(2)?.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Balance:</span>
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(payment.balanceAmount)}`}>
                          ₹{payment.balanceAmount?.toFixed(2)?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${payment.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                        </span>
                      </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '')
                    ? 'No vendor payments found matching your filters.'
                    : 'No vendor payments found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Updated Pagination */}
          {filteredPayments.length > 0 && (
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
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPayments.length)} of {filteredPayments.length} results
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

        {/* View/Edit Modal - UPDATED TO MATCH PAYMENT MANAGEMENT */}
       <Modal
  isOpen={showModal || !!viewingPayment}
  onClose={() => {
    setShowModal(false);
    setEditingPayment(null);
    setViewingPayment(null);
  }}
  title={viewingPayment ? 'Vendor Payment Details' : editingPayment ? 'Edit Payment' : 'Add Payment'}
  size="lg"
  className="font-sans"
>
  {viewingPayment ? (
            <div className="flex flex-col max-h-[100vh]">
              {/* ✅ Scrollable content */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 text-sm">
                  
          {/* Vendor Information */}
                  <div className="bg-white border rounded p-3 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <BuildingOfficeIcon className="w-4 h-4 text-indigo-600 mr-2" />
                      <h3 className="font-semibold">Vendor Information</h3>
            </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                        <span className="text-xs text-gray-500">Vendor Name</span>
                        <p className="font-medium">{viewingPayment.vendor?.vendorName || viewingPayment.vendor}</p>
              </div>
                <div>
                        <span className="text-xs text-gray-500">Category</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full uppercase ${viewingPayment.vendor?.category === 'vendor' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-orange-100 text-orange-700'}`}>
                          {viewingPayment.vendor?.category === 'vendor' ? 'Vendor' : 'Contractor'}
                        </span>
                </div>
                <div>
                        <span className="text-xs text-gray-500">GST Number</span>
                        <p className="font-mono font-medium">{viewingPayment.vendorGstNumber || 'Not provided'}</p>
                </div>
            </div>
          </div>

                  {/* Financial Summary */}
                  <div className="bg-white border rounded p-3 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <CurrencyRupeeIcon className="w-4 h-4 text-green-600 mr-2" />
                      <h3 className="font-semibold">Financial Summary</h3>
            </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-blue-50 p-3 rounded border">
                        <span className="text-xs text-gray-500">Invoices Raised</span>
                        <p className="text-lg font-bold text-blue-700">₹{viewingPayment.totalInvoiceRaised?.toLocaleString() || '0.00'}</p>
              </div>
                      <div className="bg-green-50 p-3 rounded border">
                        <span className="text-xs text-gray-500">Total Payments</span>
                        <p className="text-lg font-bold text-green-700">₹{viewingPayment.totalPayments?.toLocaleString() || '0.00'}</p>
              </div>
                      <div className="bg-amber-50 p-3 rounded border">
                        <span className="text-xs text-gray-500">Balance Amount</span>
                        <p className={`text-lg font-bold ${viewingPayment.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{viewingPayment.balanceAmount?.toLocaleString() || '0.00'}
                </p>
              </div>
                      <div className="bg-purple-50 p-3 rounded border">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full uppercase ${viewingPayment.status === 'paid' ? 'bg-green-100 text-green-700' :
                          viewingPayment.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {viewingPayment.status}
                        </span>
                      </div>
            </div>
          </div>

                  {/* Invoices Generated */}
                  <div className="bg-white border rounded p-3 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <DocumentTextIcon className="w-4 h-4 text-indigo-600 mr-2" />
                      <h3 className="font-semibold">Invoices Generated ({viewingPayment.invoices?.length || 0})</h3>
            </div>
                    {viewingPayment.invoices && viewingPayment.invoices.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-500">S.No</th>
                              <th className="px-3 py-2 text-left text-gray-500">Invoice No.</th>
                              <th className="px-3 py-2 text-left text-gray-500">Date</th>
                              <th className="px-3 py-2 text-left text-gray-500">Value (₹)</th>
                              <th className="px-3 py-2 text-left text-gray-500">Due Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {viewingPayment.invoices.map((inv, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-gray-900">{inv.invoiceNumber}</td>
                                <td className="px-3 py-2 text-gray-600">{inv.invoiceDate ? formatDate(inv.invoiceDate) : '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{inv.invoiceValue?.toLocaleString() || '0.00'}</td>
                                <td className="px-3 py-2 text-red-600 font-medium">{inv.overdueDate ? formatDate(inv.overdueDate) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No invoices generated yet.</p>
                </div>
              )}
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white border rounded p-3 md:col-span-2">
                    <div className="flex items-center mb-2">
                      <BanknotesIcon className="w-4 h-4 text-green-600 mr-2" />
                      <h3 className="font-semibold">Payment Details</h3>
                    </div>
                    {viewingPayment.invoices?.[0]?.payments && viewingPayment.invoices[0].payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-gray-500">S.No</th>
                              <th className="px-3 py-2 text-left text-gray-500">Date</th>
                              <th className="px-3 py-2 text-left text-gray-500">Amount (₹)</th>
                              <th className="px-3 py-2 text-left text-gray-500">Bank</th>
                              <th className="px-3 py-2 text-left text-gray-500">Transaction ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {viewingPayment.invoices[0].payments.map((pmt, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                                <td className="px-3 py-2 text-gray-600">{pmt.date ? formatDate(pmt.date) : '-'}</td>
                                <td className="px-3 py-2 font-bold text-green-700">{pmt.amount?.toLocaleString() || '0.00'}</td>
                                <td className="px-3 py-2 text-gray-600">{pmt.bankName || '-'}</td>
                                <td className="px-3 py-2 text-blue-600 font-mono text-xs">{pmt.transactionId || '-'}</td>
                              </tr>
                            ))}
                            <tr className="bg-green-50 border-t-2 border-green-200">
                              <td colSpan="2" className="px-3 py-3 text-sm font-bold text-gray-900">Total Payments Made</td>
                              <td className="px-3 py-3 text-sm font-bold text-green-700">₹{viewingPayment.totalPayments?.toLocaleString() || '0.00'}</td>
                              <td colSpan="2"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">No payments recorded yet.</p>
                </div>
              )}
            </div>

                  {/* Document Section */}
                  {viewingPayment.image && (
                    <div className="bg-white border rounded p-3 md:col-span-2">
                      <div className="flex items-center mb-2">
                        <DocumentTextIcon className="w-4 h-4 text-purple-600 mr-2" />
                        <h3 className="font-semibold">Document</h3>
            </div>
                      <div className="flex items-center justify-between bg-purple-50 p-3 rounded border">
              <div>
                          <p className="text-xs text-gray-500">Uploaded Document</p>
                          <p className="text-sm font-medium text-gray-900">Vendor Document</p>
              </div>
                        <button
                          onClick={() => handleViewPDF(viewingPayment.image)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <DocumentTextIcon className="h-3 w-3" />
                          View PDF
                        </button>
                      </div>
                </div>
              )}

          </div>
        </div>

        {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
                  onClick={() => setViewingPayment(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Close
          </button>
                {viewingPayment.image && (
                  <button
                    onClick={() => handleViewPDF(viewingPayment.image)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    View Document
                  </button>
                )}
          <button
            onClick={() => {
              setEditingPayment(viewingPayment);
              setViewingPayment(null);
              setShowModal(true);
            }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit Record
          </button>
        </div>
      </div>
  ) : (
    <PaymentForm
      payment={editingPayment}
      onSubmit={handleFormSubmit}
      onCancel={() => {
        setShowModal(false);
        setEditingPayment(null);
      }}
    />
  )}
</Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setPaymentToDelete(null);
          }}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete payment record for vendor "{payments.find(p => p._id === paymentToDelete)?.vendor?.vendorName || payments.find(p => p._id === paymentToDelete)?.vendor || 'this vendor'}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPaymentToDelete(null);
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
      </div>
    </div>
  );
};

export default VendorPaymentManagement;
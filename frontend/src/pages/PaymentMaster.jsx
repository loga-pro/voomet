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
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import PaymentForm from '../components/Forms/PaymentForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { paymentsAPI, customersAPI } from '../services/api';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [filters, setFilters] = useState({
    customer: '',
    projectName: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, filters]);

  // Calculate pagination for filtered results
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const response = await paymentsAPI.getAll({ page });
      const list = response.payments || [];
      const pg = response.pagination || {};
      const total = typeof pg.total === 'number' ? pg.total : (Array.isArray(list) ? list.length : 0);
      const pages = typeof pg.pages === 'number' ? pg.pages : Math.max(1, Math.ceil(total / 10));

      setPayments(list);
      setFilteredPayments(list);
      setPagination({
        current: page,
        pages,
        total
      });
      setCurrentPage(1); // Reset to first page when new data is fetched
    } catch (error) {
      console.error('Error fetching payments:', error);
      showError('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (filters.customer) {
      filtered = filtered.filter(payment => 
        payment.customer.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.projectName) {
      filtered = filtered.filter(payment => 
        payment.projectName.toLowerCase().includes(filters.projectName.toLowerCase())
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
      customer: '',
      projectName: '',
      status: ''
    });
  };

  const exportToCSV = () => {
    const headers = [
      'Customer', 'Project Name', 'Project Cost', 'Total Invoice Raised', 
      'Total Payments', 'Balance Amount', 'Status', 'Invoices Count'
    ];
    
    const csvData = filteredPayments.map(payment => [
      payment.customer || '',
      payment.projectName || '',
      payment.projectCost ?? '',
      payment.totalInvoiceRaised ?? '',
      payment.totalPayments ?? '',
      payment.balanceAmount ?? '',
      payment.status || '',
      (payment.invoices?.length) ?? 0
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payments.csv';
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

  const handleDelete = (id) => {
    setPaymentToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (paymentToDelete) {
      try {
        await paymentsAPI.delete(paymentToDelete);
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
        await paymentsAPI.update(editingPayment._id, formData);
        showSuccess('Payment record updated successfully');
      } else {
        await paymentsAPI.create(formData);
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

  const handlePageChange = (page) => {
    fetchPayments(page);
  };

  const getStatusColor = (balance) => {
    if (balance === 0) return 'bg-green-100 text-green-800';
    if (balance > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const statusOptions = ['paid', 'pending', 'overdue'];

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
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by customer..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean) 
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                    <select
                      value={filters.customer}
                      onChange={(e) => handleFilterChange('customer', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Client</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer.customerName}>
                          {customer.customerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={filters.projectName}
                      onChange={(e) => handleFilterChange('projectName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                      placeholder="Search by project name"
                    />
                  </div> */}

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

         {/* Payments Table */}
<div className="overflow-hidden">
  {/* Desktop Table View */}
  <div className="hidden sm:block">
    <div className="max-h-[60vh] overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project Cost
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
              Invoices
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentItems.length > 0 ? (
            currentItems.map((payment) => (
              <tr key={payment._id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{payment.customer}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{payment.projectName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{payment.projectCost?.toFixed(2)?.toLocaleString()}</div>
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
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    payment.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{payment.invoices?.length || 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
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
            ))
          ) : (
            <tr>
              <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                {Object.values(filters).some(val => val !== '') 
                  ? 'No payments found matching your filters.' 
                  : 'No payments found.'
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
      currentItems.map((payment) => (
        <div key={payment._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">{payment.customer}</h3>
              <p className="text-sm text-gray-500 truncate">{payment.projectName}</p>
            </div>
            <div className="flex space-x-2 ml-2">
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
              <span className="font-medium">Project Cost:</span> ₹{payment.projectCost?.toFixed(2)?.toLocaleString()}
            </div>
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
              <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                payment.status === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : payment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
              </span>
            </div>
            <div>
              <span className="font-medium">Invoices:</span> {payment.invoices?.length || 0}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="p-8 text-center text-gray-500">
        {Object.values(filters).some(val => val !== '') 
          ? 'No payments found matching your filters.' 
          : 'No payments found.'
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
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
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

        <Modal
          isOpen={showModal || !!viewingPayment}
          onClose={() => {
            setShowModal(false);
            setEditingPayment(null);
            setViewingPayment(null);
          }}
          title={
            viewingPayment 
              ? 'Payment Details' 
              : editingPayment 
              ? 'Edit Payment' 
              : 'Add Payment'
          }
          size="lg"
        >
          {viewingPayment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client Name</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingPayment.customer}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Name</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingPayment.projectName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project Cost</label>
                  <p className="mt-1 text-sm text-gray-900">₹{viewingPayment.projectCost.toFixed(2)?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Invoice Raised</label>
                  <p className="mt-1 text-sm text-gray-900">₹{viewingPayment.totalInvoiceRaised.toFixed(2)?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Payments</label>
                  <p className="mt-1 text-sm text-gray-900">₹{viewingPayment.totalPayments.toFixed(2)?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Balance Amount</label>
                  <p className="mt-1 text-sm text-gray-900">₹{viewingPayment.balanceAmount.toFixed(2)?.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{viewingPayment.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoices Count</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingPayment.invoices?.length || 0}</p>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setViewingPayment(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Close
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
            Are you sure you want to delete payment record for "{payments.find(p => p._id === paymentToDelete)?.customer || 'this customer'}"? This action cannot be undone.
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

export default PaymentManagement;
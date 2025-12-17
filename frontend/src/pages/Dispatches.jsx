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
  TruckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import DispatchForm from '../components/Forms/DispatchForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { dispatchesAPI, partsAPI, customersAPI } from '../services/api';

const Dispatches = () => {
  const [dispatches, setDispatches] = useState([]);
  const [filteredDispatches, setFilteredDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [editingDispatch, setEditingDispatch] = useState(null);
  const [filters, setFilters] = useState({
    dispatchCategory: '',
    partName: '',
    customerName: '',
    workCategory: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniquePartNames, setUniquePartNames] = useState([]);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [uniqueWorkCategories, setUniqueWorkCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [parts, setParts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Status color mapping
  const statusColors = {
    dispatched: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800'
  };

  // Category color mapping
  const categoryColors = {
    dispatch: 'bg-green-100 text-green-800',
    return: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDispatches();
  }, [dispatches, filters, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dispatchesRes, partsRes, customersRes] = await Promise.all([
        dispatchesAPI.getAll(),
        partsAPI.getAll(),
        customersAPI.getAll()
      ]);

      // Handle nested response structure
      const dispatchesData = dispatchesRes.data?.data || dispatchesRes.data || [];
      const partsData = partsRes.data || [];
      const customersData = customersRes.data || [];

      setDispatches(dispatchesData);
      setParts(partsData);
      setCustomers(customersData);

      // Extract unique values for dropdowns from saved dispatches only
      const categories = [...new Set(dispatchesData.map(d => d.dispatchCategory))].filter(Boolean);
      const partNames = [...new Set(dispatchesData.map(d => d.partName))].filter(Boolean);
      const customerNames = [...new Set(dispatchesData.map(d => d.customerName))].filter(Boolean);

      // Get work categories from parts master data to show all available categories
      const workCategories = [...new Set(partsData.map(p => p.scopeOfWork))].filter(Boolean);

      setUniqueCategories(categories);
      setUniquePartNames(partNames);
      setUniqueCustomers(customerNames);
      setUniqueWorkCategories(workCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load dispatches data');
      // Set empty arrays to prevent errors
      setDispatches([]);
      setParts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDispatches = () => {
    let filtered = dispatches;

    // Apply dropdown filters
    if (filters.dispatchCategory) {
      filtered = filtered.filter(dispatch =>
        dispatch.dispatchCategory === filters.dispatchCategory
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(dispatch =>
        dispatch.partName === filters.partName
      );
    }

    if (filters.customerName) {
      filtered = filtered.filter(dispatch =>
        dispatch.customerName === filters.customerName
      );
    }

    if (filters.workCategory) {
      filtered = filtered.filter(dispatch =>
        dispatch.workCategory === filters.workCategory
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(dispatch => {
        const invoiceNo = dispatch.invoiceNo?.toString().toLowerCase() || '';
        const partName = dispatch.partName?.toString().toLowerCase() || '';
        const customerName = dispatch.customerName?.toString().toLowerCase() || '';
        const workCategory = dispatch.workCategory?.toString().toLowerCase() || '';
        const reasonForRejection = dispatch.reasonForRejection?.toString().toLowerCase() || '';

        return invoiceNo.includes(searchLower) ||
          partName.includes(searchLower) ||
          customerName.includes(searchLower) ||
          workCategory.includes(searchLower) ||
          reasonForRejection.includes(searchLower);
      });
    }

    setFilteredDispatches(filtered);
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
      dispatchCategory: '',
      partName: '',
      customerName: '',
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDispatches.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDispatches.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = [
      'Date', 'Dispatch Category', 'Work Category', 'Part Name', 'Customer Name',
      'Quantity', 'Unit'
    ];

    const csvData = filteredDispatches.map(dispatch => [
      formatDate(dispatch.date),
      dispatch.dispatchCategory?.toUpperCase() || '',
      dispatch.workCategory || '',
      dispatch.partName || '',
      dispatch.customerName || '',
      dispatch.invoiceNo || '',
      formatDate(dispatch.invoiceDate),
      dispatch.quantity || '0',
      dispatch.unit || '',
      formatCurrency(dispatch.invoiceValueWithoutGST || 0),
      formatCurrency(dispatch.gstValue || 0),
      formatCurrency(dispatch.totalValue || 0),
      dispatch.status || 'dispatched'
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
    link.setAttribute('download', `dispatches_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showSuccess('Dispatches exported to CSV successfully');
  };

  const handleView = (dispatch) => {
    setSelectedDispatch(dispatch);
    setViewModal(true);
  };

  const handleEdit = (dispatch) => {
    setEditingDispatch(dispatch);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dispatchToDelete, setDispatchToDelete] = useState(null);

  const handleDelete = (dispatch) => {
    setDispatchToDelete(dispatch);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await dispatchesAPI.delete(dispatchToDelete._id);
      await fetchData();
      showSuccess(`Dispatch deleted successfully`);
      setShowDeleteModal(false);
      setDispatchToDelete(null);
    } catch (error) {
      console.error('Error deleting dispatch:', error);
      showError(error.response?.data?.message || 'Failed to delete dispatch');
      setShowDeleteModal(false);
      setDispatchToDelete(null);
    }
  };

  const handleFormSubmit = async (dispatchData, dispatchId = null) => {
    try {
      if (dispatchId) {
        // Update existing dispatch
        await dispatchesAPI.update(dispatchId, dispatchData);
        showSuccess('Dispatch updated successfully');
      } else {
        // Create new dispatch
        await dispatchesAPI.create(dispatchData);
        showSuccess('Dispatch added successfully');
      }

      setShowModal(false);
      setEditingDispatch(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving dispatch:', error);
      showError(error.response?.data?.message || 'Failed to save dispatch');
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
                    placeholder="Search dispatches by invoice, part, customer..."
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
                  Found {filteredDispatches.length} dispatch(s) matching "{searchTerm}"
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Dispatch
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Category</label>
                  <select
                    value={filters.dispatchCategory}
                    onChange={(e) => handleFilterChange('dispatchCategory', e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <select
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Customers</option>
                    {uniqueCustomers.map(customer => (
                      <option key={customer} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Dispatches Table */}
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
                        Part Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((dispatch) => (
                        <tr key={dispatch._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(dispatch.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[dispatch.dispatchCategory] || 'bg-gray-100 text-gray-800'}`}>
                              {dispatch.dispatchCategory?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{dispatch.partName}</div>
                            <div className="text-xs text-gray-500">{dispatch.workCategory}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{dispatch.customerName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {dispatch.quantity} {dispatch.unit}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {dispatch.upload && (
                                <button
                                  onClick={() => viewUpload(dispatch.upload)}
                                  className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                  title="View Document"
                                >
                                  <DocumentTextIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleView(dispatch)}
                                className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(dispatch)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(dispatch)}
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
                            ? 'No dispatches found matching your filters.'
                            : 'No dispatches found.'
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
                currentItems.map((dispatch) => (
                  <div key={dispatch._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[dispatch.dispatchCategory] || 'bg-gray-100 text-gray-800'}`}>
                            {dispatch.dispatchCategory?.toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[dispatch.status] || 'bg-gray-100 text-gray-800'}`}>
                            {dispatch.status?.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 truncate">{dispatch.partName}</h3>
                        <p className="text-xs text-gray-500 truncate">
                          {dispatch.customerName} • {formatDate(dispatch.date)}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        {dispatch.upload && (
                          <button
                            onClick={() => viewUpload(dispatch.upload)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Document"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleView(dispatch)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(dispatch)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dispatch)}
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
                          {dispatch.quantity} {dispatch.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Work Category:</span>
                        <span className="ml-1 text-gray-900">{dispatch.workCategory || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Invoice:</span>
                        <span className="ml-1 text-gray-900 font-mono">{dispatch.invoiceNo || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Total Value:</span>
                        <span className="ml-1 font-bold text-green-600">
                          {formatCurrency(dispatch.totalValue || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') || searchTerm
                    ? 'No dispatches found matching your filters.'
                    : 'No dispatches found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredDispatches.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredDispatches.length)} of {filteredDispatches.length} results
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
          setEditingDispatch(null);
        }}
        title={editingDispatch ? 'Edit Dispatch' : 'Add Dispatch'}
        size="xl"
      >
        <DispatchForm
          dispatchData={editingDispatch}
          isEditing={!!editingDispatch}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingDispatch(null);
          }}
          parts={parts}
          customers={customers}
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
          setSelectedDispatch(null);
        }}
        title="Dispatch Details"
        size="lg"
        className="font-sans"
      >
        {selectedDispatch && (
          <div className="space-y-6 py-1">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Dispatch</h2>
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[selectedDispatch.dispatchCategory] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedDispatch.dispatchCategory?.toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedDispatch.status] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedDispatch.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(selectedDispatch.totalValue || 0)}
                </p>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <TruckIcon className="h-5 w-5 mr-2 text-blue-500" />
                Dispatch Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</h4>
                  <p className="text-sm text-gray-900 font-medium">{formatDate(selectedDispatch.date)}</p>
                </div>


                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Part Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedDispatch.partName}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Work Category</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedDispatch.workCategory || '-'}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedDispatch.customerName}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedDispatch.quantity} {selectedDispatch.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {selectedDispatch.reasonForRejection && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-orange-500" />
                  Reason for Rejection/Return
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {selectedDispatch.reasonForRejection}
                </p>
              </div>
            )}

            {/* Document View */}
            {selectedDispatch.upload && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Attached Document
                </h3>
                <button
                  onClick={() => viewUpload(selectedDispatch.upload)}
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
                  setEditingDispatch(selectedDispatch);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-200"
              >
                Edit Dispatch
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
            Are you sure you want to delete this dispatch? This action cannot be undone.
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
    </div>
  );
};

export default Dispatches;
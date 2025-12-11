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
  UserIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  DocumentMagnifyingGlassIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import QualityForm from '../components/Forms/QualityForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { qualityAPI, customersAPI, vendorsAPI, employeesAPI } from '../services/api';

const QualityManagement = () => {
  const [qualityIssues, setQualityIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [viewingIssue, setViewingIssue] = useState(null);
  const [filters, setFilters] = useState({
    customer: '',
    scopeOfWork: '',
    category: '',
    status: '',
    responsibility: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState(null);

  useEffect(() => {
    fetchQualityIssues();
    fetchCustomers();
    fetchVendors();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterIssues();
  }, [qualityIssues, filters, searchTerm, currentPage, itemsPerPage]);

  const fetchQualityIssues = async () => {
    try {
      setLoading(true);
      const response = await qualityAPI.getAll();
      const issues = response.data.qualityIssues || response.data || [];
      setQualityIssues(issues);
      setFilteredIssues(issues);
    } catch (error) {
      console.error('Error fetching quality issues:', error);
      showError('Failed to fetch quality issues');
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

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const filterIssues = () => {
    let filtered = qualityIssues;

    // Apply search term across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.customer?.toLowerCase().includes(searchLower) ||
        (Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join(', ').toLowerCase().includes(searchLower) : issue.scopeOfWork?.toLowerCase().includes(searchLower)) ||
        issue.openIssues?.toLowerCase().includes(searchLower) ||
        issue.category?.toLowerCase().includes(searchLower) ||
        issue.status?.toLowerCase().includes(searchLower) ||
        issue.responsibility?.toLowerCase().includes(searchLower) ||
        issue.scopeOfWorkText?.toLowerCase().includes(searchLower) ||
        issue.remarks?.toLowerCase().includes(searchLower)
      );
    }

    // Apply dropdown filters
    if (filters.customer) {
      filtered = filtered.filter(issue => 
        issue.customer === filters.customer
      );
    }

    if (filters.scopeOfWork) {
      filtered = filtered.filter(issue => 
        Array.isArray(issue.scopeOfWork) 
          ? issue.scopeOfWork.includes(filters.scopeOfWork)
          : issue.scopeOfWork === filters.scopeOfWork
      );
    }

    if (filters.category) {
      filtered = filtered.filter(issue => 
        issue.category === filters.category
      );
    }

    if (filters.status) {
      filtered = filtered.filter(issue => 
        issue.status === filters.status
      );
    }

    if (filters.responsibility) {
      filtered = filtered.filter(issue => 
        issue.responsibility === filters.responsibility
      );
    }

    setFilteredIssues(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      customer: '',
      scopeOfWork: '',
      category: '',
      status: '',
      responsibility: ''
    });
    setSearchTerm('');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredIssues.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = ['Customer', 'Scope of Work', 'Open Issues', 'Category', 'Status', 'Person Type', 'Responsible Person'];
    const csvData = filteredIssues.map(issue => [
      issue.customer,
      Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join(', ') : issue.scopeOfWork,
      issue.openIssues,
      issue.category,
      issue.status,
      issue.personType || '',
      issue.responsibility
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quality_issues.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleEdit = (issue) => {
    setEditingIssue(issue);
    setShowModal(true);
  };

  const handleView = (issue) => {
    setViewingIssue(issue);
    setShowModal(true);
  };

  const handleDelete = (issue) => {
    setIssueToDelete(issue);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await qualityAPI.delete(issueToDelete._id);
      showSuccess('Quality issue deleted successfully');
      fetchQualityIssues();
      setShowDeleteModal(false);
      setIssueToDelete(null);
    } catch (error) {
      console.error('Error deleting quality issue:', error);
      showError('Failed to delete quality issue');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      
      // Clean up form data to ensure proper data types
      const cleanedData = {
        ...formData,
        customer: formData.customer?.trim() || undefined,
        scopeOfWork: formData.scopeOfWork, // Already an array, no need to trim
        scopeOfWorkText: formData.scopeOfWorkText?.trim() || undefined,
        openIssues: formData.openIssues?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        status: formData.status?.trim() || 'open',
        responsibility: formData.responsibility?.trim() || undefined,
        remarks: formData.remarks?.trim() || undefined
      };

      // Remove any undefined values to prevent validation issues
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
        }
      });

      console.log('Submitting quality issue with cleaned data:', cleanedData);

      if (editingIssue) {
        await qualityAPI.update(editingIssue._id, cleanedData);
        showSuccess('Quality issue updated successfully');
      } else {
        await qualityAPI.create(cleanedData);
        showSuccess('Quality issue added successfully');
      }
      setShowModal(false);
      setEditingIssue(null);
      setViewingIssue(null);
      fetchQualityIssues();
    } catch (error) {
      console.error('Error submitting form:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to save quality issue';
      
      showError(`Failed to save quality issue: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const scopeOptions = ['Electrical', 'Data', 'CCTV', 'Partition', 'Fire and Safety', 'Access', 'Transportation'];
  const categoryOptions = ['rectify', 'replace'];
  const statusOptions = ['open', 'closed'];

  // Function to truncate long text with ellipsis
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 sm:p-3 lg:p-4 xl:p-6">
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
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search quality issues..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean) || searchTerm
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
                  Add Quality Issue
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                    <select
                      value={filters.scopeOfWork}
                      onChange={(e) => handleFilterChange('scopeOfWork', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Scopes</option>
                      {scopeOptions.map(scope => (
                        <option key={scope} value={scope}>{scope}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Categories</option>
                      {categoryOptions.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">All Status</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responsible person</label>
                    <select
                      value={filters.responsibility}
                      onChange={(e) => handleFilterChange('responsibility', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">All Vendors</option>
                      {vendors.map(vendor => (
                        <option key={vendor._id} value={vendor.vendorName}>
                          {vendor.vendorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

         

          {/* Quality Issues Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Client Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Scope of Work
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/6">
                        Open Issues
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Responsible person
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((issue) => (
                        <tr key={issue._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{issue.customer}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join(', ') : issue.scopeOfWork}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900 max-w-md">
                              <div className="line-clamp-2">
                                {truncateText(issue.openIssues, 150)}
                              </div>
                              {issue.openIssues && issue.openIssues.length > 150 && (
                                <button
                                  onClick={() => handleView(issue)}
                                  className="text-blue-600 hover:text-blue-800 text-xs mt-1 font-medium"
                                >
                                  Read more
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              issue.category === 'rectify' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {issue.category?.charAt(0).toUpperCase() + issue.category?.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              issue.status === 'open' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {issue.status?.charAt(0).toUpperCase() + issue.status?.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{issue.responsibility}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(issue)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(issue)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(issue)}
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
                          {Object.values(filters).some(val => val !== '') || searchTerm
                            ? 'No quality issues found matching your filters.' 
                            : 'No quality issues found.'
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
                currentItems.map((issue) => (
                  <div key={issue._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{issue.customer}</h3>
                        <p className="text-sm text-gray-500 truncate">{Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join(', ') : issue.scopeOfWork}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(issue)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(issue)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(issue)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Category:</span>
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          issue.category === 'rectify' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {issue.category?.charAt(0).toUpperCase() + issue.category?.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          issue.status === 'open' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {issue.status?.charAt(0).toUpperCase() + issue.status?.slice(1)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Responsible person:</span> {issue.responsibility}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Open Issues:</span>
                        <p className="mt-1 text-gray-600 whitespace-pre-line">
                          {issue.openIssues?.replace(/(?<!^)(\d+\.)/g, '\n$1')}
                        </p>
                        {issue.openIssues && issue.openIssues.length > 100 && (
                          <button
                            onClick={() => handleView(issue)}
                            className="text-blue-600 hover:text-blue-800 text-xs mt-1 font-medium"
                          >
                            Read more
                          </button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Created:</span> {new Date(issue.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') || searchTerm
                    ? 'No quality issues found matching your filters.' 
                    : 'No quality issues found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Updated Pagination */}
          {filteredIssues.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredIssues.length)} of {filteredIssues.length} results
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
  isOpen={showModal || !!viewingIssue}
  onClose={() => {
    setShowModal(false);
    setEditingIssue(null);
    setViewingIssue(null);
  }}
  title={
    viewingIssue 
      ? 'Quality Issue Details' 
      : editingIssue 
      ? 'Edit Quality Issue' 
      : 'Add Quality Issue'
  }
  size="lg"
>
  {viewingIssue ? (
    <div className="space-y-0 bg-gray-50 rounded-lg">
      {/* Fixed Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-12 w-12 bg-white/20 rounded-lg flex items-center justify-center shadow-lg border border-white/30">
              <DocumentTextIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{viewingIssue.customer}</h2>
              <p className="text-blue-100 text-sm mt-1">{Array.isArray(viewingIssue.scopeOfWork) ? viewingIssue.scopeOfWork.join(', ') : viewingIssue.scopeOfWork}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-white/30 ${
              viewingIssue.status === 'open' ? 'bg-yellow-500/20 text-yellow-100' :
              viewingIssue.status === 'in progress' ? 'bg-blue-500/20 text-blue-100' :
              viewingIssue.status === 'resolved' ? 'bg-green-500/20 text-green-100' :
              'bg-gray-500/20 text-gray-100'
            }`}>
              {viewingIssue.status?.charAt(0).toUpperCase() + viewingIssue.status?.slice(1)}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white border border-white/30 capitalize">
              {viewingIssue.category}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">
        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Basic Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Name</label>
                <p className="text-sm text-gray-900 font-medium bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                  {viewingIssue.customer}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Scope of Work</label>
                <p className="text-sm text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  {Array.isArray(viewingIssue.scopeOfWork) ? viewingIssue.scopeOfWork.join(', ') : viewingIssue.scopeOfWork}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Category</label>
                <p className="text-sm text-gray-900 font-medium bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 capitalize">
                  {viewingIssue.category}
                </p>
              </div>
            </div>
          </div>

          {/* Assignment & Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Assignment & Timeline</h3>
            </div>
            <div className="space-y-4">
              {viewingIssue.personType && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Person Type</label>
                  <p className="text-sm text-gray-900 font-medium bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 capitalize">
                    {viewingIssue.personType}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Responsible Person</label>
                <p className="text-sm text-gray-900 font-medium bg-green-50 px-3 py-2 rounded-lg border border-green-100">
                  {viewingIssue.responsibility}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</label>
                <p className={`text-sm font-medium px-3 py-2 rounded-lg border capitalize ${
                  viewingIssue.status === 'open' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                  viewingIssue.status === 'in progress' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                  viewingIssue.status === 'resolved' ? 'bg-green-50 text-green-800 border-green-200' :
                  'bg-gray-50 text-gray-800 border-gray-200'
                }`}>
                  {viewingIssue.status}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="space-y-6">
          {/* Open Issues */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Open Issues</h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                {viewingIssue.openIssues}
              </p>
            </div>
          </div>

          {/* Scope Details */}
          {viewingIssue.scopeOfWorkText && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DocumentMagnifyingGlassIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Scope Details</h3>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {viewingIssue.scopeOfWorkText}
                </p>
              </div>
            </div>
          )}

          {/* Remarks */}
          {viewingIssue.remarks && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">Remarks</h3>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {viewingIssue.remarks}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setShowModal(false);
              setViewingIssue(null);
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Set the current viewing issue as the editing issue
              setEditingIssue(viewingIssue);
              // Clear the viewing issue to switch to edit mode
              setViewingIssue(null);
              // Keep the modal open for editing
              setShowModal(true);
            }}
            className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 shadow-sm"
          >
            Edit Issue
          </button>
        </div>
      </div>
    </div>
  ) : (
    <QualityForm
      quality={editingIssue}
      onSubmit={handleFormSubmit}
      onCancel={() => {
        setShowModal(false);
        setEditingIssue(null);
      }}
    />
  )}
</Modal>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Confirm Delete"
          >
            <div className="p-4">
              <p className="mb-4 text-gray-700">
                Are you sure you want to delete the quality issue for{" "}
                <span className="font-semibold">{issueToDelete?.customer}</span>?
                This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-600">
                  <span className="font-medium">Client Name:</span> {issueToDelete?.customer}
                </p>
                <p className="text-sm text-red-600">
                  <span className="font-medium">Scope of Work:</span> {issueToDelete?.scopeOfWork}
                </p>
                <p className="text-sm text-red-600">
                  <span className="font-medium">Open Issues:</span> {issueToDelete?.openIssues}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  DELETE
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default QualityManagement;
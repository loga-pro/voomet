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
  const [scopeOfWorkOptions, setScopeOfWorkOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [responsibilityOptions, setResponsibilityOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState(null);

  // View details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [issueDetails, setIssueDetails] = useState(null);

  useEffect(() => {
    fetchQualityIssues();
  }, []);

  useEffect(() => {
    filterIssues();
  }, [qualityIssues, filters, searchTerm, currentPage, itemsPerPage]);

  const extractUniqueOptionsFromData = (issues) => {
    // Extract unique customers
    const uniqueCustomers = [...new Set(issues
      .map(issue => issue.customer)
      .filter(Boolean)
      .map(name => name.trim())
    )].sort();

    const customerOptions = uniqueCustomers.map(name => ({
      id: name,
      value: name,
      label: name
    }));
    setCustomers(customerOptions);

    // Extract unique scope of work values
    const allScopes = issues.flatMap(issue => {
      if (Array.isArray(issue.scopeOfWork)) {
        return issue.scopeOfWork.map(s => s.trim()).filter(Boolean);
      } else if (issue.scopeOfWork) {
        return [issue.scopeOfWork.trim()];
      }
      return [];
    });

    const uniqueScopes = [...new Set(allScopes)].sort();
    setScopeOfWorkOptions(uniqueScopes);

    // Extract unique categories
    const uniqueCategories = [...new Set(issues
      .map(issue => issue.category)
      .filter(Boolean)
      .map(cat => cat.trim())
    )].sort();
    setCategoryOptions(uniqueCategories);

    // Extract unique statuses
    const uniqueStatuses = [...new Set(issues
      .map(issue => issue.status)
      .filter(Boolean)
      .map(status => status.trim())
    )].sort();
    setStatusOptions(uniqueStatuses);

    // Extract unique responsibility values
    const uniqueResponsibilities = [...new Set(issues
      .map(issue => issue.responsibility)
      .filter(Boolean)
      .map(resp => resp.trim())
    )].sort();
    setResponsibilityOptions(uniqueResponsibilities);
  };

  const fetchQualityIssues = async () => {
    try {
      setLoading(true);
      const response = await qualityAPI.getAll();
      const issues = response.data.qualityIssues || response.data || [];
      setQualityIssues(issues);
      setFilteredIssues(issues);

      // Extract filter options from saved data only
      extractUniqueOptionsFromData(issues);
    } catch (error) {
      console.error('Error fetching quality issues:', error);
      showError('Failed to fetch quality issues');
    } finally {
      setLoading(false);
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
    // Comprehensive headers for all quality data
    const headers = [
      'Client Name',
      'Project Name',
      'Scope of Work',
      'Open Issues',
      'Category',
      'Status',
      'Person Type',
      'Responsible Person',
      'Remarks',
      'Created Date',
      'Last Updated',

      'Issue #',
      'Issue Date',
      'Issue Scope',
      'Issue Reason',
      'Issue Description',
      'Damage Date',
      'Issue Person Type',
      'Issue Responsible Person',
      'Issue Remarks',
      'Has Damage Image',
      'Has Fixed Image'
    ];

    // Create rows for each quality issue
    const csvData = [];

    filteredIssues.forEach(issue => {
      // If there are quality issues, create a row for each
      if (issue.qualityIssues && issue.qualityIssues.length > 0) {
        issue.qualityIssues.forEach((qi, index) => {
          csvData.push([
            issue.customer || '',
            issue.projectName || '',
            Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join('; ') : (issue.scopeOfWork || ''),
            (issue.openIssues || '').replace(/"/g, '""'), // Escape quotes
            issue.category || '',
            issue.status || '',
            issue.personType || '',
            issue.responsibility || '',
            (issue.remarks || '').replace(/"/g, '""'),
            issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : '',
            issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : '',
            // Quality Issue Details
            index + 1,
            qi.dateOfIssue ? new Date(qi.dateOfIssue).toLocaleDateString() : '',
            qi.scopeOfWork || '',
            qi.reason || '',
            (qi.description || '').replace(/"/g, '""'),
            qi.dateOfDamage ? new Date(qi.dateOfDamage).toLocaleDateString() : '',
            qi.personType === 'inhouse' ? 'Inhouse' : qi.personType === 'outsourced' ? 'Outsourced' : '',
            qi.responsiblePerson || '',
            (qi.remarks || '').replace(/"/g, '""'),
            qi.damageImage ? 'Yes' : 'No',
            qi.fixedImage ? 'Yes' : 'No'
          ]);
        });
      } else {
        // If no quality issues, still include the main record
        csvData.push([
          issue.customer || '',
          issue.projectName || '',
          Array.isArray(issue.scopeOfWork) ? issue.scopeOfWork.join('; ') : (issue.scopeOfWork || ''),
          (issue.openIssues || '').replace(/"/g, '""'),
          issue.category || '',
          issue.status || '',
          issue.personType || '',
          issue.responsibility || '',
          (issue.remarks || '').replace(/"/g, '""'),
          issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : '',
          issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : '',
          // Empty quality issue fields
          '', '', '', '', '', '', '', '', '', '', ''
        ]);
      }
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `quality_issues_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (issue) => {
    setIssueDetails(issue);
    setShowDetailsModal(true);
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
        customer: formData.customer?.trim() || undefined,
        projectName: formData.projectName?.trim() || undefined,
        openIssues: formData.openIssues?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        status: formData.status?.trim() || 'open',
        qualityIssues: formData.qualityIssues || []
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
      fetchQualityIssues(); // This will refresh the filter options too
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
                    placeholder="Search client, scope of work..."
                  />
                </div>
              </div>

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
                      <option value="">All Clients</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.value}>
                          {customer.label}
                        </option>
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        View Issues
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((issue) => (
                        <tr key={issue._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">{issue.customer || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">{issue.projectName || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleView(issue)}
                              className="text-blue-600 hover:text-blue-900 p-2 transition-colors duration-150"
                              title="View Issues"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${issue.category === 'rectify' ? 'bg-yellow-100 text-yellow-800' :
                              issue.category === 'replace' ? 'bg-orange-100 text-orange-800' :
                                issue.category === 'possible' ? 'bg-green-100 text-green-800' :
                                  issue.category === 'not possible' ? 'bg-red-100 text-red-800' :
                                    issue.category === 'reject' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                              }`}>
                              {issue.category?.charAt(0).toUpperCase() + issue.category?.slice(1) || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${issue.status === 'open' ? 'bg-red-100 text-red-800' :
                              issue.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                              {issue.status?.charAt(0).toUpperCase() + issue.status?.slice(1).replace('-', ' ') || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(issue)}
                                className="text-green-600 hover:text-green-900 p-2 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(issue)}
                                className="text-indigo-600 hover:text-indigo-900 p-2 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(issue)}
                                className="text-red-600 hover:text-red-900 p-2 transition-colors duration-150"
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
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') || searchTerm
                            ? 'No quality issues found matching your filters.'
                            : 'No quality issues found. Add your first quality issue to get started.'
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
                          onClick={() => handleViewDetails(issue)}
                          className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleView(issue)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Issues"
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
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${issue.category === 'rectify'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {issue.category?.charAt(0).toUpperCase() + issue.category?.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${issue.status === 'open'
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
                            onClick={() => handleViewDetails(issue)}
                            className="text-green-600 hover:text-green-800 text-xs mt-1 font-medium"
                          >
                            View All Details
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
                    : 'No quality issues found. Add your first quality issue to get started.'
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

        {/* Modal for Add/Edit/View */}
        <Modal
          isOpen={showModal || !!viewingIssue}
          onClose={() => {
            setShowModal(false);
            setEditingIssue(null);
            setViewingIssue(null);
          }}
          title={viewingIssue ? 'Quality Issue Details' : editingIssue ? 'Edit Quality Issue' : 'Add Quality Issue'}
          size="xl"
          className="font-sans"
        >
          {viewingIssue ? (
            <div className="space-y-6">
              {/* Quality Issues Table */}
              <div className="bg-white rounded-lg border border-gray-200">
                {viewingIssue.qualityIssues && viewingIssue.qualityIssues.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Issue</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope of Work</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsible Person</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Damage</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewingIssue.qualityIssues.map((issue, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {issue.dateOfIssue ? new Date(issue.dateOfIssue).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {issue.scopeOfWork || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${viewingIssue.category === 'rectify' ? 'bg-yellow-100 text-yellow-800' :
                                viewingIssue.category === 'replace' ? 'bg-orange-100 text-orange-800' :
                                  viewingIssue.category === 'possible' ? 'bg-green-100 text-green-800' :
                                    viewingIssue.category === 'not possible' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                }`}>
                                {viewingIssue.category?.charAt(0).toUpperCase() + viewingIssue.category?.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {issue.personType === 'inhouse' ? 'Inhouse' :
                                issue.personType === 'outsourced' ? 'Outsourced' : 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {issue.responsiblePerson || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {issue.dateOfDamage ? new Date(issue.dateOfDamage).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No quality issues added yet
                  </div>
                )}
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

        {/* Details View Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Quality Issue - Complete Details"
          size="xl"
        >
          {issueDetails && (
            <div className="space-y-6">
              {/* Main Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Main Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Name</span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{issueDetails.customer}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project Name</span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{issueDetails.projectName || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                    <div className="mt-1">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${issueDetails.category === 'rectify' ? 'bg-yellow-100 text-yellow-800' :
                        issueDetails.category === 'replace' ? 'bg-orange-100 text-orange-800' :
                          issueDetails.category === 'possible' ? 'bg-green-100 text-green-800' :
                            issueDetails.category === 'not possible' ? 'bg-red-100 text-red-800' :
                              issueDetails.category === 'reject' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        {issueDetails.category?.charAt(0).toUpperCase() + issueDetails.category?.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${issueDetails.status === 'open' ? 'bg-red-100 text-red-800' :
                        issueDetails.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        {issueDetails.status?.charAt(0).toUpperCase() + issueDetails.status?.slice(1).replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Issues Section */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-5 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
                  Open Issues
                </h3>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="whitespace-pre-line text-sm text-gray-900 leading-relaxed">
                    {issueDetails.openIssues || 'No open issues recorded'}
                  </div>
                </div>
              </div>

              {/* Remarks Section */}
              {issueDetails.remarks && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-purple-600" />
                    Remarks
                  </h3>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-900 leading-relaxed">{issueDetails.remarks}</p>
                  </div>
                </div>
              )}

              {/* Quality Issues Details Section */}
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-5 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DocumentMagnifyingGlassIcon className="h-5 w-5 mr-2 text-green-600" />
                  Quality Issues Details
                  {issueDetails.qualityIssues && issueDetails.qualityIssues.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                      {issueDetails.qualityIssues.length} {issueDetails.qualityIssues.length === 1 ? 'Issue' : 'Issues'}
                    </span>
                  )}
                </h3>
                {issueDetails.qualityIssues && issueDetails.qualityIssues.length > 0 ? (
                  <div className="space-y-4">
                    {issueDetails.qualityIssues.map((issue, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Issue #{index + 1}</h4>
                          <span className="text-xs text-gray-500">
                            {issue.dateOfIssue ? new Date(issue.dateOfIssue).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Scope of Work</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{issue.scopeOfWork || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Reason</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{issue.reason || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded md:col-span-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Description</span>
                            <p className="text-sm text-gray-900 mt-1 leading-relaxed">{issue.description || 'N/A'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Date of Damage</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {issue.dateOfDamage ? new Date(issue.dateOfDamage).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Person Type</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {issue.personType === 'inhouse' ? 'Inhouse' :
                                issue.personType === 'outsourced' ? 'Outsourced' : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded md:col-span-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Responsible Person</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">{issue.responsiblePerson || 'N/A'}</p>
                          </div>
                          {issue.remarks && (
                            <div className="bg-gray-50 p-3 rounded md:col-span-2">
                              <span className="text-xs font-medium text-gray-500 uppercase">Remarks</span>
                              <p className="text-sm text-gray-900 mt-1 leading-relaxed">{issue.remarks}</p>
                            </div>
                          )}
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Damage Image</span>
                            <p className="text-sm font-medium mt-1">
                              {issue.damageImage ? (
                                <span className="text-green-600 flex items-center">
                                  <EyeIcon className="h-4 w-4 mr-1" />
                                  Available
                                </span>
                              ) : (
                                <span className="text-gray-400">Not Available</span>
                              )}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <span className="text-xs font-medium text-gray-500 uppercase">Fixed Image</span>
                            <p className="text-sm font-medium mt-1">
                              {issue.fixedImage ? (
                                <span className="text-green-600 flex items-center">
                                  <EyeIcon className="h-4 w-4 mr-1" />
                                  Available
                                </span>
                              ) : (
                                <span className="text-gray-400">Not Available</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                    <p className="text-sm text-gray-500">No quality issues recorded</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEdit(issueDetails);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit Issue
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
                >
                  Close
                </button>
              </div>
            </div>
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
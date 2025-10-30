import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import CustomerForm from '../components/Forms/CustomerForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { customersAPI, projectsAPI } from '../services/api';

const CustomerMaster = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [awardedProjects, setAwardedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [filters, setFilters] = useState({
    customerName: '',
    customerEmail: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCustomerNames, setUniqueCustomerNames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { notification, showSuccess, hideNotification } = useNotification();

  useEffect(() => {
    fetchCustomers();
    fetchAwardedProjects();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, filters, currentPage, itemsPerPage]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
      
      // Extract unique values for dropdowns
      const customerNames = [...new Set(response.data.map(customer => customer.customerName))].filter(Boolean);
      
      setUniqueCustomerNames(customerNames);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAwardedProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      // Show all projects except RFQ stage (boq, awarded, under_execution, completed, post_implementation)
      const nonRfqProjects = response.data.filter(project => project.stage !== 'rfq');
      setAwardedProjects(nonRfqProjects);
    } catch (error) {
      console.error('Error fetching awarded projects:', error);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (filters.customerName) {
      filtered = filtered.filter(customer => 
        customer.customerName.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    if (filters.customerEmail) {
      filtered = filtered.filter(customer => 
        customer.customerEmail.toLowerCase().includes(filters.customerEmail.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      customerName: '',
      customerEmail: ''
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Customer Email', 'Invoice Email', 'Billing Address'];
    const csvData = filteredCustomers.map(customer => [
      customer.customerName,
      customer.customerEmail,
      customer.invoiceEmail,
      customer.billingAddress
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customers.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setViewModal(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await customersAPI.delete(customerToDelete._id);
      fetchCustomers(); // Refresh the list
      showSuccess(`Customer "${customerToDelete.customerName}" deleted successfully`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingCustomer(null);
    fetchCustomers(); // Refresh the list
    showSuccess(isEdit ? 'Customer updated successfully' : 'Customer added successfully');
  };

  const getAwardedProjectsForCustomer = (customerName) => {
    return awardedProjects.filter(project => project.customerName === customerName);
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
      <div className="max-w-none xl:max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">

          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search customers..."
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
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Customer
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <select
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Customers</option>
                    {uniqueCustomerNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="text"
                    value={filters.customerEmail}
                    onChange={(e) => handleFilterChange('customerEmail', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by customer email"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Customers Table */}
          <div className="overflow-hidden">
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > filteredCustomers.length ? filteredCustomers.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{filteredCustomers.length}</span> results
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing Address
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects Tracking
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Budget
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((customer) => {
                    const customerAwardedProjects = getAwardedProjectsForCustomer(customer.customerName);
                    const totalProjectBudget = customerAwardedProjects.reduce((sum, project) => sum + (project.totalProjectValue || 0), 0);
                    
                    return (
                      <tr key={customer._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="font-medium text-blue-800">
                                {customer.customerName ? customer.customerName.charAt(0).toUpperCase() : 'C'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
                              <div className="text-sm text-gray-500">{customer.customerEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.invoiceEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{customer.billingAddress}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {customerAwardedProjects.length > 0 ? (
                              <div className="space-y-1">
                                {customerAwardedProjects.map((project, index) => {
                                  const stageColors = {
                                    boq: 'bg-blue-50 text-blue-800 border-blue-200',
                                    awarded: 'bg-green-50 text-green-800 border-green-200',
                                    under_execution: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                                    completed: 'bg-purple-50 text-purple-800 border-purple-200',
                                    post_implementation: 'bg-gray-50 text-gray-800 border-gray-200'
                                  };
                                  const colorClass = stageColors[project.stage] || 'bg-gray-50 text-gray-800 border-gray-200';
                                  return (
                                    <div key={project._id} className={`flex items-center justify-between ${colorClass} px-2 py-1 rounded text-xs border`}>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium">{project.projectName}</span>
                                        <span className="text-xs opacity-75">({project.stage.replace('_', ' ').toUpperCase()})</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500">No projects (excluding RFQ)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customerAwardedProjects.length > 0 ? (
                              <div className="space-y-1">
                                {customerAwardedProjects.map((project) => (
                                  <div key={project._id} className="flex justify-between items-center px-2 py-1 text-xs font-medium">
                                    <span>₹{project.totalProjectValue?.toLocaleString() || '0'}</span>
                                  </div>
                                ))}
                                {/* Total Budget */}
                                <div className="border-t border-gray-200 mt-2 pt-1">
                                  <div className="flex justify-between items-center px-2 py-1 text-xs font-bold bg-gray-50 rounded">
                                    <span>Total:</span>
                                    <span>₹{totalProjectBudget.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(customer)}
                              className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(customer)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(customer)}
                              className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
              {currentItems.map((customer) => {
                const customerAwardedProjects = getAwardedProjectsForCustomer(customer.customerName);
                const totalProjectBudget = customerAwardedProjects.reduce((sum, project) => sum + (project.totalProjectValue || 0), 0);
                
                return (
                  <div key={customer._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{customer.customerName}</h3>
                        <p className="text-sm text-gray-500 truncate">{customer.customerEmail}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(customer)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Invoice Email:</span> {customer.invoiceEmail}
                      </div>
                      <div>
                        <span className="font-medium">Address:</span> {customer.billingAddress}
                      </div>
                      <div>
                        <span className="font-medium">Projects (Non-RFQ):</span> {customerAwardedProjects.length}
                        {customerAwardedProjects.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {customerAwardedProjects.slice(0, 2).map((project) => {
                              const stageColors = {
                                boq: 'bg-blue-50 text-blue-800 border-blue-200',
                                awarded: 'bg-green-50 text-green-800 border-green-200',
                                under_execution: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                                completed: 'bg-purple-50 text-purple-800 border-purple-200',
                                post_implementation: 'bg-gray-50 text-gray-800 border-gray-200'
                              };
                              const colorClass = stageColors[project.stage] || 'bg-gray-50 text-gray-800 border-gray-200';
                              return (
                                <div key={project._id} className={`${colorClass} px-2 py-1 rounded text-xs border`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{project.projectName}</span>
                                    <span className="font-bold">₹{project.totalProjectValue?.toLocaleString() || '0'}</span>
                                  </div>
                                  <div className="text-xs opacity-75 mt-1">{project.stage.replace('_', ' ').toUpperCase()}</div>
                                </div>
                              );
                            })}
                            {customerAwardedProjects.length > 2 && (
                              <div className="text-xs text-gray-500">+{customerAwardedProjects.length - 2} more</div>
                            )}
                            {/* Total Budget for Mobile */}
                            <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold mt-1">
                              <div className="flex justify-between">
                                <span>Total Budget:</span>
                                <span>₹{totalProjectBudget.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div></div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => paginate(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <CustomerForm
          customer={editingCustomer}
          onSubmit={() => handleFormSubmit(!!editingCustomer)}
          onCancel={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      </Modal>

      {/* View Customer Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title="Customer Details"
          size="lg"
          className="font-sans"
        >
          <div className="space-y-6 py-1">
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedCustomer.customerName}</h2>
                <div className="flex items-center mt-1">
                  <i className="fas fa-envelope text-gray-400 mr-2 text-sm"></i>
                  <p className="text-sm text-gray-600">{selectedCustomer.customerEmail}</p>
                </div>
              </div>
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-blue-700">
                  {getAwardedProjectsForCustomer(selectedCustomer.customerName).length} Projects (Non-RFQ)
                </span>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-address-card mr-2 text-blue-500"></i>
                Contact Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                    <i className="fas fa-envelope mr-1 text-gray-400"></i>
                    Customer Email
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedCustomer.customerEmail}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                    <i className="fas fa-file-invoice mr-1 text-gray-400"></i>
                    Invoice Email
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedCustomer.invoiceEmail}</p>
                </div>
                
                <div className="md:col-span-2 space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                    <i className="fas fa-map-marker-alt mr-1 text-gray-400"></i>
                    Billing Address
                  </h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedCustomer.billingAddress}</p>
                </div>
              </div>
            </div>

            {/* Awarded Projects Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-trophy mr-2 text-amber-500"></i>
                Awarded Projects & Budget
              </h3>
              
              {getAwardedProjectsForCustomer(selectedCustomer.customerName).length > 0 ? (
                <div className="space-y-3">
                  {getAwardedProjectsForCustomer(selectedCustomer.customerName).map((project) => (
                    <div key={project._id} className="bg-green-50 border border-green-100 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors duration-150">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-green-800">{project.projectName}</span>
                        <span className="text-green-700 font-semibold bg-white px-2 py-1 rounded-md text-sm">
                          ₹{project.totalProjectValue?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Awarded on {new Date(project.awardDate || project.createdAt).toLocaleDateString()}</span>
                        <span className="font-medium">{project.stage.replace('_', ' ').toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                  {/* Total Budget */}
                  <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-800">Total Project Budget:</span>
                      <span className="text-blue-700 font-bold text-lg">
                        ₹{getAwardedProjectsForCustomer(selectedCustomer.customerName)
                          .reduce((sum, project) => sum + (project.totalProjectValue.toFixed(2)  || 0), 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <i className="fas fa-folder-open text-gray-300 text-3xl mb-2"></i>
                  <p className="text-sm text-gray-500">No awarded projects for this customer</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

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
            Are you sure you want to delete "{customerToDelete?.customerName || 'this customer'}?" This action cannot be undone.
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

export default CustomerMaster;
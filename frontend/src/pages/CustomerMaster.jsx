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
  UserGroupIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  DocumentTextIcon,
  MapPinIcon,
  CalendarIcon,
  TrophyIcon,
  FolderIcon,
  FolderOpenIcon
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
    customerEmail: '',
    city: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCustomerNames, setUniqueCustomerNames] = useState([]);
  const [uniqueCustomerEmails, setUniqueCustomerEmails] = useState([]);
  const [uniqueCities, setUniqueCities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchCustomers();
    fetchAwardedProjects();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, filters, searchTerm, currentPage, itemsPerPage]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
      
      // Extract unique values for dropdowns
      const customerNames = [...new Set(response.data.map(customer => customer.customerName))].filter(Boolean);
      const customerEmails = [...new Set(response.data.map(customer => customer.customerEmail))].filter(Boolean);
      const cities = [...new Set(response.data.map(customer => customer.city))].filter(Boolean);
      
      setUniqueCustomerNames(customerNames);
      setUniqueCustomerEmails(customerEmails);
      setUniqueCities(cities);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAwardedProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      // Show all projects (including all stages)
      setAwardedProjects(response.data);
    } catch (error) {
      console.error('Error fetching awarded projects:', error);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply dropdown filters
    if (filters.customerName) {
      filtered = filtered.filter(customer => 
        customer.customerName === filters.customerName
      );
    }

    if (filters.customerEmail) {
      filtered = filtered.filter(customer => 
        customer.customerEmail === filters.customerEmail
      );
    }

    if (filters.city) {
      filtered = filtered.filter(customer => 
        customer.city === filters.city
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.customerName.toLowerCase().includes(searchLower) ||
        customer.customerEmail.toLowerCase().includes(searchLower) ||
        customer.invoiceEmail.toLowerCase().includes(searchLower) ||
        customer.address?.toLowerCase().includes(searchLower) ||
        customer.city?.toLowerCase().includes(searchLower) ||
        customer.state?.toLowerCase().includes(searchLower) ||
        customer.zipCode?.toLowerCase().includes(searchLower) ||
        customer.country?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCustomers(filtered);
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
      customerName: '',
      customerEmail: '',
      city: '',
    });
    setSearchTerm('');
  };

  // Format address for display
  const formatAddress = (customer) => {
    const addressParts = [
      customer.address,
      customer.city,
      customer.state,
      customer.zipCode,
      customer.country
    ].filter(Boolean);
    
    return addressParts.join(', ');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = ['Customer Name', 'Customer Email', 'City', 'State', 'Address', 'Invoice Email', 'ZIP/Postal Code', 'Country'];
    const csvData = filteredCustomers.map(customer => [
      customer.customerName,
      customer.customerEmail,
      customer.city || '',
      customer.state || '',
      customer.address || '',
      customer.invoiceEmail || '',
      customer.zipCode || '',
      customer.country || ''
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
      fetchCustomers();
      showSuccess(`Customer "${customerToDelete.customerName}" deleted successfully`);
      setShowDeleteModal(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      const errorMessage = error.response?.data?.message || 'Error deleting customer';
      showError(errorMessage);
      setShowDeleteModal(false);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingCustomer(null);
    fetchCustomers();
    showSuccess(isEdit ? 'Customer updated successfully' : 'Customer added successfully');
  };

  const getProjectsForCustomer = (customerName) => {
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
    <div className="bg-gray-50 p-2 sm:p-3 lg:p-4 xl:p-6">
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
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search clients, emails, addresses..."
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
                  Add Customer
                </button>
              </div>
            </div>
          </div>

          {/* Filters Section - Customer Name, Email, and City */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <select
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Clients</option>
                    {uniqueCustomerNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <select
                    value={filters.customerEmail}
                    onChange={(e) => handleFilterChange('customerEmail', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Emails</option>
                    {uniqueCustomerEmails.map(email => (
                      <option key={email} value={email}>{email}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Cities</option>
                    {uniqueCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}


          {/* Customers Table */}
<div className="overflow-hidden">
  {/* Desktop Table View */}
  <div className="hidden sm:block">
    <div className="max-h-[60vh] overflow-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              City
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              State
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentItems.length > 0 ? (
            currentItems.map((customer) => (
              <tr key={customer._id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{customer.customerEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {customer.city || (
                      <span className="text-gray-400 italic">Not specified</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {customer.state || (
                      <span className="text-gray-400 italic">Not specified</span>
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
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                {Object.values(filters).some(val => val !== '') || searchTerm
                  ? 'No customers found matching your filters.' 
                  : 'No customers found.'
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
      currentItems.map((customer) => (
        <div key={customer._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">{customer.customerName}</h3>
              <p className="text-sm text-gray-500 truncate">{customer.customerEmail}</p>
              {customer.invoiceEmail && customer.invoiceEmail !== customer.customerEmail && (
                <p className="text-xs text-gray-400 truncate">Invoice: {customer.invoiceEmail}</p>
              )}
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
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>
              <span className="font-medium">City:</span> {customer.city || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">State:</span> {customer.state || 'Not specified'}
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="p-8 text-center text-gray-500">
        {Object.values(filters).some(val => val !== '') || searchTerm
          ? 'No customers found matching your filters.' 
          : 'No customers found.'
        }
      </div>
    )}
  </div>
</div>

          {/* Updated Pagination */}
          {filteredCustomers.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} results
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
          existingCustomers={customers}
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
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <UserGroupIcon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.customerName}</h2>
          <p className="text-gray-600 text-sm">{selectedCustomer.customerEmail}</p>
        </div>
      </div>

      {/* Main Grid - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
              Contact Info
            </h3>
            
            <div className="space-y-3">
              
              
              {selectedCustomer.invoiceEmail && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Email</label>
                  <div className="flex items-center text-sm text-gray-900">
                    <EnvelopeOpenIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {selectedCustomer.invoiceEmail}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          {(selectedCustomer.city || selectedCustomer.state) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-green-600" />
                Location
              </h3>
              
              <div className="space-y-2">
                {selectedCustomer.city && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                    <div className="text-sm text-gray-900">{selectedCustomer.city}</div>
                  </div>
                )}
                
                {selectedCustomer.state && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                    <div className="text-sm text-gray-900">{selectedCustomer.state}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Address Information */}
          {selectedCustomer.address && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2 text-red-600" />
                Address
              </h3>
              
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="space-y-2 text-sm">
                  <div className="font-medium text-gray-900">{selectedCustomer.address}</div>
                  <div className="text-gray-700">
                    {selectedCustomer.city && `${selectedCustomer.city}, `}
                    {selectedCustomer.state && `${selectedCustomer.state}`}
                    {selectedCustomer.zipCode && ` ${selectedCustomer.zipCode}`}
                  </div>
                  {selectedCustomer.country && (
                    <div className="text-gray-700">{selectedCustomer.country}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

  

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            setSelectedCustomer(null);
            setEditingCustomer(selectedCustomer);
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <PencilSquareIcon className="h-4 w-4 mr-2" />
          Edit Customer
        </button>
        <button
          onClick={() => setSelectedCustomer(null)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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
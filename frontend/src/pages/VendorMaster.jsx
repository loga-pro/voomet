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
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  MapPinIcon,
  CreditCardIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import VendorForm from '../components/Forms/VendorForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { vendorsAPI } from '../services/api';

const VendorMaster = () => {
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [filters, setFilters] = useState({
    vendorName: '',
    email: '',
    category: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueVendorNames, setUniqueVendorNames] = useState([]);
  const [uniqueEmails, setUniqueEmails] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Categories for dropdown
  const categories = [
    { value: 'vendor', label: 'Vendor' },
    { value: 'contractor', label: 'Contractor' }
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [vendors, filters, searchTerm, currentPage, itemsPerPage]);

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data);
      
      // Extract unique values for dropdowns
      const vendorNames = [...new Set(response.data.map(vendor => vendor.vendorName))].filter(Boolean);
      const emails = [...new Set(response.data.map(vendor => vendor.email))].filter(Boolean);
      
      setUniqueVendorNames(vendorNames);
      setUniqueEmails(emails);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    // Apply dropdown filters
    if (filters.vendorName) {
      filtered = filtered.filter(vendor => 
        vendor.vendorName === filters.vendorName
      );
    }

    if (filters.email) {
      filtered = filtered.filter(vendor => 
        vendor.email === filters.email
      );
    }

    if (filters.category) {
      filtered = filtered.filter(vendor => 
        vendor.category === filters.category
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(vendor => 
        vendor.vendorName.toLowerCase().includes(searchLower) ||
        vendor.email.toLowerCase().includes(searchLower) ||
        vendor.gstNumber.toLowerCase().includes(searchLower) ||
        vendor.mobileNumber.toLowerCase().includes(searchLower) ||
        (vendor.address && vendor.address.toLowerCase().includes(searchLower)) ||
        (vendor.contactPerson && vendor.contactPerson.toLowerCase().includes(searchLower)) ||
        (vendor.category && vendor.category.toLowerCase().includes(searchLower))
      );
    }

    setFilteredVendors(filtered);
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
      vendorName: '',
      email: '',
      category: ''
    });
    setSearchTerm('');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = [
      'Vendor/Contractor Name', 
      'Email', 
      'GST Number', 
      'Mobile Number', 
      'Contact Person', 
      'Address',
      'City',
      'State',
      'Zip Code',
      'Country',
      'Bank Account Number',
      'Category'
    ];
    
    const csvData = filteredVendors.map(vendor => [
      vendor.vendorName,
      vendor.email,
      vendor.gstNumber,
      vendor.mobileNumber,
      vendor.contactPerson || '',
      vendor.address || '',
      vendor.city || '',
      vendor.state || '',
      vendor.zipCode || '',
      vendor.country || '',
      vendor.bankAccountNumber,
      vendor.category || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'vendors_full_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleView = (vendor) => {
    setSelectedVendor(vendor);
    setViewModal(true);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const handleDelete = (vendor) => {
    setVendorToDelete(vendor);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await vendorsAPI.delete(vendorToDelete._id);
      fetchVendors();
      showSuccess(`Vendor "${vendorToDelete.vendorName}" deleted successfully`);
      setShowDeleteModal(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      // Handle the new error response format
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.childRecords) {
          showError(errorData.message);
        } else {
          showError('Failed to delete vendor. Please try again.');
        }
      } else {
        showError('Failed to delete vendor. Please try again.');
      }
      setShowDeleteModal(false);
      setVendorToDelete(null);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingVendor(null);
    fetchVendors();
    showSuccess(isEdit ? 'Vendor updated successfully' : 'Vendor added successfully');
  };

  // Format category for display
  const formatCategory = (category) => {
    if (!category) return 'N/A';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Get category badge color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'vendor':
        return 'bg-blue-100 text-blue-800';
      case 'contractor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
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
                    placeholder="Search vendors, emails, GST numbers, categories..."
                  />
                </div>
              </div>
              
              {/* Search Results Info */}
              {searchTerm && (
                <div className="mt-3 text-sm text-gray-600">
                  Found {filteredVendors.length} vendor(s) matching "{searchTerm}"
                </div>
              )}
              
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
                  Add Vendor
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor/Contractor Name</label>
                  <select
                    value={filters.vendorName}
                    onChange={(e) => handleFilterChange('vendorName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Vendors</option>
                    {uniqueVendorNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <select
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Emails</option>
                    {uniqueEmails.map(email => (
                      <option key={email} value={email}>{email}</option>
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
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Vendors Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor/Contractor Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mobile Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((vendor) => (
                        <tr key={vendor._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{vendor.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">{vendor.gstNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{vendor.mobileNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(vendor.category)}`}>
                              {formatCategory(vendor.category)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(vendor)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(vendor)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit Vendor"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(vendor)}
                                className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                                title="Delete Vendor"
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
                            ? 'No vendors found matching your filters.' 
                            : 'No vendors found.'
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
                currentItems.map((vendor) => (
                  <div key={vendor._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{vendor.vendorName}</h3>
                        <p className="text-sm text-gray-500 truncate">{vendor.email}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(vendor.category)}`}>
                          {formatCategory(vendor.category)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">GST Number:</span> {vendor.gstNumber}
                      </div>
                      <div>
                        <span className="font-medium">Mobile Number:</span> {vendor.mobileNumber}
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2 mt-3 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleView(vendor)}
                        className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                        title="Edit Vendor"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                        title="Delete Vendor"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') || searchTerm
                    ? 'No vendors found matching your filters.' 
                    : 'No vendors found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Updated Pagination */}
          {filteredVendors.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredVendors.length)} of {filteredVendors.length} results
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
          setEditingVendor(null);
        }}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        size="lg"
      >
        <VendorForm
          vendor={editingVendor}
          onSubmit={() => handleFormSubmit(!!editingVendor)}
          onCancel={() => {
            setShowModal(false);
            setEditingVendor(null);
          }}
        />
      </Modal>

      {/* View Modal */}
     <Modal
  isOpen={viewModal}
  onClose={() => {
    setViewModal(false);
    setSelectedVendor(null);
  }}
  title="Vendor Details"
  size="lg"
  className="font-sans"
>
  {selectedVendor && (
    <div className="p-1">
      <div className="space-y-6">
        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900">Vendor Information</h3>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor Name</p>
                <p className="text-sm font-medium text-gray-800">{selectedVendor.vendorName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm text-gray-600">{selectedVendor.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(selectedVendor.category)}`}>
                  {formatCategory(selectedVendor.category)}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900">Contact Info</h3>
            </div>
            <div className="space-y-2">
              {selectedVendor.contactPerson && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Person</p>
                  <p className="text-sm text-gray-800">{selectedVendor.contactPerson}</p>
                </div>
              )}
              {selectedVendor.mobileNumber && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mobile</p>
                  <p className="text-sm text-gray-800">{selectedVendor.mobileNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900">Business Info</h3>
            </div>
            <div className="space-y-2">
              {selectedVendor.gstNumber && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">GST Number</p>
                  <p className="text-sm font-mono text-gray-800">{selectedVendor.gstNumber}</p>
                </div>
              )}
              {selectedVendor.bankAccountNumber && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Account</p>
                  <p className="text-sm font-mono text-gray-800">{selectedVendor.bankAccountNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900">Location</h3>
            </div>
            <div className="space-y-2">
              {selectedVendor.city && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">City</p>
                  <p className="text-sm text-gray-800">{selectedVendor.city}</p>
                </div>
              )}
              {selectedVendor.state && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">State</p>
                  <p className="text-sm text-gray-800">{selectedVendor.state}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address Information - Spans 2 columns like Customer Master */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm md:col-span-2">
            <div className="flex items-center mb-3">
              <h3 className="text-md font-semibold text-gray-900">Address</h3>
            </div>
            <div className="space-y-2">
              {selectedVendor.address && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Address</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedVendor.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {selectedVendor.zipCode && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ZIP Code</p>
                    <p className="text-sm text-gray-800">{selectedVendor.zipCode}</p>
                  </div>
                )}
                {selectedVendor.country && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</p>
                    <p className="text-sm text-gray-800">{selectedVendor.country}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              setViewModal(false);
              handleEdit(selectedVendor);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Vendor
          </button>
          <button
            onClick={() => setViewModal(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
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
            Are you sure you want to delete "{vendorToDelete?.vendorName || 'this vendor'}"? This action cannot be undone.
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

export default VendorMaster;
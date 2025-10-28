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
    email: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueVendorNames, setUniqueVendorNames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { notification, showSuccess, hideNotification } = useNotification();

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    filterVendors();
  }, [vendors, filters, currentPage, itemsPerPage]);

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data);
      
      // Extract unique values for dropdowns
      const vendorNames = [...new Set(response.data.map(vendor => vendor.vendorName))].filter(Boolean);
      
      setUniqueVendorNames(vendorNames);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVendors = () => {
    let filtered = vendors;

    if (filters.vendorName) {
      filtered = filtered.filter(vendor => 
        vendor.vendorName.toLowerCase().includes(filters.vendorName.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(vendor => 
        vendor.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
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
      vendorName: '',
      email: ''
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
  const headers = ['Vendor Name', 'Email', 'GST Number', 'Bank Account Number'];
  const csvData = filteredVendors.map(vendor => [
    vendor.vendorName,
    vendor.email,
    vendor.gstNumber,
    vendor.bankAccountNumber
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
      fetchVendors(); // Refresh the list
      showSuccess(`Vendor "${vendorToDelete.vendorName}" deleted successfully`);
      setShowDeleteModal(false);
      setVendorToDelete(null);
    } catch (error) {
      console.error('Error deleting vendor:', error);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingVendor(null);
    fetchVendors(); // Refresh the list
    showSuccess(isEdit ? 'Vendor updated successfully' : 'Vendor added successfully');
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
          value={filters.vendorName}
          onChange={(e) => handleFilterChange('vendorName', e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search vendors..."
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
        Add Vendor
      </button>
    </div>
  </div>
</div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
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
                  <input
                    type="text"
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by email"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Vendors Table */}
          <div className="overflow-hidden">
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > filteredVendors.length ? filteredVendors.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{filteredVendors.length}</span> results
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Account Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((vendor) => (
                    <tr key={vendor._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.gstNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{vendor.bankAccountNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(vendor)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(vendor)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(vendor)}
                            className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
              {currentItems.map((vendor) => (
                <div key={vendor._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{vendor.vendorName}</h3>
                      <p className="text-sm text-gray-500 truncate">{vendor.email}</p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => handleView(vendor)}
                        className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-gray-500">
                     <div>
                      <span className="font-medium">GST Number:</span> {vendor.gstNumber}
                    </div>
                    <div>
                      <span className="font-medium">Bank Account:</span> {vendor.bankAccountNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                
              </div>
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
    <div className="space-y-6 py-1">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{selectedVendor.vendorName}</h2>
          <div className="flex items-center mt-1">
            <i className="fas fa-envelope text-gray-400 mr-2 text-sm"></i>
            <p className="text-sm text-gray-600">{selectedVendor.email}</p>
          </div>
        </div>
      </div>

      {/* Vendor Information Card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <i className="fas fa-signature mr-1 text-gray-400"></i>
              Vendor Name
            </h4>
            <p className="text-sm text-gray-900 font-medium">{selectedVendor.vendorName}</p>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <i className="fas fa-envelope mr-1 text-gray-400"></i>
              Email Address
            </h4>
            <p className="text-sm text-gray-900 font-medium">{selectedVendor.email}</p>
          </div>
          
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <i className="fas fa-university mr-1 text-gray-400"></i>
              Bank Account Number
            </h4>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded-md">
              {selectedVendor.bankAccountNumber}
            </p>
          </div>
          
          <div className="space-y-1 md:col-span-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <i className="fas fa-map-marker-alt mr-1 text-gray-400"></i>
              Address
            </h4>
            <p className="text-sm text-gray-900 font-medium bg-gray-50 p-2 rounded-md">
              {selectedVendor.address}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Information Section (if available) */}
      {(selectedVendor.phone || selectedVendor.contactPerson) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
            <i className="fas fa-phone-alt mr-2 text-green-500"></i>
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {selectedVendor.phone && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                  <i className="fas fa-phone mr-1 text-gray-400"></i>
                  Phone Number
                </h4>
                <p className="text-sm text-gray-900 font-medium">{selectedVendor.phone}</p>
              </div>
            )}
            
            {selectedVendor.contactPerson && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
                  <i className="fas fa-user mr-1 text-gray-400"></i>
                  Contact Person
                </h4>
                <p className="text-sm text-gray-900 font-medium">{selectedVendor.contactPerson}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-2">
        <button
          onClick={() => setViewModal(false)}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Close
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
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
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import PartForm from '../components/Forms/PartForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { partsAPI } from '../services/api';

const PartMaster = () => {
  const [parts, setParts] = useState([]);
  const [filteredParts, setFilteredParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [filters, setFilters] = useState({
    scopeOfWork: '',
    category: '',
    partName: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueScopes, setUniqueScopes] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniquePartNames, setUniquePartNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Helper function to format scope of work (capitalize first word)
  const formatScopeOfWork = (scope) => {
    const str = (scope || '').replace(/_/g, ' ').toLowerCase();
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  };

  // Category color mapping
  const categoryColors = {
    inhouse: 'bg-blue-100 text-blue-800',
    out_sourced: 'bg-purple-100 text-purple-800',
    bought_out: 'bg-green-100 text-green-800'
  };

  // Unit type color mapping
  const unitTypeColors = {
    sq_feet: 'bg-orange-100 text-orange-800',
    number: 'bg-indigo-100 text-indigo-800',
    meter: 'bg-pink-100 text-pink-800'
  };

  useEffect(() => {
    fetchParts();
  }, []);

  useEffect(() => {
    filterParts();
  }, [parts, filters, searchTerm]);

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data);

      // Extract unique values for dropdowns
      const scopes = [...new Set(response.data.map(part => part.scopeOfWork))].filter(Boolean);
      const categories = [...new Set(response.data.map(part => part.category))].filter(Boolean);
      const partNames = [...new Set(response.data.map(part => part.partName))].filter(Boolean);

      setUniqueScopes(scopes);
      setUniqueCategories(categories);
      setUniquePartNames(partNames);
    } catch (error) {
      console.error('Error fetching parts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterParts = () => {
    let filtered = parts;

    // Apply dropdown filters
    if (filters.scopeOfWork) {
      filtered = filtered.filter(part =>
        part.scopeOfWork === filters.scopeOfWork
      );
    }

    if (filters.category) {
      filtered = filtered.filter(part =>
        part.category === filters.category
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(part =>
        part.partName === filters.partName
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(part => {
        // Safely convert values to strings and check if they include the search term
        const partName = part.partName?.toString().toLowerCase() || '';
        const scopeOfWork = part.scopeOfWork?.toString().toLowerCase() || '';
        const category = part.category?.toString().toLowerCase() || '';
        const unitType = part.unitType?.toString().toLowerCase() || '';
        const partPrice = part.partPrice?.toString() || '';

        return partName.includes(searchLower) ||
          scopeOfWork.includes(searchLower) ||
          category.includes(searchLower) ||
          unitType.includes(searchLower) ||
          partPrice.includes(searchTerm);
      });
    }

    setFilteredParts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
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
      scopeOfWork: '',
      category: '',
      partName: ''
    });
    setSearchTerm('');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredParts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const headers = ['Scope of Work', 'Item Name', 'Specification', 'Category', 'Unit Type', 'Part Price (In Rupees)', 'Vendor Name', 'Reorder Level'];
    const csvData = filteredParts.map(part => [
      formatScopeOfWork(part.scopeOfWork),
      part.partName,
      part.specification || '',
      part.category.replace('_', ' ').toUpperCase(),
      part.unitType.toUpperCase(),
      `${parseFloat(part.partPrice).toFixed(2)}`,
      part.vendorName || '',
      part.reorderLevel || '0'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Add UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'parts_full_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleView = (part) => {
    setSelectedPart(part);
    setViewModal(true);
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);

  const handleDelete = (part) => {
    setPartToDelete(part);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await partsAPI.delete(partToDelete._id);
      fetchParts(); // Refresh the list
      showSuccess(`Part "${partToDelete.partName}" deleted successfully`);
      setShowDeleteModal(false);
      setPartToDelete(null);
    } catch (error) {
      console.error('Error deleting part:', error);
      if (error.response?.data?.message) {
        // Show detailed error message from backend
        showError(error.response.data.message);
        if (error.response.data.details) {
          // Optionally show more details in console or as additional notification
          console.log('Delete restriction details:', error.response.data.details);
        }
      } else {
        showError('Failed to delete part. Please try again.');
      }
      setShowDeleteModal(false);
      setPartToDelete(null);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingPart(null);
    fetchParts(); // Refresh the list
    showSuccess(isEdit ? 'Part updated successfully' : 'Part added successfully');
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
                    placeholder="Search parts, scope, category, unit type, price..."
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
                  Found {filteredParts.length} part(s) matching "{searchTerm}"
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Part
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                  <select
                    value={filters.scopeOfWork}
                    onChange={(e) => handleFilterChange('scopeOfWork', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Scopes</option>
                    {uniqueScopes.map(scope => (
                      <option key={scope} value={scope}>{formatScopeOfWork(scope)}</option>
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
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <select
                    value={filters.partName}
                    onChange={(e) => handleFilterChange('partName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Item Names</option>
                    {uniquePartNames.map(partName => (
                      <option key={partName} value={partName}>{partName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}


          {/* Parts Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scope of Work
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Part Price (₹)
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((part) => (
                        <tr key={part._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {formatScopeOfWork(part.scopeOfWork)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{part.partName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[part.category] || 'bg-gray-100 text-gray-800'}`}>
                              {part.category.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${unitTypeColors[part.unitType] || 'bg-gray-100 text-gray-800'}`}>
                              {part.unitType.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{parseFloat(part.partPrice).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(part)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(part)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(part)}
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
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') || searchTerm
                            ? 'No parts found matching your filters.'
                            : 'No parts found.'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View - Keep your existing mobile view code */}
            <div className="sm:hidden">
              {currentItems.length > 0 ? (
                currentItems.map((part) => (
                  <div key={part._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{part.partName}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {formatScopeOfWork(part.scopeOfWork)}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(part)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(part)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(part)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-500">Category:</span>
                        <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[part.category] || 'bg-gray-100 text-gray-800'}`}>
                          {part.category.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Unit Type:</span>
                        <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${unitTypeColors[part.unitType] || 'bg-gray-100 text-gray-800'}`}>
                          {part.unitType.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Price:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          ₹{parseFloat(part.partPrice).toFixed(2)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Vendor:</span>
                        <span className="ml-1 text-gray-900">
                          {part.vendorName || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') || searchTerm
                    ? 'No parts found matching your filters.'
                    : 'No parts found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredParts.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredParts.length)} of {filteredParts.length} results
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
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingPart(null);
        }}
        title={editingPart ? 'Edit Part' : 'Add Part'}
        size="lg"
      >
        <PartForm
          part={editingPart}
          onSubmit={() => handleFormSubmit(!!editingPart)}
          onCancel={() => {
            setShowModal(false);
            setEditingPart(null);
          }}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedPart(null);
        }}
        title="Part Details"
        size="xl"
      >
        {selectedPart && (
          <div className="p-3 text-sm">

            {/* BASIC ITEM INFORMATION */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Basic Item Information
              </h3>

              <div className="border rounded-md p-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Item Name</p>
                    <p className="font-medium text-gray-800">
                      {selectedPart.partName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Specification
                    </p>
                    <p className="text-gray-700">
                      {selectedPart.specification || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Scope of Work
                    </p>
                    <p className="text-gray-700">
                      {formatScopeOfWork(selectedPart.scopeOfWork)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Category</p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[selectedPart.category]}`}
                    >
                      {selectedPart.category?.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Unit Type</p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${unitTypeColors[selectedPart.unitType]}`}
                    >
                      {selectedPart.unitType?.toUpperCase()}
                    </span>
                  </div>

                </div>
              </div>
            </div>

            {/* FINANCIAL INFORMATION */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">
                Financial Information
              </h3>

              <div className="border rounded-md p-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                  {selectedPart.existingPrice && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Existing Price</p>
                      <p className="font-semibold text-gray-600">
                        ₹{parseFloat(selectedPart.existingPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Part Price</p>
                    <p className="font-semibold text-gray-900">
                      ₹{parseFloat(selectedPart.partPrice || 0).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase">Vendor</p>
                    <p className="text-gray-700">
                      {selectedPart.vendorName || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setViewModal(false)}
                className="px-3 py-1.5 text-sm border rounded-md"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewModal(false);
                  setEditingPart(selectedPart);
                  setShowModal(true);
                }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md"
              >
                Edit Part
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
            Are you sure you want to delete "{partToDelete?.partName || 'this part'}"? This action cannot be undone.
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

export default PartMaster;

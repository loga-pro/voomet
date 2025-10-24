import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import InventoryForm from '../components/Forms/InventoryForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { inventoryAPI, partsAPI } from '../services/api';

const InventoryManagement = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({
    scopeOfWork: '',
    partName: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [parts, setParts] = useState([]);
  const [uniqueScopes, setUniqueScopes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Use notification hook
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchInventoryItems();
    fetchParts();
  }, []);

  useEffect(() => {
    filterItems();
  }, [inventoryItems, filters, currentPage, itemsPerPage]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const response = await inventoryAPI.getAll();
      setInventoryItems(response.data);
      
      // Extract unique values for dropdowns
      const scopes = [...new Set(response.data.map(item => item.scopeOfWork))].filter(Boolean);
      setUniqueScopes(scopes);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      showError('Failed to fetch inventory items');
    } finally {
      setLoading(false);
    }
  };

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data);
    } catch (error) {
      console.error('Error fetching parts:', error);
      showError('Failed to fetch parts');
    }
  };

  const filterItems = () => {
    let filtered = inventoryItems;

    if (filters.scopeOfWork) {
      filtered = filtered.filter(item => 
        item.scopeOfWork === filters.scopeOfWork
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(item => 
        item.partName.toLowerCase().includes(filters.partName.toLowerCase())
      );
    }

    setFilteredItems(filtered);
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
      scopeOfWork: '',
      partName: ''
    });
  };

  // Helper function to calculate totals from arrays
  const calculateTotals = (item) => {
    const totalReceipts = item.receipts?.reduce((sum, receipt) => sum + (receipt.quantity || 0), 0) || 0;
    const totalDispatches = item.dispatches?.reduce((sum, dispatch) => sum + (dispatch.quantity || 0), 0) || 0;
    const totalReturns = item.returns?.reduce((sum, returnItem) => sum + (returnItem.quantity || 0), 0) || 0;
    
    return { totalReceipts, totalDispatches, totalReturns };
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    try {
      const headers = [
        'Scope of Work', 'Part Name', 'Part Price', 'Date of Receipt', 
        'Total Receipts', 'Total Dispatches', 'Total Returns',
        'Cumulative Qty at Voomet', 'Cumulative Price Value', 'Remarks'
      ];
      
      const csvData = filteredItems.map(item => {
        const { totalReceipts, totalDispatches, totalReturns } = calculateTotals(item);
        
        return [
          item.scopeOfWork,
          item.partName,
          item.partPrice,
          new Date(item.dateOfReceipt).toLocaleDateString(),
          totalReceipts,
          totalDispatches,
          totalReturns,
          item.cumulativeQuantityAtVoomet || 0,
          item.cumulativePriceValue || 0,
          item.remarks || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_data.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Inventory data exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Failed to export inventory data');
    }
  };

  const handleView = (item) => {
    setSelectedItem(item);
    setViewModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await inventoryAPI.delete(id);
        showSuccess('Inventory item deleted successfully');
        fetchInventoryItems(); // Refresh the list
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        showError('Failed to delete inventory item');
      }
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingItem(null);
    showSuccess(isEdit ? 'Inventory item updated successfully' : 'Inventory item added successfully');
    fetchInventoryItems(); // Refresh the list
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
      {/* Notification Component */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      <div className="max-w-none xl:max-w-8xl mx-auto">
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
                    value={filters.partName}
                    onChange={(e) => handleFilterChange('partName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search parts..."
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
                  Add Inventory
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                  <select
                    value={filters.scopeOfWork}
                    onChange={(e) => handleFilterChange('scopeOfWork', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Scopes</option>
                    {uniqueScopes.map(scope => (
                      <option key={scope} value={scope}>{scope.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Part Name</label>
                  <input
                    type="text"
                    value={filters.partName}
                    onChange={(e) => handleFilterChange('partName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by part name"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div>
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > filteredItems.length ? filteredItems.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{filteredItems.length}</span> results
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scope of Work
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price (₹)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Receipts
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date of Receipt
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => {
                    const { totalReceipts } = calculateTotals(item);
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.scopeOfWork.replace('_', ' ').toUpperCase()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{item.partName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">₹{item.partPrice}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{totalReceipts}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(item.dateOfReceipt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(item)}
                              className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
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
              {currentItems.map((item) => {
                const { totalReceipts } = calculateTotals(item);
                return (
                  <div key={item._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{item.partName}</h3>
                        <p className="text-sm text-gray-500 truncate">{item.scopeOfWork.replace('_', ' ').toUpperCase()}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-500">Price:</span>
                        <span className="ml-1 font-semibold text-gray-900">₹{item.partPrice}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Total Receipts:</span>
                        <span className="ml-1 text-gray-900">{totalReceipts}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500">Date of Receipt:</span>
                        <span className="ml-1 text-gray-900">{new Date(item.dateOfReceipt).toLocaleDateString()}</span>
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
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
        size="xl"
      >
        <InventoryForm
          inventory={editingItem}
          onSubmit={() => handleFormSubmit(!!editingItem)}
          onCancel={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          showNotification={showSuccess}
          showError={showError}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedItem(null);
        }}
        title="Inventory Item Details"
        size="lg"
        className="font-sans"
      >
        {selectedItem && (
          <div className="space-y-6 py-1">
            {/* Header with part name and scope */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedItem.partName}</h2>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {selectedItem.scopeOfWork.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Part Price</p>
                <p className="text-2xl font-bold text-blue-600">₹{selectedItem.partPrice.toLocaleString()}</p>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                Inventory Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scope of Work</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.scopeOfWork.replace('_', ' ').toUpperCase()}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Part Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.partName}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Part Price</h4>
                  <p className="text-sm text-gray-900 font-medium">₹{selectedItem.partPrice}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Receipt</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(selectedItem.dateOfReceipt).toLocaleDateString()}
                  </p>
                </div>
                
                {(() => {
                  const { totalReceipts, totalDispatches, totalReturns } = calculateTotals(selectedItem);
                  return (
                    <>
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Receipts</h4>
                        <p className="text-sm text-gray-900 font-medium">{totalReceipts}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Dispatches</h4>
                        <p className="text-sm text-gray-900 font-medium">{totalDispatches}</p>
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Returns</h4>
                        <p className="text-sm text-gray-900 font-medium">{totalReturns}</p>
                      </div>
                    </>
                  );
                })()}
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cumulative Qty at Voomet</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.cumulativeQuantityAtVoomet || 0}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cumulative Price Value</h4>
                  <p className="text-sm text-gray-900 font-medium">₹{(selectedItem.cumulativePriceValue || 0).toLocaleString()}</p>
                </div>
                
                {selectedItem.remarks && (
                  <div className="col-span-2 space-y-1">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Remarks</h4>
                    <p className="text-sm text-gray-900 font-medium">{selectedItem.remarks}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transactions Tables */}
          {selectedItem.receipts && selectedItem.receipts.length > 0 && (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
    <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
      Receipts
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {selectedItem.receipts.map((receipt, index) => (
            <tr key={index}>
              <td className="px-3 py-2 text-sm text-gray-900">
                {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900">{receipt.quantity || 0}</td>
              <td className="px-3 py-2 text-sm text-gray-900">
                ₹{(receipt.total || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{selectedItem.dispatches && selectedItem.dispatches.some(d => d.quantity > 0) && (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
    <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
      Dispatches to Site
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {selectedItem.dispatches.filter(d => d.quantity > 0).map((dispatch, index) => (
            <tr key={index}>
              <td className="px-3 py-2 text-sm text-gray-900">
                {dispatch.date ? new Date(dispatch.date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900">{dispatch.quantity || 0}</td>
              <td className="px-3 py-2 text-sm text-gray-900">
                ₹{(dispatch.total || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{selectedItem.returns && selectedItem.returns.some(r => r.quantity > 0) && (
  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
    <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
      Returns from Site
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {selectedItem.returns.filter(r => r.quantity > 0).map((returnItem, index) => (
            <tr key={index}>
              <td className="px-3 py-2 text-sm text-gray-900">
                {returnItem.date ? new Date(returnItem.date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="px-3 py-2 text-sm text-gray-900">{returnItem.quantity || 0}</td>
              <td className="px-3 py-2 text-sm text-gray-900">
                ₹{(returnItem.total || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
              <button
                onClick={() => {
                  setViewModal(false);
                  handleEdit(selectedItem);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Item
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryManagement;
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
  ChevronRightIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  ArchiveBoxIcon,
  TruckIcon,
  ArrowPathIcon
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
    partName: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [parts, setParts] = useState([]);
  const [uniqueScopes, setUniqueScopes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
      const items = response.data.map(item => ({
        ...item,
        // Ensure numeric values
        partPrice: parseFloat(item.partPrice) || 0,
        cumulativeQuantityAtVoomet: parseFloat(item.cumulativeQuantityAtVoomet) || 0,
        cumulativePriceValue: parseFloat(item.cumulativePriceValue) || 0,
        // Ensure arrays exist
        receipts: item.receipts || [],
        dispatches: item.dispatches || [],
        returns: item.returns || []
      }));
      setInventoryItems(items);
      
      const scopes = [...new Set(items.map(item => item.scopeOfWork))].filter(Boolean);
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
    let filtered = [...inventoryItems];

    if (filters.scopeOfWork) {
      filtered = filtered.filter(item => 
        item.scopeOfWork?.toLowerCase().includes(filters.scopeOfWork.toLowerCase())
      );
    }

    if (filters.partName) {
      filtered = filtered.filter(item => 
        item.partName?.toLowerCase().includes(filters.partName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(item => {
        const { totalReceipts, totalDispatches } = calculateTotals(item);
        const currentStock = totalReceipts - totalDispatches;
        
        switch (filters.status) {
          case 'in-stock':
            return currentStock > 0;
          case 'low-stock':
            return currentStock > 0 && currentStock <= 10;
          case 'out-of-stock':
            return currentStock <= 0;
          default:
            return true;
        }
      });
    }

    setFilteredItems(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      scopeOfWork: '',
      partName: '',
      status: ''
    });
  };

  // Enhanced totals calculation with validation
  const calculateTotals = (item) => {
    const totalReceipts = item.receipts?.reduce((sum, receipt) => 
      sum + (parseFloat(receipt.quantity) || 0), 0) || 0;
    
    const totalDispatches = item.dispatches?.reduce((sum, dispatch) => 
      sum + (parseFloat(dispatch.quantity) || 0), 0) || 0;
    
    const totalReturns = item.returns?.reduce((sum, returnItem) => 
      sum + (parseFloat(returnItem.quantity) || 0), 0) || 0;

    const currentStock = totalReceipts + totalReturns - totalDispatches;
    
    return { 
      totalReceipts: parseFloat(totalReceipts.toFixed(2)), 
      totalDispatches: parseFloat(totalDispatches.toFixed(2)), 
      totalReturns: parseFloat(totalReturns.toFixed(2)),
      currentStock: parseFloat(currentStock.toFixed(2))
    };
  };

  // Calculate total value for a specific item
  const calculateTotalValue = (item) => {
    const { currentStock } = calculateTotals(item);
    return (currentStock * (item.partPrice || 0)).toFixed(2);
  };

  // Get stock status
  const getStockStatus = (item) => {
    const { currentStock } = calculateTotals(item);
    
    if (currentStock <= 0) {
      return { status: 'Out of Stock', color: 'red' };
    } else if (currentStock <= 10) {
      return { status: 'Low Stock', color: 'yellow' };
    } else {
      return { status: 'In Stock', color: 'green' };
    }
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
        'Total Receipts', 'Total Dispatches', 'Total Returns', 'Current Stock',
        'Cumulative Qty at Voomet', 'Cumulative Price Value', 'Stock Status', 'Remarks'
      ];
      
      const csvData = filteredItems.map(item => {
        const { totalReceipts, totalDispatches, totalReturns, currentStock } = calculateTotals(item);
        const stockStatus = getStockStatus(item);
        
        return [
          item.scopeOfWork,
          item.partName,
          item.partPrice,
          new Date(item.dateOfReceipt).toLocaleDateString(),
          totalReceipts,
          totalDispatches,
          totalReturns,
          currentStock,
          item.cumulativeQuantityAtVoomet || 0,
          item.cumulativePriceValue || 0,
          stockStatus.status,
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
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await inventoryAPI.delete(itemToDelete._id);
      showSuccess('Inventory item deleted successfully');
      fetchInventoryItems();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      showError('Failed to delete inventory item');
    }
  };

  const handleFormSubmit = async (isEdit = false) => {
    setShowModal(false);
    setEditingItem(null);
    showSuccess(isEdit ? 'Inventory item updated successfully' : 'Inventory item added successfully');
    // Add a small delay to ensure the form submission is complete before refreshing
    setTimeout(() => {
      fetchInventoryItems();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-2 sm:p-4 lg:p-5 overflow-x-hidden">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      <div className="w-full max-w-full px-1 sm:px-2 mx-auto">
        {/* KPI Cards Section - At the Top */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CubeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">{inventoryItems.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArchiveBoxIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {inventoryItems.filter(item => calculateTotals(item).currentStock > 0).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {inventoryItems.filter(item => {
                    const { currentStock } = calculateTotals(item);
                    return currentStock > 0 && currentStock <= 10;
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyRupeeIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ₹{inventoryItems.reduce((sum, item) => {
                    const totalValue = parseFloat(calculateTotalValue(item));
                    return sum + totalValue;
                  }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Toolbar */}
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

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                  <select
                    value={filters.scopeOfWork}
                    onChange={(e) => handleFilterChange('scopeOfWork', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Scopes</option>
                    {uniqueScopes.map(scope => (
                      <option key={scope} value={scope}>
                        {scope.replace(/_/g, ' ').toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Status</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="px-4 py-4 sm:px-6 bg-white border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, filteredItems.length)}
                </span> of{' '}
                <span className="font-medium">{filteredItems.length}</span> results
              </p>
              
              {filteredItems.length > 0 && (
                <div className="mt-2 sm:mt-0 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Page</span>
                  <span className="text-sm font-medium text-gray-900">{currentPage} of {totalPages}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scope
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Info
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Financials
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => {
                    const { totalReceipts, totalDispatches, currentStock } = calculateTotals(item);
                    const stockStatus = getStockStatus(item);
                    const totalValue = calculateTotalValue(item);
                    
                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <CubeIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{item.partName}</div>
                              <div className="text-sm text-gray-500">₹{item.partPrice?.toLocaleString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.scopeOfWork?.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{Math.round(currentStock)}</div>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                            stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {stockStatus.status}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="flex justify-between space-x-2">
                              <span className="text-gray-500">Receipts:</span>
                              <span className="font-medium text-green-600">{Math.round(totalReceipts)}</span>
                            </div>
                            <div className="flex justify-between space-x-2">
                              <span className="text-gray-500">Dispatches:</span>
                              <span className="font-medium text-orange-600">{Math.round(totalDispatches)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            ₹{parseFloat(totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {new Date(item.dateOfReceipt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(item)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {currentItems.map((item) => {
                const { totalReceipts, totalDispatches, currentStock } = calculateTotals(item);
                const stockStatus = getStockStatus(item);
                const totalValue = calculateTotalValue(item);
                
                return (
                  <div key={item._id} className="border-b border-gray-200 p-2 sm:p-3 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CubeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="ml-2 min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.partName}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {item.scopeOfWork?.replace(/_/g, ' ').toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Price:</span>
                        <span className="ml-1 font-semibold text-gray-900">₹{item.partPrice}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Stock:</span>
                        <span className="ml-1 font-semibold text-gray-900">{Math.round(currentStock)}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Receipts:</span>
                        <span className="ml-1 text-green-600 font-medium">{Math.round(totalReceipts)}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Dispatches:</span>
                        <span className="ml-1 text-orange-600 font-medium">{Math.round(totalDispatches)}</span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Total Value:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          ₹{parseFloat(totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Status:</span>
                        <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                          stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {stockStatus.status}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                        <span className="font-medium text-gray-500">Date:</span>
                        <span className="ml-1 text-gray-900 flex items-center text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1 text-gray-400" />
                          {new Date(item.dateOfReceipt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Pagination */}
          {filteredItems.length > 0 && (
            <div className="bg-white px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between items-center sm:hidden">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredItems.length)}</span> of{' '}
                    <span className="font-medium">{filteredItems.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                        currentPage === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
              <p className="mt-1 text-sm text-gray-500">
                {inventoryItems.length === 0 
                  ? "Get started by adding your first inventory item."
                  : "No items match your current filters."
                }
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    if (inventoryItems.length === 0) {
                      setShowModal(true);
                    } else {
                      clearFilters();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {inventoryItems.length === 0 ? 'Add Inventory Item' : 'Clear Filters'}
                </button>
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

      {/* Enhanced View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedItem(null);
        }}
        title="Inventory Item Details"
        size="xl"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CubeIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedItem.partName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedItem.scopeOfWork?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {(() => {
                        const stockStatus = getStockStatus(selectedItem);
                        return (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            stockStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                            stockStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {stockStatus.status}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 text-right">
                  <p className="text-sm text-gray-500">Unit Price</p>
                  <p className="text-2xl font-bold text-blue-600">₹{selectedItem.partPrice?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Stock Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Current Stock</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(calculateTotals(selectedItem).currentStock)}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Receipts</div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(calculateTotals(selectedItem).totalReceipts)}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Dispatches</div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(calculateTotals(selectedItem).totalDispatches)}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Value</div>
                <div className="text-2xl font-bold text-purple-600">
                  ₹{calculateTotalValue(selectedItem)}
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CubeIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Scope of Work:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedItem.scopeOfWork?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Part Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedItem.partName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Unit Price:</span>
                    <span className="text-sm font-medium text-gray-900">₹{selectedItem.partPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Date of Receipt:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(selectedItem.dateOfReceipt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CurrencyRupeeIcon className="h-5 w-5 mr-2 text-green-500" />
                  Financial Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Cumulative Qty at Voomet:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {Math.round(selectedItem.cumulativeQuantityAtVoomet || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Cumulative Price Value:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{(selectedItem.cumulativePriceValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Value:</span>
                    <span className="text-sm font-medium text-gray-900">
                      ₹{calculateTotalValue(selectedItem)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-6">
              {/* Receipts */}
              {selectedItem.receipts && selectedItem.receipts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ArrowPathIcon className="h-5 w-5 mr-2 text-green-500" />
                    Receipts ({selectedItem.receipts.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedItem.receipts.map((receipt, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{Math.round(receipt.quantity || 0)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              ₹{((receipt.quantity || 0) * (selectedItem.partPrice || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dispatches */}
              {selectedItem.dispatches && selectedItem.dispatches.filter(d => d.quantity > 0).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TruckIcon className="h-5 w-5 mr-2 text-orange-500" />
                    Dispatches to Site ({selectedItem.dispatches.filter(d => d.quantity > 0).length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedItem.dispatches
                          .filter(dispatch => dispatch.quantity > 0)
                          .map((dispatch, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {dispatch.date ? new Date(dispatch.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{Math.round(dispatch.quantity || 0)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                ₹{((dispatch.quantity || 0) * (selectedItem.partPrice || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Returns */}
              {selectedItem.returns && selectedItem.returns.filter(r => r.quantity > 0).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ArchiveBoxIcon className="h-5 w-5 mr-2 text-purple-500" />
                    Returns from Site ({selectedItem.returns.filter(r => r.quantity > 0).length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedItem.returns
                          .filter(returnItem => returnItem.quantity > 0)
                          .map((returnItem, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {returnItem.date ? new Date(returnItem.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{Math.round(returnItem.quantity || 0)}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                ₹{((returnItem.quantity || 0) * (selectedItem.partPrice || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            {selectedItem.remarks && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Remarks</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">{selectedItem.remarks}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Inventory Item</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this inventory item? This action cannot be undone.
              </p>
            </div>
          </div>
          
          {itemToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Part Name:</span>
                  <p className="text-gray-900">{itemToDelete.partName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Scope:</span>
                  <p className="text-gray-900">{itemToDelete.scopeOfWork?.replace(/_/g, ' ').toUpperCase()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Current Stock:</span>
                  <p className="text-gray-900">{Math.round(calculateTotals(itemToDelete).currentStock)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Unit Price:</span>
                  <p className="text-gray-900">₹{itemToDelete.partPrice}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Value:</span>
                  <p className="text-gray-900">₹{calculateTotalValue(itemToDelete)}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
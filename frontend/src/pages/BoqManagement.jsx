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
import BOQForm from '../components/Forms/BOQForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { boqAPI, projectsAPI, customersAPI } from '../services/api';
import AdvancedBOQPDFGenerator from '../components/BOQ/AdvancedBOQPDFGenerator';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

const BOQManagement = () => {
  const [showAdvancedPDF, setShowAdvancedPDF] = useState(false);
const [pdfBOQData, setPdfBOQData] = useState(null);
  const [boqItems, setBoqItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [filters, setFilters] = useState({
    projectName: '',
    customer: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchBOQItems();
    fetchProjects();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterItems();
  }, [boqItems, filters, currentPage, itemsPerPage]);

  const fetchBOQItems = async () => {
    try {
      setLoading(true);
      const response = await boqAPI.getAll();
      const items = Array.isArray(response.data.data) ? response.data.data : [];
      setBoqItems(items);
      
      const statuses = [...new Set(items.map(item => item.status))].filter(Boolean);
      setUniqueStatuses(statuses);
    } catch (error) {
      console.error('Error fetching BOQ items:', error);
      setBoqItems([]);
      showError('Failed to fetch BOQ items');
    } finally {
      setLoading(false);
    }
  };
const handleAdvancedPDFPreview = (item) => {
  setPdfBOQData(item);
  setShowAdvancedPDF(true);
};
  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showError('Failed to fetch projects');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showError('Failed to fetch customers');
    }
  };

  const filterItems = () => {
    const itemsArray = Array.isArray(boqItems) ? boqItems : [];
    let filtered = itemsArray;

    if (filters.projectName) {
      filtered = filtered.filter(item => 
        item.projectName && item.projectName.toLowerCase().includes(filters.projectName.toLowerCase())
      );
    }

    if (filters.customer) {
      filtered = filtered.filter(item => 
        item.customer && item.customer.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(item => 
        item.status === filters.status
      );
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
      projectName: '',
      customer: '',
      status: ''
    });
  };

  // Pagination logic
  const safeFilteredItems = Array.isArray(filteredItems) ? filteredItems : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeFilteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeFilteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

 const exportToCSV = () => {
  try {
    const headers = [
      'Customer', 'Scope of Work', 'Items Description', 
      'Total Quantity', 'Price Range', 'Total Amount', 'Created Date'
    ];
    
    const csvData = safeFilteredItems.map(item => {
      const items = item.items || [];
      
      // Get all item descriptions
      const itemDescriptions = items.map(subItem => subItem.partName || subItem.itemDescription).filter(Boolean);
      const displayDescription = itemDescriptions.length > 0 
        ? itemDescriptions.join(' | ') 
        : item.itemDescription || 'No items';
      
      // Calculate total quantities
      const totalQuantity = items.reduce((sum, subItem) => {
        const qty = parseFloat(subItem.numberOfUnits || subItem.quantity || 0);
        return sum + qty;
      }, 0);
      
      // Get unit types
      const unitTypes = [...new Set(items.map(subItem => subItem.unitType || subItem.unit).filter(Boolean))];
      const displayUnit = unitTypes.length > 0 ? unitTypes.join(', ') : item.unit || '';
      
      // Get price range
      const prices = items.map(subItem => parseFloat(subItem.unitPrice || 0)).filter(price => price > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : (item.unitPrice || 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : (item.unitPrice || 0);
      
      const displayPrice = prices.length > 1 && minPrice !== maxPrice
        ? `₹${parseFloat(minPrice).toFixed(2)} - ₹${parseFloat(maxPrice).toFixed(2)}`
        : `₹${parseFloat(minPrice).toFixed(2)}`;

      return [
        item.customer,
        Array.isArray(item.scopeOfWork) ? item.scopeOfWork.join(', ') : item.scopeOfWork,
        displayDescription,
        totalQuantity > 0 ? `${totalQuantity}${displayUnit ? ` ${displayUnit}` : ''}` : 'N/A',
        displayPrice,
        parseFloat(item.totalAmount || item.totalWithGST || 0).toFixed(2),
        new Date(item.createdAt).toLocaleDateString()
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
    link.setAttribute('download', 'boq_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showSuccess('BOQ data exported successfully');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showError('Failed to export BOQ data');
  }
};
  const handleView = (item) => {
    setSelectedItem(item);
    setViewModal(true);
  };

  const handleEdit = async (item) => {
    console.log('Editing BOQ item:', item);
    try {
      // Fetch the complete BOQ item data for editing
      const response = await boqAPI.getById(item._id);
      console.log('Fetched BOQ item for edit:', response.data);
      setEditingItem(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching BOQ item for edit:', error);
      showError('Failed to load BOQ item for editing');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDelete = (item) => {
  setItemToDelete(item);
  setShowDeleteModal(true);
};

  const confirmDelete = async () => {
  try {
    await boqAPI.delete(itemToDelete._id);
    showSuccess('BOQ item deleted successfully');
    fetchBOQItems();
    setShowDeleteModal(false);
    setItemToDelete(null);
  } catch (error) {
    console.error('Error deleting BOQ item:', error);
    showError('Failed to delete BOQ item');
  }
};

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingItem(null);
    showSuccess(isEdit ? 'BOQ item updated successfully' : 'BOQ item added successfully');
    fetchBOQItems();
  };

  const handleFileAccess = (filePath, fileName) => {
    const fullUrl = `${process.env.REACT_APP_API_URL || 'https://3z1p79h8-5000.inc1.devtunnels.ms'}${filePath}`;
    console.log('Attempting to access file:', fullUrl);
    
    // Try to open the file in a new tab
    const newWindow = window.open(fullUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      showError('Please allow popups for this site to view files');
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
                    value={filters.projectName}
                    onChange={(e) => handleFilterChange('projectName', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search projects..."
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
                  Add BOQ Item
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={filters.projectName}
                    onChange={(e) => handleFilterChange('projectName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Customers</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer.customerName}>
                        {customer.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* BOQ Table */}
          <div>
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > safeFilteredItems.length ? safeFilteredItems.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{safeFilteredItems.length}</span> results
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
          Scope of Work
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Items Description
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Total Quantity
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Price Range
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Total Amount
        </th>
        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {currentItems.length > 0 ? (
        currentItems.map((item) => {
          // Process items data for display
          const items = item.items || [];
          
          // Get all item descriptions
          const itemDescriptions = items.map(subItem => subItem.partName || subItem.itemDescription).filter(Boolean);
          const displayDescription = itemDescriptions.length > 0 
            ? itemDescriptions.join(', ') 
            : item.itemDescription || 'No items';
          
          // Calculate total quantities
          const totalQuantity = items.reduce((sum, subItem) => {
            const qty = parseFloat(subItem.numberOfUnits || subItem.quantity || 0);
            return sum + qty;
          }, 0);
          
          // Get unit types (for display)
          const unitTypes = [...new Set(items.map(subItem => subItem.unitType || subItem.unit).filter(Boolean))];
          const displayUnit = unitTypes.length > 0 ? unitTypes.join(', ') : item.unit || '';
          
          // Get price range
          const prices = items.map(subItem => parseFloat(subItem.unitPrice || 0)).filter(price => price > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : (item.unitPrice || 0);
          const maxPrice = prices.length > 0 ? Math.max(...prices) : (item.unitPrice || 0);
          
          const displayPrice = prices.length > 1 && minPrice !== maxPrice
            ? `₹${parseFloat(minPrice).toFixed(2)} - ₹${parseFloat(maxPrice).toFixed(2)}`
            : `₹${parseFloat(minPrice).toFixed(2)}`;

          return (
            <tr key={item._id} className="hover:bg-gray-50 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{item.customer}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs">
                  {Array.isArray(item.scopeOfWork) ? item.scopeOfWork.join(', ') : item.scopeOfWork}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 max-w-xs">
                  <div className="truncate" title={displayDescription}>
                    {displayDescription}
                  </div>
                  {itemDescriptions.length > 1 && (
                    <span className="text-xs text-gray-500">
                      +{itemDescriptions.length - 1} more items
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {totalQuantity > 0 ? `${totalQuantity}${displayUnit ? ` ${displayUnit}` : ''}` : 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900">{displayPrice}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900">
                  ₹{parseFloat(item.totalAmount || item.totalWithGST || 0).toFixed(2)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
  <button
    onClick={() => handleView(item)}
    className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
    title="View Details"
  >
    <EyeIcon className="h-5 w-5" />
  </button>
  <button
    onClick={() => handleAdvancedPDFPreview(item)}
    className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
    title="Generate PDF"
  >
    <DocumentArrowDownIcon className="h-5 w-5" />
  </button>
  <button
    onClick={() => handleEdit(item)}
    className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
    title="Edit"
  >
    <PencilSquareIcon className="h-5 w-5" />
  </button>
  <button
  onClick={() => handleDelete(item)}
  className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
  title="Delete"
>
  <TrashIcon className="h-5 w-5" />
</button>
</div>
              </td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
            No BOQ items found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
  {currentItems.length > 0 ? (
    currentItems.map((item) => {
      // Process items data for mobile display
      const items = item.items || [];
      const itemDescriptions = items.map(subItem => subItem.partName || subItem.itemDescription).filter(Boolean);
      const displayDescription = itemDescriptions.length > 0 
        ? itemDescriptions.join(', ') 
        : item.itemDescription || 'No items';
      
      const totalQuantity = items.reduce((sum, subItem) => {
        const qty = parseFloat(subItem.numberOfUnits || subItem.quantity || 0);
        return sum + qty;
      }, 0);
      
      const unitTypes = [...new Set(items.map(subItem => subItem.unitType || subItem.unit).filter(Boolean))];
      const displayUnit = unitTypes.length > 0 ? unitTypes.join(', ') : item.unit || '';
      
      const prices = items.map(subItem => parseFloat(subItem.unitPrice || 0)).filter(price => price > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : (item.unitPrice || 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : (item.unitPrice || 0);
      
      const displayPrice = prices.length > 1 && minPrice !== maxPrice
        ? `₹${parseFloat(minPrice).toFixed(2)} - ₹${parseFloat(maxPrice).toFixed(2)}`
        : `₹${parseFloat(minPrice).toFixed(2)}`;

      return (
        <div key={item._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">{item.customer}</h3>
              <p className="text-sm text-gray-500 truncate">
                {Array.isArray(item.scopeOfWork) ? item.scopeOfWork.join(', ') : item.scopeOfWork}
              </p>
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
            <div className="col-span-2">
              <span className="font-medium text-gray-500">Items:</span>
              <span className="ml-1 text-gray-900">
                {displayDescription}
              </span>
              {itemDescriptions.length > 1 && (
                <span className="ml-1 text-gray-500">
                  (+{itemDescriptions.length - 1} more)
                </span>
              )}
            </div>
            <div>
              <span className="font-medium text-gray-500">Total Qty:</span>
              <span className="ml-1 text-gray-900">
                {totalQuantity > 0 ? `${totalQuantity}${displayUnit ? ` ${displayUnit}` : ''}` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Price Range:</span>
              <span className="ml-1 font-semibold text-gray-900">{displayPrice}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-500">Total Amount:</span>
              <span className="ml-1 font-semibold text-gray-900">
                ₹{parseFloat(item.totalAmount || item.totalWithGST || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      );
    })
  ) : (
    <div className="p-4 text-center text-sm text-gray-500">
      No BOQ items found
    </div>
  )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">
                      {indexOfLastItem > safeFilteredItems.length ? safeFilteredItems.length : indexOfLastItem}
                    </span> of{' '}
                    <span className="font-medium">{safeFilteredItems.length}</span> results
                  </p>
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
        title={editingItem ? 'Edit BOQ Item' : 'Add BOQ Item'}
        size="xl"
      >
        <BOQForm
          boq={editingItem}
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
        title="BOQ Item Details"
        size="lg"
        className="font-sans"
      >
        {selectedItem && (
          <div className="space-y-6 py-1">
            {/* Header with project name and customer */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedItem.projectName}</h2>
                <div className="mt-1">
                  <span className="text-sm text-gray-600">{selectedItem.customer}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{parseFloat(selectedItem.totalAmount).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                BOQ Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.projectName}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.customer}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scope of Work</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {Array.isArray(selectedItem.scopeOfWork) ? selectedItem.scopeOfWork.join(', ') : selectedItem.scopeOfWork}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Item Description</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.itemDescription}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedItem.quantity} {selectedItem.unit}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unit Price</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    ₹{parseFloat(selectedItem.unitPrice).toFixed(2)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Amount</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    ₹{parseFloat(selectedItem.totalAmount).toFixed(2)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</h4>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedItem.status === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedItem.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  </span>
                </div>
                
                {selectedItem.overallRemarks && (
                  <div className="col-span-2 space-y-1">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overall Remarks</h4>
                    <p className="text-sm text-gray-900 font-medium">{selectedItem.overallRemarks}</p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created Date</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Document Preview and Download Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-file-alt mr-2 text-blue-500"></i>
                Document
              </h3>
              
              {selectedItem.image && selectedItem.image.path ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">{selectedItem.image.originalName || 'Document'}</h4>
                      <p className="text-xs text-gray-500">
                        {selectedItem.image.size ? `${Math.round(selectedItem.image.size / 1024)} KB` : ''}
                      </p>
                    </div>
                    
                    <a 
                      href={`${process.env.REACT_APP_API_URL || 'https://3z1p79h8-5000.inc1.devtunnels.ms'}${selectedItem.image.path}`}
                      download={selectedItem.image.originalName || 'document'}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200 flex items-center"
                      onClick={(e) => {
                        if (!selectedItem.image.path) {
                          e.preventDefault();
                          showError("No file available for download");
                        }
                      }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-download mr-1.5"></i>
                      Download
                    </a>
                  </div>
                  
                  {/* Document Preview */}
                  <div className="mt-4">
                    {selectedItem.image.path.toLowerCase().endsWith('.pdf') ? (
                      <button 
                        onClick={() => handleFileAccess(selectedItem.image.path, selectedItem.image.originalName)}
                        className="text-blue-600 hover:underline flex items-center bg-transparent border-none cursor-pointer"
                      >
                        <i className="fas fa-file-pdf text-red-500 mr-2 text-lg"></i>
                        <span>Click to view PDF</span>
                      </button>
                    ) : selectedItem.image.path.match(/\.(jpe?g|png|gif|webp|bmp)$/i) ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img 
                          src={`${process.env.REACT_APP_API_URL || 'https://3z1p79h8-5000.inc1.devtunnels.ms'}${selectedItem.image.path}`}
                          alt={selectedItem.image.originalName || "Document preview"} 
                          className="w-full h-auto max-h-64 object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Available";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-500">
                        <i className="fas fa-file text-gray-400 mr-2 text-lg"></i>
                        <span>File preview not available</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 py-4 text-center">
                  <i className="fas fa-file-upload text-gray-300 text-3xl mb-2"></i>
                  <p>No document uploaded</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setViewModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  setViewModal(false);
                  await handleEdit(selectedItem);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Item
              </button>
            </div>          </div>
        )}
      </Modal>

      {/* Advanced PDF Generator Modal */}
      {showAdvancedPDF && pdfBOQData && (
        <AdvancedBOQPDFGenerator
          boqData={pdfBOQData}
          onClose={() => setShowAdvancedPDF(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {/* Delete Confirmation Modal */}
<Modal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  title="Confirm Delete"
  size="sm"
>
  <div className="p-4">
    <p className="mb-4 text-gray-700">
      Are you sure you want to delete the BOQ item for{" "}
      <span className="font-semibold">{itemToDelete?.customer}</span> -{" "}
      <span className="font-semibold">{itemToDelete?.projectName}</span>?
      This action cannot be undone.
    </p>
    {itemToDelete && (
      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
        <p className="text-sm text-red-600">
          <span className="font-medium">Customer:</span> {itemToDelete.customer}
        </p>
        <p className="text-sm text-red-600">
          <span className="font-medium">Project:</span> {itemToDelete.projectName}
        </p>
        <p className="text-sm text-red-600">
          <span className="font-medium">Scope:</span>{" "}
          {Array.isArray(itemToDelete.scopeOfWork) 
            ? itemToDelete.scopeOfWork.join(', ') 
            : itemToDelete.scopeOfWork}
        </p>
      </div>
    )}
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

export default BOQManagement;
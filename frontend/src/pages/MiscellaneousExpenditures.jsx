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
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import MiscellaneousExpenditureForm from '../components/Forms/MiscellaneousExpenditureForm';
import Modal from "../components/Modals/Modal";
import Notification from "../components/Notifications/Notification";
import useNotification from "../hooks/useNotification";
import { miscellaneousExpendituresAPI, customersAPI, projectsAPI } from "../services/api";

const MiscellaneousExpenditureManagement = () => {
  const [expenditures, setExpenditures] = useState([]);
  const [filteredExpenditures, setFilteredExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Data states
  const [selectedExpenditure, setSelectedExpenditure] = useState(null);
  const [viewingExpenditure, setViewingExpenditure] = useState(null);
  const [expenditureToDelete, setExpenditureToDelete] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    financialYear: '',
    customer: '',
    project: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Master data
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Initialize
  useEffect(() => {
    fetchExpenditures();
  }, []);

  // Filter when data or filters change
  useEffect(() => {
    filterExpenditures();
  }, [expenditures, filters]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredExpenditures.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExpenditures.length / itemsPerPage);

  const fetchExpenditures = async () => {
    try {
      setLoading(true);
      const response = await miscellaneousExpendituresAPI.getAll();
      const data = response.data?.expenditures || response.data || [];
      
      setExpenditures(data);
      setFilteredExpenditures(data);
      
      // Extract unique financial years from saved expenditures
      const years = [...new Set(data.map(exp => exp.financialYear))].filter(Boolean).sort().reverse();
      setFinancialYears(years);
      
      // Extract unique customers from saved expenditures
      const uniqueCustomers = [...new Set(data.map(exp => exp.customerName || exp.customer?.name))].filter(Boolean);
      const customerOptions = uniqueCustomers.map(name => ({
        _id: name,
        name: name,
        customerName: name
      }));
      setCustomers(customerOptions);
      
      // Extract unique projects from saved expenditures
      const uniqueProjects = [...new Set(data.map(exp => exp.projectName || exp.project?.name))].filter(Boolean);
      const projectOptions = uniqueProjects.map(name => ({
        _id: name,
        name: name,
        projectName: name
      }));
      setProjects(projectOptions);
    } catch (error) {
      console.error('Error fetching miscellaneous expenditures:', error);
      showError('Failed to fetch expenditure records');
      setExpenditures([]);
      setFilteredExpenditures([]);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenditures = () => {
    let filtered = Array.isArray(expenditures) ? expenditures : [];

    if (filters.financialYear) {
      filtered = filtered.filter(exp => exp.financialYear === filters.financialYear);
    }

    if (filters.customer) {
      filtered = filtered.filter(exp => 
        exp.customer?._id === filters.customer || 
        exp.customerName?.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.project) {
      filtered = filtered.filter(exp => 
        exp.project?._id === filters.project || 
        exp.projectName?.toLowerCase().includes(filters.project.toLowerCase())
      );
    }


    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(exp => 
        exp.customerName?.toLowerCase().includes(searchTerm) ||
        exp.projectName?.toLowerCase().includes(searchTerm) ||
        exp.expenses?.some(expense => 
          expense.expenseDescription?.toLowerCase().includes(searchTerm) ||
          expense.expenseCategory?.toLowerCase().includes(searchTerm)
        )
      );
    }

    setFilteredExpenditures(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      financialYear: '',
      customer: '',
      project: '',
      search: ''
    });
  };

  const handleView = (expenditure) => {
    setViewingExpenditure(expenditure);
    setShowViewModal(true);
  };

  const handleEdit = (expenditure) => {
    setSelectedExpenditure(expenditure);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setExpenditureToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (expenditureToDelete) {
      try {
        await miscellaneousExpendituresAPI.delete(expenditureToDelete);
        showSuccess('Miscellaneous expenditure deleted successfully!');
        fetchExpenditures();
      } catch (error) {
        console.error('Error deleting expenditure:', error);
        showError('Error deleting expenditure record');
      } finally {
        setShowDeleteModal(false);
        setExpenditureToDelete(null);
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      
      if (selectedExpenditure) {
        await miscellaneousExpendituresAPI.update(selectedExpenditure._id, formData);
        showSuccess('Miscellaneous expenditure updated successfully');
      } else {
        await miscellaneousExpendituresAPI.create(formData);
        showSuccess('Miscellaneous expenditure added successfully');
      }
      
      setShowModal(false);
      setSelectedExpenditure(null);
      await fetchExpenditures();
    } catch (error) {
      console.error('Error saving expenditure:', error);
      let errorMessage = 'Failed to save expenditure record';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorFields = errorData.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          errorMessage = `Validation Error: ${errorFields}`;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await miscellaneousExpendituresAPI.exportCSV(filters);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `miscellaneous-expenditures-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Failed to export CSV');
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
  };

  if (loading && expenditures.length === 0) {
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
      
      <div className="max-w-none w-full">
        {/* Header and Filters */}
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
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search miscellaneous expenditures..."
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
                  {Object.values(filters).filter(Boolean).length > 0 && (
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
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                
                <button
                  onClick={() => {
                    setSelectedExpenditure(null);
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Miscellaneous
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                    <select
                      value={filters.financialYear}
                      onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Years</option>
                      {financialYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                    <select
                      value={filters.customer}
                      onChange={(e) => handleFilterChange('customer', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Client</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name || customer.customerName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                      value={filters.project}
                      onChange={(e) => handleFilterChange('project', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    >
                      <option value="">All Projects</option>
                      {projects.map(project => (
                        <option key={project._id} value={project._id}>
                          {project.name || project.projectName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Expenditures Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Financial Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expenses Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((expenditure) => (
                        <tr key={expenditure._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {expenditure.financialYear}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {expenditure.customerName || expenditure.customer?.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {expenditure.projectName || expenditure.project?.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {expenditure.expenses?.length || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{expenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleView(expenditure)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(expenditure)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(expenditure._id)}
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
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') 
                            ? 'No miscellaneous expenditures found matching your filters.' 
                            : 'No miscellaneous expenditure records found. Click "Add Miscellaneous" to create one.'
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
                currentItems.map((expenditure) => (
                  <div key={expenditure._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {expenditure.customerName || expenditure.customer?.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {expenditure.projectName || expenditure.project?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {expenditure.financialYear} • {formatDate(expenditure.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(expenditure)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(expenditure)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expenditure._id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                      <div>
                        <span className="font-medium">Expenses:</span> {expenditure.expenses?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> 
                        <span className="ml-1 font-semibold">
                          ₹{expenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') 
                    ? 'No miscellaneous expenditures found matching your filters.' 
                    : 'No miscellaneous expenditure records found. Click "Add Miscellaneous" to create one.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredExpenditures.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredExpenditures.length)} of {filteredExpenditures.length} results
                </span>
                
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && (
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewingExpenditure(null);
          }}
          title="Miscellaneous Expenditure Details"
          size="4xl"
        >
          {viewingExpenditure && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Financial Year</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingExpenditure.financialYear}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client Name</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingExpenditure.customerName || viewingExpenditure.customer?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingExpenditure.projectName || viewingExpenditure.project?.name}</p>
                  </div>
                 
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      ₹{viewingExpenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(viewingExpenditure.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Expenses Table */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses ({viewingExpenditure.expenses?.length || 0})</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingExpenditure.expenses?.map((expense, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(expense.date)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {expense.expenseCategory}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {expense.expenseDescription}
                            {expense.remarks && (
                              <div className="text-xs text-gray-500 mt-1">
                                Remarks: {expense.remarks}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            ₹{expense.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {expense.paymentMethod}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {expense.receipt ? (
                              <a
                                href={`${process.env.REACT_APP_API_URL}/${expense.receipt.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View Receipt
                              </a>
                            ) : (
                              <span className="text-gray-400">No receipt</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                          Total:
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-gray-900">
                          ₹{viewingExpenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpenditure(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedExpenditure(null);
          }}
          title={selectedExpenditure ? 'Edit Miscellaneous Expenditure' : 'Add Miscellaneous Expenditure'}
          size="4xl"
        >
          <MiscellaneousExpenditureForm
            initialData={selectedExpenditure || {}}
            financialYear={filters.financialYear}
            customerName={filters.customer}
            projectName={filters.project}
            onSave={handleFormSubmit}
            onCancel={() => {
              setShowModal(false);
              setSelectedExpenditure(null);
            }}
            showNotification={showSuccess}
            showError={showError}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setExpenditureToDelete(null);
          }}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete this miscellaneous expenditure record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setExpenditureToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MiscellaneousExpenditureManagement;
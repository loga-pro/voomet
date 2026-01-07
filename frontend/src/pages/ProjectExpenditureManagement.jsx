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
  ClipboardDocumentCheckIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import ProjectExpenditureForm from '../components/Forms/ProjectExpenditureForm';
import LogisticExpenditureForm from '../components/Forms/LogisticExpenditureForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { projectExpendituresAPI, customersAPI, projectsAPI, projectBudgetsAPI, logisticExpendituresAPI } from "../services/api";

const ProjectExpenditureManagement = () => {
  const [expenditures, setExpenditures] = useState([]);
  const [filteredExpenditures, setFilteredExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showLogisticModal, setShowLogisticModal] = useState(false);
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
    typeOfWork: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Master data
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

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

  // Debug logging
  console.log('Filtered expenditures count:', filteredExpenditures.length);
  console.log('Current items count:', currentItems.length);
  console.log('Current page:', currentPage);
  console.log('Items per page:', itemsPerPage);

  const fetchExpenditures = async () => {
    try {
      setLoading(true);
      console.log('Fetching expenditures...');
      const response = await projectExpendituresAPI.getAll();
      console.log('Expenditures API response:', response);
      console.log('Response data:', response.data);

      // Handle nested response structure: response.data.expenditures
      let data = [];
      if (response.data?.expenditures && Array.isArray(response.data.expenditures)) {
        data = response.data.expenditures;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }

      console.log('Extracted expenditures:', data);
      console.log('Number of expenditures:', data.length);

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
      console.error('Error fetching expenditures:', error);
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
      filtered = filtered.filter(exp =>
        exp.financialYear === filters.financialYear
      );
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

    if (filters.typeOfWork) {
      filtered = filtered.filter(exp =>
        exp.items?.some(item => item.typeOfWork === filters.typeOfWork)
      );
    }


    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.customerName?.toLowerCase().includes(searchTerm) ||
        exp.projectName?.toLowerCase().includes(searchTerm) ||
        exp.items?.some(item =>
          item.partName?.toLowerCase().includes(searchTerm) ||
          item.description?.toLowerCase().includes(searchTerm)
        ) ||
        exp.remarks?.toLowerCase().includes(searchTerm)
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
      typeOfWork: '',
      search: ''
    });
  };

  const handleView = (expenditure) => {
    setViewingExpenditure(expenditure);
    setShowViewModal(true);
  };

  const handleEdit = (expenditure) => {
    console.log('Editing expenditure:', expenditure);

    // Transform items from backend format to form format
    const transformedExpenditure = {
      ...expenditure,
      items: expenditure.items?.map(item => ({
        typeOfWork: item.typeOfWork || '',
        partName: item.description || '', // Backend uses 'description', form uses 'partName'
        quantityToBeOrdered: item.quantityToBeOrdered || item.quantity || '', // Use stored BOQ quantity or fallback to quantity
        unit: item.unit || 'nos',
        quantityOrderedActual: item.quantity || '', // Actual quantity ordered
        price: item.rate || '', // Backend uses 'rate', form uses 'price'
        totalPrice: item.amount || '' // Backend uses 'amount', form uses 'totalPrice'
      })) || []
    };

    console.log('Transformed expenditure for editing:', transformedExpenditure);
    setSelectedExpenditure(transformedExpenditure);
    setShowProjectModal(true);
  };

  const handleDelete = (id) => {
    setExpenditureToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (expenditureToDelete) {
      try {
        await projectExpendituresAPI.delete(expenditureToDelete);
        showSuccess('Expenditure record deleted successfully!');
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
      console.log('Submitting form data:', formData);

      if (selectedExpenditure) {
        const result = await projectExpendituresAPI.update(selectedExpenditure._id, formData);
        console.log('Update result:', result);
        showSuccess('Expenditure record updated successfully');
      } else {
        const result = await projectExpendituresAPI.create(formData);
        console.log('Create result:', result);
        showSuccess('Expenditure record added successfully');
      }

      // Update project budget's amountSpent
      await updateProjectBudgetAmountSpent(formData);

      setShowProjectModal(false);
      setSelectedExpenditure(null);

      console.log('Refreshing expenditures list...');
      await fetchExpenditures();
      console.log('Expenditures list refreshed');
    } catch (error) {

      let errorMessage = 'Failed to save expenditure record';

      // Handle specific error types
      if (error.response?.data) {
        const errorData = error.response.data;

        // Validation errors
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorFields = errorData.errors.map(e => `${e.field}: ${e.message}`).join(', ');
          errorMessage = `Validation Error: ${errorFields}`;
        }
        // Missing fields
        else if (errorData.missingFields && Array.isArray(errorData.missingFields)) {
          errorMessage = `Missing required fields: ${errorData.missingFields.join(', ')}`;
        }
        // General message
        else if (errorData.message) {
          errorMessage = errorData.message;

          // Add details if available
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        }
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error: Please check if all required fields are filled correctly';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogisticSubmit = async (formData) => {
    try {
      setLoading(true);

      // Save logistic expenditure (if API exists)
      try {
        await logisticExpendituresAPI.create(formData);
      } catch (apiError) {
        console.log('Logistic expenditure API not available, updating budget only');
      }

      // Update project budget's amountSpent with logistic expenditures
      await updateProjectBudgetAmountSpent({
        ...formData,
        expenditures: formData.expenditures || [] // Logistic expenditures
      });

      showSuccess('Logistic expenditure saved successfully');
      setShowLogisticModal(false);
      fetchExpenditures();
    } catch (error) {
      console.error('Error submitting logistic form:', error);
      showError('Failed to save logistic expenditure');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to update project budget's amountSpent
  const updateProjectBudgetAmountSpent = async (formData) => {
    try {
      if (!formData.financialYear || !formData.projectName || !formData.customerName) {
        return; // Skip if required fields are missing
      }

      // Find the project budget
      const budgetsResponse = await projectBudgetsAPI.getAll({
        financialYear: formData.financialYear,
        projectName: formData.projectName,
        customerName: formData.customerName
      });

      const budgets = budgetsResponse?.data?.budgets || budgetsResponse?.data || [];
      if (budgets.length === 0) {
        return; // No budget found, skip update
      }

      const budget = budgets[0];

      // Get existing expenditures
      let projectExpenditures = [...(budget.projectExpenditures || [])];
      let logisticExpenditures = [...(budget.logisticExpenditures || [])];

      const isLogisticExpenditure = formData.expenditures && formData.expenditures.length > 0 && formData.expenditures[0].purpose !== undefined;

      if (formData.expenditures && Array.isArray(formData.expenditures)) {
        if (isLogisticExpenditure) {
          logisticExpenditures = [...logisticExpenditures, ...formData.expenditures];
        } else {
          projectExpenditures = [...projectExpenditures, ...formData.expenditures];
        }
      } else if (formData.items && Array.isArray(formData.items)) {
        const mappedItems = formData.items.map(item => ({
          typeOfWork: item.typeOfWork || '',
          partName: item.description || '',
          quantityToBeOrdered: parseFloat(item.quantity) || 0,
          unit: item.unit || 'nos',
          quantityOrderedActual: parseFloat(item.quantity) || 0,
          price: parseFloat(item.rate) || 0,
          totalPrice: parseFloat(item.amount) || 0
        }));
        projectExpenditures = [...projectExpenditures, ...mappedItems];
      }

      // Calculate total from all expenditures
      const projectExpendituresTotal = projectExpenditures.reduce((sum, exp) => sum + (parseFloat(exp.totalPrice) || 0), 0);
      const logisticExpendituresTotal = logisticExpenditures.reduce((sum, exp) => sum + (parseFloat(exp.totalPrice) || 0), 0);
      const totalAmountSpent = projectExpendituresTotal + logisticExpendituresTotal;

      // Update the budget with new expenditures and calculated amountSpent
      await projectBudgetsAPI.update(budget._id, {
        financialYear: budget.financialYear,
        projectName: budget.projectName,
        customerName: budget.customerName,
        siteLocation: budget.siteLocation,
        quotedPrice: budget.quotedPrice,
        negotiatedPrice: budget.negotiatedPrice,
        projectExpenditures: projectExpenditures,
        logisticExpenditures: logisticExpenditures,
        amountSpent: totalAmountSpent,
        netProfitLoss: (parseFloat(budget.negotiatedPrice) || 0) - totalAmountSpent,
        overallBusinessImpact: budget.overallBusinessImpact || 'Medium'
      });
    } catch (error) {
      console.error('Error updating project budget amountSpent:', error);
      // Don't show error to user as this is a background update
    }
  };

  const exportToCSV = () => {
    // Create detailed CSV with all items
    const headers = [
      'Financial Year',
      'Customer',
      'Project',
      'Type of Work',
      'Item Name',
      'Qty to Order',
      'Qty Actual',
      'Unit',
      'Price (₹)',
      'Total (₹)',
      'Created Date'
    ];

    // Flatten the data - one row per item
    const csvData = [];
    filteredExpenditures.forEach(exp => {
      if (exp.items && exp.items.length > 0) {
        exp.items.forEach(item => {
          csvData.push([
            exp.financialYear || '',
            exp.customerName || exp.customer?.name || '',
            exp.projectName || exp.project?.name || '',
            item.typeOfWork || '',
            item.description || item.partName || '',
            item.quantityToBeOrdered || '',
            item.quantity || item.quantityOrderedActual || '',
            item.unit || '',
            item.rate || item.price || 0,
            item.amount || item.totalPrice || 0,
            new Date(exp.createdAt).toLocaleDateString()
          ]);
        });
      } else {
        // If no items, add a row with expenditure info only
        csvData.push([
          exp.financialYear || '',
          exp.customerName || exp.customer?.name || '',
          exp.projectName || exp.project?.name || '',
          '',
          '',
          '',
          '',
          '',
          0,
          exp.totalAmount || 0,
          new Date(exp.createdAt).toLocaleDateString()
        ]);
      }
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project-expenditures-detailed-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    showSuccess('CSV exported successfully!');
  };

  if (loading && expenditures.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
                    placeholder="Search expenditures..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some(Boolean)
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

                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowProjectModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Add Project
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Financial Year
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((expenditure) => (
                        <tr key={expenditure._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {expenditure.financialYear || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {expenditure.customerName || expenditure.customer?.name || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {expenditure.projectName || expenditure.project?.name || '-'}
                            </div>
                            {expenditure.boqReference && (
                              <div className="text-xs text-gray-500">
                                BOQ: {expenditure.boqReference.boqNumber}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-semibold text-gray-900">
                              ₹{expenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {expenditure.items?.length || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center space-x-2">
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
                        <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '')
                            ? 'No expenditures found matching your filters.'
                            : 'No expenditure records found. Click "Add Project" to create one.'
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
                          {expenditure.financialYear}
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
                        <span className="font-medium">Total:</span>
                        <span className="ml-1 font-semibold">
                          ₹{expenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Items:</span> {expenditure.items?.length || 0}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '')
                    ? 'No expenditures found matching your filters.'
                    : 'No expenditure records found. Click "Add Project" to create one.'
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
          title="Expenditure Details"
          size="xl"
        >
          {viewingExpenditure && (
            <div className="p-3 text-sm">

              {/* BASIC INFORMATION */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Basic Information
                </h3>

                <div className="border rounded-md p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    <div>
                      <p className="text-xs text-gray-500 uppercase">Financial Year</p>
                      <p className="font-medium text-gray-800">
                        {viewingExpenditure.financialYear}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase">Client Name</p>
                      <p className="text-gray-700">
                        {viewingExpenditure.customerName || viewingExpenditure.customer?.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase">Project</p>
                      <p className="text-gray-700">
                        {viewingExpenditure.projectName || viewingExpenditure.project?.name}
                      </p>
                    </div>



                  </div>
                </div>
              </div>

              {/* FINANCIAL SUMMARY */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Financial Summary
                </h3>

                <div className="border rounded-md p-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total Amount</p>
                      <p className="font-semibold text-gray-900 text-lg">
                        ₹{viewingExpenditure.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>



                    <div>
                      <p className="text-xs text-gray-500 uppercase">Items Count</p>
                      <p className="font-medium text-gray-800">
                        {viewingExpenditure.items?.length || 0}
                      </p>
                    </div>

                  </div>
                </div>
              </div>


              {/* ITEMS TABLE */}
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  Items ({viewingExpenditure.items?.length || 0})
                </h3>

                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">TYPE</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">ITEM NAME</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">QTY</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">PRICE</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {viewingExpenditure.items?.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center text-gray-900">{item.typeOfWork || '-'}</td>
                            <td className="px-3 py-2 text-center text-gray-900">{item.description || item.partName || '-'}</td>
                            <td className="px-3 py-2 text-center text-gray-900">
                              {item.quantity || item.quantityOrderedActual || item.quantityToBeOrdered || '-'} {item.unit || ''}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-900">
                              ₹{(item.rate || item.price)?.toLocaleString('en-IN') || '-'}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-900">
                              ₹{(item.amount || item.totalPrice)?.toLocaleString('en-IN') || '-'}
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingExpenditure(null);
                  }}
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

            </div>
          )}
        </Modal>

        {/* Project Expenditure Modal */}
        <Modal
          isOpen={showProjectModal}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedExpenditure(null);
          }}
          title={selectedExpenditure ? 'Edit Project Expenditure' : 'Add Project Expenditure'}
          size="xl"
        >
          <ProjectExpenditureForm
            initialData={selectedExpenditure?.items || []}
            financialYear={selectedExpenditure?.financialYear}
            customerName={selectedExpenditure?.customerName}
            projectName={selectedExpenditure?.projectName}
            onSave={handleFormSubmit}
            onCancel={() => {
              setShowProjectModal(false);
              setSelectedExpenditure(null);
            }}
            showNotification={showSuccess}
            showError={showError}
          />
        </Modal>

        {/* Logistic Expenditure Modal */}
        <Modal
          isOpen={showLogisticModal}
          onClose={() => setShowLogisticModal(false)}
          title="Add Logistic Expenditure"
          size="4xl"
        >
          <LogisticExpenditureForm
            initialData={[]}
            financialYear={filters.financialYear}
            customerName={filters.customer}
            projectName={filters.project}
            onSave={handleLogisticSubmit}
            onCancel={() => setShowLogisticModal(false)}
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
              Are you sure you want to delete this expenditure record? This action cannot be undone.
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

export default ProjectExpenditureManagement;

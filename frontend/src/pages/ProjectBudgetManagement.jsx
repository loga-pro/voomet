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
  CurrencyRupeeIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import ProjectBudgetForm from '../components/Forms/ProjectBudgetForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { projectBudgetsAPI } from '../services/api';

const ProjectBudgetManagement = () => {
  const [budgets, setBudgets] = useState([]);
  const [filteredBudgets, setFilteredBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [filters, setFilters] = useState({
    financialYear: '',
    projectName: '',
    customerName: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueFinancialYears, setUniqueFinancialYears] = useState([]);
  const [uniqueProjectNames, setUniqueProjectNames] = useState([]);
  const [uniqueCustomerNames, setUniqueCustomerNames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [budgets, filters, currentPage, itemsPerPage]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      console.log('Fetching project budgets...');
      const response = await projectBudgetsAPI.getAll();
      console.log('Budgets API response:', response);

      const budgetsData = response.data.budgets || response.data;
      console.log('Processed budgets data:', budgetsData);
      console.log('Number of budgets found:', budgetsData.length);

      setBudgets(budgetsData);

      const years = [...new Set(budgetsData.map(budget => budget.financialYear))].filter(Boolean);
      setUniqueFinancialYears(years);

      const projectNames = [...new Set(budgetsData.map(budget => budget.projectName))].filter(Boolean);
      setUniqueProjectNames(projectNames);

      const customerNames = [...new Set(budgetsData.map(budget => budget.customerName))].filter(Boolean);
      setUniqueCustomerNames(customerNames);
    } catch (error) {
      console.error('Error fetching project budgets:', error);
      console.error('Error response:', error.response);
      showError('Failed to fetch project budgets');
    } finally {
      setLoading(false);
    }
  };

  const filterBudgets = () => {
    let filtered = [...budgets];

    if (filters.financialYear) {
      filtered = filtered.filter(budget =>
        budget.financialYear === filters.financialYear
      );
    }

    if (filters.projectName) {
      filtered = filtered.filter(budget =>
        budget.projectName === filters.projectName
      );
    }

    if (filters.customerName) {
      filtered = filtered.filter(budget =>
        budget.customerName === filters.customerName
      );
    }

    if (filters.search) {
      filtered = filtered.filter(budget =>
        budget.projectName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        budget.customerName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        budget.siteLocation?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredBudgets(filtered);
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
      financialYear: '',
      projectName: '',
      customerName: '',
      search: ''
    });
  };

  // Calculate business metrics
  const calculateMetrics = () => {
    const totalProfit = budgets.reduce((sum, budget) =>
      budget.netProfitLoss > 0 ? sum + budget.netProfitLoss : sum, 0
    );

    const totalLoss = Math.abs(budgets.reduce((sum, budget) =>
      budget.netProfitLoss < 0 ? sum + budget.netProfitLoss : sum, 0
    ));

    const profitableProjects = budgets.filter(budget => budget.netProfitLoss > 0).length;
    const lossProjects = budgets.filter(budget => budget.netProfitLoss < 0).length;

    return { totalProfit, totalLoss, profitableProjects, lossProjects };
  };

  // Get profit/loss color
  const getProfitLossColor = (amount) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Get business impact color
  const getBusinessImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBudgets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = async () => {
    try {
      const response = await projectBudgetsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `project_budgets_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Project budgets exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Failed to export project budgets');
    }
  };

  const handleView = (budget) => {
    setSelectedBudget(budget);
    setViewModal(true);
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  const handleDelete = (budget) => {
    setBudgetToDelete(budget);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await projectBudgetsAPI.delete(budgetToDelete._id);
      showSuccess('Project budget deleted successfully');
      fetchBudgets();
      setShowDeleteModal(false);
      setBudgetToDelete(null);
    } catch (error) {
      console.error('Error deleting project budget:', error);
      showError('Failed to delete project budget');
    }
  };

  const handleFormSubmit = async (isEdit = false, formData = null) => {
    try {
      setLoading(true);
      console.log('Submitting form data:', formData);
      console.log('Is edit mode:', isEdit);
      console.log('Editing budget:', editingBudget);

      // Ensure all required fields are present and properly formatted
      const submitData = {
        ...formData,
        // Ensure numeric fields are numbers, not strings
        quotedPrice: parseFloat(formData.quotedPrice) || 0,
        negotiatedPrice: parseFloat(formData.negotiatedPrice) || 0,
        amountSpent: parseFloat(formData.amountSpent) || 0,
        netProfitLoss: parseFloat(formData.netProfitLoss) || 0,
        // Ensure arrays are properly formatted
        projectExpenditures: formData.projectExpenditures?.map(exp => ({
          ...exp,
          quantityToBeOrdered: parseFloat(exp.quantityToBeOrdered) || 0,
          quantityOrderedActual: parseFloat(exp.quantityOrderedActual) || 0,
          price: parseFloat(exp.price) || 0,
          totalPrice: parseFloat(exp.totalPrice) || 0
        })) || [],
        logisticExpenditures: formData.logisticExpenditures?.map(log => ({
          ...log,
          kmTravelled: parseFloat(log.kmTravelled) || 0,
          totalPrice: parseFloat(log.totalPrice) || 0
        })) || []
      };

      console.log('Processed submit data:', submitData);

      if (isEdit && editingBudget) {
        console.log('Updating budget with ID:', editingBudget._id);
        const response = await projectBudgetsAPI.update(editingBudget._id, submitData);
        console.log('Update response:', response);
        showSuccess('Project budget updated successfully');
      } else if (!isEdit && formData) {
        console.log('Creating new budget');
        const response = await projectBudgetsAPI.create(submitData);
        console.log('Create response:', response);
        showSuccess('Project budget added successfully');
      }

      setShowModal(false);
      setEditingBudget(null);

      // Refresh the budgets list
      setTimeout(() => {
        fetchBudgets();
      }, 500);

    } catch (error) {
      console.error('Error saving project budget:', error);
      console.error('Error response:', error.response);

      // Enhanced error logging
      if (error.response) {
        console.error('Error details:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      }

      showError(error.response?.data?.message || 'Failed to save project budget');
    } finally {
      setLoading(false);
    }
  };

  const { totalProfit, totalLoss, profitableProjects, lossProjects } = calculateMetrics();

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

      <div className="w-full max-w-full px-1 sm:px-2">
        {/* KPI Cards Section - At the Top */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Budgets</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">{budgets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-semibold text-green-600">
                  ₹{totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyRupeeIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Loss</p>
                <p className="text-2xl font-semibold text-red-600">
                  ₹{totalLoss > 0
                    ? ' -' + totalLoss.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BuildingStorefrontIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profitable Projects</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {profitableProjects} / {budgets.length}
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
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search projects, cliens, locations..."
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
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>

                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Budget
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                  <select
                    value={filters.financialYear}
                    onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Years</option>
                    {uniqueFinancialYears.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <select
                    value={filters.projectName}
                    onChange={(e) => handleFilterChange('projectName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Projects</option>
                    {uniqueProjectNames.map(projectName => (
                      <option key={projectName} value={projectName}>
                        {projectName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <select
                    value={filters.customerName}
                    onChange={(e) => handleFilterChange('customerName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Client</option>
                    {uniqueCustomerNames.map(customerName => (
                      <option key={customerName} value={customerName}>
                        {customerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Table */}
          <div className="overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Financial Year
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quoted (₹)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Negotiated (₹)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spent (₹)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Profit/Loss
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Impact
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((budget) => (
                    <tr key={budget._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{budget.projectName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {budget.financialYear}
                        </span>
                      </td>
                      <td className="px-6 py-4">₹{budget.quotedPrice?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">₹{budget.negotiatedPrice?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">₹{budget.amountSpent?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-semibold ${getProfitLossColor(budget.netProfitLoss)}`}>
                          ₹{(budget.netProfitLoss >= 0 ? '' : '-') + Math.abs(budget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${budget.netProfitLoss >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {budget.netProfitLoss >= 0 ? 'Profit' : 'Loss'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBusinessImpactColor(budget.overallBusinessImpact)}`}>
                          {budget.overallBusinessImpact}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(budget)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(budget)}
                            className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(budget)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {currentItems.map((budget) => (
                <div key={budget._id} className="border-b border-gray-200 p-2 sm:p-3 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                      </div>
                      <div className="ml-2 min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{budget.projectName}</h3>
                        <p className="text-xs text-gray-500 truncate">{budget.customerName}</p>
                        <p className="text-xs text-gray-400 truncate flex items-center">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          {budget.siteLocation}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleView(budget)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-150"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(budget)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-150"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors duration-150"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 text-xs sm:text-sm">
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                      <span className="font-medium text-gray-500">Year:</span>
                      <span className="ml-1 font-semibold text-gray-900">{budget.financialYear}</span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                      <span className="font-medium text-gray-500">Quoted:</span>
                      <span className="ml-1 font-semibold text-gray-900">₹{budget.quotedPrice?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                      <span className="font-medium text-gray-500">Negotiated:</span>
                      <span className="ml-1 font-semibold text-gray-900">₹{budget.negotiatedPrice?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                      <span className="font-medium text-gray-500">Spent:</span>
                      <span className="ml-1 font-semibold text-gray-900">₹{budget.amountSpent?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200 col-span-2">
                      <span className="font-medium text-gray-500">Net:</span>
                      <span className={`ml-1 font-semibold ${getProfitLossColor(budget.netProfitLoss)}`}>
                        ₹{Math.abs(budget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${budget.netProfitLoss >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {budget.netProfitLoss >= 0 ? 'Profit' : 'Loss'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-md p-1.5 border border-gray-200">
                      <span className="font-medium text-gray-500">Impact:</span>
                      <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBusinessImpactColor(budget.overallBusinessImpact)}`}>
                        {budget.overallBusinessImpact}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Updated Pagination */}
          {filteredBudgets.length > 0 && (
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
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBudgets.length)} of {filteredBudgets.length} results
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

          {/* Empty State */}
          {filteredBudgets.length === 0 && (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No project budgets</h3>
              <p className="mt-1 text-sm text-gray-500">
                {budgets.length === 0
                  ? "Get started by adding your first project budget."
                  : "No budgets match your current filters."
                }
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    if (budgets.length === 0) {
                      setShowModal(true);
                    } else {
                      clearFilters();
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {budgets.length === 0 ? 'Add Project Budget' : 'Clear Filters'}
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
          setEditingBudget(null);
        }}
        title={editingBudget ? 'Edit Project Budget' : 'Add Project Budget'}
        size="md"
      >
        <ProjectBudgetForm
          budget={editingBudget}
          onSubmit={(formData) => handleFormSubmit(!!editingBudget, formData)}
          onCancel={() => {
            setShowModal(false);
            setEditingBudget(null);
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
          setSelectedBudget(null);
        }}
        title="Project Budget Details"
        size="xl"
      >
        {selectedBudget && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedBudget.projectName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedBudget.financialYear}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBusinessImpactColor(selectedBudget.overallBusinessImpact)}`}>
                        {selectedBudget.overallBusinessImpact} Impact
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedBudget.netProfitLoss >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {selectedBudget.netProfitLoss >= 0 ? 'Profit' : 'Loss'}: ₹{Math.abs(selectedBudget.netProfitLoss)?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 text-right">
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="text-lg font-bold text-blue-600">{selectedBudget.customerName}</p>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Quoted Price</div>
                <div className="text-xl font-bold text-gray-900">
                  ₹{selectedBudget.quotedPrice?.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Negotiated Price</div>
                <div className="text-xl font-bold text-blue-600">
                  ₹{selectedBudget.negotiatedPrice?.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Amount Spent</div>
                <div className="text-xl font-bold text-orange-600">
                  ₹{selectedBudget.amountSpent?.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-sm font-medium text-gray-500 mb-1">Net Profit/Loss</div>
                <div className={`text-xl font-bold ${getProfitLossColor(selectedBudget.netProfitLoss)}`}>
                  ₹{Math.abs(selectedBudget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-blue-500" />
                  Project Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Financial Year:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedBudget.financialYear}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Project Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedBudget.projectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Customer Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedBudget.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Site Location:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedBudget.siteLocation}</span>
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
                    <span className="text-sm text-gray-500">Quoted Price:</span>
                    <span className="text-sm font-medium text-gray-900">₹{selectedBudget.quotedPrice?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Negotiated Price:</span>
                    <span className="text-sm font-medium text-gray-900">₹{selectedBudget.negotiatedPrice?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount Spent:</span>
                    <span className="text-sm font-medium text-gray-900">₹{selectedBudget.amountSpent?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Net Profit/Loss:</span>
                    <span className={`text-sm font-medium ${getProfitLossColor(selectedBudget.netProfitLoss)}`}>
                      ₹{Math.abs(selectedBudget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Business Impact:</span>
                    <span className={`text-sm font-medium ${getBusinessImpactColor(selectedBudget.overallBusinessImpact).replace('bg-', 'text-').replace('100', '800')}`}>
                      {selectedBudget.overallBusinessImpact}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenditures */}
            <div className="space-y-6">
              {/* Project Expenditures */}
              {selectedBudget.projectExpenditures && selectedBudget.projectExpenditures.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Project Expenditures ({selectedBudget.projectExpenditures.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type of Work</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty Ordered</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price (₹)</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBudget.projectExpenditures.map((exp, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.typeOfWork}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.partName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.quantityOrderedActual}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.unit}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.price}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.totalPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Logistic Expenditures */}
              {selectedBudget.logisticExpenditures && selectedBudget.logisticExpenditures.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Logistic Expenditures ({selectedBudget.logisticExpenditures.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transporter</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">From - To</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">KM</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedBudget.logisticExpenditures.map((log, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.purpose}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.vehicleType}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.transporterName}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.from} - {log.to}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.kmTravelled}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{log.totalPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

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
                  handleEdit(selectedBudget);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Budget
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
              <h3 className="text-lg font-medium text-gray-900">Delete Project Budget</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this project budget? This action cannot be undone.
              </p>
            </div>
          </div>

          {budgetToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Project Name:</span>
                  <p className="text-gray-900">{budgetToDelete.projectName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Customer:</span>
                  <p className="text-gray-900">{budgetToDelete.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Financial Year:</span>
                  <p className="text-gray-900">{budgetToDelete.financialYear}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Net Profit/Loss:</span>
                  <p className={`text-gray-900 ${getProfitLossColor(budgetToDelete.netProfitLoss)}`}>
                    ₹{Math.abs(budgetToDelete.netProfitLoss)?.toLocaleString('en-IN')}
                  </p>
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

export default ProjectBudgetManagement;
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
  MapPinIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchBudgets();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [budgets, filters, currentPage, itemsPerPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsHeaderFixed(true);
      } else {
        setIsHeaderFixed(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    // Use current filtered budgets for calculations
    const budgetsToCalculate = filteredBudgets.length > 0 ? filteredBudgets : budgets;
    
    // Total Projects
    const totalProjects = budgetsToCalculate.length;
    
    // Total Negotiated Amount
    const totalNegotiatedAmount = budgetsToCalculate.reduce((sum, budget) => 
      sum + (parseFloat(budget.negotiatedPrice) || 0), 0
    );
    
    // Total Amount Spent
    const totalAmountSpent = budgetsToCalculate.reduce((sum, budget) => 
      sum + (parseFloat(budget.amountSpent) || 0), 0
    );
    
    // Net Profit or Loss (sum of all netProfitLoss)
    const netProfitLoss = budgetsToCalculate.reduce((sum, budget) => 
      sum + (parseFloat(budget.netProfitLoss) || 0), 0
    );
    
    // Profitable Projects (netProfitLoss > 0)
    const profitableProjects = budgetsToCalculate.filter(budget => 
      (parseFloat(budget.netProfitLoss) || 0) > 0
    ).length;
    
    // Loss Projects (netProfitLoss < 0)
    const lossProjects = budgetsToCalculate.filter(budget => 
      (parseFloat(budget.netProfitLoss) || 0) < 0
    ).length;

    return { 
      totalProjects, 
      totalNegotiatedAmount, 
      totalAmountSpent, 
      netProfitLoss, 
      profitableProjects, 
      lossProjects 
    };
  };

  // Get profit/loss color - Updated to handle zero
  const getProfitLossColor = (amount) => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  // Get profit/loss text - New function
  const getProfitLossText = (amount) => {
    if (amount > 0) return 'Profit';
    if (amount < 0) return 'Loss';
    return 'Neither';
  };

  // Get profit/loss icon - New function
  const getProfitLossIcon = (amount) => {
    if (amount > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />;
    if (amount < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />;
    return <ArrowTrendingUpIcon className="h-4 w-4 text-gray-500" />;
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

  const { 
    totalProjects, 
    totalNegotiatedAmount, 
    totalAmountSpent, 
    netProfitLoss, 
    profitableProjects, 
    lossProjects 
  } = calculateMetrics();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <div className="bg-gray-50 min-h-screen p-2 sm:p-4 lg:p-5 overflow-x-hidden relative font-sans">
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />

        <div className="w-full max-w-full px-1 sm:px-2">
          {/* Sticky KPI Cards Section */}
          <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-1.5 sm:gap-2 mb-3 sm:mb-4 transition-all duration-300 ${isHeaderFixed ? 'pt-16' : ''}`}>
            {/* Total Projects Card */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">
                  <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <p className="text-xs font-medium text-gray-600">Total Projects</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{totalProjects}</p>
              </div>
            </div>

            {/* Total Negotiated Amount Card */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyRupeeIcon className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-xs font-medium text-gray-600">Total Negotiated</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ₹{totalNegotiatedAmount.toLocaleString('en-IN', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  })}
                </p>
              </div>
            </div>

            {/* Total Amount Spent Card */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyRupeeIcon className="h-5 w-5 text-orange-600 mr-2" />
                  <p className="text-xs font-medium text-gray-600">Total Spent</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ₹{totalAmountSpent.toLocaleString('en-IN', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  })}
                </p>
              </div>
            </div>

            {/* Net Profit/Loss Card */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">
                  {getProfitLossIcon(netProfitLoss)}
                  <p className="text-xs font-medium text-gray-600 ml-2">Net Profit/Loss</p>
                </div>
                <p className={`text-xl font-bold ${getProfitLossColor(netProfitLoss)}`}>
                  ₹{Math.abs(netProfitLoss).toLocaleString('en-IN', { 
                    minimumFractionDigits: 0, 
                    maximumFractionDigits: 0 
                  })}
                </p>
                <p className="text-xs mt-1">
                  <span className={getProfitLossColor(netProfitLoss)}>
                    {getProfitLossText(netProfitLoss)}
                  </span>
                </p>
              </div>
            </div>

            {/* Profitable Projects Card */}
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center mb-2">
                  <BuildingStorefrontIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <p className="text-xs font-medium text-gray-600">Profitable Projects</p>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {profitableProjects}/{totalProjects}
                </p>
                {/* <p className="text-xs mt-1 text-gray-500">
                  {totalProjects > 0 ? `${Math.round((profitableProjects / totalProjects) * 100)}% success` : 'No projects'}
                </p> */}
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Sticky Toolbar */}
            <div className={`px-4 py-4 sm:px-6 border-b border-gray-200 bg-white ${isHeaderFixed ? 'fixed top-0 left-0 right-0 z-50 shadow-md' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Search projects, clients, locations..."
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`inline-flex items-center px-3.5 py-2.5 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some(Boolean)
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
                      className="inline-flex items-center px-3.5 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <XMarkIcon className="h-5 w-5 mr-2" />
                      Clear
                    </button>
                  )}

                  <button
                    onClick={exportToCSV}
                    className="inline-flex items-center px-3.5 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    Export CSV
                  </button>

                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Budget
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Filters */}
            {showFilters && (
              <div className={`px-4 py-4 sm:px-6 bg-gray-50 border-b border-gray-200 ${isHeaderFixed ? 'fixed top-16 left-0 right-0 z-40 shadow-md' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year</label>
                    <select
                      value={filters.financialYear}
                      onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5 px-3"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                    <select
                      value={filters.projectName}
                      onChange={(e) => handleFilterChange('projectName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5 px-3"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                    <select
                      value={filters.customerName}
                      onChange={(e) => handleFilterChange('customerName', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2.5 px-3"
                    >
                      <option value="">All Clients</option>
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
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Financial Year
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quoted (₹)
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Negotiated (₹)
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spent (₹)
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Profit/Loss
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business Impact
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((budget) => (
                      <tr key={budget._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="text-sm font-medium text-gray-900">{budget.projectName}</div>
                            {/* <div className="text-xs text-gray-500">{budget.customerName}</div> */}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {budget.financialYear}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          ₹{budget.quotedPrice?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          ₹{budget.negotiatedPrice?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          ₹{budget.amountSpent?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center">
  <div className={`text-sm font-semibold ${getProfitLossColor(budget.netProfitLoss)}`}>
    ₹{Math.abs(budget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  </div>
  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
    budget.netProfitLoss > 0 
      ? 'bg-green-100 text-green-800' 
      : budget.netProfitLoss < 0 
        ? 'bg-red-100 text-red-800' 
        : 'bg-gray-100 text-gray-800'
  }`}>
    {budget.netProfitLoss > 0 ? 'Profit' : budget.netProfitLoss < 0 ? 'Loss' : 'Neither'}
  </span>
</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${getBusinessImpactColor(budget.overallBusinessImpact)}`}>
                            {budget.overallBusinessImpact}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleView(budget)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(budget)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(budget)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
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

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {currentItems.map((budget) => (
                  <div key={budget._id} className="border-b border-gray-200 p-3 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{budget.projectName}</h3>
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
                          className="text-blue-600 hover:text-blue-900 p-1.5 rounded transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(budget)}
                          className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget)}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="font-medium text-gray-500 mb-1">Year</div>
                        <div className="font-semibold text-gray-900">{budget.financialYear}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="font-medium text-gray-500 mb-1">Quoted</div>
                        <div className="font-semibold text-gray-900">₹{budget.quotedPrice?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="font-medium text-gray-500 mb-1">Negotiated</div>
                        <div className="font-semibold text-gray-900">₹{budget.negotiatedPrice?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="font-medium text-gray-500 mb-1">Spent</div>
                        <div className="font-semibold text-gray-900">₹{budget.amountSpent?.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200 col-span-2">
                        <div className="font-medium text-gray-500 mb-1">Net Profit/Loss</div>
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${getProfitLossColor(budget.netProfitLoss)}`}>
                            ₹{Math.abs(budget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${budget.netProfitLoss >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {budget.netProfitLoss >= 0 ? 'Profit' : 'Loss'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="font-medium text-gray-500 mb-1">Impact</div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getBusinessImpactColor(budget.overallBusinessImpact)}`}>
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
              <div className="bg-white px-4 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex items-center mb-4 sm:mb-0">
                  <span className="text-sm text-gray-700 mr-2">Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-md text-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <span className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBudgets.length)} of {filteredBudgets.length} results
                  </span>

                  <nav className="flex space-x-1">
                    <button
                      onClick={() => paginate(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {budgets.length === 0 ? 'Add Project Budget' : 'Clear Filters'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    {editingBudget ? 'Edit Project Budget' : 'Add Project Budget'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setEditingBudget(null);
                    }}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-4 py-5 sm:p-6 max-h-[80vh] overflow-y-auto">
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
              </div>
            </div>
          </div>
        </div>
      )}

      {viewModal && (
  <div className="fixed inset-0 z-[9999] overflow-y-auto">
    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setViewModal(false)} />
    <div className="flex min-h-full items-center justify-center p-4 text-center">
      <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-6xl">
        <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              Project Budget Details
            </h3>
            <button
              onClick={() => {
                setViewModal(false);
                setSelectedBudget(null);
              }}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="bg-white px-4 py-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {selectedBudget && (
            <div className="flex flex-col">
              
              {/* Project Information - 4 Columns */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Project Information</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Project Name</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedBudget.projectName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Customer Name</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedBudget.customerName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Financial Year</span>
                    <p className="text-sm font-medium text-gray-900">{selectedBudget.financialYear}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Site Location</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedBudget.siteLocation}</p>
                  </div>
                </div>
              </div>

              {/* Financial Overview - 4 Columns */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <CurrencyRupeeIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">Financial Overview</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 border border-gray-100 rounded">
                    <span className="text-xs text-gray-500 block mb-1">Quoted Price</span>
                    <p className="text-base font-bold text-gray-900">
                      ₹{selectedBudget.quotedPrice?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-center p-2 border border-gray-100 rounded">
                    <span className="text-xs text-gray-500 block mb-1">Negotiated Price</span>
                    <p className="text-base font-bold text-blue-600">
                      ₹{selectedBudget.negotiatedPrice?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-center p-2 border border-gray-100 rounded">
                    <span className="text-xs text-gray-500 block mb-1">Amount Spent</span>
                    <p className="text-base font-bold text-orange-600">
                      ₹{selectedBudget.amountSpent?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-center p-2 border border-gray-100 rounded">
                    <span className="text-xs text-gray-500 block mb-1">Net Profit/Loss</span>
                    <p className={`text-base font-bold ${getProfitLossColor(selectedBudget.netProfitLoss)}`}>
                      ₹{Math.abs(selectedBudget.netProfitLoss)?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      selectedBudget.netProfitLoss > 0 
                        ? 'bg-green-100 text-green-800' 
                        : selectedBudget.netProfitLoss < 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedBudget.netProfitLoss > 0 ? 'Profit' : selectedBudget.netProfitLoss < 0 ? 'Loss' : 'Neither'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 mt-4">
                <button
                  onClick={() => setViewModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModal(false);
                    handleEdit(selectedBudget);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
                >
                  Edit Budget
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-md">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Confirm Delete
                  </h3>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-4 py-5 sm:p-6">
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
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectBudgetManagement;
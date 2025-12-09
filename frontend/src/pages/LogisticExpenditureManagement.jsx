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
  TruckIcon,
  MapIcon,
  ClockIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import LogisticExpenditureForm from '../components/Forms/LogisticExpenditureForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import api, { customersAPI, projectsAPI, logisticExpendituresAPI, projectBudgetsAPI } from "../services/api";

const LogisticExpenditureManagement = () => {
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
    vehicleType: '',
    transporter: '',
    purpose: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Master data
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [financialYears, setFinancialYears] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Initialize
  useEffect(() => {
    fetchExpenditures();
    fetchMasterData();
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
      const response = await logisticExpendituresAPI.getAll();
      const data = Array.isArray(response.data) ? response.data : [];
      setExpenditures(data);
      setFilteredExpenditures(data);
      
      // Extract unique financial years
      const years = [...new Set(data.map(exp => exp.financialYear))].filter(Boolean).sort().reverse();
      setFinancialYears(years);
      
      // Extract unique vehicle types
      const vehicles = [...new Set(data.flatMap(exp => 
        exp.items?.map(item => item.vehicleType) || []
      ))].filter(Boolean).sort();
      setVehicleTypes(vehicles);
    } catch (error) {
      console.error('Error fetching logistic expenditures:', error);
      showError('Failed to fetch logistic expenditure records');
      setExpenditures([]);
      setFilteredExpenditures([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      // Fetch customers
      const customersResponse = await customersAPI.getAll();
      setCustomers(customersResponse.data || []);
      
      // Fetch projects
      const projectsResponse = await projectsAPI.getAll();
      setProjects(projectsResponse.data || []);
      
      // Note: No transportersAPI available, using mock data
      const mockTransporters = [
        { _id: '1', name: 'Transporter A' },
        { _id: '2', name: 'Transporter B' },
        { _id: '3', name: 'Transporter C' }
      ];
      setTransporters(mockTransporters);
    } catch (error) {
      console.error('Error fetching master data:', error);
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

    if (filters.vehicleType) {
      filtered = filtered.filter(exp => 
        exp.items?.some(item => item.vehicleType === filters.vehicleType)
      );
    }

    if (filters.transporter) {
      filtered = filtered.filter(exp => 
        exp.items?.some(item => 
          item.transporterName?.toLowerCase().includes(filters.transporter.toLowerCase())
        )
      );
    }

    if (filters.purpose) {
      filtered = filtered.filter(exp => 
        exp.items?.some(item => 
          item.purpose?.toLowerCase().includes(filters.purpose.toLowerCase())
        )
      );
    }

    if (filters.status) {
      filtered = filtered.filter(exp => 
        exp.status === filters.status
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(exp => 
        exp.customerName?.toLowerCase().includes(searchTerm) ||
        exp.projectName?.toLowerCase().includes(searchTerm) ||
        exp.items?.some(item => 
          item.purpose?.toLowerCase().includes(searchTerm) ||
          item.transporterName?.toLowerCase().includes(searchTerm) ||
          item.vehicleType?.toLowerCase().includes(searchTerm) ||
          item.from?.toLowerCase().includes(searchTerm) ||
          item.to?.toLowerCase().includes(searchTerm)
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
      vehicleType: '',
      transporter: '',
      purpose: '',
      status: '',
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
        await logisticExpendituresAPI.delete(expenditureToDelete);
        showSuccess('Logistic expenditure record deleted successfully!');
        fetchExpenditures();
      } catch (error) {
        console.error('Error deleting logistic expenditure:', error);
        showError('Error deleting logistic expenditure record');
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
        await logisticExpendituresAPI.update(selectedExpenditure._id, formData);
        showSuccess('Logistic expenditure record updated successfully');
      } else {
        await logisticExpendituresAPI.create(formData);
        showSuccess('Logistic expenditure record added successfully');
      }
      // Sync ProjectBudget with latest logistic expenditures
      await updateProjectBudgetAmountSpent(formData);
      setShowModal(false);
      setSelectedExpenditure(null);
      fetchExpenditures();
    } catch (error) {
      console.error('Error submitting form:', error);
      showError('Failed to save logistic expenditure record');
    } finally {
      setLoading(false);
    }
  };

  // Update ProjectBudget amountSpent and logisticExpenditures after saving
  const updateProjectBudgetAmountSpent = async (formData) => {
    try {
      if (!formData.financialYear || !formData.projectName || !formData.customerName) {
        return;
      }

      // Find corresponding budget
      const budgetsResponse = await projectBudgetsAPI.getAll({
        financialYear: formData.financialYear,
        projectName: formData.projectName,
        customerName: formData.customerName
      });

      const budgets = budgetsResponse?.data?.budgets || budgetsResponse?.data || [];
      if (!budgets.length) return;

      const budget = budgets[0];

      // Merge logistic expenditures
      const existingProjectExpenditures = Array.isArray(budget.projectExpenditures) ? budget.projectExpenditures : [];
      const existingLogisticExpenditures = Array.isArray(budget.logisticExpenditures) ? budget.logisticExpenditures : [];

      const newLogistics = Array.isArray(formData.expenditures) ? formData.expenditures : [];
      const mergedLogistics = [...existingLogisticExpenditures, ...newLogistics];

      // Recalculate totals
      const projectTotal = existingProjectExpenditures.reduce((sum, exp) => sum + (parseFloat(exp.totalPrice) || 0), 0);
      const logisticsTotal = mergedLogistics.reduce((sum, log) => sum + (parseFloat(log.totalPrice) || 0), 0);
      const totalAmountSpent = projectTotal + logisticsTotal;

      await projectBudgetsAPI.update(budget._id, {
        financialYear: budget.financialYear,
        projectName: budget.projectName,
        customerName: budget.customerName,
        siteLocation: budget.siteLocation,
        quotedPrice: budget.quotedPrice,
        negotiatedPrice: budget.negotiatedPrice,
        projectExpenditures: existingProjectExpenditures,
        logisticExpenditures: mergedLogistics,
        amountSpent: totalAmountSpent,
        netProfitLoss: (parseFloat(budget.negotiatedPrice) || 0) - totalAmountSpent,
        overallBusinessImpact: budget.overallBusinessImpact || 'Medium'
      });
    } catch (err) {
      console.error('Error syncing ProjectBudget after logistic save:', err);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Financial Year',
      'Customer',
      'Project',
      'Total Amount',
      'Total KM',
      'Trips Count',
      'Vehicle Types',
      'Transporters',
      'Created Date'
    ];
    
    const csvData = filteredExpenditures.map(exp => {
      const items = exp.items || [];
      const vehicleTypes = [...new Set(items.map(item => item.vehicleType))].join('; ');
      const transporters = [...new Set(items.map(item => item.transporterName))].join('; ');
      const totalKM = items.reduce((sum, item) => sum + (item.kmTravelled || 0), 0);
      
      return [
        exp.financialYear || '',
        exp.customerName || exp.customer?.name || '',
        exp.projectName || exp.project?.name || '',
        exp.totalAmount || 0,
        totalKM,
        items.length,
        exp.status || '',
        vehicleTypes,
        transporters,
        new Date(exp.createdAt).toLocaleDateString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logistic-expenditures-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    showSuccess('CSV exported successfully!');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Scheduled': 'bg-blue-100 text-blue-800',
      'In Transit': 'bg-yellow-100 text-yellow-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Completed': 'bg-purple-100 text-purple-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'On Hold': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getVehicleTypeColor = (vehicleType) => {
    const colors = {
      'Truck': 'bg-blue-100 text-blue-800',
      'Trailer': 'bg-purple-100 text-purple-800',
      'Container': 'bg-green-100 text-green-800',
      'Pickup': 'bg-yellow-100 text-yellow-800',
      'Tempo': 'bg-orange-100 text-orange-800',
      'LCV': 'bg-teal-100 text-teal-800',
      'HCV': 'bg-red-100 text-red-800',
      'Other': 'bg-gray-100 text-gray-800'
    };
    return colors[vehicleType] || 'bg-gray-100 text-gray-800';
  };

  const purposeOptions = ['Material Delivery', 'Equipment Transport', 'Site Visit', 'Staff Transport', 'Goods Pickup', 'Other'];
  const statusOptions = ['Draft', 'Scheduled', 'In Transit', 'Delivered', 'Completed', 'Cancelled', 'On Hold'];
  const defaultVehicleTypes = ['Truck', 'Trailer', 'Container', 'Pickup', 'Tempo', 'LCV', 'HCV', 'Other'];

  if (loading && expenditures.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Search logistic expenditures..."
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    showFilters || Object.values(filters).some(Boolean) 
                      ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).filter(Boolean).length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                {Object.values(filters).some(Boolean) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear
                  </button>
                )}
                
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                  Export CSV
                </button>
                
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <TruckIcon className="h-5 w-5 mr-2" />
                  Add Logistic
                </button>
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
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
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
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

          {/* Logistic Expenditures Table */}
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
                        Client / Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trip Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle / Transporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Distance & Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trips
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((expenditure) => {
                        const items = expenditure.items || [];
                        const totalKM = items.reduce((sum, item) => sum + (item.kmTravelled || 0), 0);
                        const totalAmount = expenditure.totalAmount || 0;
                        const avgCostPerKM = totalKM > 0 ? (totalAmount / totalKM).toFixed(2) : 0;
                        const uniqueVehicles = [...new Set(items.map(item => item.vehicleType))];
                        const uniqueTransporters = [...new Set(items.map(item => item.transporterName))];

                        return (
                          <tr key={expenditure._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {expenditure.financialYear}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {expenditure.customerName || expenditure.customer?.name}
                                </div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {expenditure.projectName || expenditure.project?.name}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm">
                                {items.length > 0 && (
                                  <>
                                    <div className="text-gray-900 font-medium">
                                      {items[0].purpose}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center mt-1">
                                      <MapIcon className="h-3 w-3 mr-1" />
                                      {items[0].from} → {items[0].to}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {uniqueVehicles.slice(0, 3).map((vehicle, idx) => (
                                    <span 
                                      key={idx}
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVehicleTypeColor(vehicle)}`}
                                    >
                                      {vehicle}
                                    </span>
                                  ))}
                                  {uniqueVehicles.length > 3 && (
                                    <span className="inline-flex px-2 py-1 text-xs text-gray-600">
                                      +{uniqueVehicles.length - 3} more
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {uniqueTransporters.slice(0, 2).join(', ')}
                                  {uniqueTransporters.length > 2 && '...'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <TruckIcon className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-sm text-gray-900">{totalKM.toLocaleString()} KM</span>
                                </div>
                                <div className="flex items-center">
                                  <CurrencyRupeeIcon className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    ₹{totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {avgCostPerKM > 0 && (
                                  <div className="text-xs text-gray-500">
                                    ₹{avgCostPerKM}/KM
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {items.length} trips
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
                                  className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
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
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') 
                            ? 'No logistic expenditures found matching your filters.' 
                            : 'No logistic expenditure records found. Click "Add Logistic" to create one.'
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
                currentItems.map((expenditure) => {
                  const items = expenditure.items || [];
                  const totalKM = items.reduce((sum, item) => sum + (item.kmTravelled || 0), 0);
                  const totalAmount = expenditure.totalAmount || 0;
                  const firstItem = items[0] || {};

                  return (
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
                            className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
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
                      
                      <div className="mb-3">
                        <div className="text-sm text-gray-900 font-medium">
                          {firstItem.purpose}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <MapIcon className="h-3 w-3 mr-1" />
                          {firstItem.from} → {firstItem.to}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                        <div>
                          <span className="font-medium">Total:</span> 
                          <span className="ml-1 font-semibold">
                            ₹{totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Distance:</span> {totalKM.toLocaleString()} KM
                        </div>
                        <div>
                          <span className="font-medium">Trips:</span> {items.length}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center mb-1">
                          <TruckIcon className="h-3 w-3 mr-1" />
                          <span className="font-medium mr-2">Vehicles:</span>
                          <div className="flex flex-wrap gap-1">
                            {[...new Set(items.map(item => item.vehicleType))].slice(0, 2).map((vehicle, idx) => (
                              <span 
                                key={idx}
                                className={`px-2 py-0.5 rounded-full ${getVehicleTypeColor(vehicle)}`}
                              >
                                {vehicle}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          <span className="font-medium mr-2">Transporters:</span>
                          <span className="truncate">
                            {[...new Set(items.map(item => item.transporterName))].slice(0, 2).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') 
                    ? 'No logistic expenditures found matching your filters.' 
                    : 'No logistic expenditure records found. Click "Add Logistic" to create one.'
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
                  className="border border-gray-300 rounded-md text-sm p-1 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
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
                                ? 'z-10 bg-green-50 border-green-500 text-green-600'
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
          title="Logistic Expenditure Details"
          size="xl"
        >
          {viewingExpenditure && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700">Total Distance</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900 flex items-center">
                      <TruckIcon className="h-5 w-5 mr-2 text-gray-400" />
                      {viewingExpenditure.items?.reduce((sum, item) => sum + (item.kmTravelled || 0), 0).toLocaleString()} KM
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-500">Total Trips</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {viewingExpenditure.items?.length || 0}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-500">Avg Cost/KM</div>
                    <div className="text-lg font-semibold text-gray-900">
                      ₹{
                        (viewingExpenditure.totalAmount / 
                        (viewingExpenditure.items?.reduce((sum, item) => sum + (item.kmTravelled || 0), 0) || 1))
                        .toFixed(2)
                      }
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-500">Vehicle Types</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {[...new Set(viewingExpenditure.items?.map(item => item.vehicleType))].length}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-500">Transporters</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {[...new Set(viewingExpenditure.items?.map(item => item.transporterName))].length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trips ({viewingExpenditure.items?.length || 0})</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Transporter</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">KM</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost/KM</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingExpenditure.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.purpose}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <MapIcon className="h-3 w-3 mr-1 text-gray-400" />
                              <span>{item.from} → {item.to}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVehicleTypeColor(item.vehicleType)}`}>
                              {item.vehicleType}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.transporterName}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.kmTravelled?.toLocaleString()} KM
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                            ₹{item.totalPrice?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            ₹{item.kmTravelled > 0 ? (item.totalPrice / item.kmTravelled).toFixed(2) : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
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

        {/* Add/Edit Logistic Expenditure Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedExpenditure(null);
          }}
          title={selectedExpenditure ? 'Edit Logistic Expenditure' : 'Add Logistic Expenditure'}
          size="4xl"
        >
          <LogisticExpenditureForm
            initialData={selectedExpenditure?.items || []}
            financialYear={selectedExpenditure?.financialYear}
            customerName={selectedExpenditure?.customerName}
            projectName={selectedExpenditure?.projectName}
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
              Are you sure you want to delete this logistic expenditure record? This action cannot be undone.
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

export default LogisticExpenditureManagement;

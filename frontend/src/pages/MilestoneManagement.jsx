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
import MilestoneForm from '../components/Forms/MilestoneForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { milestonesAPI } from '../services/api';
import { phaseOptions, statusOptions } from '../data/taskConfig';

const MilestoneManagement = () => {
  const [milestones, setMilestones] = useState([]);
  const [filteredMilestones, setFilteredMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [filters, setFilters] = useState({
    customer: '',
    projectName: '',
    emailId: '',
    phase: '',
    projectStatus: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchMilestones();
  }, []);

  useEffect(() => {
    filterMilestones();
  }, [milestones, filters, currentPage, itemsPerPage]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await milestonesAPI.getAll();
      setMilestones(response.data.milestones || response.data);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      showError('Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  const filterMilestones = () => {
    let filtered = milestones;

    if (filters.customer) {
      filtered = filtered.filter(milestone => 
        milestone.customer && milestone.customer.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    if (filters.projectName) {
      filtered = filtered.filter(milestone => 
        milestone.projectName && milestone.projectName.toLowerCase().includes(filters.projectName.toLowerCase())
      );
    }

    if (filters.emailId) {
      filtered = filtered.filter(milestone => 
        milestone.emailId && milestone.emailId.toLowerCase().includes(filters.emailId.toLowerCase())
      );
    }

    if (filters.phase) {
      filtered = filtered.filter(milestone => 
        milestone.phase === filters.phase
      );
    }

    if (filters.projectStatus) {
      filtered = filtered.filter(milestone => 
        milestone.projectStatus === filters.projectStatus
      );
    }

    setFilteredMilestones(filtered);
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
      customer: '',
      projectName: '',
      emailId: '',
      phase: '',
      projectStatus: ''
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMilestones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMilestones.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    try {
      const headers = [
        'Customer', 'Project Name', 'Email ID', 'Phase', 'Task', 'Duration', 
        'Start Date', 'End Date', 'Responsible Person', 'Status'
      ];
      
      const csvData = filteredMilestones.map(milestone => [
        milestone.customer || '',
        milestone.projectName || '',
        milestone.emailId || '',
        milestone.phase || '',
        milestone.task?.name || '',
        `${milestone.task?.duration || 0} days`,
        milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : '',
        milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : '',
        milestone.responsiblePerson || '',
        milestone.projectStatus || 'not started'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'milestone_data.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('Milestone data exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Failed to export milestone data');
    }
  };

  const handleView = (milestone) => {
    setSelectedMilestone(milestone);
    setViewModal(true);
  };

  const handleEdit = (milestone) => {
    setEditingMilestone(milestone);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      try {
        await milestonesAPI.delete(id);
        showSuccess('Milestone deleted successfully');
        fetchMilestones(); // Refresh the list
      } catch (error) {
        console.error('Error deleting milestone:', error);
        showError('Failed to delete milestone');
      }
    }
  };

  const handleFormSuccess = (savedMilestone) => {
    setShowModal(false);
    setEditingMilestone(null);
    showSuccess(editingMilestone ? 'Milestone updated successfully' : 'Milestone added successfully');
    fetchMilestones(); // Refresh the list
  };

  const getStatusColor = (status) => {
    // Handle null/undefined status
    const normalizedStatus = (status || 'not started').toLowerCase();
    
    switch (normalizedStatus) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-yellow-100 text-yellow-800';
      case 'not started': return 'bg-gray-100 text-gray-800';
      case 'on track': return 'bg-blue-100 text-blue-800';
      case 'delayed': return 'bg-red-100 text-red-800';
      case 'likely delay': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status) => {
    // Handle null/undefined status
    const safeStatus = status || 'not started';
    return safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
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
                  Add Milestone
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <input
                    type="text"
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by customer"
                  />
                </div>
                
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                  <input
                    type="text"
                    value={filters.emailId}
                    onChange={(e) => handleFilterChange('emailId', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                    placeholder="Search by email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                  <select
                    value={filters.phase}
                    onChange={(e) => handleFilterChange('phase', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Phases</option>
                    {phaseOptions.map(phase => (
                      <option key={phase} value={phase}>{phase}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.projectStatus}
                    onChange={(e) => handleFilterChange('projectStatus', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Status</option>
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Milestones Table */}
          <div>
            {/* Results Count */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > filteredMilestones.length ? filteredMilestones.length : indexOfLastItem}
                </span> of{' '}
                <span className="font-medium">{filteredMilestones.length}</span> results
              </p>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((milestone) => (
                    <tr key={milestone._id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{milestone.customer || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{milestone.projectName || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{milestone.emailId || ''}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(milestone.projectStatus)}`}>
                          {formatStatus(milestone.projectStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => handleView(milestone)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                            title="View"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(milestone)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(milestone._id)}
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
              {currentItems.map((milestone) => (
                <div key={milestone._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{milestone.projectName || ''}</h3>
                      <p className="text-sm text-gray-500 truncate">{milestone.customer || ''}</p>
                    </div>
                    <div className="flex space-x-4 ml-2">
                      <button
                        onClick={() => handleView(milestone)}
                        className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(milestone)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(milestone._id)}
                        className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-500">Email:</span>
                      <span className="ml-1 text-gray-900">{milestone.emailId || ''}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Start Date:</span>
                      <span className="ml-1 text-gray-900">
                        {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">End Date:</span>
                      <span className="ml-1 text-gray-900">
                        {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Status:</span>
                      <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(milestone.projectStatus)}`}>
                        {formatStatus(milestone.projectStatus)}
                      </span>
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
          setEditingMilestone(null);
        }}
        title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
        size="xl"
      >
        <MilestoneForm
          milestone={editingMilestone}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowModal(false);
            setEditingMilestone(null);
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
          setSelectedMilestone(null);
        }}
        title="Milestone Details"
        size="lg"
        className="font-sans"
      >
        {selectedMilestone && (
          <div className="space-y-6 py-1">
            {/* Header with project name and customer */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedMilestone.projectName || ''}</h2>
                <div className="mt-1">
                  <span className="text-sm text-gray-600">Customer: {selectedMilestone.customer || ''}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMilestone.projectStatus)}`}>
                  {formatStatus(selectedMilestone.projectStatus)}
                </span>
              </div>
            </div>

            {/* Basic Information Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h3 className="text-md font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100 flex items-center">
                <i className="fas fa-info-circle mr-2 text-blue-500"></i>
                Milestone Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedMilestone.customer || ''}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project Name</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedMilestone.projectName || ''}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email ID</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedMilestone.emailId || ''}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phase</h4>
                  <p className="text-sm text-gray-900 font-medium">{selectedMilestone.phase || ''}</p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedMilestone.startDate ? new Date(selectedMilestone.startDate).toLocaleDateString() : ''}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date</h4>
                  <p className="text-sm text-gray-900 font-medium">
                    {selectedMilestone.endDate ? new Date(selectedMilestone.endDate).toLocaleDateString() : ''}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</h4>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(selectedMilestone.projectStatus)}`}>
                    {formatStatus(selectedMilestone.projectStatus)}
                  </span>
                </div>
              </div>
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
                onClick={() => {
                  setViewModal(false);
                  handleEdit(selectedMilestone);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Milestone
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MilestoneManagement;
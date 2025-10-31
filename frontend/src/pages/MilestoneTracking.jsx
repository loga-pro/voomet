import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { milestonesAPI } from '../services/api';

const MilestoneTracking = () => {
  const [milestones, setMilestones] = useState([]);
  const [filteredMilestones, setFilteredMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [trackingData, setTrackingData] = useState([]);
  const [filters, setFilters] = useState({
    customer: '',
    projectName: '',
    emailId: '',
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
  }, [milestones, filters]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const response = await milestonesAPI.getAll();
      // Handle both response structures
      const milestonesData = response.data.milestones || response.data || [];
      setMilestones(milestonesData);
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
      projectStatus: ''
    });
  };

  // Function to calculate business days (excluding Sundays)
  const calculateBusinessDays = (startDate, duration) => {
    const start = new Date(startDate);
    let count = 0;
    let currentDate = new Date(start);
    
    // If duration is 0 or negative, return the start date
    if (duration <= 0) return currentDate;
    
    while (count < duration) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Skip Sundays (day 0)
      if (currentDate.getDay() !== 0) {
        count++;
      }
    }
    
    return currentDate;
  };

  // Function to format date as YYYY-MM-DD for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Improved status determination based on Actual End and Outlook Completion
  const determineStatusBasedOnDates = (task) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If actual end date exists, task is completed
    if (task.actualEndDate) {
      const actualEnd = new Date(task.actualEndDate);
      const plannedEnd = task.endDate ? new Date(task.endDate) : null;
      
      // Check if completed on time or delayed
      if (plannedEnd && actualEnd > plannedEnd) {
        const delayDays = Math.ceil((actualEnd - plannedEnd) / (1000 * 60 * 60 * 24));
        return delayDays <= 15 ? 'Likely Delay' : 'Delayed';
      }
      return 'Completed';
    }

    // If no actual start date, task hasn't started
    if (!task.actualStartDate) {
      return 'Not Started';
    }

    // Task has started but not completed
    const actualStart = new Date(task.actualStartDate);
    
    // Check outlook completion vs planned end date
    if (task.outlookCompletion && task.endDate) {
      const outlookCompletion = new Date(task.outlookCompletion);
      const plannedEnd = new Date(task.endDate);
      
      // If outlook completion is after planned end, likely to be delayed
      if (outlookCompletion > plannedEnd) {
        const delayDays = Math.ceil((outlookCompletion - plannedEnd) / (1000 * 60 * 60 * 24));
        return delayDays <= 15 ? 'Likely Delay' : 'Delayed';
      }
    }

    // Check if planned end date has passed
    if (task.endDate) {
      const plannedEnd = new Date(task.endDate);
      if (today > plannedEnd) {
        const delayDays = Math.ceil((today - plannedEnd) / (1000 * 60 * 60 * 24));
        return delayDays <= 15 ? 'Likely Delay' : 'Delayed';
      }
    }

    // Check if task is progressing normally
    if (task.actualStartDate && !task.actualEndDate) {
      // If we have current progress information
      if (task.completion !== undefined) {
        // If task has started and has some progress but not completed
        if (task.completion > 0 && task.completion < 100) {
          return 'On track';
        }
      }
      
      // Default case for tasks that have started but no specific progress data
      return 'On track';
    }

    // Default to on track if none of the above conditions are met
    return 'On track';
  };

  // Calculate completion percentage based on status and dates
  const calculateCompletionPercentage = (task) => {
    // If task is completed, always 100%
    if (task.actualEndDate) {
      return 100;
    }

    // If not started, 0%
    if (!task.actualStartDate) {
      return 0;
    }

    // If in progress, calculate based on time elapsed vs total duration
    if (task.actualStartDate && task.endDate) {
      const start = new Date(task.actualStartDate);
      const end = new Date(task.endDate);
      const today = new Date();
      
      const totalDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const elapsedDuration = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
      
      if (totalDuration <= 0) return 100;
      
      const percentage = Math.min(Math.max(Math.round((elapsedDuration / totalDuration) * 100), 0), 100);
      return percentage;
    }

    // Default to 50% for tasks in progress without clear timeline
    return 50;
  };

  const handleTrackingChange = (index, field, value) => {
    setTrackingData(prev => {
      const newData = [...prev];
      const task = { ...newData[index] };
      
      // Update the field
      task[field] = value;
      
      // Recalculate outlook completion if actual start date or duration changes
      if ((field === 'actualStartDate' && value && task.duration) || 
          (field === 'duration' && value && task.actualStartDate)) {
        const outlookDate = calculateBusinessDays(
          field === 'actualStartDate' ? value : task.actualStartDate, 
          field === 'duration' ? parseInt(value) || 0 : task.duration
        );
        task.outlookCompletion = formatDateForInput(outlookDate);
      }
      
      // Determine status based on the updated data
      const newStatus = determineStatusBasedOnDates({
        ...task,
        [field]: value
      });
      task.status = newStatus;
      
      // Calculate completion percentage based on the new status and dates
      task.completion = calculateCompletionPercentage({
        ...task,
        [field]: value
      });
      
      // Special handling for status changes
      if (field === 'status') {
        if (value === 'Completed') {
          task.completion = 100;
          // Set actual end date to today if completed and not already set
          if (!task.actualEndDate) {
            task.actualEndDate = formatDateForInput(new Date());
          }
        } else if (value === 'Not Started') {
          task.completion = 0;
          task.actualStartDate = '';
          task.actualEndDate = '';
          task.outlookCompletion = '';
        } else if (value === 'On track') {
          // When setting to "On track", ensure we have an actual start date
          if (!task.actualStartDate) {
            task.actualStartDate = formatDateForInput(new Date());
          }
          // Calculate appropriate completion percentage
          if (task.completion === 0 || task.completion === 100) {
            task.completion = Math.max(calculateCompletionPercentage(task), 10);
          }
        }
      }
      
      // If actual end date is manually set, mark as completed
      if (field === 'actualEndDate' && value) {
        task.status = 'Completed';
        task.completion = 100;
      }
      
      // If actual start date is set and task was not started, update status
      if (field === 'actualStartDate' && value && task.status === 'Not Started') {
        task.status = 'On track';
        task.completion = Math.max(task.completion, 10); // At least 10% when started
      }
      
      // If completion is set to 100%, mark as completed
      if (field === 'completion' && value === 100) {
        task.status = 'Completed';
        if (!task.actualEndDate) {
          task.actualEndDate = formatDateForInput(new Date());
        }
      }
      
      newData[index] = task;
      return newData;
    });
  };

  const calculateActivityStats = (milestone) => {
    if (!milestone.tasks) return { total: 0, finished: 0 };
    
    const total = milestone.tasks.length;
    const finished = milestone.tasks.filter(task => 
      task.status && task.status.toLowerCase() === 'completed'
    ).length;
    
    return { total, finished };
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMilestones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMilestones.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleViewTracking = (milestone) => {
    setSelectedMilestone(milestone);
    
    // Initialize tracking data with proper date formatting and status calculation
    if (milestone.tasks) {
      const initialTrackingData = milestone.tasks.map(task => {
        // Calculate outlook completion if we have actual start and duration
        const outlookCompletion = task.outlookCompletion ? 
          new Date(task.outlookCompletion).toISOString().split('T')[0] : 
          (task.actualStartDate && task.duration ? 
            formatDateForInput(calculateBusinessDays(task.actualStartDate, task.duration)) : '');
        
        // Determine status based on actual end and outlook completion
        const status = determineStatusBasedOnDates(task);
        
        // Calculate completion percentage
        const completion = calculateCompletionPercentage(task);
        
        return {
          ...task,
          duration: task.duration || 0,
          status: status,
          completion: completion,
          actualStartDate: task.actualStartDate ? new Date(task.actualStartDate).toISOString().split('T')[0] : '',
          actualEndDate: task.actualEndDate ? new Date(task.actualEndDate).toISOString().split('T')[0] : '',
          outlookCompletion: outlookCompletion,
          startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
          endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : ''
        };
      });
      setTrackingData(initialTrackingData);
    } else {
      setTrackingData([]);
    }
    setShowTrackingModal(true);
  };

  const saveTrackingData = async () => {
    try {
      // Convert date strings to proper Date objects for MongoDB
      const trackingDataForSave = trackingData.map(task => ({
        ...task,
        startDate: task.startDate ? new Date(task.startDate) : null,
        endDate: task.endDate ? new Date(task.endDate) : null,
        actualStartDate: task.actualStartDate ? new Date(task.actualStartDate) : null,
        actualEndDate: task.actualEndDate ? new Date(task.actualEndDate) : null,
        outlookCompletion: task.outlookCompletion ? new Date(task.outlookCompletion) : null,
        duration: task.duration || 0,
        status: task.status,
        completion: task.completion,
        remark: task.remark || ''
      }));

      await milestonesAPI.updateTracking(selectedMilestone._id, trackingDataForSave);
      showSuccess('Tracking data saved successfully');
      setShowTrackingModal(false);
      fetchMilestones(); // Refresh the list
    } catch (error) {
      console.error('Error saving tracking data:', error);
      showError('Failed to save tracking data: ' + (error.response?.data?.message || error.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return '-';
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.projectStatus}
                    onChange={(e) => handleFilterChange('projectStatus', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Status</option>
                    <option value="Not Started">Not Started</option>
                    <option value="On track">On track</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Likely Delay">Likely Delay</option>
                    <option value="Completed">Completed</option>
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
                      Plan Start
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan End
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual Start
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual End
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outlook Completion
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Activity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity Finished
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((milestone) => {
                    const { total, finished } = calculateActivityStats(milestone);
                    
                    return (
                      <tr key={milestone._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{milestone.customer || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{milestone.projectName || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(milestone.startDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(milestone.endDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {milestone.tasks && milestone.tasks.length > 0 
                              ? formatDate(milestone.tasks[0].actualStartDate)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {milestone.tasks && milestone.tasks.length > 0 
                              ? formatDate(milestone.tasks[0].actualEndDate)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {milestone.tasks && milestone.tasks.length > 0 
                              ? formatDate(milestone.tasks[0].outlookCompletion)
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 text-center">
                            {total}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 text-center">
                            {finished} / {total}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-4">
                            <button
                              onClick={() => handleViewTracking(milestone)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Track Progress
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
              {currentItems.map((milestone) => {
                const { total, finished } = calculateActivityStats(milestone);
                
                return (
                  <div key={milestone._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{milestone.projectName || ''}</h3>
                        <p className="text-sm text-gray-500 truncate">{milestone.customer || ''}</p>
                      </div>
                      <div className="flex space-x-4 ml-2">
                        <button
                          onClick={() => handleViewTracking(milestone)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-500">Plan Start:</span>
                        <span className="ml-1 text-gray-900">
                          {formatDate(milestone.startDate)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Plan End:</span>
                        <span className="ml-1 text-gray-900">
                          {formatDate(milestone.endDate)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500">Activities:</span>
                        <span className="ml-1 text-gray-900">
                          {finished} / {total}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between items-center">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                </span>
                
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracking Modal */}
      <Modal
        isOpen={showTrackingModal}
        onClose={() => {
          setShowTrackingModal(false);
          setSelectedMilestone(null);
        }}
        title={`Track Progress - ${selectedMilestone?.projectName || ''}`}
        size="6xl"
      >
        {selectedMilestone && (
          <div className="space-y-6 py-1">
            {/* Project Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Customer</h4>
                <p className="text-sm font-medium text-gray-900">{selectedMilestone.customer || ''}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Project Name</h4>
                <p className="text-sm font-medium text-gray-900">{selectedMilestone.projectName || ''}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Timeline</h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(selectedMilestone.startDate)} - {formatDate(selectedMilestone.endDate)}
                </p>
              </div>
            </div>

            {/* Tracking Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phase
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration (Days)
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Start
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan End
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsible
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Completion
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual Start
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual End
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outlook Completion
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trackingData.map((task, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.phase}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.task}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="number"
                          min="1"
                          value={task.duration || 0}
                          onChange={(e) => handleTrackingChange(index, 'duration', parseInt(e.target.value) || 0)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="date"
                          value={task.startDate || ''}
                          onChange={(e) => handleTrackingChange(index, 'startDate', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="date"
                          value={task.endDate || ''}
                          onChange={(e) => handleTrackingChange(index, 'endDate', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="text"
                          value={task.responsiblePerson || ''}
                          onChange={(e) => handleTrackingChange(index, 'responsiblePerson', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed"
                          readOnly
                          disabled
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <select
                          value={task.status}
                          onChange={(e) => handleTrackingChange(index, 'status', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="On track">On track</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Likely Delay">Likely Delay</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={task.completion}
                          onChange={(e) => handleTrackingChange(index, 'completion', parseInt(e.target.value) || 0)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="date"
                          value={task.actualStartDate}
                          onChange={(e) => handleTrackingChange(index, 'actualStartDate', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="date"
                          value={task.actualEndDate}
                          onChange={(e) => handleTrackingChange(index, 'actualEndDate', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <input
                          type="date"
                          value={task.outlookCompletion}
                          onChange={(e) => handleTrackingChange(index, 'outlookCompletion', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          readOnly
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {(task.status === 'Delayed' || task.status === 'Likely Delay') && (
                          <textarea
                            value={task.remark || ''}
                            onChange={(e) => handleTrackingChange(index, 'remark', e.target.value)}
                            placeholder="Enter remarks for delay..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            rows="2"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={saveTrackingData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Tracking Data
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MilestoneTracking;
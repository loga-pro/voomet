import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { inhouseMilestonesAPI } from '../services/api';
import { Popover } from 'antd';

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
  const [itemsPerPage, setItemsPerPage] = useState(5);

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
      const response = await inhouseMilestonesAPI.getAll();
      const milestonesData = response.data.milestones || response.data || [];
      setMilestones(milestonesData);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      showError('Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for dropdowns
  const getUniqueValues = (key) => {
    const values = milestones
      .map(milestone => milestone[key])
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return values;
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

  // Export to CSV function
  const exportToCSV = () => {
    const dataToExport = filteredMilestones.length > 0 ? filteredMilestones : milestones;

    if (dataToExport.length === 0) {
      showError('No data available to export');
      return;
    }

    // Main project headers
    const mainHeaders = [
      'Customer',
      'Project Plan Start',
      'Project Plan End',
      'Overall Status',
      'Total Activities',
      'Activities Finished',
      'Activities Delayed',
      'Activities Likely Delayed'
    ];

    // Task/Activity detailed headers
    const taskHeaders = [
      'Phase',
      'Task Name',
      'Duration (Days)',
      'Plan Start Date',
      'Plan End Date',
      'Responsible Person',
      'Status',
      'Completion %',
      'Actual Start Date',
      'Actual End Date',
      'Outlook Completion Date',
      'Remarks'
    ];

    // Prepare CSV content
    const csvRows = [];

    // Add main headers
    csvRows.push([...mainHeaders, ...taskHeaders].join(','));

    // Add data rows
    dataToExport.forEach(milestone => {
      const { total, finished, delayed, likelyDelayed } = calculateActivityStats(milestone);
      const overallStatus = getOverallProjectStatus(milestone);

      // Main project data
      const mainData = [
        `"${milestone.customer || ''}"`,
        `"${formatDate(milestone.startDate)}"`,
        `"${formatDate(milestone.endDate)}"`,
        `"${overallStatus}"`,
        total,
        finished,
        delayed,
        likelyDelayed
      ];

      if (milestone.tasks && milestone.tasks.length > 0) {
        // Add each task as a separate row with project context
        milestone.tasks.forEach((task, index) => {
          const taskData = [
            `"${task.phase || ''}"`,
            `"${task.task || ''}"`,
            task.duration || 0,
            `"${formatDate(task.startDate)}"`,
            `"${formatDate(task.endDate)}"`,
            `"${task.responsiblePerson || ''}"`,
            `"${task.status || ''}"`,
            calculateCompletionPercentage(task),
            `"${formatDate(task.actualStartDate)}"`,
            `"${formatDate(task.actualEndDate)}"`,
            `"${formatDate(task.outlookCompletion)}"`,
            `"${(task.remark || '').replace(/"/g, '""')}"`
          ];

          // For first task, include main project data
          if (index === 0) {
            csvRows.push([...mainData, ...taskData].join(','));
          } else {
            // For subsequent tasks, leave main project columns empty
            const emptyMainData = Array(mainData.length).fill('""');
            csvRows.push([...emptyMainData, ...taskData].join(','));
          }
        });
      } else {
        // No tasks - just show project info
        const emptyTaskData = Array(taskHeaders.length).fill('""');
        csvRows.push([...mainData, ...emptyTaskData].join(','));
      }
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `milestone-detailed-tracking-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess('Detailed data exported successfully');
  };

  // Function to calculate days (including all days)
  // Duration includes the start date, so duration of 2 means start date + 1 day
  const calculateBusinessDays = (startDate, duration) => {
    const start = new Date(startDate);
    let currentDate = new Date(start);

    if (duration <= 0) return currentDate;
    if (duration === 1) return currentDate; // Duration of 1 day = same day

    // Subtract 1 because the start date counts as day 1
    const daysToAdd = duration - 1;
    currentDate.setDate(currentDate.getDate() + daysToAdd);

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

  // Calculate days difference between two dates
  const getDaysDifference = (date1, date2) => {
    if (!date1 || !date2) return 0;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Status determination based on planned end vs actual end date comparison
  const determineStatusBasedOnDates = (task) => {
    // If actual end date exists, compare with planned end date only
    if (task.actualEndDate) {
      const actualEnd = new Date(task.actualEndDate);

      // Compare with plan end date
      if (task.endDate) {
        const planEnd = new Date(task.endDate);
        if (actualEnd < planEnd) {
          return 'Completed (in advance)';
        } else if (actualEnd.getTime() === planEnd.getTime()) {
          return 'Completed (On Time)';
        } else {
          const delayDays = getDaysDifference(planEnd, actualEnd);
          if (delayDays > 30) {
            return 'Completed with Delay';
          } else {
            return 'Completed with Delay';
          }
        }
      }

      return 'Completed';
    }

    // If no actual start date, check if plan start date has passed
    if (!task.actualStartDate) {
      if (task.startDate) {
        const planStart = new Date(task.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today > planStart) {
          const delayDays = getDaysDifference(planStart, today);
          if (delayDays > 30) {
            return 'Delayed';
          } else if (delayDays > 15) {
            return 'Likely Delay';
          }
        }
      }
      return 'Not Started';
    }

    // Task has started but not completed - compare actual start with plan start
    const actualStart = new Date(task.actualStartDate);
    const planStart = task.startDate ? new Date(task.startDate) : null;

    if (planStart) {
      const startDateDiff = getDaysDifference(planStart, actualStart);

      if (startDateDiff === 0) {
        return 'On track';
      } else if (startDateDiff <= 15) {
        return 'Likely Delay';
      } else if (startDateDiff > 15) {
        return 'Delayed';
      }
    }

    return 'On track';
  };

  // Calculate completion percentage based on status rules
  const calculateCompletionPercentage = (task) => {
    // If actual end date exists, task is 100% complete
    if (task.actualEndDate) {
      return 100;
    }

    const status = determineStatusBasedOnDates(task);

    // Based on status rules
    switch (status) {
      case 'Completed (in advance)':
      case 'Completed (On Time)':
      case 'Completed with Delay':
      case 'Completed with Delay':
      case 'Completed':
        return 100;
      case 'On track':
        return 0;
      case 'Likely Delay':
      case 'Delayed':
      case 'Not Started':
        return 0;
      default:
        return 0;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed (in advance)':
        return 'bg-emerald-100 text-emerald-800';
      case 'Completed (On Time)':
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Completed with Delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed with Delay':
        return 'bg-red-100 text-red-800';
      case 'On track':
        return 'bg-blue-100 text-blue-800';
      case 'Delayed':
        return 'bg-red-100 text-red-800';
      case 'Likely Delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  function handleCompletionChange(e, index) {
    let value = parseInt(e.target.value) || 0;
    // Ensure max value is 100 and min is 0
    if (value > 100) value = 100;
    if (value < 0) value = 0;

    setTrackingData(prev => {
      const newData = [...prev];
      const task = { ...newData[index] };
      task.completion = value;
      task.isCompletionManuallyEdited = true; // Mark as manually edited

      // Update status based on completion percentage
      // Only change status to Completed when 100%, otherwise keep existing status
      if (value === 100) {
        task.status = 'Completed';
      } else if (value > 0 && value < 100 && task.status !== 'Completed') {
        // Don't change status if it's "Likely Delay" or "Delayed"
        // Only update to "On track" if current status is "Not Started"
        if (task.status === 'Not Started') {
          task.status = 'On track';
        }
        // For "Likely Delay", "Delayed", and "On track" - keep the status as is
      }

      newData[index] = task;
      return newData;
    });
  }

  const handleTrackingChange = (index, field, value) => {
    setTrackingData(prev => {
      const newData = [...prev];
      const task = { ...newData[index] };

      // Validation: Cannot set actual end date without actual start date
      if (field === 'actualEndDate' && value && !task.actualStartDate) {
        showError('Please set Actual Start Date before setting Actual End Date');
        return prev;
      }

      // Validation: Cannot set dates prior to start date
      if ((field === 'actualStartDate' || field === 'actualEndDate') && value) {
        const newDate = new Date(value);
        const startDate = task.startDate ? new Date(task.startDate) : null;

        if (startDate && newDate < startDate) {
          showError('Actual dates cannot be prior to plan start date');
          return prev;
        }
      }

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

      // Special handling for actual end date
      if (field === 'actualEndDate') {
        if (value) {
          // When actual end date is set, automatically calculate status based on comparison
          const newStatus = determineStatusBasedOnDates({
            ...task,
            actualEndDate: value
          });
          task.status = newStatus;
          task.completion = 100;
          task.isCompletionManuallyEdited = true; // Mark as edited since we're setting it to 100
        } else {
          // When actual end date is cleared, recalculate status without it
          const newStatus = determineStatusBasedOnDates({
            ...task,
            actualEndDate: ''
          });
          task.status = newStatus;

          // Only recalculate completion if it wasn't manually edited
          if (!task.isCompletionManuallyEdited) {
            const newCompletion = calculateCompletionPercentage({
              ...task,
              actualEndDate: ''
            });
            task.completion = newCompletion;
          }
        }
      } else if (field === 'actualStartDate' || field === 'startDate' || field === 'duration') {
        // When any of these fields change, recalculate status
        const newStatus = determineStatusBasedOnDates({
          ...task,
          [field]: value
        });
        task.status = newStatus;

        // Only recalculate completion if it wasn't manually edited
        if (!task.isCompletionManuallyEdited) {
          const newCompletion = calculateCompletionPercentage({
            ...task,
            [field]: value
          });
          task.completion = newCompletion;
        }
      }

      newData[index] = task;
      return newData;
    });
  };

  const calculateActivityStats = (milestone) => {
    if (!milestone.tasks) return { total: 0, finished: 0, delayed: 0, likelyDelayed: 0 };

    const total = milestone.tasks.length;
    const finished = milestone.tasks.filter(task =>
      task.status && (task.status.includes('Completed') || task.status === 'Completed')
    ).length;
    const delayed = milestone.tasks.filter(task =>
      task.status && (task.status.includes('Delayed') || task.status === 'Delayed')
    ).length;
    const likelyDelayed = milestone.tasks.filter(task =>
      task.status && task.status === 'Likely Delay'
    ).length;

    return { total, finished, delayed, likelyDelayed };
  };

  // Get overall project status based on tasks
  const getOverallProjectStatus = (milestone) => {
    if (!milestone.tasks || milestone.tasks.length === 0) return 'Not Started';

    const tasks = milestone.tasks;

    // If all tasks are completed
    if (tasks.every(task => task.status && task.status.includes('Completed'))) {
      return 'Completed';
    }

    // If any task is delayed
    if (tasks.some(task => task.status && (task.status.includes('Delayed') || task.status === 'Delayed'))) {
      return 'Delayed';
    }

    // If any task is likely delayed
    if (tasks.some(task => task.status && task.status === 'Likely Delay')) {
      return 'Likely Delay';
    }

    // If any task has started
    if (tasks.some(task => task.status && (task.status === 'On track' || task.status.includes('Completed')))) {
      return 'On track';
    }

    return 'Not Started';
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMilestones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMilestones.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleViewTracking = (milestone) => {
    setSelectedMilestone(milestone);

    if (milestone.tasks) {
      const initialTrackingData = milestone.tasks.map(task => {
        const outlookCompletion = task.outlookCompletion ?
          new Date(task.outlookCompletion).toISOString().split('T')[0] :
          (task.actualStartDate && task.duration ?
            formatDateForInput(calculateBusinessDays(task.actualStartDate, task.duration)) : '');

        const status = determineStatusBasedOnDates(task);
        const calculatedCompletion = calculateCompletionPercentage(task);

        // Check if completion was manually edited
        // If task has a saved completion value that differs from calculated, it was manually edited
        const savedCompletion = task.completion !== undefined ? task.completion : calculatedCompletion;
        const isManuallyEdited = task.completion !== undefined && task.completion !== calculatedCompletion;

        return {
          ...task,
          duration: task.duration || 0,
          status: status,
          completion: savedCompletion,
          isCompletionManuallyEdited: isManuallyEdited,
          actualStartDate: task.actualStartDate ? new Date(task.actualStartDate).toISOString().split('T')[0] : '',
          actualEndDate: task.actualEndDate ? new Date(task.actualEndDate).toISOString().split('T')[0] : '',
          outlookCompletion: outlookCompletion,
          startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
          endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
          remark: task.remark || ''
        };
      });
      setTrackingData(initialTrackingData);
    } else {
      setTrackingData([]);
    }
    setShowTrackingModal(true);
  };
  const [open, setOpen] = useState(null);
  const [summeryViewData, setSummeryViewData] = useState([])

  const hide = (action, milestone) => {
    setOpen(action ? milestone._id : null);
    setSummeryViewData([])
  };

  const handleOpenChange = (action, milestone) => {
    setOpen(action ? milestone._id : null);
    if (milestone.tasks) {
      const initialTrackingData = milestone?.tasks?.map(task => {
        const status = determineStatusBasedOnDates(task);
        return {
          status: status,
        };
      });
      setSummeryViewData(initialTrackingData)
    } else {
      // not task yet
      setSummeryViewData([])
    }
  };

  const saveTrackingData = async () => {
    try {
      // Validate data before saving
      for (let i = 0; i < trackingData.length; i++) {
        const task = trackingData[i];

        // Check if actual end date is set without actual start date
        if (task.actualEndDate && !task.actualStartDate) {
          showError(`Task "${task.task}" has Actual End Date but no Actual Start Date`);
          return;
        }

        // Check if dates are prior to plan start date
        if (task.startDate) {
          const planStart = new Date(task.startDate);

          if (task.actualStartDate && new Date(task.actualStartDate) < planStart) {
            showError(`Task "${task.task}" has Actual Start Date prior to Plan Start Date`);
            return;
          }

          if (task.actualEndDate && new Date(task.actualEndDate) < planStart) {
            showError(`Task "${task.task}" has Actual End Date prior to Plan Start Date`);
            return;
          }
        }
      }

      const trackingDataForSave = trackingData.map(task => ({
        ...task,
        // Send string dates to backend - let backend handle the conversion
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        actualStartDate: task.actualStartDate || '',
        actualEndDate: task.actualEndDate || '',
        outlookCompletion: task.outlookCompletion || '',
        duration: task.duration || 0,
        status: task.status || 'Not Started',
        completion: task.completion || 0,
        remark: task.remark || '',
        dependencies: task.dependencies || [], // Ensure dependencies field is included
        phase: task.phase || 'Uncategorized',
        task: task.task || 'Untitled Task',
        responsiblePerson: task.responsiblePerson || 'Unassigned'
      }));

      console.log('Sending tracking data:', JSON.stringify(trackingDataForSave, null, 2));
      console.log('Milestone ID:', selectedMilestone._id);

      // Debug: Check if all required fields are present and validate data types
      trackingDataForSave.forEach((task, index) => {
        const missingFields = [];
        const invalidFields = [];

        if (!task.phase) missingFields.push('phase');
        if (!task.task) missingFields.push('task');
        if (!task.responsiblePerson) missingFields.push('responsiblePerson');

        // Check data types
        if (task.duration !== undefined && (typeof task.duration !== 'number' || task.duration < 0)) {
          invalidFields.push(`duration (${task.duration})`);
        }
        if (task.completion !== undefined && (typeof task.completion !== 'number' || task.completion < 0 || task.completion > 100)) {
          invalidFields.push(`completion (${task.completion})`);
        }
        if (task.status && typeof task.status !== 'string') {
          invalidFields.push(`status (${task.status})`);
        }

        // Check date fields
        const dateFields = ['startDate', 'endDate', 'actualStartDate', 'actualEndDate', 'outlookCompletion'];
        dateFields.forEach(field => {
          if (task[field] !== null && task[field] !== undefined && !(task[field] instanceof Date) && task[field] !== '') {
            invalidFields.push(`${field} (${task[field]} - ${typeof task[field]})`);
          }
        });

        if (missingFields.length > 0) {
          console.warn(`Task ${index} missing required fields:`, missingFields);
        }
        if (invalidFields.length > 0) {
          console.warn(`Task ${index} invalid fields:`, invalidFields);
        }
        if (missingFields.length > 0 || invalidFields.length > 0) {
          console.warn('Task data:', task);
        }
      });

      await inhouseMilestonesAPI.updateTracking(selectedMilestone._id, trackingDataForSave);
      showSuccess('Tracking data saved successfully');
      setShowTrackingModal(false);
      fetchMilestones();
    } catch (error) {
      console.error('Error saving tracking data:', error);
      console.error('Error response:', error.response);
      console.error('Error request:', error.request);

      let errorMessage = 'Failed to save tracking data: ';
      if (error.response) {
        // The request was made and the server responded with a status code
        errorMessage += error.response.data?.message || error.response.statusText;
        console.error('Server responded with:', error.response.status, error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage += 'No response from server';
        console.error('No response received for request:', error.request);
      } else {
        // Something happened in setting up the request
        errorMessage += error.message;
      }

      showError(errorMessage);
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

  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  return (
    <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto mb-6">

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
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Client</option>
                    {getUniqueValues('customer').map(customer => (
                      <option key={customer} value={customer}>{customer}</option>
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
                    {getUniqueValues('projectName').map(project => (
                      <option key={project} value={project}>{project}</option>
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
            {/* No Data Message */}
            {filteredMilestones.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg font-medium mb-2">No data available</div>
                <div className="text-gray-400 text-sm">
                  {milestones.length === 0 ? 'No milestones found' : 'No milestones match your search criteria'}
                </div>
              </div>
            )}

            {/* Mobile View (up to md) */}
            {filteredMilestones.length > 0 && (
              <div className="block lg:hidden">
                {currentItems.map((milestone) => {
                  const { total, finished, delayed, likelyDelayed } = calculateActivityStats(milestone);
                  const overallStatus = getOverallProjectStatus(milestone);

                  return (
                    <div key={milestone._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                      {/* Header Section */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 mr-3">
                          <h3 className="text-sm font-medium text-gray-900 break-words mb-1">
                            {milestone.projectName || 'No project name'}
                          </h3>
                          <p className="text-sm text-gray-500 break-words">
                            {milestone.customer || 'No customer name'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewTracking(milestone)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          Track
                        </button>
                      </div>

                      {/* Status and Dates */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <span className="text-xs font-medium text-gray-500">Status:</span>
                          <span className={`ml-1 text-xs px-2 py-1 rounded-full ${getStatusColor(overallStatus)}`}>
                            {overallStatus}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-500">Timeline:</span>
                          <span className="ml-1 text-xs text-gray-900">
                            {formatDate(milestone.startDate)} - {formatDate(milestone.endDate)}
                          </span>
                        </div>
                      </div>

                      {/* Activity Stats */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-medium text-gray-500">Total Activities:</span>
                            <span className="ml-1 text-gray-900">{total}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Completed:</span>
                            <span className="ml-1 text-green-600 font-medium">{finished}/{total}</span>
                          </div>
                          {likelyDelayed > 0 && (
                            <div>
                              <span className="font-medium text-gray-500">Likely Delayed:</span>
                              <span className="ml-1 text-yellow-600 font-medium">{likelyDelayed}</span>
                            </div>
                          )}
                          {delayed > 0 && (
                            <div>
                              <span className="font-medium text-gray-500">Delayed:</span>
                              <span className="ml-1 text-red-600 font-medium">{delayed}</span>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tablet View (md to lg) */}
            {filteredMilestones.length > 0 && (
              <div className="hidden md:block lg:hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client Name
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timeline
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.map((milestone) => {
                        const { total, finished, delayed, likelyDelayed } = calculateActivityStats(milestone);
                        const overallStatus = getOverallProjectStatus(milestone);

                        return (
                          <tr key={milestone._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-3 py-4 whitespace-normal">
                              <div className="text-sm font-medium text-gray-900 break-words">
                                {milestone.projectName || '-'}
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-normal">
                              <div className="text-sm text-gray-900 break-words">
                                {milestone.customer || '-'}
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatDate(milestone.startDate)} - {formatDate(milestone.endDate)}
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(overallStatus)}`}>
                                {overallStatus}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="flex items-center space-x-2">
                                  <span className="text-green-600 font-medium">{finished}/{total}</span>
                                  {(delayed > 0 || likelyDelayed > 0) && (
                                    <span className="text-xs text-gray-500">
                                      ({delayed > 0 && <span className="text-red-600">{delayed}D</span>}
                                      {delayed > 0 && likelyDelayed > 0 && ', '}
                                      {likelyDelayed > 0 && <span className="text-yellow-600">{likelyDelayed}LD</span>})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <button
                                onClick={() => handleViewTracking(milestone)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                Track Progress
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Desktop Table View */}
            {filteredMilestones.length > 0 && (
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Client Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Project
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Plan Start
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Plan End
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Actual Start
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Actual End
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Outlook Completion
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                        Total Activity
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Activity Finished
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Delayed/Likely Delayed
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        View Summary
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((milestone) => {
                      const { total, finished, delayed, likelyDelayed } = calculateActivityStats(milestone);
                      const overallStatus = getOverallProjectStatus(milestone);

                      return (
                        <tr key={milestone._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-4 whitespace-normal text-center">
                            <div className="text-sm font-medium text-gray-900 break-words">{milestone.customer || '-'}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-normal text-center">
                            <div className="text-sm text-gray-900 break-words">{milestone.projectName || '-'}</div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {formatDate(milestone.startDate)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {formatDate(milestone.endDate)}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {milestone.tasks && milestone.tasks.length > 0
                                ? formatDate(milestone.tasks[0].actualStartDate)
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {milestone.tasks && milestone.tasks.length > 0
                                ? formatDate(milestone.tasks[0].actualEndDate)
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {milestone.tasks && milestone.tasks.length > 0
                                ? (() => {
                                  const task = milestone.tasks[0];
                                  // Priority: Show Actual End if it exists
                                  if (task.actualEndDate) {
                                    return formatDate(task.actualEndDate);
                                  }
                                  // Otherwise, show Outlook Completion (calculated or stored)
                                  if (task.outlookCompletion) {
                                    return formatDate(task.outlookCompletion);
                                  }
                                  // If no outlook completion, calculate it if we have actual start and duration
                                  if (task.actualStartDate && task.duration) {
                                    const calculatedDate = calculateBusinessDays(task.actualStartDate, task.duration);
                                    return formatDate(calculatedDate);
                                  }
                                  return '-';
                                })()
                                : '-'
                              }
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900 text-center">
                              {total}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900 text-center">
                              {finished} / {total}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900 text-center">
                              {delayed > 0 && <span className="text-red-600 font-medium">{delayed} Delayed</span>}
                              {delayed > 0 && likelyDelayed > 0 && <span>, </span>}
                              {likelyDelayed > 0 && <span className="text-yellow-600 font-medium">{likelyDelayed} Likely Delayed</span>}
                              {delayed === 0 && likelyDelayed === 0 && '-'}
                            </div>
                          </td>
                          <th className="px-4 py-4 whitespace-nowrap flex justify-center">
                            <Popover content={<>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-sm font-medium text-blue-800 mb-2">Activity Summary</h4>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 cursor-pointer text-blue-600 hover:text-blue-800" onClick={() => hide(false, milestone)}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>

                                {/* Project and Client Info */}
                                <div className="mb-3 pb-3 border-b border-blue-200">
                                  <div className="text-sm mb-1">
                                    <span className="font-medium text-blue-700">Project: </span>
                                    <span className="text-gray-900">{milestone.projectName || '-'}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium text-blue-700">Client: </span>
                                    <span className="text-gray-900">{milestone.customer || '-'}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-blue-600 font-medium">Total Activities: </span>
                                    <span>{summeryViewData.length}</span>
                                  </div>
                                  <div>
                                    <span className="text-green-600 font-medium">Completed: </span>
                                    <span>{summeryViewData.filter(task => task.status && task.status.includes('Completed')).length}</span>
                                  </div>
                                  <div>
                                    <span className="text-yellow-600 font-medium">Likely Delayed: </span>
                                    <span>{summeryViewData.filter(task => task.status && task.status === 'Likely Delay').length}</span>
                                  </div>
                                  <div>
                                    <span className="text-red-600 font-medium">Delayed: </span>
                                    <span>{summeryViewData.filter(task => task.status && (task.status.includes('Delayed') || task.status === 'Delayed')).length}</span>
                                  </div>

                                </div>
                              </div>
                            </>}
                              placement="leftBottom"
                              trigger="click"
                              onOpenChange={() => handleOpenChange(true, milestone)}
                              open={open === milestone._id}
                              key={milestone._id}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </Popover>
                          </th>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center space-x-2">
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
            )}

            {/* Enhanced Pagination */}
            {filteredMilestones.length > 0 && (
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
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredMilestones.length)} of {filteredMilestones.length} results
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
                        // Add ellipsis for gaps in pagination
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
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Client Name</h4>
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
              <div>
                <h4 className="text-sm font-medium text-gray-500">Outlook Completion</h4>
                <p className="text-sm font-medium text-gray-900">
                  {(() => {
                    // Get tasks with actual start dates
                    const tasksWithActualStart = trackingData.filter(task => task.actualStartDate);
                    if (tasksWithActualStart.length === 0) return '-';

                    // Find earliest actual start date
                    const earliestStart = new Date(Math.min(...tasksWithActualStart.map(t => new Date(t.actualStartDate))));

                    // Calculate total duration of all tasks
                    const totalDuration = trackingData.reduce((sum, task) => {
                      return sum + (task.duration || 0);
                    }, 0);

                    if (totalDuration === 0) {
                      return formatDate(earliestStart);
                    }

                    // Calculate end date: earliest start + total duration
                    const calculatedEndDate = calculateBusinessDays(earliestStart, totalDuration);

                    return `${formatDate(earliestStart)} - ${formatDate(calculatedEndDate)}`;
                  })()}
                </p>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Activity Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Total Activities: </span>
                  <span>{trackingData.length}</span>
                </div>
                <div>
                  <span className="text-green-600 font-medium">Completed: </span>
                  <span>{trackingData.filter(task => task.status && task.status.includes('Completed')).length}</span>
                </div>
                <div>
                  <span className="text-yellow-600 font-medium">Likely Delayed: </span>
                  <span>{trackingData.filter(task => task.status && task.status === 'Likely Delay').length}</span>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Delayed: </span>
                  <span>{trackingData.filter(task => task.status && (task.status.includes('Delayed') || task.status === 'Delayed')).length}</span>
                </div>
              </div>
            </div>

            {/* Tracking Table with Fixed Header and Inside Scroll */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                        Phase
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] bg-gray-50">
                        Task
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Duration
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Plan Start
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Plan End
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                        Responsible Person
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        % Completion
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Actual Start
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-50">
                        Actual End
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-gray-50">
                        Outlook Completion
                      </th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] bg-gray-50">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trackingData.map((task, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-normal text-sm text-gray-900 min-w-[120px] text-center">
                          {task.phase || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-normal text-sm text-gray-900 min-w-[150px] text-center">
                          {task.task || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px] text-center">
                          {task.duration || 0}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px] text-center">
                          {formatDateToDDMMYYYY(task.startDate) || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px] text-center">
                          {formatDateToDDMMYYYY(task.endDate) || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-normal text-sm text-gray-900 min-w-[120px] text-center">
                          {task.responsiblePerson || '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[120px] text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px]">
                          {task.status === "Completed" ? (
                            <div className="text-center">
                              100%
                            </div>
                          ) : task.status === "On track" || task.status === "Delayed" || task.status === "Likely Delay" || task.status === "Not Started" ? (
                            <input
                              type="number"
                              max="100"
                              min="0"
                              value={task.completion}
                              onChange={(e) => handleCompletionChange(e, index)}
                              disabled={!task.actualStartDate}
                              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 text-center ${!task.actualStartDate ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                              title={!task.actualStartDate ? 'Please set Actual Start Date first' : ''}
                            />
                          ) : (
                            <div className="text-center">
                              {task.completion}%
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px]">
                          <input
                            type="date"
                            value={task.actualStartDate}
                            onChange={(e) => handleTrackingChange(index, 'actualStartDate', e.target.value)}
                            min="1900-01-01"
                            max="2100-12-31"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-center"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[100px]">
                          <input
                            type="date"
                            value={task.actualEndDate}
                            onChange={(e) => handleTrackingChange(index, 'actualEndDate', e.target.value)}
                            min="1900-01-01"
                            max="2100-12-31"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-center"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[120px]">
                          <input
                            type="date"
                            value={task.outlookCompletion}
                            onChange={(e) => handleTrackingChange(index, 'outlookCompletion', e.target.value)}
                            min="1900-01-01"
                            max="2100-12-31"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 text-center"
                            readOnly
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 min-w-[150px]">
                          <textarea
                            value={task.remark || ''}
                            onChange={(e) => handleTrackingChange(index, 'remark', e.target.value)}
                            placeholder="Enter remarks..."
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            rows="2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
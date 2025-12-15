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
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import MilestoneForm from '../components/Forms/MilestoneForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { milestonesAPI, inhouseMilestonesAPI, reportsAPI } from '../services/api';
import EmailCompose from '../components/EmailCompose/emailCompose.jsx';

const MilestoneManagement = () => {
  const [milestones, setMilestones] = useState([]);
  const [filteredMilestones, setFilteredMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [isEmailSyncing, setIsEmailSyncing] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [recentlySyncedEmails, setRecentlySyncedEmails] = useState(new Set());
  const [filters, setFilters] = useState({
    customer: '',
    projectName: '',
    emailId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [uniqueProjectNames, setUniqueProjectNames] = useState([]);
  const [uniqueEmailIds, setUniqueEmailIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingMilestoneId, setSendingMilestoneId] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMilestoneId, setPreviewMilestoneId] = useState(null);
  const [emailStatus, setEmailStatus] = useState(null); // 'sending', 'success', 'error' 
  const [emailMessage, setEmailMessage] = useState('');
  const [emailapiTrigger, setEmailapiTrigger] = useState({
    status: "default",   // "default" | "pending" | "success" | "error"
    message: "no"
  });

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const [emailCompose, setEmailCompose] = useState({ milestoneData: "", model: false });

  useEffect(() => {
    fetchMilestones();

    // Set up interval for periodic sync (every 60 seconds)
    const syncInterval = setInterval(() => {
    }, 10);

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, []);

  useEffect(() => {
    filterMilestones();
  }, [milestones, filters, searchTerm, currentPage, itemsPerPage]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      // Only fetch regular milestones (not inhouse milestones)
      const response = await milestonesAPI.getAll();
      const milestonesData = response.data.milestones || response.data;
      setMilestones(milestonesData);

      // Extract unique values for dropdowns
      const customers = [...new Set(milestonesData.map(milestone => milestone.customer))].filter(Boolean);
      const projectNames = [...new Set(milestonesData.map(milestone => milestone.projectName))].filter(Boolean);
      const emailIds = [...new Set(milestonesData.map(milestone => milestone.emailId))].filter(Boolean);

      setUniqueCustomers(customers);
      setUniqueProjectNames(projectNames);
      setUniqueEmailIds(emailIds);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      showError('Failed to fetch milestones');
    } finally {
      setLoading(false);
    }
  };

  const filterMilestones = () => {
    let filtered = milestones;

    // Apply dropdown filters
    if (filters.customer) {
      filtered = filtered.filter(milestone =>
        milestone.customer === filters.customer
      );
    }

    if (filters.projectName) {
      filtered = filtered.filter(milestone =>
        milestone.projectName === filters.projectName
      );
    }

    if (filters.emailId) {
      filtered = filtered.filter(milestone =>
        milestone.emailId === filters.emailId
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(milestone =>
        milestone.customer?.toLowerCase().includes(searchLower) ||
        milestone.projectName?.toLowerCase().includes(searchLower) ||
        milestone.emailId?.toLowerCase().includes(searchLower) ||
        milestone.phase?.toLowerCase().includes(searchLower) ||
        milestone.projectStatus?.toLowerCase().includes(searchLower) ||
        milestone.responsiblePerson?.toLowerCase().includes(searchLower) ||
        (milestone.task?.name && milestone.task.name.toLowerCase().includes(searchLower)) ||
        (milestone.tasks && milestone.tasks.some(task =>
          task.name?.toLowerCase().includes(searchLower) ||
          task.status?.toLowerCase().includes(searchLower)
        ))
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      customer: '',
      projectName: '',
      emailId: ''
    });
    setSearchTerm('');
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
        'Start Date', 'End Date', 'Responsible Person'
      ];

      const csvData = filteredMilestones.flatMap(milestone => {
        // If milestone has tasks, create a row for each task
        if (milestone.tasks && milestone.tasks.length > 0) {
          return milestone.tasks.map(task => [
            milestone.customer || '',
            milestone.projectName || '',
            milestone.emailId || '',
            task.phase || '',
            task.task || '',
            `${task.duration || 0} days`,
            milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : '',
            milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : '',
            task.responsiblePerson || ''
          ]);
        } else {
          // If no tasks, create one row with empty task data
          return [[
            milestone.customer || '',
            milestone.projectName || '',
            milestone.emailId || '',
            '',
            '',
            '0 days',
            milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : '',
            milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : '',
            '',
            milestone.projectStatus || 'not started'
          ]];
        }
      });

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

  const handlePreview = async (milestone) => {
    try {
      setPreviewLoading(true);
      setPreviewMilestoneId(milestone._id);

      // Create a hidden container div for the React component
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // Import React and ReactDOM for dynamic rendering
      const [React, ReactDOM, { default: BackgroundReportPDFGenerator }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Reports/BackgroundReportPDFGenerator.js')
      ]);

      const root = ReactDOM.createRoot(container);

      const handleComplete = (pdfBlob, generatedFilename) => {
        // Open PDF in new tab
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');

        // Clean up
        root.unmount();
        document.body.removeChild(container);
        URL.revokeObjectURL(url);

        setPreviewLoading(false);
        setPreviewMilestoneId(null);
        showSuccess('PDF preview opened in new tab');
      };

      const handleError = (error) => {
        console.error('Error generating PDF:', error);
        root.unmount();
        document.body.removeChild(container);
        setPreviewLoading(false);
        setPreviewMilestoneId(null);
        showError('Failed to generate PDF preview');
      };

      // Render the BackgroundReportPDFGenerator component
      root.render(
        React.createElement(BackgroundReportPDFGenerator, {
          reportData: [milestone],
          reportType: 'milestone',
          reportTitle: `Milestone Report - ${milestone.projectName}`,
          onComplete: handleComplete,
          onError: handleError
        })
      );
    } catch (error) {
      console.error('Error loading PDF generator:', error);
      setPreviewLoading(false);
      setPreviewMilestoneId(null);
      showError('Failed to generate PDF preview');
    }
  };

  const handleDownloadPdfForEmailCompose = async (milestone, onPdfGenerated, setPreviewLoading) => {
    try {
      setPreviewLoading(true);
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      const [React, ReactDOM, { default: BackgroundReportPDFGenerator }] = await Promise.all([
        import('react'),
        import('react-dom/client'),
        import('../components/Reports/BackgroundReportPDFGenerator.js')
      ]);

      const root = ReactDOM.createRoot(container);

      const handleComplete = (pdfBlob, generatedFilename) => {
        if (onPdfGenerated) {
          onPdfGenerated({
            file: new File([pdfBlob], generatedFilename, { type: "application/pdf" }),
            url: URL.createObjectURL(pdfBlob),
            name: generatedFilename
          });
        }

        root.unmount();
        document.body.removeChild(container);
        setPreviewLoading(false);
      };

      const handleError = (error) => {
        console.error('Error generating PDF:', error);
        root.unmount();
        document.body.removeChild(container);
        setPreviewLoading(false);
      };

      root.render(
        React.createElement(BackgroundReportPDFGenerator, {
          reportData: [milestone],
          reportType: 'milestone',
          reportTitle: `Milestone Report - ${milestone.projectName}`,
          onComplete: handleComplete,
          onError: handleError
        })
      );
    } catch (error) {
      setPreviewLoading(false);
      console.error('Error loading PDF generator for mail compose:', error);
      showError('Failed to generate PDF for mail compose');
    }
  };

  const closeModel = () => {
    setEmailCompose({ milestoneData: '', model: false })
  }

  const onSend = async (emailComposeData) => {
    try {
      setEmailapiTrigger({
        status: "pending",
        message: "Sending email..."
      });

      // Build FormData
      const formData = new FormData();

      formData.append("from", emailComposeData.from || "");
      emailComposeData.to.forEach(v => formData.append("to", v));
      emailComposeData.cc.forEach(v => formData.append("cc", v));
      emailComposeData.bcc.forEach(v => formData.append("bcc", v));
      formData.append("subject", emailComposeData.subject || "");
      formData.append("body", emailComposeData.body || "");

      // Attach files
      if (emailComposeData.attachments && emailComposeData.attachments.length > 0) {
        emailComposeData.attachments.forEach(file => {
          formData.append("attachments", file);
        });
      }

      // Call backend email API
      await reportsAPI.sendEmail(formData);

      // Success
      setEmailapiTrigger({
        status: "success",
        message: `Email successfully sent to ${emailComposeData.to}`
      });
      closeModel();

      setEmailStatus('success')
      setEmailMessage(`Email successfully sent to ${emailComposeData.to}`)
      // Clear message after delay
      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
        setEmailStatus(null)
        setEmailMessage(``)
      }, 3000);

    } catch (error) {
      setEmailapiTrigger({
        status: "error",
        message: `Failed to send email: ${error.message}`
      });

      setTimeout(() => {
        setEmailapiTrigger({
          status: "default",
          message: ""
        });
      }, 5000);

    } finally {
      setEmailapiTrigger({
        status: "default",
        message: ""
      });
    }
  };


  const handleSend = async (milestone) => {
    setEmailCompose({ milestoneData: milestone, model: true })
  };

  const handleDelete = (id) => {
    setMilestoneToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (milestoneToDelete) {
      try {
        await milestonesAPI.delete(milestoneToDelete);
        showSuccess('Milestone deleted successfully');
        fetchMilestones(); // Refresh the list
      } catch (error) {
        console.error('Error deleting milestone:', error);
        showError('Failed to delete milestone');
      } finally {
        setShowDeleteModal(false);
        setMilestoneToDelete(null);
      }
    }
  };

  const handleFormSuccess = (savedMilestone) => {
    setShowModal(false);
    setEditingMilestone(null);
    showSuccess(editingMilestone ? 'Milestone updated successfully' : 'Milestone added successfully');
    fetchMilestones(); // Refresh the list
  };

  const handleEmailChange = (milestoneId, newEmail) => {
    // Update the milestones array with the new email
    setMilestones(prevMilestones =>
      prevMilestones.map(milestone =>
        milestone._id === milestoneId
          ? { ...milestone, emailId: newEmail }
          : milestone
      )
    );

    // Update the unique email IDs if necessary
    setUniqueEmailIds(prevEmails => {
      const updatedEmails = [...new Set([...prevEmails, newEmail])].filter(Boolean);
      return updatedEmails;
    });
  };

  const formatStatus = (status) => {
    // Handle null/undefined status
    const safeStatus = status || 'not started';
    return safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
  };

  const computeMilestoneStatus = (milestone) => {
    if (!milestone.tasks || milestone.tasks.length === 0) return milestone.projectStatus || 'Not Started';
    const allCompleted = milestone.tasks.every(task => task.status === 'Completed');
    return allCompleted ? 'Completed' : 'On track';
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

      {/* Email Status Notification */}
      {emailStatus && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${emailStatus === 'sending' ? 'bg-blue-50 border-blue-200' :
          emailStatus === 'success' ? 'bg-green-50 border-green-200' :
            'bg-red-50 border-red-200'
          } border rounded-lg shadow-lg p-4 transition-all duration-300 transform translate-x-0`}>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {emailStatus === 'sending' && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              )}
              {emailStatus === 'success' && (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              )}
              {emailStatus === 'error' && (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${emailStatus === 'sending' ? 'text-blue-800' :
                emailStatus === 'success' ? 'text-green-800' :
                  'text-red-800'
                }`}>
                {emailStatus === 'sending' ? 'Sending Email...' :
                  emailStatus === 'success' ? 'Email Sent!' :
                    'Failed to Send Email'}
              </p>
              <p className={`text-sm ${emailStatus === 'sending' ? 'text-blue-700' :
                emailStatus === 'success' ? 'text-green-700' :
                  'text-red-700'
                }`}>
                {emailMessage}
              </p>
            </div>
          </div>
        </div>
      )}

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
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search Client, projects, emails, phases..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some(Boolean) || searchTerm
                    ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {(Object.values(filters).some(Boolean) || searchTerm) && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0)}
                    </span>
                  )}
                </button>

                {(Object.values(filters).some(Boolean) || searchTerm) && (
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
                  Add Milestone
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <select
                    value={filters.customer}
                    onChange={(e) => handleFilterChange('customer', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Client</option>
                    {uniqueCustomers.map(customer => (
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
                    {uniqueProjectNames.map(projectName => (
                      <option key={projectName} value={projectName}>{projectName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                  <select
                    value={filters.emailId}
                    onChange={(e) => handleFilterChange('emailId', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Emails</option>
                    {uniqueEmailIds.map(emailId => (
                      <option key={emailId} value={emailId}>{emailId}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Milestones Table */}
          <div>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handlePreview(milestone)}
                            className={`text-green-600 hover:text-green-900 p-1 transition-colors duration-150 ${previewLoading && previewMilestoneId === milestone._id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title="Preview PDF"
                            disabled={previewLoading && previewMilestoneId === milestone._id}
                          >
                            {previewLoading && previewMilestoneId === milestone._id ? (
                              <div className="h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSend(milestone)}
                            className={`text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150 ${sendingEmail && sendingMilestoneId === milestone._id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title="Send Report"
                            disabled={sendingEmail && sendingMilestoneId === milestone._id}
                          >
                            {sendingEmail && sendingMilestoneId === milestone._id ? (
                              <div className="h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <PaperAirplaneIcon className="h-5 w-5" />
                            )}
                          </button>
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
                  <div className="flex justify-between items-start mb-3">
                    {/* Text content section with improved spacing */}
                    <div className="flex-1 min-w-0 mr-3">
                      {/* Project name - removed truncate, added break-words */}
                      <h3 className="text-sm font-medium text-gray-900 break-words mb-1">
                        {milestone.projectName || 'No project name'}
                      </h3>
                      {/* Customer name - removed truncate, added break-words */}
                      <p className="text-sm text-gray-500 break-words">
                        {milestone.customer || 'No customer name'}
                      </p>
                    </div>

                    {/* Action buttons - adjusted spacing and alignment */}
                    <div className="flex flex-shrink-0 space-x-2">
                      <button
                        onClick={() => handlePreview(milestone)}
                        className={`text-green-600 hover:text-green-900 p-1 transition-colors duration-150 ${previewLoading && previewMilestoneId === milestone._id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        title="Preview PDF"
                        disabled={previewLoading && previewMilestoneId === milestone._id}
                      >
                        {previewLoading && previewMilestoneId === milestone._id ? (
                          <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSend(milestone)}
                        className={`text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150 ${sendingEmail && sendingMilestoneId === milestone._id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        title="Send Report"
                        disabled={sendingEmail && sendingMilestoneId === milestone._id}
                      >
                        {sendingEmail && sendingMilestoneId === milestone._id ? (
                          <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <PaperAirplaneIcon className="h-4 w-4" />
                        )}
                      </button>
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

                  {/* Improved responsive layout for details */}
                  <div className="space-y-2 text-xs">
                    {/* Email field - full width */}
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-500">Email:</span>
                      <span className="text-gray-900 break-all">{milestone.emailId || 'No email'}</span>
                    </div>

                    {/* Dates - side by side on mobile */}
                    <div className="flex justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-500">Start Date:</span>
                        <span className="text-gray-900">
                          {milestone.startDate ? new Date(milestone.startDate).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-500">End Date:</span>
                        <span className="text-gray-900">
                          {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : 'No date'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* No Data Available Message */}
          {filteredMilestones.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">

                <p className="text-gray-500 max-w-md mx-auto">
                  {milestones.length === 0
                    ? 'Get started by adding your first milestone.'
                    : 'No milestones match your current search or filters. Try adjusting your criteria.'
                  }
                </p>
              </div>
            </div>
          )}
          {/* Updated Pagination */}
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
          onEmailChange={handleEmailChange}
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
  size="xl"
  className="font-sans"
>
  {selectedMilestone && (
    <div className="space-y-6 py-1">
      {/* Basic Information Card - Compact One Line Layout */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client Name:</h4>
            <p className="text-sm text-gray-900 font-medium">{selectedMilestone.customer || ''}</p>
          </div>
           <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Project Name:</h4>
            <p className="text-sm text-gray-900 font-medium">{selectedMilestone.projectName || ''}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email ID</h4>
            <p className="text-sm text-gray-900 font-medium">{selectedMilestone.emailId || ''}</p>
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
          {selectedMilestone.flexibilityPercentage !== undefined && selectedMilestone.flexibilityPercentage > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Flexibility</h4>
              <p className="text-sm text-gray-900 font-medium">{selectedMilestone.flexibilityPercentage}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      {selectedMilestone.tasks && selectedMilestone.tasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-md font-semibold text-gray-700 flex items-center">
              <i className="fas fa-tasks mr-2 text-blue-500"></i>
              Project Tasks ({selectedMilestone.tasks.length})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsible Person</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedMilestone.tasks.map((task, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{task.phase || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.task || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.duration || 0} day</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{task.responsiblePerson || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {task.endDate ? new Date(task.endDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMilestoneToDelete(null);
        }}
        title="Confirm Delete"
        size="md"
      >
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Milestone</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete milestone "{milestones.find(m => m._id === milestoneToDelete)?.projectName || 'this milestone'}"? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setMilestoneToDelete(null);
              }}
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

      {emailCompose?.model && (
        <EmailCompose
          emailAddress={"support@caldimengg.in"}
          closeModel={closeModel}
          tomail={[emailCompose.milestoneData.emailId]}
          onSend={onSend}
          modelTitle={"Send Mail"}
          handlePreview={(handlePdfAttach, setPreviewLoading) => handleDownloadPdfForEmailCompose(emailCompose.milestoneData, handlePdfAttach, setPreviewLoading)}
          emailapiTrigger={emailapiTrigger}
          emailMeta={{
            title: emailCompose?.milestoneData.projectName,
            reportType: "milestone",
            data: [emailCompose?.milestoneData],
            defaultSubject: `Milestone Report - ${emailCompose?.milestoneData?.projectName}`
          }}
        />
      )}
    </div>
  );
};

export default MilestoneManagement;
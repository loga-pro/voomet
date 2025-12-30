import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon
} from "@heroicons/react/24/outline";
import ProjectForm from "../components/Forms/ProjectForm";
import Modal from "../components/Modals/Modal";
import Notification from "../components/Notifications/Notification";
import useNotification from "../hooks/useNotification";
import { projectsAPI } from "../services/api";

const ProjectMaster = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [projectHistory, setProjectHistory] = useState([]);
  const [filters, setFilters] = useState({
    customerName: "",
    stage: "",
    projectName: "",
    projectCategory: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [uniqueStages, setUniqueStages] = useState([]);
  const [uniqueProjectNames, setUniqueProjectNames] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, filters, searchTerm, currentPage, itemsPerPage]);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);

      // Extract unique values for dropdowns
      const customers = [
        ...new Set(response.data.map((project) => project.customerName)),
      ].filter(Boolean);
      const stages = [
        ...new Set(response.data.map((project) => project.stage)),
      ].filter(Boolean);
      const projectNames = [
        ...new Set(response.data.map((project) => project.projectName)),
      ].filter(Boolean);
      const categories = [
        ...new Set(response.data.map((project) => project.projectCategory)),
      ].filter(Boolean);

      setUniqueCustomers(customers);
      setUniqueStages(stages);
      setUniqueProjectNames(projectNames);
      setUniqueCategories(categories);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function specifically for Fire and safety formatting
  const formatScopeItem = (scope) => {
    if (typeof scope !== 'string') return String(scope);

    return scope
      .replace(/_/g, " ") // Replace underscores with spaces
      .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize first letter of each word
      .replace(/\b(Fire And Safety|Fire Safety|Fire)\b/gi, (match) => {
        // Special handling for Fire and safety terms
        if (match.toLowerCase() === 'fire and safety') return 'Fire and Safety';
        if (match.toLowerCase() === 'fire safety') return 'Fire safety';
        return 'Fire';
      });
  };

  // Helper function for displaying scope of work items
  const formatScopeOfWork = (scopeArray) => {
    if (!scopeArray || !Array.isArray(scopeArray)) return ["—"];

    return scopeArray.map(scope => formatScopeItem(scope));
  };

  const filterProjects = () => {
    let filtered = projects;

    // Apply dropdown filters
    if (filters.customerName) {
      filtered = filtered.filter(
        (project) => project.customerName === filters.customerName
      );
    }

    if (filters.stage) {
      filtered = filtered.filter((project) => project.stage === filters.stage);
    }

    if (filters.projectName) {
      filtered = filtered.filter(
        (project) => project.projectName === filters.projectName
      );
    }

    if (filters.projectCategory) {
      filtered = filtered.filter(
        (project) => project.projectCategory === filters.projectCategory
      );
    }

    // Apply overall search across multiple fields
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((project) => {
        // Check basic fields
        const basicMatch =
          project.projectName?.toLowerCase().includes(searchLower) ||
          project.customerName?.toLowerCase().includes(searchLower) ||
          project.stage?.toLowerCase().includes(searchLower) ||
          project.totalProjectValue?.toString().includes(searchTerm);

        // Check scope of work - format for search
        const scopeMatch = project.scopeOfWork?.some((scope) => {
          const formattedScope = formatScopeItem(scope).toLowerCase();
          return formattedScope.includes(searchLower);
        });

        return basicMatch || scopeMatch;
      });
    }

    setFilteredProjects(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      customerName: "",
      stage: "",
      projectName: "",
      projectCategory: "",
    });
    setSearchTerm("");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProjects.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    const escapeCSV = (cell) => {
      if (cell === null || cell === undefined) return '';
      const stringCell = String(cell);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
        return `"${stringCell.replace(/"/g, '""')}"`;
      }
      return stringCell;
    };

    const headers = [
      "Customer Name",
      "Project Name",
      "Enquiry Date",
      "Stage",
      "Project Value (In Rupees)",
      "Scope of Work",
    ];

    const csvData = filteredProjects.map((project) => [
      escapeCSV(project.customerName),
      escapeCSV(project.projectName),
      escapeCSV(new Date(project.enquiryDate).toLocaleDateString()),
      escapeCSV(project.stage.replace(/_/g, " ").toUpperCase()), // Fixed stage formatting
      escapeCSV(project.totalProjectValue.toFixed(2)),
      escapeCSV(formatScopeOfWork(project.scopeOfWork).join("; ")),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "projects.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleView = (project) => {
    setSelectedProject(project);
    setViewModal(true);
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowModal(true);
  };

  const handleViewHistory = async (project) => {
    try {
      const response = await projectsAPI.getHistory(project._id);

      // Filter out duplicate entries where old and new values are the same
      const filteredHistory = response.data.filter((change, index, array) => {
        if (change.field === "created") return true; // Always show creation

        // Skip if old and new values are identical
        if (JSON.stringify(change.oldValue) === JSON.stringify(change.newValue)) {
          return false;
        }

        // For dates, compare as timestamps
        if (change.field === "enquiryDate") {
          const oldDate = new Date(change.oldValue).getTime();
          const newDate = new Date(change.newValue).getTime();
          return oldDate !== newDate;
        }

        return true;
      });

      setProjectHistory(filteredHistory);
      setSelectedProject(project);
      setHistoryModal(true);
    } catch (error) {
      console.error("Error fetching project history:", error);
      showError("Error loading project history");
    }
  };

  const handleDownloadHistoryPDF = async () => {
    try {
      setPdfLoading(true);

      // Dynamically import jsPDF and html2canvas
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Create a temporary container for the PDF content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm'; // A4 width
      container.style.backgroundColor = 'white';
      container.style.padding = '20px';
      document.body.appendChild(container);

      // Build the HTML content
      const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px;">
          <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Project History Report</h1>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <!-- Horizontal Project Information Section -->
        <div style="margin-bottom: 25px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Project Information</h2>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">PROJECT NAME</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${selectedProject?.projectName || 'N/A'}</div>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">CLIENT NAME</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${selectedProject?.customerName || 'N/A'}</div>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">CURRENT STAGE</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">
                ${selectedProject?.stage?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
              </div>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">PROJECT VALUE</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">₹${selectedProject?.totalProjectValue?.toLocaleString() || '0'}</div>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <div style="font-size: 11px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">TOTAL CHANGES</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${projectHistory.length}</div>
            </div>
          </div>
        </div>

        <div>
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Change History</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">Date & Time</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">Changed By</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">Action</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">Field</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">Old Value</th>
                <th style="padding: 10px; text-align: left; font-weight: 600; color: #6b7280;">New Value</th>
              </tr>
            </thead>
            <tbody>
              ${projectHistory.map((change, index) => {
        const isCreation = change.field === 'created';
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';

        return `
                  <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px;">
                      <div style="font-weight: 500;">${new Date(change.updatedAt).toLocaleDateString()}</div>
                      <div style="font-size: 10px; color: #6b7280;">${new Date(change.updatedAt).toLocaleTimeString()}</div>
                    </td>
                    <td style="padding: 8px;">${change.updatedBy || 'System'}</td>
                    <td style="padding: 8px;">
                      <span style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; background-color: ${isCreation ? '#d1fae5' : '#fef3c7'}; color: ${isCreation ? '#065f46' : '#92400e'};">
                        ${isCreation ? 'Created' : 'Modified'}
                      </span>
                    </td>
                    <td style="padding: 8px; font-weight: 500; color: ${isCreation ? '#059669' : '#2563eb'};">
                      ${isCreation ? 'Project Creation' : formatFieldName(change.field)}
                    </td>
                    <td style="padding: 8px; color: #6b7280;">
                      ${isCreation ? '—' : formatValue(change.oldValue, change.field)}
                    </td>
                    <td style="padding: 8px; font-weight: 500; color: ${isCreation ? '#059669' : '#000'};">
                      ${isCreation ? 'Initial Setup' : formatValue(change.newValue, change.field)}
                    </td>
                  </tr>
                `;
      }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

      container.innerHTML = htmlContent;

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate canvas from HTML
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Clean up container
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      const fileName = `Project_History_${selectedProject?.projectName?.replace(/\\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      showSuccess('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const handleDelete = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await projectsAPI.delete(projectToDelete._id);
      fetchProjects();
      showSuccess(
        `Project "${projectToDelete.projectName}" deleted successfully`
      );
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      const errorMessage = error.response?.data?.message || 'Error deleting project';
      showError(errorMessage);
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingProject(null);
    fetchProjects();
    showSuccess(
      isEdit ? "Project updated successfully" : "Project added successfully"
    );
  };

  // Helper function to format field names
  const formatFieldName = (field) => {
    const fieldNames = {
      projectName: "Project Name",
      customerName: "Customer Name",
      totalProjectValue: "Total Project Value",
      enquiryDate: "Enquiry Date",
      stage: "Stage",
      scopeOfWork: "Scope of Work",
      projectType: "Project Type",
      projectCategory: "Project Category",
      created: "Project Created",
    };
    return (
      fieldNames[field] ||
      field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
    );
  };

  // Helper function to format values based on field type
  const formatValue = (value, field) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (field === "totalProjectValue") {
      return `₹${Number(value).toLocaleString()}`;
    }

    if (field === "enquiryDate") {
      // Ensure consistent date formatting
      try {
        return new Date(value).toLocaleDateString('en-GB'); // DD/MM/YYYY format
      } catch (error) {
        return String(value);
      }
    }

    if (field === "scopeOfWork" && Array.isArray(value)) {
      return formatScopeOfWork(value).join(", ");
    }

    if (field === "stage") {
      return value.replace(/_/g, " ").toUpperCase();
    }

    if (field === "projectType") {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    if (field === "projectCategory") {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  // Function to get current project state with all changes applied up to a certain point
  const getProjectStateAtChange = (changeIndex) => {
    const initialState = {
      customerName: "",
      projectName: "",
      enquiryDate: "",
      stage: "",
      totalProjectValue: 0,
      scopeOfWork: [],
      projectType: "new",
    };

    // Apply all changes up to the specified index
    const changesToApply = projectHistory.slice(0, changeIndex + 1);

    return changesToApply.reduce((state, change) => {
      if (change.field === "created") {
        // For creation, set all initial values
        return {
          ...state,
          customerName: change.newValue.customerName || "",
          projectName: change.newValue.projectName || "",
          enquiryDate: change.newValue.enquiryDate || "",
          stage: change.newValue.stage || "rfq",
          totalProjectValue: change.newValue.totalProjectValue || 0,
          scopeOfWork: change.newValue.scopeOfWork || [],
          projectType: change.newValue.projectType || "new",
        };
      } else {
        // For field updates, update specific field
        return {
          ...state,
          [change.field]: change.newValue,
        };
      }
    }, initialState);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 sm:p-4 lg:p-6 xl:p-8">
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
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search projects, Clients, stages, values..."
                  />
                  {searchTerm && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters ||
                    Object.values(filters).some(Boolean) ||
                    searchTerm
                    ? "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {(Object.values(filters).some(Boolean) || searchTerm) && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(Boolean).length +
                        (searchTerm ? 1 : 0)}
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
                  Add Project
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <select
                    value={filters.customerName}
                    onChange={(e) =>
                      handleFilterChange("customerName", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Clients </option>
                    {uniqueCustomers.map((customer) => (
                      <option key={customer} value={customer}>
                        {customer}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage
                  </label>
                  <select
                    value={filters.stage}
                    onChange={(e) =>
                      handleFilterChange("stage", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Stages</option>
                    {uniqueStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage.replace(/_/g, " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <select
                    value={filters.projectName}
                    onChange={(e) =>
                      handleFilterChange("projectName", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Projects</option>
                    {uniqueProjectNames.map((projectName) => (
                      <option key={projectName} value={projectName}>
                        {projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Category
                  </label>
                  <select
                    value={filters.projectCategory}
                    onChange={(e) =>
                      handleFilterChange("projectCategory", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Projects Table */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Project Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Client Name
                      </th>

                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Enquiry Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Stage
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Project Value (₹)
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((project) => (
                        <tr
                          key={project._id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {project.projectName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {project?.customerName}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(
                                project.enquiryDate
                              ).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {project.stage.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ₹
                              {project.totalProjectValue
                                .toFixed(2)
                                .toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(project)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(project)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleViewHistory(project)}
                                className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150 group relative"
                                title="View History"
                              >
                                <ClockIcon className="h-5 w-5" />
                                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                                  View History
                                </span>
                              </button>
                              <button
                                onClick={() => handleDelete(project)}
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
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          {searchTerm.trim() ||
                            Object.values(filters).some((val) => val !== "")
                            ? "No projects found matching your search criteria."
                            : 'No projects found. Click "Add Project" to create your first project.'}
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
                currentItems.map((project) => (
                  <div
                    key={project._id}
                    className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {project.projectName}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {project.customerName}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(project)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(project)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(project)}
                          className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150 group relative"
                          title="View History"
                        >
                          <ClockIcon className="h-4 w-4" />
                          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            View History
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(project)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Stage:</span>{" "}
                        {project.stage.replace(/_/g, " ")}
                      </div>
                      <div>
                        <span className="font-medium">Value:</span> ₹
                        {project.totalProjectValue.toLocaleString()}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Date:</span>{" "}
                        {new Date(project.enquiryDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm.trim() ||
                    Object.values(filters).some((val) => val !== "")
                    ? "No projects found matching your search criteria."
                    : 'No projects found. Click "Add Project" to create your first project.'}
                </div>
              )}
            </div>
          </div>

          {/* Updated Pagination */}
          {filteredProjects.length > 0 && (
            <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <span className="text-sm text-gray-700 mr-2">
                  Items per page:
                </span>
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
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, filteredProjects.length)} of{" "}
                  {filteredProjects.length} results
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
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => {
                      // Add ellipsis for gaps in pagination
                      const showEllipsis =
                        index > 0 && page - array[index - 1] > 1;
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
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                              }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() =>
                      paginate(Math.min(totalPages, currentPage + 1))
                    }
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
          setEditingProject(null);
        }}
        title={editingProject ? "Edit Project" : "Add Project"}
        size="lg"
      >
        <ProjectForm
          project={editingProject}
          onSubmit={() => handleFormSubmit(!!editingProject)}
          onCancel={() => {
            setShowModal(false);
            setEditingProject(null);
          }}
          existingProjects={projects}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedProject(null);
        }}
        title="Project Details"
        size="lg"
        className="font-sans"
      >
        {selectedProject && (
          <div className="flex flex-col max-h-[100vh]">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 text-sm">

                {/* Project Information */}
                <div className="bg-white border rounded p-3 md:col-span-2">
                  <div className="flex items-center mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-indigo-600 mr-2" />
                    <h3 className="font-semibold">Project Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs text-gray-500">Project Name</span>
                      <p className="font-medium">{selectedProject.projectName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Client Name</span>
                      <p>{selectedProject?.customerName || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Project Type</span>
                      <p>
                        {selectedProject.projectType?.charAt(0).toUpperCase() +
                          selectedProject.projectType?.slice(1) || "New"}
                      </p>
                    </div>
                     <div>
                      <span className="text-xs text-gray-500">Enquiry Date</span>
                      <p>{new Date(selectedProject.enquiryDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                    <span className="text-xs text-gray-500">Scope of Work</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProject.scopeOfWork && selectedProject.scopeOfWork.length > 0 ? (
                        formatScopeOfWork(selectedProject.scopeOfWork).map((scope, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {scope}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No scope of work defined</span>
                      )}
                    </div>
                  </div>
                    <div>
                      <span className="text-xs text-gray-500">Stage</span>
                      <p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {selectedProject.stage.replace(/_/g, " ")}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white border rounded p-3 md:col-span-2">
                  <div className="flex items-center mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-green-600 mr-2" />
                    <h3 className="font-semibold">Financial Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-gray-500">Project Value</span>
                      <p className="font-medium">₹{selectedProject.totalProjectValue.toLocaleString()}</p>
                    </div>
                    {selectedProject.projectBudget && (
                      <div>
                        <span className="text-xs text-gray-500">Project Budget</span>
                        <p>₹{selectedProject.projectBudget.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setViewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewModal(false);
                  setEditingProject(selectedProject);
                  setShowModal(true);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Edit Project
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={historyModal}
        onClose={() => {
          setHistoryModal(false);
          setProjectHistory([]);
          setSelectedProject(null);
        }}
        title="Project History"
        size="full"
      >
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Complete Change History - {selectedProject?.projectName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Client Name: {selectedProject?.customerName} | Current Stage:{" "}
                    <span className="font-medium">
                      {selectedProject?.stage.replace(/_/g, " ").toUpperCase()}
                    </span>{" "}
                    | Project Value:{" "}
                    <span className="font-medium">
                      ₹{selectedProject?.totalProjectValue?.toLocaleString()}
                    </span>
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleDownloadHistoryPDF}
                    disabled={pdfLoading || projectHistory.length === 0}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    {pdfLoading ? 'Generating...' : 'Download PDF'}
                  </button>
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">
                      {projectHistory.length}{" "}
                      {projectHistory.length === 1 ? "change" : "changes"} recorded
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {projectHistory.length > 0 ? (
              <div className="overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Changed By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Old Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Value
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {projectHistory.map((change, index) => {
                        const isCreation = change.field === "created";
                        const changedField = change.field;

                        // Skip rows where old and new values are the same (except for creation)
                        if (!isCreation && JSON.stringify(change.oldValue) === JSON.stringify(change.newValue)) {
                          return null;
                        }

                        return (
                          <tr
                            key={index}
                            className={`hover:bg-gray-50 transition-colors duration-150 ${isCreation ? "bg-green-50" : "bg-white"
                              }`}
                          >
                            {/* DATE & TIME */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-medium">
                                {new Date(change.updatedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(change.updatedAt).toLocaleTimeString()}
                              </div>
                            </td>

                            {/* CHANGED BY */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-medium">
                                {change.updatedBy || "System"}
                              </div>
                            </td>

                            {/* ACTION */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isCreation ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Created
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Modified
                                </span>
                              )}
                            </td>

                            {/* FIELD NAME */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isCreation ? (
                                <div className="text-sm font-semibold text-green-700">
                                  Project Creation
                                </div>
                              ) : (
                                <div className="text-sm font-semibold text-blue-700">
                                  {formatFieldName(changedField)}
                                </div>
                              )}
                            </td>

                            {/* OLD VALUE */}
                            <td className="px-6 py-4">
                              {isCreation ? (
                                <div className="text-sm text-gray-500 italic">
                                  —
                                </div>
                              ) : (
                                <div className="text-sm text-gray-700">
                                  {formatValue(change.oldValue, changedField)}
                                </div>
                              )}
                            </td>

                            {/* NEW VALUE */}
                            <td className="px-6 py-4">
                              {isCreation ? (
                                <div className="space-y-1">
                                  {(() => {
                                    let newValueObj = change.newValue;
                                    if (typeof newValueObj === 'string') {
                                      try {
                                        newValueObj = JSON.parse(newValueObj);
                                      } catch (e) {
                                        return <div className="text-sm text-gray-900">{newValueObj}</div>;
                                      }
                                    }

                                    if (typeof newValueObj === 'object' && newValueObj !== null) {
                                      return Object.entries(newValueObj).map(([key, value]) => (
                                        <div key={key} className="text-sm">
                                          <span className="font-medium text-green-700">
                                            {formatFieldName(key)}:
                                          </span>{" "}
                                          <span className="text-gray-900">
                                            {formatValue(value, key)}
                                          </span>
                                        </div>
                                      ));
                                    }

                                    return <div className="text-sm text-gray-900">{String(newValueObj)}</div>;
                                  })()}
                                </div>
                              ) : (
                                <div className={`text-sm font-medium ${change.oldValue !== change.newValue ? 'text-green-600' : 'text-gray-900'
                                  }`}>
                                  {formatValue(change.newValue, changedField)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  No history available for this project.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Changes will appear here once the project is modified.
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete "
            {projectToDelete?.projectName || "this project"}?" This action
            cannot be undone.
          </p>
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

export default ProjectMaster;
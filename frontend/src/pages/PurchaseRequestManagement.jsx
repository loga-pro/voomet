import React, { useState, useEffect } from "react";
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
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import Modal from "../components/Modals/Modal";
import Notification from "../components/Notifications/Notification";
import useNotification from "../hooks/useNotification";
import PurchaseRequestForm from "../components/Forms/PurchaseRequestForm";
import { customersAPI, projectsAPI, purchaseRequestsAPI } from "../services/api";

const PurchaseRequestManagement = () => {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [filters, setFilters] = useState({
    searchQuery: "",
    customerName: "",
    projectName: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);

  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  useEffect(() => {
    fetchPurchaseRequests();
    fetchCustomers();
    fetchProjects();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [purchaseRequests, filters, currentPage, itemsPerPage]);

  const fetchPurchaseRequests = async () => {
  try {
    setLoading(true);
    const response = await purchaseRequestsAPI.getAll();
    const requests = response.data || response;
    
    // Ensure items is an array
    if (!Array.isArray(requests)) {
      console.error('Expected array but got:', requests);
      setPurchaseRequests([]);
      setFilteredRequests([]);
      return;
    }
    
    setPurchaseRequests(requests);
    setFilteredRequests(requests);

    // Extract unique values for filters
    const uniqueCustomers = [...new Set(requests.map((req) => req.customerName))].filter(Boolean);
    setUniqueCustomers(uniqueCustomers);

    const uniqueProjects = [...new Set(requests.map((req) => req.projectName))].filter(Boolean);
    setUniqueProjects(uniqueProjects);
    
  } catch (error) {
    console.error("Error fetching purchase requests:", error);
    showError("Failed to fetch purchase requests");
    setPurchaseRequests([]);
    setFilteredRequests([]);
  } finally {
    setLoading(false);
  }
};

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      const customers = response.data || response;
      setCustomers(customers);
      setUniqueCustomers([...new Set(customers.map(c => c.customerName))].filter(Boolean));
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      const projects = response.data || response;
      setProjects(projects);
      setUniqueProjects([...new Set(projects.map(p => p.projectName))].filter(Boolean));
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const filterRequests = () => {
    let filtered = [...purchaseRequests];

    // Universal search across all fields
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((req) => {
        // Search in basic fields
        const matchesBasicFields = 
          req.customerName?.toLowerCase().includes(query) ||
          req.projectName?.toLowerCase().includes(query) ||
          req.overallProduction?.toLowerCase().includes(query) ||
          req.status?.toLowerCase().includes(query);
        
        // Search in items (part names, descriptions, etc.)
        const matchesItems = req.items?.some(item => 
          item.partName?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.unit?.toLowerCase().includes(query)
        );
        
        return matchesBasicFields || matchesItems;
      });
    }

    if (filters.customerName) {
      filtered = filtered.filter((req) =>
        req.customerName?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    if (filters.projectName) {
      filtered = filtered.filter((req) =>
        req.projectName?.toLowerCase().includes(filters.projectName.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter((req) =>
        req.status === filters.status
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter((req) =>
        new Date(req.startDate) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter((req) =>
        new Date(req.endDate) <= new Date(filters.endDate)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      customerName: "",
      projectName: "",
      status: "",
      startDate: "",
      endDate: "",
    });
  };

  // Calculate status color
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return { bgColor: "bg-yellow-100", textColor: "text-yellow-800", label: "Pending" };
      case "approved":
        return { bgColor: "bg-green-100", textColor: "text-green-800", label: "Approved" };
      case "rejected":
        return { bgColor: "bg-red-100", textColor: "text-red-800", label: "Rejected" };
      case "completed":
        return { bgColor: "bg-blue-100", textColor: "text-blue-800", label: "Completed" };
      default:
        return { bgColor: "bg-gray-100", textColor: "text-gray-800", label: "Unknown" };
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        "Customer Name",
        "Project Name",
        "Start Date",
        "End Date",
        "Scope of Work",
        "Part Name",
        "Quantity Required",
        "Purpose",
        "Unit Type",
        "Estimated Cost",
        "Status",
        "Remarks",
        "Created At"
      ];

      const csvData = [];
      filteredRequests.forEach((request) => {
        if (request.items && request.items.length > 0) {
          request.items.forEach((item) => {
            csvData.push([
              request.customerName,
              request.projectName,
              request.startDate ? new Date(request.startDate).toLocaleDateString() : "",
              request.endDate ? new Date(request.endDate).toLocaleDateString() : "",
              item.scopeOfWork || "",
              item.partName || "",
              item.quantityRequired || 0,
              item.purpose || "",
              item.unitType || "",
              item.estimatedCost || 0,
              request.status,
              request.remarks || "",
              request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""
            ]);
          });
        } else {
          csvData.push([
            request.customerName,
            request.projectName,
            request.startDate ? new Date(request.startDate).toLocaleDateString() : "",
            request.endDate ? new Date(request.endDate).toLocaleDateString() : "",
            "",
            "",
            0,
            "",
            "",
            0,
            request.status,
            request.remarks || "",
            request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""
          ]);
        }
      });

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) => row.map((field) => `"${field}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `purchase_requests_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Purchase requests exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      showError("Failed to export purchase requests");
    }
  };

  // View request details
  const handleView = (request) => {
    setSelectedRequest(request);
    setViewModal(true);
  };

  // Edit request
  const handleEdit = (request) => {
    setEditingRequest(request);
    setShowModal(true);
  };

  // Delete request
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);

  const handleDelete = (request) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await purchaseRequestsAPI.delete(requestToDelete._id);
      showSuccess("Purchase request deleted successfully");
      fetchPurchaseRequests();
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } catch (error) {
      console.error("Error deleting purchase request:", error);
      const errorMessage = error.response?.data?.message || "Failed to delete purchase request";
      showError(errorMessage);
      setShowDeleteModal(false);
      setRequestToDelete(null);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (isEdit = false) => {
    setShowModal(false);
    setEditingRequest(null);
    showSuccess(
      isEdit
        ? "Purchase request updated successfully"
        : "Purchase request added successfully"
    );
    setTimeout(() => {
      fetchPurchaseRequests();
    }, 500);
  };

  // Calculate totals for a request
  const calculateRequestTotals = (request) => {
    if (!request?.items) return { totalItems: 0, totalQuantity: 0 };
    
    const totalItems = request.items.length;
    const totalQuantity = request.items.reduce((sum, item) => sum + (item.quantityRequired || 0), 0);
    
    return { totalItems, totalQuantity };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 overflow-x-hidden">
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      <div className="w-full max-w-full">
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
                    value={filters.searchQuery}
                    onChange={(e) =>
                      handleFilterChange("searchQuery", e.target.value)
                    }
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by project, Client, part name..."
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean)
                      ? "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
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
                  Add Purchase Request
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <option value="">All Client</option>
                    {uniqueCustomers.map((customer) => (
                      <option key={customer} value={customer}>
                        {customer}
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
                    {uniqueProjects.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange("startDate", e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange("endDate", e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1 px-2"
                      placeholder="End Date"
                    />
                  </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Production Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((request) => {
                    const statusColor = getStatusColor(request.status);
                    const totals = calculateRequestTotals(request);
                    
                    return (
                      <tr
                        key={request._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        {/* Customer Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {request.customerName || "N/A"}
                            </div>
                          </div>
                        </td>

                        {/* Project Name */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {request.projectName || "N/A"}
                          </div>
                        </td>

                        {/* Production Period */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                              {request.startDate ? new Date(request.startDate).toLocaleDateString() : "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              to {request.endDate ? new Date(request.endDate).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </td>


                        {/* Items Count */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {totals.totalItems} items
                          </div>
                          <div className="text-xs text-gray-500">
                            {totals.totalQuantity} total quantity
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bgColor} ${statusColor.textColor}`}>
                            {statusColor.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(request)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(request)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(request)}
                              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              {currentItems.map((request) => {
                const statusColor = getStatusColor(request.status);
                const totals = calculateRequestTotals(request);
                
                return (
                  <div
                    key={request._id}
                    className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {request.projectName || "N/A"}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {request.customerName}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(request)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(request)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(request)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Start Date</div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.startDate ? new Date(request.startDate).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">End Date</div>
                        <div className="text-sm font-medium text-gray-900">
                          {request.endDate ? new Date(request.endDate).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Items</div>
                        <div className="text-sm font-medium text-gray-900">
                          {totals.totalItems}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Total Qty</div>
                        <div className="text-sm font-medium text-gray-900">
                          {totals.totalQuantity}
                        </div>
                      </div>
                    </div>

                    {/* Status and Production */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bgColor} ${statusColor.textColor}`}>
                          {statusColor.label}
                        </span>
                        <span className="ml-2 text-xs text-gray-600">
                          {request.overallProduction}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {filteredRequests.length > 0 && (
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
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, filteredRequests.length)} of{" "}
                  {filteredRequests.length} results
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
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
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

          {/* Empty State */}
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No purchase requests found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {purchaseRequests.length === 0
                  ? "Get started by adding your first purchase request."
                  : "No requests match your current filters."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingRequest(null);
        }}
        title={editingRequest ? "Edit Purchase Request" : "Add Purchase Request"}
        size="xl"
      >
        <PurchaseRequestForm
          purchaseRequest={editingRequest}
          customers={customers}
          projects={projects}
          onSubmit={() => handleFormSubmit(!!editingRequest)}
          onCancel={() => {
            setShowModal(false);
            setEditingRequest(null);
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      </Modal>

      {/* View Modal */}
      <Modal
  isOpen={viewModal}
  onClose={() => {
    setViewModal(false);
    setSelectedRequest(null);
  }}
  title="Purchase Request Details"
  size="xl"
>
  {selectedRequest && (
    <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedRequest.projectName || "Project"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {selectedRequest.customerName}
                  </span>
                  {(() => {
                    const statusColor = getStatusColor(selectedRequest.status);
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bgColor} ${statusColor.textColor}`}>
                        {statusColor.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <p className="text-sm text-gray-500">Production Period</p>
              <p className="text-sm font-semibold text-blue-600">
                {selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString() : "N/A"} - 
                {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
              Customer & Project Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Client Name:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedRequest.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Project Name:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedRequest.projectName}
                </span>
              </div>
              
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-orange-500" />
              Timeline Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Start Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedRequest.startDate ? new Date(selectedRequest.startDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">End Date:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedRequest.endDate ? new Date(selectedRequest.endDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created At:</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-green-500" />
            Requested Items ({selectedRequest.items?.length || 0})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope of Work
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity Required
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedRequest.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                      {item.scopeOfWork}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.partName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.quantityRequired}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        {selectedRequest.remarks && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Remarks
            </h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
              {selectedRequest.remarks}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-2">
          <button
            onClick={() => setViewModal(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Close
          </button>
          <button
            onClick={() => {
              setViewModal(false);
              handleEdit(selectedRequest);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Request
          </button>
        </div>
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
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Delete Purchase Request
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this purchase request? This action
                cannot be undone.
              </p>
            </div>
          </div>

          {requestToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">
                    Client Name:
                  </span>
                  <p className="text-gray-900">
                    {requestToDelete.customerName}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Project Name:</span>
                  <p className="text-gray-900">
                    {requestToDelete.projectName}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Total Items:
                  </span>
                  <p className="text-gray-900">
                    {requestToDelete.items?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">
                    Status:
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(requestToDelete.status).bgColor} ${getStatusColor(requestToDelete.status).textColor}`}>
                    {getStatusColor(requestToDelete.status).label}
                  </span>
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

export default PurchaseRequestManagement;

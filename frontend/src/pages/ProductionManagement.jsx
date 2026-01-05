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
  CalendarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CubeIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import ProductionForm from "../components/Forms/ProductionForm";
import Modal from "../components/Modals/Modal";
import Notification from "../components/Notifications/Notification";
import useNotification from "../hooks/useNotification";
import { productionAPI } from "../services/api";

const ProductionManagement = () => {
  const [productions, setProductions] = useState([]);
  const [filteredProductions, setFilteredProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [editingProduction, setEditingProduction] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: "", // Add universal search term
    customerName: "",
    projectName: "",
    partName: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueParts, setUniqueParts] = useState([]);

  const { notification, showSuccess, showError, hideNotification } =
    useNotification();

  useEffect(() => {
    fetchProductions();
  }, []);

  useEffect(() => {
    filterItems();
  }, [productions, filters, currentPage, itemsPerPage]);

  const fetchProductions = async () => {
    try {
      setLoading(true);
      const response = await productionAPI.getAll();

      // Handle paginated response structure: { success, count, total, totalPages, currentPage, data }
      let data = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response)) {
        data = response;
      } else {
        console.error('Expected array but got:', response);
        setProductions([]);
        setFilteredProductions([]);
        return;
      }

      // Process data
      const processedData = data.map((item) => ({
        ...item,
        customerName: item.customerName || "",
        projectName: item.projectName || "",
        startDate: item.startDate || "",
        endDate: item.endDate || "",
        productionDetails: item.productionDetails || [],
        status: item.status || "active",
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      setProductions(processedData);

      // Extract unique values for filters
      const customers = [...new Set(processedData.map((item) => item.customerName))].filter(Boolean);
      setUniqueCustomers(customers);

      const projects = [...new Set(processedData.map((item) => item.projectName))].filter(Boolean);
      setUniqueProjects(projects);

      // Extract unique part names from production details
      const allParts = processedData.flatMap(item =>
        item.productionDetails.map(detail => detail.partName)
      ).filter(Boolean);
      const parts = [...new Set(allParts)];
      setUniqueParts(parts);

    } catch (error) {
      console.error("Error fetching productions:", error);
      showError("Failed to fetch production data");
      setProductions([]);
      setFilteredProductions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...productions];

    // Universal search across multiple fields
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        // Search in main fields
        const matchesMainFields =
          (item.customerName?.toLowerCase().includes(searchTerm)) ||
          (item.projectName?.toLowerCase().includes(searchTerm)) ||
          (item.status?.toLowerCase().includes(searchTerm));

        // Search in production details (part names)
        const matchesParts = item.productionDetails.some(detail =>
          detail.partName?.toLowerCase().includes(searchTerm)
        );

        // Search in production details other fields
        const matchesDetailFields = item.productionDetails.some(detail =>
          detail.reasonForDelay?.toLowerCase().includes(searchTerm) ||
          detail.remarks?.toLowerCase().includes(searchTerm)
        );

        // Search in date fields
        const searchDate = new Date(searchTerm);
        if (!isNaN(searchDate)) {
          const dateString = searchDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const matchesDate =
            item.overallProduction.startDate?.includes(dateString) ||
            item.overallProduction.endDate?.includes(dateString);

          if (matchesDate) return true;
        }

        return matchesMainFields || matchesParts || matchesDetailFields;
      });
    }

    // Filter by customer
    if (filters.customerName) {
      filtered = filtered.filter((item) =>
        item.customerName?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    // Filter by project
    if (filters.projectName) {
      filtered = filtered.filter((item) =>
        item.projectName?.toLowerCase().includes(filters.projectName.toLowerCase())
      );
    }

    // Filter by part name (search in production details)
    if (filters.partName) {
      filtered = filtered.filter((item) =>
        item.productionDetails.some(detail =>
          detail.partName?.toLowerCase().includes(filters.partName.toLowerCase())
        )
      );
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter((item) => {
        const startDate = new Date(item.overallProduction.startDate);
        const filterDateFrom = new Date(filters.dateFrom);
        return startDate >= filterDateFrom;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter((item) => {
        const endDate = new Date(item.overallProduction.endDate);
        const filterDateTo = new Date(filters.dateTo);
        return endDate <= filterDateTo;
      });
    }

    setFilteredProductions(filtered);
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
      searchTerm: "",
      customerName: "",
      projectName: "",
      partName: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const totalProductions = productions.length;

    // Calculate total planned and actual production
    let totalPlanned = 0;
    let totalActual = 0;

    productions.forEach(production => {
      production.productionDetails.forEach(detail => {
        totalPlanned += parseFloat(detail.productionQuantityPlan) || 0;
        totalActual += parseFloat(detail.actualProduction) || 0;
      });
    });

    const totalGap = totalPlanned - totalActual;
    const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

    return {
      totalProductions,
      totalPlanned,
      totalActual,
      totalGap,
      efficiency
    };
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProductions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProductions.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        "Customer Name",
        "Project Name",
        "Production Start Date",
        "Production End Date",
        "Item Name",
        "Planned Quantity",
        "Actual Quantity",
        "Gap",
        "Reason for Delay",
        "Remarks",
        "Status"
      ];

      const csvData = [];
      filteredProductions.forEach((production) => {
        if (production.productionDetails.length > 0) {
          production.productionDetails.forEach((detail) => {
            csvData.push([
              production.customerName,
              production.projectName,
              production.startDate,
              production.endDate,
              detail.partName,
              detail.productionQuantityPlan,
              detail.actualProduction,
              detail.gap,
              detail.reasonForDelay || "",
              detail.remarks || "",
              production.status
            ]);
          });
        } else {
          csvData.push([
            production.customerName,
            production.projectName,
            production.startDate,
            production.endDate,
            "",
            "",
            "",
            "",
            "",
            "",
            production.status,
            new Date(production.createdAt).toLocaleDateString()
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
        `production_report_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Production data exported successfully");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      showError("Failed to export production data");
    }
  };

  // View production details
  const handleView = (production) => {
    setSelectedProduction(production);
    setViewModal(true);
  };

  // Edit production
  const handleEdit = (production) => {
    setEditingProduction(production);
    setShowModal(true);
  };

  // Delete production
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productionToDelete, setProductionToDelete] = useState(null);

  const handleDelete = (production) => {
    setProductionToDelete(production);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await productionAPI.delete(productionToDelete._id);
      showSuccess("Production record deleted successfully");
      fetchProductions();
      setShowDeleteModal(false);
      setProductionToDelete(null);
    } catch (error) {
      console.error("Error deleting production record:", error);
      showError("Failed to delete production record");
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      if (editingProduction) {
        await productionAPI.update(editingProduction._id, formData);
        showSuccess("Production record updated successfully");
      } else {
        await productionAPI.create(formData);
        showSuccess("Production record added successfully");
      }
      setShowModal(false);
      setEditingProduction(null);
      fetchProductions();
    } catch (error) {
      console.error("Error saving production:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);

      let errorMessage = "Failed to save production record";

      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Handle express-validator errors
        errorMessage = error.response.data.errors.map(err => err.msg || err).join(', ');
      } else if (error.response?.data?.message) {
        // Handle standard message
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpis = calculateKPIs();

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
                    value={filters.searchTerm}
                    onChange={(e) =>
                      handleFilterChange("searchTerm", e.target.value)
                    }
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search client, project, part, status..."
                  />
                  {filters.searchTerm && (
                    <button
                      onClick={() => handleFilterChange("searchTerm", "")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${showFilters || Object.values(filters).some((value, key) => key !== 'searchTerm' && Boolean(value))
                    ? "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100"
                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).filter((value, index) =>
                    Object.keys(filters)[index] !== 'searchTerm' && Boolean(value)
                  ).length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                        {Object.values(filters).filter((value, index) =>
                          Object.keys(filters)[index] !== 'searchTerm' && Boolean(value)
                        ).length}
                      </span>
                    )}
                </button>

                {Object.values(filters).some(Boolean) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    Clear All
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
                  Add Production
                </button>
              </div>
            </div>

            {/* Search help text */}
            {filters.searchTerm && (
              <div className="mt-2 text-xs text-gray-500">
                Searching in: Client, Project, Item Name, Status, Remarks, Dates
              </div>
            )}
          </div>

          {/* Enhanced Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    Item Name
                  </label>
                  <select
                    value={filters.partName}
                    onChange={(e) =>
                      handleFilterChange("partName", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Parts</option>
                    {uniqueParts.map((part) => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      handleFilterChange("dateTo", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  />
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Production Period
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Parts
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Planned
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Actual
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => {
                    // Calculate totals for this production
                    const totals = item.productionDetails.reduce((acc, detail) => {
                      acc.planned += parseFloat(detail.productionQuantityPlan) || 0;
                      acc.actual += parseFloat(detail.actualProduction) || 0;
                      return acc;
                    }, { planned: 0, actual: 0 });

                    const gap = totals.planned - totals.actual;

                    return (
                      <tr
                        key={item._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        {/* Customer Name */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {item.customerName || "-"}
                          </div>
                        </td>

                        {/* Project Name */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {item.projectName || "-"}
                          </div>
                        </td>

                        {/* Production Period */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center justify-center">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {item.startDate ?
                                new Date(item.startDate).toLocaleDateString() : "-"}
                            </div>
                            <div className="flex items-center justify-center text-xs text-gray-500">
                              to {item.endDate ?
                                new Date(item.endDate).toLocaleDateString() : "-"}
                            </div>
                          </div>
                        </td>

                        {/* Total Parts */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {item.productionDetails.length}
                          </div>
                        </td>

                        {/* Total Planned */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {totals.planned.toLocaleString()}
                          </div>
                        </td>

                        {/* Total Actual */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {totals.actual.toLocaleString()}
                          </div>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${gap > 0 ? 'bg-red-100 text-red-800' : gap < 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {gap > 0 ? 'Shortage' : gap < 0 ? 'Excess' : 'Balanced'}: {Math.abs(gap).toLocaleString()}
                          </div>
                        </td>



                        {/* Actions */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleView(item)}
                              className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-150"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
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
              {currentItems.map((item) => {
                const totals = item.productionDetails.reduce((acc, detail) => {
                  acc.planned += parseFloat(detail.productionQuantityPlan) || 0;
                  acc.actual += parseFloat(detail.actualProduction) || 0;
                  return acc;
                }, { planned: 0, actual: 0 });

                const gap = totals.planned - totals.actual;

                return (
                  <div
                    key={item._id}
                    className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {item.projectName || ""}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {item.customerName}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleView(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Production Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Production Period</div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.startDate ?
                            new Date(item.startDate).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Total Parts</div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.productionDetails.length}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Planned</div>
                        <div className="text-sm font-medium text-gray-900">
                          {totals.planned.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                        <div className="text-xs text-gray-500">Actual</div>
                        <div className="text-sm font-medium text-gray-900">
                          {totals.actual.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Status and Gap */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || 'Active'}
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${gap > 0 ? 'bg-red-100 text-red-800' : gap < 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                          {gap > 0 ? 'Shortage' : gap < 0 ? 'Excess' : 'Balanced'}: {Math.abs(gap).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {filteredProductions.length > 0 && (
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
                  {Math.min(indexOfLastItem, filteredProductions.length)} of{" "}
                  {filteredProductions.length} results
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

          {/* Empty State */}
          {filteredProductions.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No production records found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {productions.length === 0
                  ? "Get started by adding your first production record."
                  : "No records match your current filters."}
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
          setEditingProduction(null);
        }}
        title={editingProduction ? "Edit Production Record" : "Add Production Record"}
        size="xl"
      >
        <ProductionForm
          production={editingProduction}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingProduction(null);
          }}
          showSuccess={showSuccess}
          showError={showError}
        />
      </Modal>

      {/* View Production Details Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => {
          setViewModal(false);
          setSelectedProduction(null);
        }}
        title="Production Details"
        size="xl"
      >
        {selectedProduction && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedProduction.projectName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedProduction.customerName}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Production Period
                  </label>
                  <div className="flex items-center text-sm text-gray-900">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                    {selectedProduction.startDate ?
                      new Date(selectedProduction.startDate).toLocaleDateString() : "N/A"}
                    {" → "}
                    {selectedProduction.endDate ?
                      new Date(selectedProduction.endDate).toLocaleDateString() : "N/A"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created Date
                  </label>
                  <div className="text-sm text-gray-900">
                    {new Date(selectedProduction.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Production Details Table */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Production Parts</h4>
              {selectedProduction.productionDetails.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Planned Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actual Qty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gap
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason for Delay
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedProduction.productionDetails.map((detail, index) => {
                        const gap = (parseFloat(detail.productionQuantityPlan) || 0) -
                          (parseFloat(detail.actualProduction) || 0);

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {detail.partName || ""}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {detail.productionQuantityPlan?.toLocaleString() || "0"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {detail.actualProduction?.toLocaleString() || "0"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gap > 0 ? 'bg-red-100 text-red-800' : gap < 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {gap > 0 ? 'Shortage: ' : gap < 0 ? 'Excess: ' : 'Balanced: '}{Math.abs(gap).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {detail.reasonForDelay || ""}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {detail.remarks || ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No parts added</h3>
                  <p className="mt-1 text-sm text-gray-500">No production details available for this record.</p>
                </div>
              )}
            </div>

            {/* Summary Statistics */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedProduction.productionDetails.length}
                  </div>
                  <div className="text-sm text-gray-500">Total Parts</div>
                </div>

                {(() => {
                  const totals = selectedProduction.productionDetails.reduce((acc, detail) => {
                    acc.planned += parseFloat(detail.productionQuantityPlan) || 0;
                    acc.actual += parseFloat(detail.actualProduction) || 0;
                    return acc;
                  }, { planned: 0, actual: 0 });

                  const gap = totals.planned - totals.actual;
                  const efficiency = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

                  return (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {totals.planned.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Total Planned</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {totals.actual.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">Total Actual</div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {efficiency.toFixed(1)}%
                        </div>
                        <div className={`text-sm ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          Efficiency ({gap > 0 ? 'Shortage' : gap < 0 ? 'Excess' : 'Balanced'}: {Math.abs(gap).toLocaleString()})
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
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
                  // Assuming you have a handleEdit function
                  handleEdit(selectedProduction);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Production
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
          setProductionToDelete(null);
        }}
        title="Delete Production Record"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this production record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setProductionToDelete(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionManagement;
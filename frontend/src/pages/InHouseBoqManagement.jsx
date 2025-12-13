import React, { useState, useEffect } from "react";
import {
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
  DocumentTextIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  ListBulletIcon,
  TagIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  DocumentDuplicateIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import Modal from "../components/Modals/Modal";
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { boqAPI, projectsAPI } from "../services/api";
import AdvancedBOQPDFGenerator from "../components/BOQ/AdvancedBOQPDFGenerator";

const InHouseBoqManagement = () => {
  const [showAdvancedPDF, setShowAdvancedPDF] = useState(false);
  const [pdfBOQData, setPdfBOQData] = useState(null);
  const [boqItems, setBoqItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    customer: "",
    projectName: "",
    scopeOfWork: "",
    itemDescription: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueProjectNames, setUniqueProjectNames] = useState([]);
  const [uniqueProjectNamesList, setUniqueProjectNamesList] = useState([]);
  const [uniqueScopeOfWork, setUniqueScopeOfWork] = useState([]);
  const [uniqueItemDescriptions, setUniqueItemDescriptions] = useState([]);
  const [allProjects, setAllProjects] = useState([]); // Store all projects to check stages
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(null);
  const { notification, showSuccess, showError, hideNotification } =
    useNotification();
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Function to format scope of work text
  const formatScopeOfWork = (scope) => {
    if (!scope) return "";
    let formatted = scope.replace(/[_-]/g, " ");
    formatted = formatted.replace(/\b\w/g, (char) => char.toUpperCase());
    return formatted;
  };

  useEffect(() => {
    fetchBOQItems();
    fetchAllProjects(); // Fetch projects to check stages
  }, []);

  useEffect(() => {
    filterItems();
  }, [boqItems, filters, searchTerm, currentPage, itemsPerPage]);

  // Fetch all projects to check their stages
  const fetchAllProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      const projectsData = response.data || response;
      setAllProjects(projectsData || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setAllProjects([]);
    }
  };

  // Filter project names based on selected customer from saved BOQ items
  // Exclude projects in RFQ stage
  const getFilteredProjectNames = () => {
    let projectNames = uniqueProjectNamesList;
    
    // Filter by customer if selected
    if (filters.customer) {
      const filteredProjects = boqItems
        .filter(item => item.customer === filters.customer)
        .map(item => item.projectName)
        .filter(Boolean);
      projectNames = [...new Set(filteredProjects)];
    }
    
    // Filter out RFQ stage projects
    // Only show: boq, awarded, under_execution, completed, post_implementation
    const allowedStages = ['boq', 'awarded', 'under_execution', 'completed', 'post_implementation'];
    const filteredByStage = projectNames.filter(projectName => {
      const project = allProjects.find(p => p.projectName === projectName);
      return project && allowedStages.includes(project.stage);
    });
    
    return filteredByStage;
  };

  const fetchBOQItems = async () => {
    try {
      setLoading(true);
      const response = await boqAPI.getAll();
      const allItems = Array.isArray(response.data.data) ? response.data.data : [];
      
      // Filter to show only saved BOQs (those with items)
      const savedItems = allItems.filter(item => 
        item.items && Array.isArray(item.items) && item.items.length > 0
      );
      
      setBoqItems(savedItems);

      // Extract unique customers from saved items only
      const customers = [...new Set(savedItems.map((item) => item.customer))].filter(Boolean);
      setUniqueProjectNames(customers);

      // Extract unique project names from saved items only
      const projectNames = [...new Set(savedItems.map((item) => item.projectName))].filter(Boolean);
      setUniqueProjectNamesList(projectNames);

      const allScopes = savedItems
        .flatMap((item) =>
          Array.isArray(item.scopeOfWork)
            ? item.scopeOfWork
            : [item.scopeOfWork]
        )
        .filter(Boolean);
      const uniqueScopes = [...new Set(allScopes)].sort();
      setUniqueScopeOfWork(uniqueScopes);

      // Extract unique item descriptions from all saved items
      const itemDescriptions = [];
      savedItems.forEach(item => {
        if (item.items && Array.isArray(item.items)) {
          item.items.forEach(subItem => {
            if (subItem.partName) {
              itemDescriptions.push(subItem.partName);
            }
            if (subItem.itemDescription) {
              itemDescriptions.push(subItem.itemDescription);
            }
          });
        }
        // Also check main item description if exists
        if (item.itemDescription) {
          itemDescriptions.push(item.itemDescription);
        }
      });
      
      const uniqueDescriptions = [...new Set(itemDescriptions)].filter(Boolean).sort();
      setUniqueItemDescriptions(uniqueDescriptions);
    } catch (error) {
      console.error("Error fetching BOQ items:", error);
      setBoqItems([]);
      showError("Failed to fetch BOQ items");
    } finally {
      setLoading(false);
    }
  };



  const handleAdvancedPDFPreview = (item) => {
    setPdfBOQData(item);
    setShowAdvancedPDF(true);
  };

  const filterItems = () => {
    const itemsArray = Array.isArray(boqItems) ? boqItems : [];
    let filtered = itemsArray;

    if (filters.customer) {
      filtered = filtered.filter((item) => item.customer === filters.customer);
    }

    if (filters.projectName) {
      filtered = filtered.filter((item) => item.projectName === filters.projectName);
    }

    if (filters.scopeOfWork) {
      filtered = filtered.filter(
        (item) =>
          Array.isArray(item.scopeOfWork) &&
          item.scopeOfWork.includes(filters.scopeOfWork)
      );
    }

    // FIXED: Item Description Filter - Search in nested items
    if (filters.itemDescription) {
      filtered = filtered.filter((item) => {
        // Check in main item description
        if (item.itemDescription === filters.itemDescription) return true;
        
        // Check in nested items
        if (item.items && Array.isArray(item.items)) {
          return item.items.some(
            (subItem) => 
              subItem.partName === filters.itemDescription ||
              subItem.itemDescription === filters.itemDescription
          );
        }
        return false;
      });
    }

    // Apply overall search across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.customer?.toLowerCase().includes(searchLower) ||
          item.projectName?.toLowerCase().includes(searchLower) ||
          (Array.isArray(item.scopeOfWork) &&
            item.scopeOfWork.some((scope) =>
              scope.toLowerCase().includes(searchLower)
            )) ||
          item.itemDescription?.toLowerCase().includes(searchLower) ||
          // Search in nested items
          (item.items &&
            item.items.some(
              (subItem) =>
                subItem.partName?.toLowerCase().includes(searchLower) ||
                subItem.itemDescription?.toLowerCase().includes(searchLower) ||
                subItem.partNumber?.toLowerCase().includes(searchLower)
            )) ||
          item.totalAmount?.toString().includes(searchTerm)
      );
    }

    setFilteredItems(filtered);
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
      projectName: "",
      customer: "",
      scopeOfWork: "",
      itemDescription: "",
    });
    setSearchTerm("");
  };

  // Format scope for display
  const formatScopeDisplay = (scopeOfWork) => {
    if (Array.isArray(scopeOfWork)) {
      return scopeOfWork.map((scope) => formatScopeOfWork(scope)).join(", ");
    }
    return formatScopeOfWork(scopeOfWork);
  };

  // Updated function to calculate item statistics with better formatting
  const calculateItemStats = (items) => {
    const itemList = items || [];
    const totalQty = itemList.reduce(
      (sum, item) => sum + parseFloat(item.numberOfUnits || item.quantity || 0),
      0
    );
    const prices = itemList
      .map((item) => parseFloat(item.unitPrice || 0))
      .filter((p) => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const units = [
      ...new Set(
        itemList.map((item) => item.unitType || item.unit).filter(Boolean)
      ),
    ];

    return { totalQty, minPrice, maxPrice, units, itemCount: itemList.length };
  };

  // New function to format item description with quantity
  const formatItemWithQuantity = (item) => {
    const quantity = item.numberOfUnits || item.quantity || 0;
    const unit = item.unitType || item.unit || "";
    const itemName = item.partName || item.itemDescription || "Unnamed Item";

    return `${itemName} (${quantity} ${unit})`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "₹0.00";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Pagination logic
  const safeFilteredItems = Array.isArray(filteredItems) ? filteredItems : [];
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeFilteredItems.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(safeFilteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const exportToCSV = () => {
    try {
      // Use boqItems instead of safeFilteredItems to export ALL data
      const allItems = Array.isArray(boqItems) ? boqItems : [];
      
      // Enhanced headers to include detailed item information
      const headers = [
        "Customer",
        "Scope of Work",
        "Part Name",
        "Number of Units",
        "Unit Type",
        "Overall Remarks"
      ];

      // Flatten the data to include each item as a separate row
      const csvData = [];
      allItems.forEach((boq) => {
        if (boq.items && boq.items.length > 0) {
          // Export each item in the BOQ as a separate row
          boq.items.forEach((item, index) => {
            csvData.push([
              boq.customer,
              formatScopeDisplay(boq.scopeOfWork),
              item.partName || '',
              item.numberOfUnits || 0,
              item.unitType || '',
              index === 0 ? (boq.overallRemarks || '') : ''
            ]);
          });
        } else {
          // If no items, still export the BOQ header information
          csvData.push([
            boq.customer,
            formatScopeDisplay(boq.scopeOfWork),
            'No items',
            0,
            '',
            0,
            boq.overallRemarks || '',
            new Date(boq.createdAt).toLocaleDateString(),
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
      link.setAttribute("download", `boq_detailed_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess(`BOQ data exported successfully (${allItems.length} BOQs, ${csvData.length} items)`);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      showError("Failed to export BOQ data");
    }
  };

  const handleView = (item) => {
    setSelectedItem(item);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await boqAPI.delete(itemToDelete._id);
      showSuccess("BOQ item deleted successfully");
      fetchBOQItems();
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting BOQ item:", error);
      showError("Failed to delete BOQ item");
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
    <div className="bg-gray-50 p-2 sm:p-3 lg:p-4 xl:p-6">
      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto mb-6">
          {/* Header Section */}
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
                    placeholder="Search Client, items..."
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
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <select
                    value={filters.customer}
                    onChange={(e) =>
                      handleFilterChange("customer", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Clients</option>
                    {uniqueProjectNames.map((customer) => (
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
                    {getFilteredProjectNames().map((projectName) => (
                      <option key={projectName} value={projectName}>
                        {projectName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scope of Work
                  </label>
                  <select
                    value={filters.scopeOfWork}
                    onChange={(e) =>
                      handleFilterChange("scopeOfWork", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Scopes</option>
                    {uniqueScopeOfWork.map((scope) => (
                      <option key={scope} value={scope}>
                        {formatScopeOfWork(scope)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Part Name
                  </label>
                  <select
                    value={filters.itemDescription}
                    onChange={(e) =>
                      handleFilterChange("itemDescription", e.target.value)
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Parts</option>
                    {uniqueItemDescriptions.map((description) => (
                      <option key={description} value={description}>
                        {description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* BOQ Table */}
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
                        Client Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Project
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Scope
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
                      currentItems.map((boq) => {
                        const stats = calculateItemStats(boq.items);
                        return (
                          <tr
                            key={boq._id}
                            className="hover:bg-gray-50 transition-colors duration-150"
                          >
                            {/* Customer & Project Column */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {boq.customer}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Project Name Column */}
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {boq.projectName}
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {formatScopeDisplay(boq.scopeOfWork)}
                              </div>
                            </td>
                            {/* Actions Column */}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleView(boq)}
                                  className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                  title="View"
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleAdvancedPDFPreview(boq)}
                                  className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
                                  title="Generate PDF"
                                >
                                  <DocumentArrowDownIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(boq)}
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
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          {Object.values(filters).some((val) => val !== "") ||
                          searchTerm
                            ? "No BOQ items found matching your filters."
                            : "No BOQ items found."}
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
                currentItems.map((boq) => {
                  const stats = calculateItemStats(boq.items);

                  return (
                    <div
                      key={boq._id}
                      className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {boq.customer}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {boq.projectName}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-2">
                          <button
                            onClick={() => handleView(boq)}
                            className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAdvancedPDFPreview(boq)}
                            className="text-purple-600 hover:text-purple-900 p-1 transition-colors duration-150"
                            title="Generate PDF"
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(boq)}
                            className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Scope */}
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-500">
                          Scope:
                        </span>
                        <div className="text-sm text-gray-900 mt-1">
                          {formatScopeDisplay(boq.scopeOfWork)}
                        </div>
                      </div>

                      {/* Items with Quantity */}
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-500">
                          Items:
                        </span>
                        {boq.items && boq.items.length > 0 ? (
                          <div className="mt-1 space-y-2">
                            {boq.items.slice(0, 2).map((item, index) => (
                              <div
                                key={index}
                                className="bg-gray-50 px-3 py-2 rounded text-sm border border-gray-200"
                              >
                                <div className="font-medium text-gray-900">
                                  {formatItemWithQuantity(item)}
                                </div>
                              </div>
                            ))}
                            {boq.items.length > 2 && (
                              <div className="text-xs text-gray-500 text-center bg-blue-50 py-1 rounded border border-blue-100">
                                +{boq.items.length - 2} more items
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm ml-2">
                            No items
                          </span>
                        )}
                      </div>

                      {/* Quantity & Pricing - Mobile */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                          <div className="flex items-center space-x-1 mb-1">
                            <CubeIcon className="h-3 w-3 text-blue-600" />
                            <span className="text-xs font-medium text-gray-700">
                              Qty
                            </span>
                          </div>
                          <div className="text-sm font-bold text-blue-700">
                            {stats.totalQty} {stats.units.join(", ")}
                          </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                          <div className="flex items-center space-x-1 mb-1">
                            <CurrencyRupeeIcon className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-gray-700">
                              Price
                            </span>
                          </div>
                          <div className="text-sm font-bold text-green-700">
                            {stats.minPrice === stats.maxPrice
                              ? `₹${stats.minPrice.toFixed(2)}`
                              : `₹${stats.minPrice.toFixed(
                                  2
                                )}-₹${stats.maxPrice.toFixed(2)}`}
                          </div>
                        </div>
                      </div>

                      {/* Total Amount */}
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-700">
                          Total Amount:
                        </span>
                        <span className="font-bold text-green-700 text-lg">
                          ₹
                          {parseFloat(
                            boq.totalAmount || boq.totalWithGST || 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some((val) => val !== "") ||
                  searchTerm
                    ? "No BOQ items found matching your filters."
                    : "No BOQ items found."}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {safeFilteredItems.length > 0 && (
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
                  {Math.min(indexOfLastItem, safeFilteredItems.length)} of{" "}
                  {safeFilteredItems.length} results
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
        </div>
      </div>

      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title=""
          size="xl"
        >
          <div className="space-y-6 max-h-[85vh] overflow-y-auto p-2">
            {/* Client & Project Information - Full Width */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                  Client & Project Information
                </h3>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Client Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      CLIENT NAME
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedItem.customer || "Not specified"}
                    </p>
                  </div>

                  {/* Project Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      PROJECT NAME
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedItem.projectName || "Not specified"}
                    </p>
                  </div>

                  {/* Scope of Work */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      SCOPE OF WORK
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatScopeDisplay(selectedItem.scopeOfWork) || "Not specified"}
                    </p>
                  </div>

                  {/* Total Items */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      TOTAL ITEMS
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedItem.items?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Project Location - Second Row (if available) */}
                {selectedItem.projectLocation && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          PROJECT LOCATION
                        </label>
                        <p className="text-sm text-gray-900 flex items-center">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
                          {selectedItem.projectLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ListBulletIcon className="h-5 w-5 text-gray-400 mr-2" />
                  Items List
                </h3>
              </div>
              
              {selectedItem.items && selectedItem.items.length > 0 ? (
                <div className="px-6 py-5">
                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Part Name
                          </th>
                          <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Units
                          </th>
                          {selectedItem.items.some(item => item.remarks) && (
                            <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Remarks
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.items.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 text-sm text-gray-900">
                              <div>
                                <div className="font-medium">{item.partName || item.itemDescription || "Unnamed Item"}</div>
                                {item.partNumber && (
                                  <div className="text-xs text-gray-500 mt-0.5">Part #: {item.partNumber}</div>
                                )}
                                {item.itemDescription && item.itemDescription !== item.partName && (
                                  <div className="text-xs text-gray-600 mt-0.5">{item.itemDescription}</div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-sm text-gray-900">
                              {item.numberOfUnits || item.quantity || 0} {item.unitType || item.unit || ""}
                            </td>
                            {selectedItem.items.some(item => item.remarks) && (
                              <td className="py-3 text-sm text-gray-700">
                                {item.remarks || "-"}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <DocumentDuplicateIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-base font-medium text-gray-500">No items found</p>
                  <p className="text-sm text-gray-400 mt-1">This BOQ doesn't contain any items</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-5 border-t border-gray-200">
              <button
                onClick={() => handleAdvancedPDFPreview(selectedItem)}
                className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Generate PDF
              </button>
              
              <button
                onClick={() => setSelectedItem(null)}
                className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />

      {/* Advanced PDF Generator Modal */}
      {showAdvancedPDF && pdfBOQData && (
        <AdvancedBOQPDFGenerator
          boqData={pdfBOQData}
          onClose={() => setShowAdvancedPDF(false)}
          hasInOffice={false}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete the BOQ for "
            {itemToDelete?.customer}"? This action cannot be undone.
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

export default InHouseBoqManagement;
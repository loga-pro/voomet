import React, { useState, useEffect } from 'react';
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
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import EmployeeForm from '../components/Forms/EmployeeForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { employeesAPI } from '../services/api';
import { Mail, Phone, MapPin, Briefcase, IdCard, Banknote, Calendar, User } from "lucide-react";

const EmployeeMaster = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '', // Renamed from 'name' to 'searchTerm'
    employeeName: '',
    uan: '',
    department: '',
    designation: '',
    gender: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);
  const [uniqueDesignations, setUniqueDesignations] = useState([]);
  const [uniqueEmployeeNames, setUniqueEmployeeNames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { notification, showSuccess, hideNotification } = useNotification();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, filters, currentPage, itemsPerPage]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      
      // Extract unique values for dropdowns
      const departments = [...new Set(response.data.map(emp => emp.department))].filter(Boolean);
      const designations = [...new Set(response.data.map(emp => emp.designation))].filter(Boolean);
      const employeeNames = [...new Set(response.data.map(emp => emp.name))].filter(Boolean).sort();
      
      setUniqueDepartments(departments);
      setUniqueDesignations(designations);
      setUniqueEmployeeNames(employeeNames);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Enhanced overall search - search across all relevant fields
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(emp => {
        // Define all fields to search
        const searchableFields = [
          emp.name,
          emp.email,
          emp.phone,
          emp.department,
          emp.designation,
          emp.qualification,
          emp.gender,
          emp.uan,
          emp.aadhar,
          emp.pan,
          emp.bankName,
          emp.bankAccountNumber,
          emp.branch,
          emp.address
        ];

        // Check if any field contains the search term
        return searchableFields.some(field => {
          if (!field) return false;
          
          // Convert to string and check for match
          return String(field).toLowerCase().includes(searchTerm);
        });
      });
    }

    // Employee name filter (exact match from dropdown)
    if (filters.employeeName) {
      filtered = filtered.filter(emp => 
        emp.name === filters.employeeName
      );
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(emp => 
        emp.department === filters.department
      );
    }

    // Designation filter
    if (filters.designation) {
      filtered = filtered.filter(emp => 
        emp.designation === filters.designation
      );
    }

    // Gender filter
    if (filters.gender) {
      filtered = filtered.filter(emp => 
        emp.gender === filters.gender
      );
    }

    // UAN filter - exact match
    if (filters.uan) {
      filtered = filtered.filter(emp => 
        emp.uan && emp.uan.includes(filters.uan)
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); 
  };

  // Handle UAN input - only allow numbers and limit to 12 digits
  const handleUANChange = (value) => {
    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    
    // Limit to 12 digits
    const limitedValue = numericValue.slice(0, 12);
    
    handleFilterChange('uan', limitedValue);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      employeeName: '',
      department: '',
      designation: '',
      gender: '',
      uan: ''
    });
  };

  // Enhanced search handler
  const handleSearch = (searchTerm) => {
    handleFilterChange('searchTerm', searchTerm);
  };

  // Debounced search for better performance
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const handleSearchChange = (value) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debouncing
    const newTimeout = setTimeout(() => {
      handleSearch(value);
    }, 300); // 300ms delay
    
    setSearchTimeout(newTimeout);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob) => {
    if (!dob) return null;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return null;
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Export to CSV function (unchanged)
  const exportToCSV = () => {
    const headers = [
      'Name', 'Email', 'Department', 'Designation', 'Phone', 
      'Aadhaar', 'PAN', 'Gender', 'Qualification', 'Address',
      'UAN', 'Bank Name', 'Bank Account Number', 'Branch','Date of Birth'
    ];
    
    const csvData = filteredEmployees.map(emp => [
      emp.name || '',
      emp.email || '',
      emp.department || '',
      emp.designation || '',
      emp.phone || '',
      emp.aadhar || '', 
      emp.pan || '',
      emp.gender || '',
      emp.qualification || '',
      emp.address || '',
      emp.uan || '', 
      emp.bankName || '',
      emp.bankAccountNumber || '', 
      emp.branch || '',
      emp.dob ? formatDate(emp.dob) : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees_full_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleView = (employee) => {
    setSelectedEmployee(employee);
    setViewModal(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const handleDelete = async (id) => {
    setEmployeeToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await employeesAPI.delete(employeeToDelete);
      fetchEmployees(); // Refresh the list
      showSuccess('Employee deleted successfully');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      if (error.response?.data?.message === 'Cannot delete employee with existing dependencies') {
        const dependencies = error.response.data.dependencies || [];
        const totalDependencies = error.response.data.totalDependencies || 0;
        showSuccess(`Cannot delete employee: ${dependencies.join(', ')} (${totalDependencies} total)`, 'error');
      } else {
        showSuccess('Error deleting employee. Please try again.', 'error');
      }
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingEmployee(null);
    fetchEmployees(); // Refresh the list
    showSuccess(isEdit ? 'Employee updated successfully' : 'Employee added successfully');
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
      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto mb-6">

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
                    onChange={(e) => {
                      // Update the input value immediately for better UX
                      setFilters(prev => ({ ...prev, searchTerm: e.target.value }));
                      // Debounced search
                      handleSearchChange(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search name, email, phone, department, UAN, etc...."
                  />
                  {filters.searchTerm && (
                    <button
                      onClick={() => handleFilterChange('searchTerm', '')}
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
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showFilters || Object.values(filters).some(Boolean) 
                      ? 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                  {Object.values(filters).filter(val => val !== '').length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                      {Object.values(filters).filter(val => val !== '').length}
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
                  Add Employee
                </button>
              </div>
            </div>

            {/* Search Results Info */}
            {filters.searchTerm && (
              <div className="mt-3 text-sm text-gray-600">
                Found {filteredEmployees.length} employee(s) matching "{filters.searchTerm}"
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Employee Name Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                  <select
                    value={filters.employeeName}
                    onChange={(e) => handleFilterChange('employeeName', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Employees</option>
                    {uniqueEmployeeNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Department Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Departments</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Designation Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    value={filters.designation}
                    onChange={(e) => handleFilterChange('designation', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Designations</option>
                    {uniqueDesignations.map(designation => (
                      <option key={designation} value={designation}>{designation}</option>
                    ))}
                  </select>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* UAN Filter - Added for better search */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">UAN Number</label>
                  <input
                    type="text"
                    value={filters.uan}
                    onChange={(e) => handleUANChange(e.target.value)}
                    maxLength={12}
                    placeholder="Enter UAN number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 12-digit UAN number</p>
                </div>
              </div>
            </div>
          )}

          {/* Employees Table - Rest of the component remains the same */}
          {/* ... (rest of the table and card view code remains unchanged) ... */}
          <div className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Designation
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qualification
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map((employee) => (
                        <tr key={employee._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate max-w-xs">{employee.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.designation}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.qualification}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{employee.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleView(employee)}
                                className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(employee)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                                title="Edit"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(employee._id)}
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
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          {Object.values(filters).some(val => val !== '') 
                            ? 'No employees found matching your filters.' 
                            : 'No employees found.'
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
                currentItems.map((employee) => (
                  <div key={employee._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{employee.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{employee.email}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(employee)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee._id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Department:</span> {employee.department}
                      </div>
                      <div>
                        <span className="font-medium">Designation:</span> {employee.designation}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {employee.phone}
                      </div>
                      <div>
                        <span className="font-medium">Gender:</span> {employee.gender || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(val => val !== '') 
                    ? 'No employees found matching your filters.' 
                    : 'No employees found.'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Pagination - Rest of the pagination code remains the same */}
          {/* ... (rest of the pagination code remains unchanged) ... */}
          {filteredEmployees.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length} results
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
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
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

      {/* Add/Edit Modal - Rest of the modals remain the same */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={() => handleFormSubmit(!!editingEmployee)}
          onCancel={() => {
            setShowModal(false);
            setEditingEmployee(null);
          }}
        />
      </Modal>

      <Modal
  isOpen={viewModal}
  onClose={() => {
    setViewModal(false);
    setSelectedEmployee(null);
  }}
  title="Employee Profile"
  size="lg"
  className="employee-modal"
>
  {selectedEmployee && (
    <div className="max-h-[80vh] overflow-y-auto p-1">
      {/* Header Section */}
      <div className="flex items-start gap-5 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl mb-6">
        <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
          <span className="font-semibold text-2xl text-white">
            {selectedEmployee.name ? selectedEmployee.name.charAt(0).toUpperCase() : 'E'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 truncate">{selectedEmployee.name}</h2>
          <p className="text-md text-indigo-600 font-medium">{selectedEmployee.designation}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedEmployee.department}
            </span>
            {selectedEmployee.qualification && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {selectedEmployee.qualification}
              </span>
            )}
            {selectedEmployee.gender && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                {selectedEmployee.gender}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-2 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Personal Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</p>
              <p className="text-sm text-gray-800 font-medium">{selectedEmployee.gender || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</p>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-800 font-medium">
                  {formatDate(selectedEmployee.dob)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Contact Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600 break-all">{selectedEmployee.email}</span>
            </div>
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600">{selectedEmployee.phone}</span>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <span className="text-sm text-gray-600">{selectedEmployee.address || 'Not provided'}</span>
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Briefcase className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Employment Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</p>
              <p className="text-sm text-gray-800 font-medium">{selectedEmployee.department}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Designation</p>
              <p className="text-sm text-gray-800 font-medium">{selectedEmployee.designation}</p>
            </div>
            {selectedEmployee.qualification && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Qualification</p>
                <p className="text-sm text-gray-800 font-medium">{selectedEmployee.qualification}</p>
              </div>
            )}
          </div>
        </div>

        {/* Government IDs */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <IdCard className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Government IDs</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Aadhaar Number</p>
              <p className="text-sm text-gray-800 font-mono">{selectedEmployee.aadhar || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PAN Number</p>
              <p className="text-sm text-gray-800 font-mono">{selectedEmployee.pan || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">UAN Number</p>
              <p className="text-sm text-gray-800 font-mono">
                {selectedEmployee.uan ? 
                  `${selectedEmployee.uan.slice(0, 4)} ${selectedEmployee.uan.slice(4, 8)} ${selectedEmployee.uan.slice(8, 12)}` 
                  : 'Not provided'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Banknote className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">Bank Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Name</p>
              <p className="text-sm text-gray-800">{selectedEmployee.bankName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</p>
              <p className="text-sm text-gray-800 font-mono">{selectedEmployee.bankAccountNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</p>
              <p className="text-sm text-gray-800">{selectedEmployee.branch || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - FIXED */}
      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            setViewModal(false);
            setSelectedEmployee(null);
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Close
        </button>
        <button
          onClick={() => {
            setViewModal(false);
            setSelectedEmployee(null);
            handleEdit(selectedEmployee); // This line was fixed
          }}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          Edit Employee
        </button>
      </div>
    </div>
  )}
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
            Are you sure you want to delete "{employees.find(e => e._id === employeeToDelete)?.name || 'this employee'}"? This action cannot be undone.
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

export default EmployeeMaster;
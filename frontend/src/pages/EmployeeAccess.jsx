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
  ChevronRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import UserForm from '../components/Forms/UserForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { authAPI } from '../services/api';

const EmployeeAccess = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Store all users for export
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    username: '',
    email: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Pagination state - FIXED
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Search timeout for debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, filters]);

  const fetchUsers = async () => {
    try {
      const response = await authAPI.getAllUsers();
      setUsers(response.data);
      setAllUsers(response.data); // Store all users for export
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to mock data if API fails
      const mockUsers = [
        {
          _id: '1',
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['dashboard', 'employee_master', 'employee_access'],
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          name: 'Project Manager',
          email: 'pm@example.com',
          role: 'project_manager',
          permissions: ['dashboard', 'project_master', 'milestone_management'],
          lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          name: '3D Modeler',
          email: 'modeler@example.com',
          role: '3d_model',
          permissions: ['dashboard', 'part_master'],
          lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '4',
          name: 'Content Artist',
          email: 'artist@example.com',
          role: 'artist',
          permissions: ['dashboard', 'quality_management'],
          lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setUsers(mockUsers);
      setAllUsers(mockUsers);
      setFilteredUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    function normalizeString(str) {
      return String(str || '').toLowerCase().trim();
    }

    // Apply dropdown filters first (username, email, role)
    if (filters.username) {
      filtered = filtered.filter(user => 
        user.name && user.name.toLowerCase().includes(filters.username.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(user => 
        user.email && user.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(user => 
        normalizeString(user.role) === normalizeString(filters.role)
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();

      filtered = filtered.filter(user => {
    const normalizedRole = (user.role || '').replace(/_/g, ' ').toLowerCase();
    const normalizedPermissions = (user.permissions || []).map(p => 
      p.replace(/_/g, ' ').toLowerCase()
    );
    
    return (
        (user.name && user.name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm)) ||
      (normalizedRole.includes(searchTerm)) 
      // normalizedPermissions.some(permission => permission.includes(searchTerm))
      );
  });
    }

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Debounced search handler
  const handleSearchChange = (value) => {
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debouncing
    const newTimeout = setTimeout(() => {
      handleFilterChange('search', value);
    }, 300); // 300ms delay
    
    setSearchTimeout(newTimeout);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: '',
      username: '',
      email: ''
    });
  };

  // Get unique values for dropdowns
  const getUniqueValues = (key) => {
    const values = users.map(user => user[key]).filter(Boolean);
    return [...new Set(values)].sort();
  };

  // Get unique roles for dropdown
  const getUniqueRoles = () => {
    const roles = users.map(user => user.role).filter(Boolean);
    return [...new Set(roles)].sort();
  };

  // Export CSV functions
  const exportToCSV = (dataToExport, filename) => {
    const headers = ['Name', 'Email', 'Role', 'Permissions'];
    const csvData = dataToExport.map(user => [
      `"${user.name}"`,
      `"${user.email}"`,
      user.role,
      `"${user.permissions.join(', ')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAllUsers = () => {
    exportToCSV(allUsers, 'all_employee_access.csv');
  };

  const exportFilteredUsers = () => {
    exportToCSV(filteredUsers, 'filtered_employee_access.csv');
  };

  // Pagination logic - FIXED
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Generate pagination range with ellipsis - FIXED
  const getPaginationRange = () => {
    if (totalPages <= 1) return [1];
    
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    if (totalPages <= 7) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        rangeWithDots.push(i);
      }
      return rangeWithDots;
    }

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleView = (user) => {
    setViewingUser(user);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const handleDelete = async (id) => {
    setUserToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await authAPI.deleteUser(userToDelete);
      fetchUsers(); // Refresh the list
      showSuccess('User deleted successfully');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Error deleting user. Please try again.');
    }
  };

  const handleFormSubmit = (isEdit = false) => {
    setShowModal(false);
    setEditingUser(null);
    fetchUsers(); // Refresh the list
    showSuccess(isEdit ? 'User updated successfully' : 'User added successfully');
  };

  const formatLastLogin = (dateString) => {
    if (!dateString) return 'Never logged in';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return the original string if it's already formatted
      }
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        return 'Yesterday at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date format error';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'project_manager':
        return 'bg-blue-100 text-blue-800';
      case '3d_model':
        return 'bg-green-100 text-green-800';
      case 'artist':
        return 'bg-yellow-100 text-yellow-800';
      case 'content_manager':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format role for display - ALL CAPS
  const formatRole = (role) => {
    return role.replace(/_/g, ' ').toUpperCase();
  };

  // Format permissions for display - Capital Case
  const formatPermission = (permission) => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-2 sm:p-3 lg:p-4 xl:p-6">
      <div className="max-w-none w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">

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
                    onChange={(e) => {
                      // Update the input value immediately for better UX
                      setFilters(prev => ({ ...prev, search: e.target.value }));
                      // Debounced search
                      handleSearchChange(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search by name, email, role, or permissions..."
                  />
                  {filters.search && (
                    <button
                      onClick={() => handleFilterChange('search', '')}
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
                  onClick={exportFilteredUsers}
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
                  Add User
                </button>
              </div>
            </div>

            {/* Search Results Info */}
            {filters.search && (
              <div className="mt-3 text-sm text-gray-600">
                Found {filteredUsers.length} user(s) matching "{filters.search}"
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <select
                    value={filters.username}
                    onChange={(e) => handleFilterChange('username', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Usernames</option>
                    {getUniqueValues('name').map(username => (
                      <option key={username} value={username}>
                        {username}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <select
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Emails</option>
                    {getUniqueValues('email').map(email => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
                  >
                    <option value="">All Roles</option>
                    {getUniqueRoles().map(role => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div>
        

            {/* Desktop Table View */}
            <div className="hidden sm:block">
              {currentItems.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((user) => (
                      <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                           
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {formatRole(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatLastLogin(user.lastLogin)}</div>
                        </td>
                       
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleView(user)}
                              className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(user._id)}
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {Object.values(filters).some(Boolean) ? 'No users found matching your criteria.' : 'No users found.'}
                  </p>
                  {Object.values(filters).some(Boolean) && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Mobile Card View */}
            <div className="sm:hidden">
              {currentItems.length > 0 ? (
                currentItems.map((user) => (
                  <div key={user._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{user.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="flex space-x-2 ml-2">
                        <button
                          onClick={() => handleView(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 transition-colors duration-150"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Role:</span> {formatRole(user.role)}
                      </div>
                      
                      <div className="col-span-2">
                        <span className="font-medium">Last Login:</span> {formatLastLogin(user.lastLogin)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  {Object.values(filters).some(Boolean) ? 'No users found matching your criteria.' : 'No users found.'}
                  {Object.values(filters).some(Boolean) && (
                    <button
                      onClick={clearFilters}
                      className="mt-2 block mx-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
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
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} results
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Edit User Access' : 'Add User Access'}
        size="lg"
      >
        <UserForm
          user={editingUser}
          onSubmit={() => handleFormSubmit(!!editingUser)}
          onCancel={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
        />
      </Modal>

      {/* View User Modal */}
{viewingUser && (
  <Modal
    isOpen={!!viewingUser}
    onClose={() => setViewingUser(null)}
    title="User Profile"
    size="lg"
  >
    <div className="max-h-[70vh] overflow-y-auto">
      <div className="space-y-8 p-1">
        {/* Header Section */}
        <div className="flex items-center space-x-6 pb-6 border-b border-gray-200">
          <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">
              {viewingUser.name ? viewingUser.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{viewingUser.name}</h3>
            <p className="text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              {viewingUser.email}
            </p>
          </div>
        </div>
        
        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</h4>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">{formatRole(viewingUser.role)}</p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Login</h4>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900">{formatLastLogin(viewingUser.lastLogin)}</p>
          </div>
        </div>
        
        {/* Permissions Section */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">ACCESS PERMISSIONS</h4>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {viewingUser.permissions.length} permissions
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {viewingUser.permissions.map((permission, index) => (
              <div 
                key={index} 
                className="bg-white border border-blue-100 rounded-lg px-4 py-3 text-sm font-medium text-blue-700 flex items-center shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                {formatPermission(permission)}
              </div>
            ))}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            onClick={() => setViewingUser(null)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow"
          >
            Close
          </button>
          <button
            onClick={() => {
              setViewingUser(null);
              handleEdit(viewingUser);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Edit Profile
          </button>
        </div>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Are you sure you want to delete "{users.find(u => u._id === userToDelete)?.name || 'this user'}"? This action cannot be undone.
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

export default EmployeeAccess;
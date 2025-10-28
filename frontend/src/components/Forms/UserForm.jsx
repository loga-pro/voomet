import React, { useState, useEffect } from 'react';
import { employeesAPI, authAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    permissions: []
  });
  const [employees, setEmployees] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const permissionOptions = [
    'dashboard', 'employee_master', 'employee_access', 'part_master',
    'customer_master', 'project_master', 'vendor_master', 'boq_management',
    'milestone_management', 'inventory_management', 'quality_management','payment_master', 'reports'
  ];

  const roleOptions = [
    { value: 'admin', label: 'ADMIN' },
    { value: 'project_manager', label: 'PROJECT MANAGER' },
    { value: '3d_model', label: '3D MODEL' },
    { value: 'artist', label: 'ARTIST' },
  ];

  useEffect(() => {
    fetchEmployees();
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        password: '',
        confirmPassword: '',
        permissions: user.permissions || []
      });
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);
    const employee = employees.find(emp => emp._id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        name: employee.name,
        email: employee.email
      }));
    } else {
      // Clear name and email if no employee selected
      setFormData(prev => ({
        ...prev,
        name: '',
        email: ''
      }));
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.role) newErrors.role = 'Role is required';
    
    // Password validation
    if (!user) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6)
        newErrors.password = 'Password must be at least 6 characters';
      
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = 'Passwords do not match';
    } else {
      // For existing users, only validate if password is provided
      if (formData.password) {
        if (formData.password.length < 6)
          newErrors.password = 'Password must be at least 6 characters';
        
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword)
          newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create a copy of formData without confirmPassword for API call
      const submitData = { ...formData };
      delete submitData.confirmPassword;

      if (user) {
        // For updates, remove password fields if they're empty
        if (!submitData.password) {
          delete submitData.password;
        }
        await authAPI.updateUser(user._id, submitData);
      } else {
        await authAPI.createUser(submitData);
      }
      onSubmit();
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Employee Select - Only show when creating new user */}
      {!user && (
        <FloatingInput
          type="select"
          label="Select Employee"
          name="employeeSelect"
          value={selectedEmployee}
          onChange={(e) => handleEmployeeSelect(e.target.value)}
          options={[
            { value: '', label: 'Select an employee' },
            ...employees.map(emp => ({
              value: emp._id,
              label: `${emp.name} - ${emp.email}`
            }))
          ]}
        />
      )}

      {/* Name - Read-only in both create and edit modes */}
      <FloatingInput
        type="text"
        label="Name"
        name="name"
        value={formData.name}
        readOnly={true}
        error={errors.name}
        required={true}
      />

      {/* Email - Read-only in both create and edit modes */}
      <FloatingInput
        type="email"
        label="Email"
        name="email"
        value={formData.email}
        readOnly={true}
        error={errors.email}
        required={true}
      />

      {/* Role */}
      <FloatingInput
        type="select"
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        options={roleOptions}
        error={errors.role}
        required={true}
      />

      {/* Password */}
      <FloatingInput
        type="password"
        label={user ? 'New Password (leave blank to keep current)' : 'Password'}
        name="password"
        value={formData.password}
        onChange={handleChange}
        error={errors.password}
        required={!user}
      />

      {/* Confirm Password */}
      <FloatingInput
        type="password"
        label={user ? 'Confirm New Password' : 'Confirm Password'}
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        required={!user}
      />

      {/* Permissions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissionOptions.map(permission => {
            const isActive = formData.permissions.includes(permission);
            return (
              <div
                key={permission}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-sm text-gray-700 capitalize">
                  {permission.replace('_', ' ')}
                </span>

                <button
                  type="button"
                  onClick={() => handlePermissionChange(permission)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out 
                    ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out 
                      ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 
                     hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium 
                     text-white bg-primary-600 hover:bg-primary-700 focus:outline-none 
                     focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : user ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;
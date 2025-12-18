import React, { useState, useEffect } from 'react';
import { customersAPI, vendorsAPI, projectsAPI, employeesAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const QualityForm = ({ quality, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer: '',
    scopeOfWork: [],
    scopeOfWorkText: '',
    openIssues: '',
    category: '',
    status: 'open',
    personType: '',
    responsibility: '',
    remarks: ''
  });

  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableScopes, setAvailableScopes] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [scopeFocused, setScopeFocused] = useState(false);

  const allScopeOptions = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'data', label: 'Data' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'partition', label: 'Partition' },
    { value: 'fire_and_safety', label: 'Fire and Safety' },
    { value: 'access', label: 'Access' },
    { value: 'transportation', label: 'Transportation' }
  ];

  const categoryOptions = ['rectify', 'replace'];
  const statusOptions = ['open', 'closed'];

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    fetchEmployees();
    fetchProjects();

    if (quality) {
      const processedScopeOfWork = Array.isArray(quality.scopeOfWork)
        ? quality.scopeOfWork.map(scope => scope.toLowerCase())
        : (quality.scopeOfWork ? [quality.scopeOfWork.toLowerCase()] : []);

      setFormData({
        customer: quality.customer || '',
        scopeOfWork: processedScopeOfWork,
        scopeOfWorkText: quality.scopeOfWorkText || '',
        openIssues: quality.openIssues || '',
        category: quality.category || '',
        status: quality.status || 'open',
        personType: quality.personType || '',
        responsibility: quality.responsibility || '',
        remarks: quality.remarks || ''
      });
    }
  }, [quality]);

  useEffect(() => {
    if (formData.customer && projects.length > 0) {
      const customerProjects = projects.filter(
        project => project.customerName === formData.customer
      );

      const scopes = new Set();
      customerProjects.forEach(project => {
        if (project.scopeOfWork && Array.isArray(project.scopeOfWork)) {
          project.scopeOfWork.forEach(scope => {
            const normalizedScope = scope.toLowerCase();
            scopes.add(normalizedScope);
          });
        }
      });

      const availableScopesArray = Array.from(scopes);
      setAvailableScopes(availableScopesArray);

      if (!quality && scopes.size > 0) {
        setFormData(prev => ({
          ...prev,
          scopeOfWork: Array.from(scopes)
        }));
      }
    } else {
      setAvailableScopes([]);
    }
  }, [formData.customer, projects, quality]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleScopeChange = (scopeValue) => {
    setFormData(prev => {
      const currentScopes = prev.scopeOfWork || [];
      const isSelected = currentScopes.includes(scopeValue);

      return {
        ...prev,
        scopeOfWork: isSelected
          ? currentScopes.filter(s => s !== scopeValue)
          : [...currentScopes, scopeValue]
      };
    });

    if (errors.scopeOfWork) {
      setErrors(prev => ({
        ...prev,
        scopeOfWork: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.scopeOfWork || formData.scopeOfWork.length === 0) {
      newErrors.scopeOfWork = 'At least one scope of work is required';
    }
    if (!formData.openIssues) newErrors.openIssues = 'Open issues description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.responsibility) newErrors.responsibility = 'Responsible person is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const scopeMapping = {
      'electrical': 'Electrical',
      'data': 'Data',
      'cctv': 'CCTV',
      'partition': 'Partition',
      'fire_and_safety': 'Fire and Safety',
      'fire and safety': 'Fire and Safety',  // Handle lowercase with space from existing records
      'access': 'Access',
      'transportation': 'Transportation'  // Add missing Transportation option
    };

    const cleanedData = {
      ...formData,
      customer: formData.customer?.trim() || undefined,
      scopeOfWork: formData.scopeOfWork && formData.scopeOfWork.length > 0
        ? formData.scopeOfWork.map(scope => scopeMapping[scope] || scope)
        : undefined,
      scopeOfWorkText: formData.scopeOfWorkText?.trim() || undefined,
      openIssues: formData.openIssues?.trim() || undefined,
      category: formData.category?.trim() || undefined,
      status: formData.status?.trim() || 'open',
      personType: formData.personType?.trim() || undefined,
      responsibility: formData.responsibility?.trim() || undefined,
      remarks: formData.remarks?.trim() || undefined
    };

    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    setLoading(true);
    try {
      await onSubmit(cleanedData);
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save quality issue';
      setErrors({ submit: `Failed to save quality issue: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] max-h-[800px]">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Form Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {quality ? 'Edit Quality Issue' : 'Create Quality Issue'}
          </h2>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error Message */}
          {errors.submit && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="space-y-6">
            {/* SECTION 1: Basic Information */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput
                  label="Client Name"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  error={errors.customer}
                  type="select"
                  required={true}
                  options={[
                    { value: '', label: 'Select Customer' },
                    ...customers.map(customer => ({
                      value: customer.customerName,
                      label: customer.customerName
                    }))
                  ]}
                />

                <FloatingInput
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  error={errors.category}
                  type="select"
                  required={true}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...categoryOptions.map(category => ({
                      value: category,
                      label: category.charAt(0).toUpperCase() + category.slice(1)
                    }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <FloatingInput
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  type="select"
                  options={statusOptions.map(status => ({
                    value: status,
                    label: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')
                  }))}
                />

                <FloatingInput
                  label="Scope of Work Details"
                  name="scopeOfWorkText"
                  value={formData.scopeOfWorkText}
                  onChange={handleChange}
                  type="text"
                />
              </div>
            </div>

            {/* SECTION 2: Scope of Work */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Scope of Work</h3>

              <div className="relative mb-4">
                <div
                  className={`block w-full px-3 pt-4 pb-2 bg-white rounded border transition-all duration-200 min-h-[64px] cursor-pointer
                    ${errors.scopeOfWork ? 'border-red-500' : scopeFocused ? 'border-blue-500' : 'border-gray-300'}
                    ${formData.customer && availableScopes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => !(formData.customer && availableScopes.length === 0) && setScopeFocused(true)}
                  onBlur={() => setScopeFocused(false)}
                  tabIndex="0"
                >
                  <label
                    className={`absolute left-3 bg-white px-1 transition-all duration-200 pointer-events-none
                      ${(scopeFocused || (formData.scopeOfWork && formData.scopeOfWork.length > 0))
                        ? 'top-0 text-xs transform -translate-y-1/2 text-blue-600 font-medium'
                        : 'top-3 text-sm text-gray-500'
                      }
                    `}
                  >
                    Scope of Work <span className="text-red-500">*</span>
                  </label>


                  {formData.customer && availableScopes.length === 0 && (
                    <div className="text-xs text-gray-500 mt-1 ml-1">
                      No scopes available for this customer
                    </div>
                  )}

                  {formData.customer && availableScopes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3 max-h-60 overflow-y-auto pr-2">
                      {allScopeOptions
                        .filter(scope => availableScopes.includes(scope.value))
                        .map((scope) => {
                          const isChecked = formData.scopeOfWork?.includes(scope.value);

                          return (
                            <label
                              key={scope.value}
                              className="flex items-center space-x-3 p-3 rounded cursor-pointer transition-colors hover:bg-blue-50 border border-gray-200"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleScopeChange(scope.value)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className={`text-sm ${isChecked ? 'font-medium text-primary-700' : 'text-gray-700'}`}>
                                {scope.label}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  )}

                </div>

                {errors.scopeOfWork && (
                  <div className="mt-1 flex items-start ml-1">
                    <svg className="w-4 h-4 mt-0.5 mr-1 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 
                          1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 
                          0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-xs text-red-600">{errors.scopeOfWork}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Responsible Party */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Responsible Party</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingInput
                  label="Person Type"
                  name="personType"
                  value={formData.personType}
                  onChange={(e) => {
                    handleChange(e);
                    setFormData(prev => ({ ...prev, responsibility: '' }));
                  }}
                  type="select"
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'inhouse', label: 'Inhouse' },
                    { value: 'outsourced', label: 'Outsourced' }
                  ]}
                />

                <FloatingInput
                  label="Responsible Person"
                  name="responsibility"
                  value={formData.responsibility}
                  onChange={handleChange}
                  error={errors.responsibility}
                  type="select"
                  required={true}
                  disabled={!formData.personType}
                  options={[
                    { value: '', label: formData.personType ? (formData.personType === 'inhouse' ? 'Select Employee' : 'Select Vendor') : 'Select Person Type First' },
                    ...(formData.personType === 'inhouse'
                      ? employees.map(employee => ({
                        value: employee.name,
                        label: employee.name
                      }))
                      : formData.personType === 'outsourced'
                        ? vendors.map(vendor => ({
                          value: vendor.vendorName,
                          label: vendor.vendorName
                        }))
                        : []
                    )
                  ]}
                />
              </div>
            </div>

            {/* SECTION 4: Issue Details */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Details</h3>
              <div className="space-y-6">
                <FloatingInput
                  label="List of Open Issues"
                  name="openIssues"
                  value={formData.openIssues}
                  onChange={handleChange}
                  error={errors.openIssues}
                  type="textarea"
                  required={true}
                  rows={5}
                  helperText="Describe all open issues that need to be addressed"
                />

                <FloatingInput
                  label="Remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  type="textarea"
                  rows={4}
                  helperText="Additional comments or notes (optional)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Action Buttons at Bottom */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : quality ? 'Update Quality Issue' : 'Create Quality Issue'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QualityForm;
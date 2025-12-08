import React, { useState, useEffect } from 'react';
import { customersAPI, vendorsAPI, partsAPI, projectsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const QualityForm = ({ quality, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer: '',
    scopeOfWork: [], // Changed to array for multiple selections
    scopeOfWorkText: '',
    openIssues: '',
    category: '',
    status: 'open',
    responsibility: '',
    remarks: ''
  });
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [availableScopes, setAvailableScopes] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const allScopeOptions = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'data', label: 'Data' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'partion', label: 'Partition' },
    { value: 'fire_and_safety', label: 'Fire and Safety' },
    { value: 'access', label: 'Access' }
  ];
  
  const categoryOptions = ['rectify', 'replace'];
  const statusOptions = ['open', 'closed'];

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    fetchParts();
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
        responsibility: quality.responsibility || '',
        remarks: quality.remarks || ''
      });
    }
  }, [quality]);

  // Update available scopes when customer changes
  useEffect(() => {
    if (formData.customer && projects.length > 0) {
      const customerProjects = projects.filter(
        project => project.customerName === formData.customer
      );
      
      // Get unique scopes from all customer projects
      const scopes = new Set();
      customerProjects.forEach(project => {
        if (project.scopeOfWork && Array.isArray(project.scopeOfWork)) {
          project.scopeOfWork.forEach(scope => {
            // Normalize scope to lowercase to match allScopeOptions
            const normalizedScope = scope.toLowerCase();
            scopes.add(normalizedScope);
          });
        }
      });
      
      const availableScopesArray = Array.from(scopes);
      setAvailableScopes(availableScopesArray);
      
      // Auto-select scopes only when creating new record
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

  const fetchParts = async () => {
    try {
      const response = await partsAPI.getAll();
      setParts(response.data || []);
    } catch (error) {
      console.error('Error fetching parts:', error);
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

    // Map lowercase project scopes to capitalized Quality scopes
    const scopeMapping = {
      'electrical': 'Electrical',
      'data': 'Data',
      'cctv': 'CCTV',
      'partion': 'Partition',
      'fire_and_safety': 'Fire and Safety',
      'access': 'Access',
      'transportation': 'Transportation'
    };

    // Clean up form data
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
      responsibility: formData.responsibility?.trim() || undefined,
      remarks: formData.remarks?.trim() || undefined
    };

    // Remove any undefined values
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    console.log('Submitting quality form with cleaned data:', cleanedData);

    setLoading(true);
    try {
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting form:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Customer"
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
          label="Responsible person"
          name="responsibility"
          value={formData.responsibility}
          onChange={handleChange}
          error={errors.responsibility}
          type="select"
          required={true}
          options={[
            { value: '', label: 'Select Vendor' },
            ...vendors.map(vendor => ({
              value: vendor.vendorName,
              label: vendor.vendorName
            }))
          ]}
        />
      </div>

      {/* Scope of Work Checkboxes - Only show when customer is selected and scopes are available */}
      {formData.customer && availableScopes.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Scope of Work <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-300 rounded-md bg-gray-50">
            {allScopeOptions
              .filter(scope => availableScopes.includes(scope.value))
              .map((scope) => {
                const isChecked = formData.scopeOfWork?.includes(scope.value);
                
                return (
                  <label
                    key={scope.value}
                    className="flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors hover:bg-blue-50"
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
          {errors.scopeOfWork && (
            <p className="text-sm text-red-600">{errors.scopeOfWork}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Scope of Work Details"
          name="scopeOfWorkText"
          value={formData.scopeOfWorkText}
          onChange={handleChange}
          type="text"
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

        <FloatingInput
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          type="select"
          options={statusOptions.map(status => ({
            value: status,
            label: status.charAt(0).toUpperCase() + status.slice(1)
          }))}
        />
      </div>

      <FloatingInput
        label="List of Open Issues"
        name="openIssues"
        value={formData.openIssues}
        onChange={handleChange}
        error={errors.openIssues}
        type="textarea"
        required={true}
        rows={3}
      />

      <FloatingInput
        label="Remarks"
        name="remarks"
        value={formData.remarks}
        onChange={handleChange}
        type="textarea"
        rows={2}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : quality ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default QualityForm;
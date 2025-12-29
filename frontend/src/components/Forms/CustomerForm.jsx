import React, { useState, useEffect } from 'react';
import { customersAPI, projectsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; 
import useNotification from '../../hooks/useNotification';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const CustomerForm = ({ customer, onSubmit, onCancel, existingCustomers = [] }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    gstinUin: '',
    customerEmail: '',
    invoiceEmail: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    zipCode: '',
    country: ''
  });
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [touchedFields, setTouchedFields] = useState({});
  const [showGstinTooltip, setShowGstinTooltip] = useState(false);
  const [showStateCodeTooltip, setShowStateCodeTooltip] = useState(false);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchRelevantProjects();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName || '',
        gstinUin: customer.gstinUin || '',
        customerEmail: customer.customerEmail || '',
        invoiceEmail: customer.invoiceEmail || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        stateCode: customer.stateCode || '',
        zipCode: customer.zipCode || '',
        country: customer.country || ''
      });
    }
  }, [customer]);

  // Update selected customer when customer data changes
  useEffect(() => {
    if (formData.customerName && !customer) {
      setSelectedCustomer(formData.customerName);
      const customerProjects = projects.filter(project => project.customerName === formData.customerName);
      setSelectedProjects(customerProjects);
    }
  }, [formData.customerName, projects, customer]);

  // Real-time validation functions
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'customerName':
        if (!value.trim()) {
          error = 'Client name is required';
        } else if (value.length > 50) {
          error = 'Client name must be 50 characters or less';
        } else if (!customer) {
          // Check for duplicate customer names only when creating new customer
          const isDuplicate = existingCustomers.some(existingCustomer => 
            existingCustomer.customerName.toLowerCase() === value.toLowerCase()
          );
          if (isDuplicate) {
            error = 'Client name already exists';
          }
        }
        break;
        
      case 'gstinUin':
        if (value && value.length > 0) {
          // GSTIN validation - 15 characters alphanumeric
          if (!/^[0-9A-Z]{15}$/.test(value)) {
            error = 'GSTIN/UIN must be 15 characters alphanumeric';
          }
        }
        break;
        
      case 'customerEmail':
        if (!value.trim()) {
          error = 'Client email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'invoiceEmail':
        if (!value.trim()) {
          error = 'Invoice email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'address':
        if (!value.trim()) {
          error = 'Street address is required';
        } else if (value.trim().length < 5) {
          error = 'Address must be at least 5 characters long';
        } else if (value.trim().length > 200) {
          error = 'Address must be less than 200 characters';
        }
        break;
        
      case 'city':
        if (!value.trim()) {
          error = 'City is required';
        } else if (value.trim().length < 2) {
          error = 'City must be at least 2 characters long';
        } else if (value.trim().length > 50) {
          error = 'City must be less than 50 characters';
        } else if (!/^[a-zA-Z\s\-']+$/.test(value.trim())) {
          error = 'City can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
        
      case 'state':
        if (!value.trim()) {
          error = 'State/Province is required';
        } else if (value.trim().length < 2) {
          error = 'State/Province must be at least 2 characters long';
        } else if (value.trim().length > 50) {
          error = 'State/Province must be less than 50 characters';
        } else if (!/^[a-zA-Z\s\-']+$/.test(value.trim())) {
          error = 'State/Province can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
        
      case 'stateCode':
        if (value && value.length > 0) {
          // State code must be exactly 2 digits
          if (!/^\d{2}$/.test(value)) {
            error = 'State code must be exactly 2 digits';
          }
        }
        break;
        
      case 'zipCode':
        if (!value.trim()) {
          error = 'ZIP/Postal code is required';
        } else if (!/^[a-zA-Z0-9\s\-]+$/.test(value.trim())) {
          error = 'ZIP/Postal code can only contain letters, numbers, spaces, and hyphens';
        } else if (value.trim().length < 3) {
          error = 'ZIP/Postal code must be at least 3 characters long';
        } else if (value.trim().length > 20) {
          error = 'ZIP/Postal code must be less than 20 characters';
        }
        break;
        
      case 'country':
        if (!value.trim()) {
          error = 'Country is required';
        } else if (value.trim().length < 2) {
          error = 'Country must be at least 2 characters long';
        } else if (value.trim().length > 50) {
          error = 'Country must be less than 50 characters';
        } else if (!/^[a-zA-Z\s\-']+$/.test(value.trim())) {
          error = 'Country can only contain letters, spaces, hyphens, and apostrophes';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

  const fetchRelevantProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      // Filter for all relevant project stages
      const relevantProjects = response.data.filter(project => 
        project.stage === 'awarded' || 
        project.stage === 'under_execution' || 
        project.stage === 'completed' || 
        project.stage === 'post_implementation'
      );
      setProjects(relevantProjects);
    } catch (error) {
      console.error('Error fetching relevant projects:', error);
    }
  };

  // Get unique customer names from all relevant project stages
  const getUniqueCustomers = () => {
    const customerNames = [...new Set(projects.map(project => project.customerName))].filter(Boolean);
    return customerNames.sort();
  };

  const handleCustomerSelect = (customerName) => {
    setSelectedCustomer(customerName);
    
    if (customerName) {
      // Find all awarded projects for this customer
      const customerProjects = projects.filter(project => project.customerName === customerName);
      setSelectedProjects(customerProjects);
      
      // Set the customer name in the form
      setFormData(prev => ({
        ...prev,
        customerName: customerName
      }));
    } else {
      // Clear selection
      setSelectedProjects([]);
      setFormData(prev => ({
        ...prev,
        customerName: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({ ...prev, [name]: true }));
    }

    // Show tooltip when user starts typing
    if (name === 'gstinUin' && value.length > 0 && !showGstinTooltip) {
      setShowGstinTooltip(true);
    }
    
    if (name === 'stateCode' && value.length > 0 && !showStateCodeTooltip) {
      setShowStateCodeTooltip(true);
    }

    // Format validation for specific fields
    let validatedValue = value;
    if (name === 'customerName') {
      // Allow only letters, spaces, and common punctuation
      validatedValue = value.replace(/[^a-zA-Z\s\-\'\.]/g, '').slice(0, 50);
    } else if (name === 'gstinUin') {
      // Convert to uppercase and allow only alphanumeric characters
      validatedValue = value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    } else if (name === 'customerEmail' || name === 'invoiceEmail') {
      // No formatting, just store as-is for email validation
      validatedValue = value.toLowerCase();
    } else if (name === 'address') {
      validatedValue = value.slice(0, 200);
    } else if (name === 'city' || name === 'state' || name === 'country') {
      validatedValue = value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 50);
    } else if (name === 'stateCode') {
      // Allow only digits, max 2
      validatedValue = value.replace(/\D/g, '').slice(0, 2);
    } else if (name === 'zipCode') {
      validatedValue = value.replace(/[^a-zA-Z0-9\s\-]/g, '').slice(0, 20);
    }

    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));

    // Validate field in real-time
    const fieldError = validateField(name, validatedValue);
    if (fieldError) {
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    } else if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({ ...prev, [name]: true }));
    }
    
    // Hide tooltip on blur
    if (name === 'gstinUin' && value.length === 0) {
      setShowGstinTooltip(false);
    }
    
    if (name === 'stateCode' && value.length === 0) {
      setShowStateCodeTooltip(false);
    }
    
    // Validate on blur
    const fieldError = validateField(name, value);
    if (fieldError) {
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleFocus = (e) => {
    const { name } = e.target;
    
    // Show tooltip on focus if field has content
    if (name === 'gstinUin' && formData.gstinUin.length > 0) {
      setShowGstinTooltip(true);
    }
    
    if (name === 'stateCode' && formData.stateCode.length > 0) {
      setShowStateCodeTooltip(true);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const fieldsToValidate = [
      'customerName',
      'gstinUin',
      'customerEmail',
      'invoiceEmail',
      'address',
      'city',
      'state',
      'stateCode',
      'zipCode',
      'country'
    ];
    
    fieldsToValidate.forEach(field => {
      const value = formData[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Please fix all validation errors before submitting.');
      return;
    }

    setLoading(true);
    try {
      if (customer) {
        await customersAPI.update(customer._id, formData);
        showSuccess('Customer updated successfully!');
      } else {
        await customersAPI.create(formData);
        showSuccess('Customer created successfully!');
      }
      onSubmit();
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
        showError(error.response.data.message);
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
        showError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if form is complete and valid
  const isFormComplete = () => {
    const requiredFields = [
      'customerName',
      'customerEmail',
      'invoiceEmail',
      'address',
      'city',
      'state',
      'zipCode',
      'country'
    ];
    
    return requiredFields.every(field => {
      const value = formData[field];
      const error = validateField(field, value);
      return !error && value && value.trim() !== '';
    });
  };

  // Prepare options for the customer select dropdown
  const customerOptions = [
    { value: '', label: 'Select customer from awarded projects' },
    ...getUniqueCustomers().map(customerName => ({
      value: customerName,
      label: customerName
    }))
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 -mr-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}
          
          {/* Customer Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Customer Information
            </h3>
            
            {/* Customer Name and GSTIN/UIN in a row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <FloatingInput
                type="text"
                name="customerName"
                  label="Client Name"
                value={formData.customerName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.customerName}
                required={true}
                maxLength={50}
              />
            </div>
              <div className="relative">
                <FloatingInput
                  type="text"
                  name="gstinUin"
                  label="GSTIN/UIN"
                  value={formData.gstinUin}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  error={errors.gstinUin}
                  required={true}
                  maxLength={15}
                />
                {/* {showGstinTooltip && (
                  <div className="absolute right-0 top-0 mt-8 z-10">
                    <div className="relative">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 w-48">
                        <div className="font-semibold mb-1">GSTIN/UIN Format:</div>
                        <div className="font-mono text-xs">• 15 characters</div>
                        <div className="font-mono text-xs">• Alphanumeric (0-9, A-Z)</div>
                        <div className="font-mono text-xs">• Example: 27ABCDE1234F1Z5</div>
                      </div>
                      <div className="absolute -top-2 right-2">
                        <div className="w-3 h-3 bg-gray-900 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )} */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                type="email"
                name="customerEmail"
                label="Client Email"
                value={formData.customerEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.customerEmail}
                required={true}
              />

              <FloatingInput
                type="email"
                name="invoiceEmail"
                label="Invoice Email"
                value={formData.invoiceEmail}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.invoiceEmail}
                required={true}
              />
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Billing Address
            </h3>
            
            <FloatingInput
              type="text"
              name="address"
              label="Street Address"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address}
              required={true}
              rows={3}
              maxLength={200}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FloatingInput
                type="text"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.city}
                required={true}
                maxLength={50}
              />

              <FloatingInput
                type="text"
                name="state"
                label="State/Province"
                value={formData.state}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.state}
                required={true}
                maxLength={50}
              />

              <div className="relative">
                <FloatingInput
                  type="text"
                  name="stateCode"
                  label="State Code"
                  value={formData.stateCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={handleFocus}
                  error={errors.stateCode}
                  maxLength={2}
                />
                {/* {showStateCodeTooltip && (
                  <div className="absolute right-0 top-0 mt-8 z-10">
                    <div className="relative">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 w-48">
                        <div className="font-semibold mb-1">State Code Format:</div>
                        <div className="font-mono text-xs">• 2 digits only</div>
                        <div className="font-mono text-xs">• Numeric (0-9)</div>
                        <div className="font-mono text-xs">• Example: 27 (for Maharashtra)</div>
                      </div>
                      <div className="absolute -top-2 right-2">
                        <div className="w-3 h-3 bg-gray-900 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                )} */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                type="text"
                name="zipCode"
                label="ZIP/Postal Code"
                value={formData.zipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.zipCode}
                required={true}
                maxLength={20}
              />

              <FloatingInput
                type="text"
                name="country"
                label="Country"
                value={formData.country}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.country}
                required={true}
                maxLength={50}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Action Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
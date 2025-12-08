import React, { useState, useEffect } from 'react';
import { customersAPI, projectsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; 

const CustomerForm = ({ customer, onSubmit, onCancel, existingCustomers = [] }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    invoiceEmail: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  });
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);

  useEffect(() => {
    fetchRelevantProjects();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName || '',
        customerEmail: customer.customerEmail || '',
        invoiceEmail: customer.invoiceEmail || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
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

  // Handle manual customer name input (for edit mode)
  const handleCustomerNameChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      customerName: value
    }));
    
    if (errors.customerName) {
      setErrors(prev => ({
        ...prev,
        customerName: ''
      }));
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

  const validateForm = () => {
    const newErrors = {};

    // Customer Name validation
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (!customer) {
      // Check for duplicate customer names only when creating new customer
      const isDuplicate = existingCustomers.some(existingCustomer => 
        existingCustomer.customerName.toLowerCase() === formData.customerName.toLowerCase()
      );
      if (isDuplicate) {
        newErrors.customerName = 'Customer name already exists';
      }
    }
    
    // Email validations
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Customer email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Customer email is invalid';
    }
    
    if (!formData.invoiceEmail.trim()) {
      newErrors.invoiceEmail = 'Invoice email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.invoiceEmail)) {
      newErrors.invoiceEmail = 'Invoice email is invalid';
    }
    
    // Address validations
    if (!formData.address.trim()) {
      newErrors.address = 'Street address is required';
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters long';
    } else if (formData.address.trim().length > 200) {
      newErrors.address = 'Address must be less than 200 characters';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      newErrors.city = 'City must be at least 2 characters long';
    } else if (formData.city.trim().length > 50) {
      newErrors.city = 'City must be less than 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.city.trim())) {
      newErrors.city = 'City can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State/Province is required';
    } else if (formData.state.trim().length < 2) {
      newErrors.state = 'State/Province must be at least 2 characters long';
    } else if (formData.state.trim().length > 50) {
      newErrors.state = 'State/Province must be less than 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.state.trim())) {
      newErrors.state = 'State/Province can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP/Postal code is required';
    } else if (!/^[a-zA-Z0-9\s\-]+$/.test(formData.zipCode.trim())) {
      newErrors.zipCode = 'ZIP/Postal code can only contain letters, numbers, spaces, and hyphens';
    } else if (formData.zipCode.trim().length < 3) {
      newErrors.zipCode = 'ZIP/Postal code must be at least 3 characters long';
    } else if (formData.zipCode.trim().length > 20) {
      newErrors.zipCode = 'ZIP/Postal code must be less than 20 characters';
    }
    
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    } else if (formData.country.trim().length < 2) {
      newErrors.country = 'Country must be at least 2 characters long';
    } else if (formData.country.trim().length > 50) {
      newErrors.country = 'Country must be less than 50 characters';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.country.trim())) {
      newErrors.country = 'Country can only contain letters, spaces, hyphens, and apostrophes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (customer) {
        await customersAPI.update(customer._id, formData);
      } else {
        await customersAPI.create(formData);
      }
      onSubmit();
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
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
            
            {/* Customer Name */}
            <div className="relative">
              <FloatingInput
                type="text"
                name="customerName"
                label="Customer Name"
                value={formData.customerName}
                onChange={handleChange}
                error={errors.customerName}
                required={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                type="email"
                name="customerEmail"
                label="Customer Email"
                value={formData.customerEmail}
                onChange={handleChange}
                error={errors.customerEmail}
                required={true}
              />

              <FloatingInput
                type="email"
                name="invoiceEmail"
                label="Invoice Email"
                value={formData.invoiceEmail}
                onChange={handleChange}
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
              error={errors.address}
              required={true}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                type="text"
                name="city"
                label="City"
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
                required={true}
              />

              <FloatingInput
                type="text"
                name="state"
                label="State/Province"
                value={formData.state}
                onChange={handleChange}
                error={errors.state}
                required={true}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                type="text"
                name="zipCode"
                label="ZIP/Postal Code"
                value={formData.zipCode}
                onChange={handleChange}
                error={errors.zipCode}
                required={true}
              />

              <FloatingInput
                type="text"
                name="country"
                label="Country"
                value={formData.country}
                onChange={handleChange}
                error={errors.country}
                required={true}
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
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
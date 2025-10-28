import React, { useState, useEffect } from 'react';
import { customersAPI, projectsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; 

const CustomerForm = ({ customer, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    invoiceEmail: '',
    billingAddress: ''
  });
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    fetchAwardedProjects();
  }, []);

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName || '',
        customerEmail: customer.customerEmail || '',
        invoiceEmail: customer.invoiceEmail || '',
        billingAddress: customer.billingAddress || ''
      });
    }
  }, [customer]);

  const fetchAwardedProjects = async () => {
    try {
      const response = await projectsAPI.getAll({ stage: 'awarded' });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching awarded projects:', error);
    }
  };

  const handleProjectSelect = (projectName) => {
    setSelectedProject(projectName);
    const project = projects.find(proj => proj.projectName === projectName);
    if (project) {
      setFormData(prev => ({
        ...prev,
        customerName: project.customerName || ''
      }));
    } else {
      // Clear customer name if no project selected
      setFormData(prev => ({
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

    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.customerEmail) newErrors.customerEmail = 'Customer email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) newErrors.customerEmail = 'Customer email is invalid';
    if (!formData.invoiceEmail) newErrors.invoiceEmail = 'Invoice email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.invoiceEmail)) newErrors.invoiceEmail = 'Invoice email is invalid';
    if (!formData.billingAddress) newErrors.billingAddress = 'Billing address is required';

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

  // Prepare options for the project select dropdown
  const projectOptions = [
    { value: '', label: 'Select from awarded projects' },
    ...projects.map(project => ({
      value: project.projectName,
      label: `${project.projectName} - ${project.customerName}`
    }))
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      {/* Project Selection Dropdown - Only shown when creating new customer */}
      {!customer && (
        <div>
          <FloatingInput
            type="select"
            name="projectSelect"
            label="Select from Awarded Projects"
            value={selectedProject}
            onChange={(e) => handleProjectSelect(e.target.value)}
            options={projectOptions}
          />
        </div>
      )}

      {/* Customer Name using FloatingInput in read-only mode */}
      <FloatingInput
        type="text"
        name="customerName"
        label="Customer Name"
        value={formData.customerName}
        readOnly={true}
        error={errors.customerName}
        required={true}
      />

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

      <FloatingInput
        type="textarea"
        name="billingAddress"
        label="Billing Address"
        value={formData.billingAddress}
        onChange={handleChange}
        error={errors.billingAddress}
        required={true}
        rows={3}
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
          {loading ? 'Saving...' : customer ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
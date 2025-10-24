import React, { useState, useEffect } from 'react';
import { customersAPI, vendorsAPI, qualityAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const QualityForm = ({ quality, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer: '',
    scopeOfWork: '',
    scopeOfWorkText: '',
    openIssues: '',
    category: '',
    status: 'open',
    responsibility: '',
    remarks: ''
  });
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const scopeOptions = ['Electrical', 'Data', 'CCTV', 'Partition', 'Fire and Safety', 'Access', 'Transportation'];
  const categoryOptions = ['rectify', 'replace'];
  const statusOptions = ['open', 'closed'];

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    
    if (quality) {
      setFormData({
        customer: quality.customer || '',
        scopeOfWork: quality.scopeOfWork || '',
        scopeOfWorkText: quality.scopeOfWorkText || '',
        openIssues: quality.openIssues || '',
        category: quality.category || '',
        status: quality.status || 'open',
        responsibility: quality.responsibility || '',
        remarks: quality.remarks || ''
      });
    }
  }, [quality]);

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

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.scopeOfWork) newErrors.scopeOfWork = 'Scope of work is required';
    if (!formData.openIssues) newErrors.openIssues = 'Open issues description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.responsibility) newErrors.responsibility = 'Responsibility is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (quality) {
        await qualityAPI.update(quality._id, formData);
      } else {
        await qualityAPI.create(formData);
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
          label="Scope of Work"
          name="scopeOfWork"
          value={formData.scopeOfWork}
          onChange={handleChange}
          error={errors.scopeOfWork}
          type="select"
          required={true}
          options={[
            { value: '', label: 'Select Scope' },
            ...scopeOptions.map(scope => ({
              value: scope,
              label: scope
            }))
          ]}
        />

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

        <FloatingInput
          label="Responsibility"
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
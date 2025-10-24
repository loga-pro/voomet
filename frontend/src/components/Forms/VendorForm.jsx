import React, { useState, useEffect } from 'react';
import { vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; // Adjust the import path as needed

const VendorForm = ({ vendor, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendorName: '',
    address: '',
    bankAccountNumber: '',
    email: '',
    gstNumber: '',
    mobileNumber: '',
    contactPerson: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendorName: vendor.vendorName || '',
        address: vendor.address || '',
        bankAccountNumber: vendor.bankAccountNumber || '',
        email: vendor.email || '',
        gstNumber: vendor.gstNumber || '',
        mobileNumber: vendor.mobileNumber || '',
        contactPerson: vendor.contactPerson || ''
      });
    }
  }, [vendor]);

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

    if (!formData.vendorName) newErrors.vendorName = 'Vendor name is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.bankAccountNumber) newErrors.bankAccountNumber = 'Bank account number is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.gstNumber) newErrors.gstNumber = 'GST number is required';
    if (!formData.mobileNumber) newErrors.mobileNumber = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Mobile number must be 10 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (vendor) {
        await vendorsAPI.update(vendor._id, formData);
      } else {
        await vendorsAPI.create(formData);
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
          label="Vendor Name"
          name="vendorName"
          type="text"
          value={formData.vendorName}
          onChange={handleChange}
          error={errors.vendorName}
          required={true}
        />

        <FloatingInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          required={true}
        />

        <FloatingInput
          label="GST Number"
          name="gstNumber"
          value={formData.gstNumber}
          onChange={handleChange}
          error={errors.gstNumber}
          required={true}
        />

        <FloatingInput
          label="Mobile Number"
          name="mobileNumber"
          type="number"
          value={formData.mobileNumber}
          onChange={handleChange}
          error={errors.mobileNumber}
          required={true}
          maxLength="10"
          pattern="[0-9]{10}"
        />

        <FloatingInput
          label="Contact Person"
          name="contactPerson"
          value={formData.contactPerson}
          onChange={handleChange}
          error={errors.contactPerson}
        />

        <FloatingInput
          label="Bank Account Number"
          name="bankAccountNumber"
          type="number"
          value={formData.bankAccountNumber}
          onChange={handleChange}
          error={errors.bankAccountNumber}
          required={true}
        />
      </div>

      <FloatingInput
        label="Address"
        name="address"
        type="textarea"
        value={formData.address}
        onChange={handleChange}
        error={errors.address}
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
          {loading ? 'Saving...' : vendor ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default VendorForm;
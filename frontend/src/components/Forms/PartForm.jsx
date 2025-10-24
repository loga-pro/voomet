import React, { useState, useEffect } from 'react';
import { partsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; // Adjust the import path as needed

const PartForm = ({ part, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    scopeOfWork: '',
    partName: '',
    category: '',
    unitType: '',
    partPrice: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const scopeOptions = [
    { value: 'electrical', label: 'ELECTRICAL' },
    { value: 'data', label: 'DATA' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'partion', label: 'PARTION' },
    { value: 'fire_and_safety', label: 'FIRE AND SAFETY' },
    { value: 'access', label: 'ACCESS' }
  ];

  const categoryOptions = [
    { value: 'inhouse', label: 'INHOUSE' },
    { value: 'out_sourced', label: 'OUT SOURCED' },
    { value: 'bought_out', label: 'BOUGHT OUT' }
  ];

  const unitTypeOptions = [
    { value: 'sq_feet', label: 'SQ FEET' },
    { value: 'number', label: 'NUMBER' },
    { value: 'meter', label: 'METER' }
  ];

  useEffect(() => {
    if (part) {
      setFormData({
        scopeOfWork: part.scopeOfWork || 'electrical',
        partName: part.partName || '',
        category: part.category || 'inhouse',
        unitType: part.unitType || 'sq_feet',
        partPrice: part.partPrice || ''
      });
    }
  }, [part]);

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

    if (!formData.partName) newErrors.partName = 'Part name is required';
    if (!formData.partPrice) newErrors.partPrice = 'Part price is required';
    else if (isNaN(formData.partPrice) || parseFloat(formData.partPrice) <= 0) {
      newErrors.partPrice = 'Part price must be a valid number greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        partPrice: parseFloat(formData.partPrice)
      };

      if (part) {
        await partsAPI.update(part._id, submitData);
      } else {
        await partsAPI.create(submitData);
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

      <FloatingInput
        label="Scope of Work"
        name="scopeOfWork"
        value={formData.scopeOfWork}
        onChange={handleChange}
        type="select"
        options={scopeOptions}
        required
      />

      <FloatingInput
        label="Part Name"
        name="partName"
        value={formData.partName}
        onChange={handleChange}
        type="text"
        error={errors.partName}
        required
      />

      <FloatingInput
        label="Category"
        name="category"
        value={formData.category}
        onChange={handleChange}
        type="select"
        options={categoryOptions}
        required
      />

      <FloatingInput
        label="Unit Type"
        name="unitType"
        value={formData.unitType}
        onChange={handleChange}
        type="select"
        options={unitTypeOptions}
        required
      />

      <FloatingInput
        label="Part Price (₹)"
        name="partPrice"
        value={formData.partPrice}
        onChange={handleChange}
        type="number"
        error={errors.partPrice}
        step="0.01"
        min="0"
        required
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
          {loading ? 'Saving...' : part ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default PartForm;
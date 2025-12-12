import React, { useState, useEffect } from 'react';
import { partsAPI, vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput'; 

const PartForm = ({ part, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    scopeOfWork: '',
    partName: '',
    category: '',
    unitType: '',
    partPrice: '',
    vendorName: '',
    reorderLevel: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [existingParts, setExistingParts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const scopeOptions = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'data', label: 'Data' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'partion', label: 'Partition' },
    { value: 'fire_and_safety', label: 'Fire and Safety' },
    { value: 'access', label: 'Access' }
  ];

  const categoryOptions = [
    { value: 'inhouse', label: 'Inhouse' },   
    { value: 'out_sourced', label: 'Out Sourced' },
    { value: 'bought_out', label: 'Bought Out' }
  ];

  useEffect(() => {
    if (part) {
      setFormData({
        scopeOfWork: part.scopeOfWork || 'electrical',
        partName: part.partName || '',
        category: part.category || 'inhouse',
        unitType: part.unitType || '',
        partPrice: part.partPrice || '',
        vendorName: part.vendorName || '',
        reorderLevel: part.reorderLevel || ''
      });
    }
  }, [part]);

  // Fetch existing parts for duplicate validation
  useEffect(() => {
    const fetchExistingParts = async () => {
      try {
        const response = await partsAPI.getAll();
        setExistingParts(response.data || []);
      } catch (error) {
        console.error('Error fetching existing parts:', error);
      }
    };
    fetchExistingParts();
  }, []);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await vendorsAPI.getAll();
        setVendors(response.data || []);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    fetchVendors();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'partPrice') {
      // Allow empty string or validate 8 digits and 2 decimals (max 99999999.99)
      if (value === '' || /^\d{0,8}(\.\d{0,2})?$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'reorderLevel') {
      // Allow empty string or validate up to 8 digits (integers only, no decimals)
      if (value === '' || /^\d{0,8}$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'partName') {
      // Allow up to 25 characters with alphabets and spaces only (no numbers or special characters)
      // Only allow letters (a-z, A-Z) and spaces
      if (value.length <= 25 && /^[a-zA-Z\s]*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'unitType') {
      // Allow letters, spaces, numbers and common unit characters (/, -, ., _)
      if (value.length <= 20 && /^[a-zA-Z0-9\s\/\-\.\_]*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (name === 'vendorName') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.scopeOfWork) {
      newErrors.scopeOfWork = 'Scope of work is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    // Validate vendor name for outsource and bought out categories
    if ((formData.category === 'out_sourced' || formData.category === 'bought_out') && 
        (!formData.vendorName || !formData.vendorName.trim())) {
      newErrors.vendorName = 'Vendor name is required for outsource and bought out categories';
    }

    if (!formData.partName.trim()) {
      newErrors.partName = 'Part name is required';
    } else if (/\d/.test(formData.partName)) {
      newErrors.partName = 'Part name should not contain numbers';
    } else if (/[^a-zA-Z\s]/.test(formData.partName)) {
      newErrors.partName = 'Part name should not contain special characters';
    } else if (formData.partName.length > 25) {
      newErrors.partName = 'Part name cannot exceed 25 characters';
    }

    if (!formData.unitType || !formData.unitType.trim()) {
      newErrors.unitType = 'Unit type is required';
    } else if (formData.unitType.trim().length < 2) {
      newErrors.unitType = 'Unit type must be at least 2 characters';
    }

    if (!formData.partPrice) newErrors.partPrice = 'Part price is required';
    else if (isNaN(formData.partPrice) || parseFloat(formData.partPrice) <= 0) {
      newErrors.partPrice = 'Part price must be a valid number greater than 0';
    } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(formData.partPrice)) {
      newErrors.partPrice = 'Part price must be maximum 8 digits and 2 decimal places (e.g., 99999999.99)';
    } else if (parseFloat(formData.partPrice) > 99999999.99) {
      newErrors.partPrice = 'Part price cannot exceed 99999999.99';
    }

    // Check for duplicate part name, category, and scope of work combination (case-insensitive)
    if (formData.partName.trim() && formData.category && formData.scopeOfWork) {
      const trimmedPartName = formData.partName.trim().toLowerCase();
      const duplicateExists = existingParts.some(existingPart => {
        const existingPartName = existingPart.partName.toLowerCase();
        const existingCategory = existingPart.category;
        const existingScopeOfWork = existingPart.scopeOfWork;
        
        // Case-insensitive comparison for all three fields
        const isSamePart = existingPartName === trimmedPartName && 
                          existingCategory === formData.category &&
                          existingScopeOfWork === formData.scopeOfWork;
        
        // If editing, exclude the current part from duplicate check
        return part ? (isSamePart && existingPart._id !== part._id) : isSamePart;
      });
      
      if (duplicateExists) {
        newErrors.partName = 'A part with this name, category, and scope of work already exists';
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
      // Check if user is authenticated
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Clean up the data before submission
      const submitData = {
        scopeOfWork: formData.scopeOfWork,
        partName: formData.partName.trim(),
        category: formData.category,
        unitType: formData.unitType.trim(),
        partPrice: parseFloat(formData.partPrice),
        // Only include vendorName if it has a value
        ...(formData.vendorName && formData.vendorName.trim() && { vendorName: formData.vendorName.trim() }),
        // Include reorderLevel (default to 0 if empty)
        reorderLevel: formData.reorderLevel ? parseInt(formData.reorderLevel) : 0
      };

      console.log('Submitting part data:', JSON.stringify(submitData, null, 2));
      console.log('Form data before processing:', JSON.stringify(formData, null, 2));

      if (part) {
        await partsAPI.update(part._id, submitData);
      } else {
        await partsAPI.create(submitData);
      }
      onSubmit();
    } catch (error) {
      console.error('Full error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.response?.data?.message);
      console.error('Error errors object:', error.response?.data?.errors);
      
      if (error.response?.data?.errors) {
        // Handle validation errors from backend
        const backendErrors = {};
        for (let field in error.response.data.errors) {
          backendErrors[field] = error.response.data.errors[field];
        }
        setErrors(backendErrors);
      } else if (error.response?.data?.message) {
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
        disabled={!!part}
        error={errors.scopeOfWork}
        required
      />
      
      <FloatingInput
        label="Category"
        name="category"
        value={formData.category}
        onChange={handleChange}
        type="select"
        options={categoryOptions}
        error={errors.category}
        required
      />

      {(formData.category === 'out_sourced' || formData.category === 'bought_out') && (
        <FloatingInput
          label="Vendor Name"
          name="vendorName"
          value={formData.vendorName || ''}
          onChange={handleChange}
          type="select"
          options={vendors.map(v => ({ value: v.vendorName, label: v.vendorName }))}
          error={errors.vendorName}
          required={formData.category === 'out_sourced' || formData.category === 'bought_out'}
        />
      )}

      <FloatingInput
        label="Part Name"
        name="partName"
        value={formData.partName}
        onChange={handleChange}
        type="text"
        error={errors.partName}
        maxLength={25}
        required
      />

      

      <FloatingInput
        label="Unit Type"
        name="unitType"
        value={formData.unitType}
        onChange={handleChange}
        type="text"
        error={errors.unitType}
        maxLength={20}
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
        max="99999999.99"
        required
      />

      <FloatingInput
        label="Reorder Level"
        name="reorderLevel"
        value={formData.reorderLevel}
        onChange={handleChange}
        type="number"
        error={errors.reorderLevel}
        min="0"
        max="99999999"
        step="1"
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
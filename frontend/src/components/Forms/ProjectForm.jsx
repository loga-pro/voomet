import React, { useState, useEffect } from 'react';
import { projectsAPI, partsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const ProjectForm = ({ project, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    enquiryDate: '',
    scopeOfWork: [],
    stage: '',
    totalProjectValue: '',
    projectName: ''
  });
  const [scopeOptions, setScopeOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const stageOptions = [
    { value: 'rfq', label: 'RFQ' },
    { value: 'boq', label: 'BOQ' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'under_execution', label: 'Under Execution' },
    { value: 'completed', label: 'Completed' },
    { value: 'post_implementation', label: 'Post Implementation' }
  ];

  useEffect(() => {
    fetchScopeOptions();
    
    if (project) {
      setFormData({
        customerName: project.customerName || '',
        enquiryDate: project.enquiryDate ? new Date(project.enquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        scopeOfWork: project.scopeOfWork || [],
        stage: project.stage || 'rfq',
        totalProjectValue: project.totalProjectValue || '',
        projectName: project.projectName || ''
      });
    }
  }, [project]);

  const fetchScopeOptions = async () => {
    try {
      const response = await partsAPI.getAll();
      const scopes = [...new Set(response.data.map(part => part.scopeOfWork))];
      setScopeOptions(scopes);
    } catch (error) {
      console.error('Error fetching scope options:', error);
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

  const handleScopeChange = (scope) => {
    setFormData(prev => ({
      ...prev,
      scopeOfWork: prev.scopeOfWork.includes(scope)
        ? prev.scopeOfWork.filter(s => s !== scope)
        : [...prev.scopeOfWork, scope]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.projectName) newErrors.projectName = 'Project name is required';
    if (!formData.enquiryDate) newErrors.enquiryDate = 'Enquiry date is required';
    if (!formData.totalProjectValue) newErrors.totalProjectValue = 'Project value is required';
    else if (isNaN(formData.totalProjectValue) || parseFloat(formData.totalProjectValue) <= 0) {
      newErrors.totalProjectValue = 'Project value must be a valid number greater than 0';
    }
    if (formData.scopeOfWork.length === 0) newErrors.scopeOfWork = 'At least one scope of work is required';

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
        totalProjectValue: parseFloat(formData.totalProjectValue)
      };

      if (project) {
        await projectsAPI.update(project._id, submitData);
      } else {
        await projectsAPI.create(submitData);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {errors.submit}
        </div>
      )}

      <FloatingInput
        label="Customer Name"
        name="customerName"
        value={formData.customerName}
        onChange={handleChange}
        error={errors.customerName}
        required
      />

      <FloatingInput
        label="Project Name"
        name="projectName"
        value={formData.projectName}
        onChange={handleChange}
        error={errors.projectName}
        required
      />

      <FloatingInput
        label="Enquiry Date"
        name="enquiryDate"
        type="date"
        value={formData.enquiryDate}
        onChange={handleChange}
        error={errors.enquiryDate}
        required
      />

      <FloatingInput
        label="Stage"
        name="stage"
        type="select"
        value={formData.stage}
        onChange={handleChange}
        options={stageOptions}
        required
      />

      <FloatingInput
        label="Total Project Value (₹)"
        name="totalProjectValue"
        type="number"
        value={formData.totalProjectValue}
        onChange={handleChange}
        error={errors.totalProjectValue}
        step="0.01"
        min="0"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Scope of Work * {errors.scopeOfWork && <span className="text-red-600 text-sm">- {errors.scopeOfWork}</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {scopeOptions.map(scope => (
            <button
              key={scope}
              type="button"
              onClick={() => handleScopeChange(scope)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                formData.scopeOfWork.includes(scope)
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {scope.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

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
          {loading ? 'Saving...' : project ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
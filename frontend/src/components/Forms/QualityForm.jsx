import React, { useState, useEffect } from 'react';
import { customersAPI, vendorsAPI, projectsAPI, employeesAPI, qualityAPI } from '../../services/api';
import FloatingInput from './FloatingInput';

const QualityForm = ({ quality, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    customer: '',
    projectName: '',
    openIssues: '',
    category: '',
    status: 'open',
    qualityIssues: []  // Array for quality issues
  });

  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // State for new quality issue form
  const [newIssue, setNewIssue] = useState({
    dateOfIssue: '',
    scopeOfWork: '',
    reason: '',
    description: '',
    dateOfDamage: '',
    damageImage: null,
    dateOfFixed: '',
    remarks: '',
    fixedImage: null,
    personType: '',
    responsiblePerson: ''
  });

  const [editingIssueIndex, setEditingIssueIndex] = useState(null);
  const [imagePreview, setImagePreview] = useState({ show: false, url: '', title: '' });

  const allScopeOptions = [
    { value: 'electrical', label: 'Electrical' },
    { value: 'data', label: 'Data' },
    { value: 'cctv', label: 'CCTV' },
    { value: 'partition', label: 'Partition' },
    { value: 'fire_and_safety', label: 'Fire and Safety' },
    { value: 'access', label: 'Access' },
    { value: 'transportation', label: 'Transportation' }
  ];

  const categoryOptions = ['rectify', 'replace', 'possible', 'not possible', 'reject'];
  const statusOptions = ['open', 'closed', 'in-progress'];
  const reasonOptions = ['Damaged', 'Missing', 'Wrong Installation', 'Other'];

  useEffect(() => {
    fetchCustomers();
    fetchVendors();
    fetchEmployees();
    fetchProjects();

    if (quality) {
      console.log('Loading quality record:', quality);

      // Initialize qualityIssues from existing data or empty array
      const qualityIssues = quality.qualityIssues || [];

      setFormData({
        customer: quality.customer || '',
        projectName: quality.projectName || '',
        openIssues: quality.openIssues || '',
        category: quality.category || '',
        status: quality.status || 'open',
        qualityIssues: qualityIssues
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

    if (name === 'customer') {
      setFormData(prev => ({
        ...prev,
        customer: value,
        projectName: ''
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

  // Handle new issue form changes
  const handleNewIssueChange = async (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file' && files[0]) {
      // Upload image immediately when selected
      try {
        const response = await qualityAPI.uploadImage(files[0]);
        const imageUrl = response.data.imageUrl;

        setNewIssue(prev => ({
          ...prev,
          [name]: imageUrl // Store the URL instead of the file object
        }));
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      }
    } else {
      // If person type changes, clear responsible person
      if (name === 'personType') {
        setNewIssue(prev => ({
          ...prev,
          [name]: value,
          responsiblePerson: '' // Clear responsible person when type changes
        }));
      } else {
        setNewIssue(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
  };

  // Edit existing quality issue
  const editIssue = (index) => {
    const issue = formData.qualityIssues[index];

    // Helper function to convert ISO date to yyyy-MM-dd format
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Reverse mapping from saved values (title case) to form values (lowercase)
    const reverseScopeMapping = {
      'Electrical': 'electrical',
      'Data': 'data',
      'CCTV': 'cctv',
      'Partition': 'partition',
      'Fire and Safety': 'fire_and_safety',
      'Access': 'access',
      'Transportation': 'transportation'
    };

    setNewIssue({
      dateOfIssue: formatDateForInput(issue.dateOfIssue),
      scopeOfWork: reverseScopeMapping[issue.scopeOfWork] || issue.scopeOfWork || '',
      reason: issue.reason || '',
      description: issue.description || '',
      dateOfDamage: formatDateForInput(issue.dateOfDamage),
      damageImage: null,
      dateOfFixed: formatDateForInput(issue.dateOfFixed),
      remarks: issue.remarks || '',
      fixedImage: null,
      personType: issue.personType || '',
      responsiblePerson: issue.responsiblePerson || ''
    });
    setEditingIssueIndex(index);

    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add new quality issue to the table or update existing one
  const addNewIssue = () => {
    if (!newIssue.dateOfIssue || !newIssue.scopeOfWork || !newIssue.reason || !newIssue.description) {
      alert('Please fill in all required fields (Date of Issue, Scope of Work, Reason, Description)');
      return;
    }

    // Don't add a temporary ID - let MongoDB generate it
    const newIssueWithoutId = {
      ...newIssue
    };

    if (editingIssueIndex !== null) {
      // Update existing issue
      setFormData(prev => ({
        ...prev,
        qualityIssues: prev.qualityIssues.map((issue, index) =>
          index === editingIssueIndex ? newIssueWithoutId : issue
        )
      }));
      setEditingIssueIndex(null);
    } else {
      // Add new issue
      setFormData(prev => ({
        ...prev,
        qualityIssues: [...prev.qualityIssues, newIssueWithoutId]
      }));
    }

    // Reset new issue form
    setNewIssue({
      dateOfIssue: '',
      scopeOfWork: '',
      reason: '',
      description: '',
      dateOfDamage: '',
      damageImage: null,
      dateOfFixed: '',
      remarks: '',
      fixedImage: null,
      personType: '',
      responsiblePerson: ''
    });
  };

  // Remove quality issue from table
  const removeIssue = (index) => {
    setFormData(prev => ({
      ...prev,
      qualityIssues: prev.qualityIssues.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.openIssues) newErrors.openIssues = 'Open issues description is required';
    if (!formData.category) newErrors.category = 'Category is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    console.log('Form data before cleaning:', formData);

    // Scope mapping for quality issues
    const scopeMapping = {
      'electrical': 'Electrical',
      'data': 'Data',
      'cctv': 'CCTV',
      'partition': 'Partition',
      'fire_and_safety': 'Fire and Safety',
      'access': 'Access',
      'transportation': 'Transportation'
    };

    // Map quality issues to ensure scope of work values are properly formatted
    const mappedQualityIssues = formData.qualityIssues.map(issue => {
      const cleanIssue = {
        ...issue,
        scopeOfWork: scopeMapping[issue.scopeOfWork] || issue.scopeOfWork,
        // Remove any _id field if it exists (MongoDB will generate it)
        _id: undefined
      };

      // Images are now URLs (strings), not File objects, so no need to delete them

      return cleanIssue;
    });

    const cleanedData = {
      customer: formData.customer?.trim() || undefined,
      projectName: formData.projectName?.trim() || undefined,
      openIssues: formData.openIssues?.trim() || undefined,
      category: formData.category?.trim() || undefined,
      status: formData.status?.trim() || 'open',
      qualityIssues: mappedQualityIssues
    };

    console.log('Cleaned data before removing undefined:', cleanedData);

    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    // Clean up qualityIssues to remove undefined _id fields
    if (cleanedData.qualityIssues) {
      cleanedData.qualityIssues = cleanedData.qualityIssues.map(issue => {
        const cleanIssue = { ...issue };
        if (cleanIssue._id === undefined) {
          delete cleanIssue._id;
        }
        return cleanIssue;
      });
    }

    console.log('Final data being submitted:', cleanedData);

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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get scope label from value
  const getScopeLabel = (scopeValue) => {
    const scope = allScopeOptions.find(s => s.value === scopeValue);
    return scope ? scope.label : scopeValue;
  };

  // Handle image preview
  const handleImagePreview = (imageUrl, title) => {
    // Construct full URL - imageUrl is like "/uploads/quality/filename.jpg"
    const fullUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `http://voomet.onrender.com${imageUrl}`;
    setImagePreview({ show: true, url: fullUrl, title });
  };

  const closeImagePreview = () => {
    setImagePreview({ show: false, url: '', title: '' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] max-h-[800px]">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">

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
                  label="Project Name"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  type="select"
                  disabled={!formData.customer}
                  options={[
                    { value: '', label: formData.customer ? 'Select Project' : 'Select Customer First' },
                    ...projects
                      .filter(project => project.customerName === formData.customer)
                      .map(project => ({
                        value: project.projectName,
                        label: project.projectName
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
              </div>
            </div>

            {/* SECTION 2: Quality Issues Table */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">

              {/* Form to add new quality issue */}
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
  <h4 className="text-md font-medium text-gray-900 mb-6">
    {editingIssueIndex !== null ? 'Edit Quality Issue' : 'Add New Quality Issue'}
  </h4>

  {/* Form Fields Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Date of Issue */}
    <FloatingInput
      label="Date of Issue"
      name="dateOfIssue"
      value={newIssue.dateOfIssue}
      onChange={handleNewIssueChange}
      type="date"
      required={true}
    />

    {/* Scope of Work */}
    <FloatingInput
      label="Scope of Work"
      name="scopeOfWork"
      value={newIssue.scopeOfWork}
      onChange={handleNewIssueChange}
      type="select"
      required={true}
      options={[
        { value: '', label: 'Select Scope' },
        ...allScopeOptions.map(scope => ({
          value: scope.value,
          label: scope.label
        }))
      ]}
    />

    {/* Reason */}
    <FloatingInput
      label="Reason"
      name="reason"
      value={newIssue.reason}
      onChange={handleNewIssueChange}
      type="select"
      required={true}
      options={[
        { value: '', label: 'Select Reason' },
        ...reasonOptions.map(reason => ({
          value: reason,
          label: reason
        }))
      ]}
    />

    {/* Description - Full Width */}
    <div className="md:col-span-2 lg:col-span-3">
      <FloatingInput
        label="Description"
        name="description"
        value={newIssue.description}
        onChange={handleNewIssueChange}
        type="textarea"
        required={true}
        rows={3}
      />
    </div>

    {/* Date of Damage */}
    <FloatingInput
      label="Date of Damage"
      name="dateOfDamage"
      value={newIssue.dateOfDamage}
      onChange={handleNewIssueChange}
      type="date"
    />

    {/* Damage Image Upload */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Damage Image
      </label>
      <input
        type="file"
        name="damageImage"
        onChange={handleNewIssueChange}
        accept="image/*"
        className="block w-full text-sm text-gray-500 
          file:mr-4 file:py-2 file:px-4 
          file:rounded-md file:border-0 
          file:text-sm file:font-medium 
          file:bg-primary-50 file:text-primary-700 
          hover:file:bg-primary-100 
          focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    {/* Date of Fixed */}
    <FloatingInput
      label="Date of Fixed"
      name="dateOfFixed"
      value={newIssue.dateOfFixed}
      onChange={handleNewIssueChange}
      type="date"
    />

    {/* Fixed Image Upload */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Fixed Image
      </label>
      <input
        type="file"
        name="fixedImage"
        onChange={handleNewIssueChange}
        accept="image/*"
        className="block w-full text-sm text-gray-500 
          file:mr-4 file:py-2 file:px-4 
          file:rounded-md file:border-0 
          file:text-sm file:font-medium 
          file:bg-primary-50 file:text-primary-700 
          hover:file:bg-primary-100 
          focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    {/* Remarks */}
    <FloatingInput
      label="Remarks"
      name="remarks"
      value={newIssue.remarks}
      onChange={handleNewIssueChange}
      type="text"
    />

    {/* Person Type */}
    <FloatingInput
      label="Person Type"
      name="personType"
      value={newIssue.personType}
      onChange={handleNewIssueChange}
      type="select"
      options={[
        { value: '', label: 'Select Type' },
        { value: 'inhouse', label: 'Inhouse' },
        { value: 'outsourced', label: 'Outsourced' }
      ]}
    />

    {/* Responsible Person */}
    <FloatingInput
      label="Responsible Person"
      name="responsiblePerson"
      value={newIssue.responsiblePerson}
      onChange={handleNewIssueChange}
      type="select"
      disabled={!newIssue.personType}
      options={[
        { 
          value: '', 
          label: newIssue.personType ? 'Select Person' : 'Select Person Type First' 
        },
        ...(newIssue.personType === 'inhouse'
          ? employees.map(emp => ({
              value: emp.name,
              label: emp.name
            }))
          : newIssue.personType === 'outsourced'
            ? vendors.map(vendor => ({
                value: vendor.vendorName,
                label: vendor.vendorName
              }))
            : [])
      ]}
    />
  </div>

  {/* Action Buttons */}
  <div className="mt-8 flex justify-end items-center gap-3">
    {editingIssueIndex !== null && (
      <button
        type="button"
        onClick={() => {
          setEditingIssueIndex(null);
          setNewIssue({
            dateOfIssue: '',
            scopeOfWork: '',
            reason: '',
            description: '',
            dateOfDamage: '',
            damageImage: null,
            dateOfFixed: '',
            remarks: '',
            fixedImage: null,
            personType: '',
            responsiblePerson: ''
          });
        }}
        className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm 
          text-sm font-medium text-gray-700 bg-white 
          hover:bg-gray-50 focus:outline-none focus:ring-2 
          focus:ring-offset-2 focus:ring-primary-500 
          transition-colors"
      >
        Cancel Edit
      </button>
    )}
    
    <button
      type="button"
      onClick={addNewIssue}
      className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm 
        text-sm font-medium text-white bg-primary-600 
        hover:bg-primary-700 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-primary-500 
        transition-colors"
    >
      {editingIssueIndex !== null ? 'Update Issue' : 'Add Issue to Table'}
    </button>
  </div>
</div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Issues</h3>

              {/* Table for quality issues */}
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Issue
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scope of Work
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Person Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsible Person
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Damage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Damage Image
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date of Fixed
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fixed Image
                      </th>

                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.qualityIssues.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="px-6 py-4 text-center text-sm text-gray-500">
                          No quality issues added yet
                        </td>
                      </tr>
                    ) : (
                      formData.qualityIssues.map((issue, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(issue.dateOfIssue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getScopeLabel(issue.scopeOfWork)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.reason}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={issue.description}>
                              {issue.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.personType === 'inhouse' ? 'Inhouse' :
                              issue.personType === 'outsourced' ? 'Outsourced' : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.responsiblePerson || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(issue.dateOfDamage)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.damageImage ? (
                              <button
                                type="button"
                                onClick={() => handleImagePreview(issue.damageImage, 'Damage Image')}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Damage Image"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            ) : (
                              <span className="text-gray-400">No image</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={issue.remarks}>
                              {issue.remarks || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(issue.dateOfFixed)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.fixedImage ? (
                              <button
                                type="button"
                                onClick={() => handleImagePreview(issue.fixedImage, 'Fixed Image')}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Fixed Image"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            ) : (
                              <span className="text-gray-400">No image</span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => editIssue(index)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => removeIssue(index)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: Open Issues */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Open Issues</h3>
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

      {/* Image Preview Modal */}
      {imagePreview.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeImagePreview}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">{imagePreview.title}</h3>
              <button
                onClick={closeImagePreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={imagePreview.url}
              alt={imagePreview.title}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityForm;
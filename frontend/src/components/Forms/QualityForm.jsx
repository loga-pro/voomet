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
      const qualityIssues = (quality.qualityIssues || []).map(issue => ({
        ...issue,
        dateOfIssue: issue.dateOfIssue ? issue.dateOfIssue.split('T')[0] : '',
        dateOfDamage: issue.dateOfDamage ? issue.dateOfDamage.split('T')[0] : '',
        dateOfFixed: issue.dateOfFixed ? issue.dateOfFixed.split('T')[0] : ''
      }));

      setFormData({
        customer: quality.customer || '',
        projectName: quality.projectName || '',
        openIssues: quality.openIssues || '',
        category: quality.category || '',
        status: quality.status || 'open',
        qualityIssues: qualityIssues
      });
    } else {
      // Add one empty row when creating new quality record
      setFormData(prev => ({
        ...prev,
        qualityIssues: [{
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
        }]
      }));
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

  // Handle quality issue field changes
  const handleIssueChange = async (index, e) => {
    const { name, value, type, files } = e.target;

    setFormData(prev => {
      const updatedIssues = [...prev.qualityIssues];

      if (type === 'file' && files[0]) {
        // Upload image immediately when selected
        (async () => {
          try {
            const response = await qualityAPI.uploadImage(files[0]);
            const imageUrl = response.data.imageUrl;

            updatedIssues[index] = {
              ...updatedIssues[index],
              [name]: imageUrl
            };

            setFormData(prevForm => ({
              ...prevForm,
              qualityIssues: updatedIssues
            }));
          } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
          }
        })();

        return prev;
      } else {
        // If person type changes, clear responsible person
        if (name === 'personType') {
          updatedIssues[index] = {
            ...updatedIssues[index],
            [name]: value,
            responsiblePerson: ''
          };
        } else {
          updatedIssues[index] = {
            ...updatedIssues[index],
            [name]: value
          };
        }

        return {
          ...prev,
          qualityIssues: updatedIssues
        };
      }
    });
  };

  // Add new empty quality issue row
  const addNewIssueRow = () => {
    setFormData(prev => ({
      ...prev,
      qualityIssues: [
        ...prev.qualityIssues,
        {
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
        }
      ]
    }));
  };

  // Remove quality issue row
  const removeIssueRow = (index) => {
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

    // Validate each quality issue
    formData.qualityIssues.forEach((issue, index) => {
      if (!issue.dateOfIssue) {
        newErrors[`issue_date_${index}`] = 'Date of Issue is required for all issues';
      }
      if (!issue.scopeOfWork) {
        newErrors[`issue_scope_${index}`] = 'Scope of Work is required for all issues';
      }
      if (!issue.reason) {
        newErrors[`issue_reason_${index}`] = 'Reason is required for all issues';
      }
      if (!issue.description) {
        newErrors[`issue_description_${index}`] = 'Description is required for all issues';
      }
    });

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

  // Format date for display in non-editable mode
  const formatDate = (dateString) => {
    if (!dateString) return '';
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
    const fullUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `http://voomet.onrender.com${imageUrl}`;
    setImagePreview({ show: true, url: fullUrl, title });
  };

  const closeImagePreview = () => {
    setImagePreview({ show: false, url: '', title: '' });
  };

  // Helper to check if an issue has an uploaded image (URL)
  const hasImage = (imageField) => {
    return imageField && typeof imageField === 'string' && imageField.length > 0;
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Quality Issues</h3>
                <button
                  type="button"
                  onClick={addNewIssueRow}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  + Add Row
                </button>
              </div>

              {/* Table for quality issues */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Date of Issue *
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Scope of Work *
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Reason *
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Description *
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Person Type
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Responsible Person
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Date of Damage
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Damage Image
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Remarks
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                        Date of Fixed
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                        Fixed Image
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.qualityIssues.map((issue, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {/* Date of Issue - Full date input */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <input
                              type="date"
                              name="dateOfIssue"
                              value={issue.dateOfIssue}
                              onChange={(e) => handleIssueChange(index, e)}
                              className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`issue_date_${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                              required
                            />

                          </div>
                          {errors[`issue_date_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`issue_date_${index}`]}</p>
                          )}
                        </td>

                        {/* Scope of Work - Full select dropdown */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <select
                            name="scopeOfWork"
                            value={issue.scopeOfWork}
                            onChange={(e) => handleIssueChange(index, e)}
                            className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`issue_scope_${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                            required
                          >
                            <option value="">Select Scope of Work</option>
                            {allScopeOptions.map(scope => (
                              <option key={scope.value} value={scope.value}>
                                {scope.label}
                              </option>
                            ))}
                          </select>
                          {errors[`issue_scope_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`issue_scope_${index}`]}</p>
                          )}
                        </td>

                        {/* Reason - Full select dropdown */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <select
                            name="reason"
                            value={issue.reason}
                            onChange={(e) => handleIssueChange(index, e)}
                            className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`issue_reason_${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                            required
                          >
                            <option value="">Select Reason</option>
                            {reasonOptions.map(reason => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                          {errors[`issue_reason_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`issue_reason_${index}`]}</p>
                          )}
                        </td>

                        {/* Description - Full textarea */}
                        <td className="px-3 py-3">
                          <textarea
                            name="description"
                            value={issue.description}
                            onChange={(e) => handleIssueChange(index, e)}
                            rows="3"
                            placeholder="Enter issue description"
                            className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`issue_description_${index}`] ? 'border-red-300' : 'border-gray-300'}`}
                            required
                          />
                          {errors[`issue_description_${index}`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`issue_description_${index}`]}</p>
                          )}
                        </td>

                        {/* Person Type - Full select dropdown */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <select
                            name="personType"
                            value={issue.personType}
                            onChange={(e) => handleIssueChange(index, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Select Type</option>
                            <option value="inhouse">Inhouse</option>
                            <option value="outsourced">Outsourced</option>
                          </select>
                        </td>

                        {/* Responsible Person - Full select dropdown */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <select
                            name="responsiblePerson"
                            value={issue.responsiblePerson}
                            onChange={(e) => handleIssueChange(index, e)}
                            disabled={!issue.personType}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">
                              {issue.personType === 'inhouse' ? 'Select Employee' :
                                issue.personType === 'outsourced' ? 'Select Vendor' :
                                  'Select Type First'}
                            </option>
                            {issue.personType === 'inhouse'
                              ? employees.map(emp => (
                                <option key={emp._id} value={emp.name}>
                                  {emp.name}
                                </option>
                              ))
                              : issue.personType === 'outsourced'
                                ? vendors.map(vendor => (
                                  <option key={vendor._id} value={vendor.vendorName}>
                                    {vendor.vendorName}
                                  </option>
                                ))
                                : null}
                          </select>
                        </td>

                        {/* Date of Damage - Full date input */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <input
                              type="date"
                              name="dateOfDamage"
                              value={issue.dateOfDamage}
                              onChange={(e) => handleIssueChange(index, e)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Optional
                            </div>
                          </div>
                        </td>

                        {/* Damage Image - Full file input */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="file"
                                name="damageImage"
                                onChange={(e) => handleIssueChange(index, e)}
                                accept="image/*"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                              />
                            </div>
                            {hasImage(issue.damageImage) && (
                              <button
                                type="button"
                                onClick={() => handleImagePreview(issue.damageImage, 'Damage Image')}
                                className="w-full px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                              >
                                View Uploaded Image
                              </button>
                            )}
                            <div className="text-xs text-gray-500">
                              Max 5MB
                            </div>
                          </div>
                        </td>

                        {/* Remarks - Full text input */}
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            name="remarks"
                            value={issue.remarks || ''}
                            onChange={(e) => handleIssueChange(index, e)}
                            placeholder="Enter remarks"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </td>

                        {/* Date of Fixed - Full date input */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <input
                              type="date"
                              name="dateOfFixed"
                              value={issue.dateOfFixed}
                              onChange={(e) => handleIssueChange(index, e)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Optional
                            </div>
                          </div>
                        </td>

                        {/* Fixed Image - Full file input */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="file"
                                name="fixedImage"
                                onChange={(e) => handleIssueChange(index, e)}
                                accept="image/*"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                              />
                            </div>
                            {hasImage(issue.fixedImage) && (
                              <button
                                type="button"
                                onClick={() => handleImagePreview(issue.fixedImage, 'Fixed Image')}
                                className="w-full px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-md"
                              >
                                View Uploaded Image
                              </button>
                            )}
                            <div className="text-xs text-gray-500">
                              Max 5MB
                            </div>
                          </div>
                        </td>

                        {/* Actions - Delete button */}
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => removeIssueRow(index)}
                            disabled={formData.qualityIssues.length === 1}
                            className={`p-2 rounded-md ${formData.qualityIssues.length === 1 ?
                              'bg-gray-100 text-gray-400 cursor-not-allowed' :
                              'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-900'}`}
                            title={formData.qualityIssues.length === 1 ? "Cannot delete the only row" : "Delete this row"}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
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
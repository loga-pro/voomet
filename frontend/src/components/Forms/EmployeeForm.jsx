// frontend/src/components/Forms/EmployeeForm.jsx
import React, { useState, useEffect } from 'react';
import { employeesAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import { UserIcon, BriefcaseIcon, BanknotesIcon } from '@heroicons/react/24/outline';

const EmployeeForm = ({ employee, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    dob: '',
    qualification: '',
    designation: '',
    department: '',
    address: '',
    phone: '',
    aadhar: '',
    pan: '',
    uan: '',
    bankName: '',
    bankAccountNumber: '',
    branch: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Map fields to their respective tabs for error navigation
  const fieldToTabMap = {
    name: 'personal',
    email: 'personal',
    gender: 'personal',
    dob: 'personal',
    phone: 'personal',
    aadhar: 'personal',
    address: 'personal',
    qualification: 'professional',
    designation: 'professional',
    department: 'professional',
    pan: 'professional',
    uan: 'professional',
    bankName: 'bank',
    bankAccountNumber: 'bank',
    branch: 'bank'
  };

  // Define tabs with labels and SVG icons
  const tabs = [
    { id: 'personal', label: 'Personal', icon: <UserIcon className="h-6 w-6 text-gray-600" /> },
    { id: 'professional', label: 'Professional', icon: <BriefcaseIcon className="h-6 w-6 text-gray-600" /> },
    { id: 'bank', label: 'Bank', icon: <BanknotesIcon className="h-6 w-6 text-gray-600" /> }
  ];

  // Function to check if a tab has errors
  const hasTabErrors = (tabId) => {
    const tabFields = Object.keys(fieldToTabMap).filter(field => fieldToTabMap[field] === tabId);
    return tabFields.some(field => errors[field]);
  };

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        gender: employee.gender || '',
        dob: employee.dob ? new Date(employee.dob).toISOString().split('T')[0] : '',
        qualification: employee.qualification || '',
        designation: employee.designation || '',
        department: employee.department || '',
        address: employee.address || '',
        phone: employee.phone || '',
        aadhar: employee.aadhar || '',
        pan: employee.pan || '',
        uan: employee.uan || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        branch: employee.branch || ''
      });
    }
  }, [employee]);

  // Function to navigate to tab containing validation errors
  const navigateToErrorTab = (errors) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const targetTab = fieldToTabMap[firstErrorField];
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validation for specific fields
    let validatedValue = value;
    if (name === 'name') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '');
    } else if (name === 'aadhar') {
      validatedValue = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'pan') {
      validatedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (name === 'phone') {
      validatedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'bankAccountNumber') {
      validatedValue = value.replace(/\D/g, '').slice(0, 16);
    }else if (name === 'department') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '');
    }else if (name === 'bankName') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '');
    }else if (name === 'branch') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '');
    }


    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone must be 10 digits';
    if (formData.aadhar && !/^\d{12}$/.test(formData.aadhar)) newErrors.aadhar = 'Aadhar must be 12 digits';
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) newErrors.pan = 'PAN must be in format ABCDE1234F';

    setErrors(newErrors);
    
    // Navigate to tab with first error if there are errors
    if (Object.keys(newErrors).length > 0) {
      navigateToErrorTab(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Only submit if we're on the bank tab (final step)
    if (activeTab !== 'bank') {
      return;
    }

    setLoading(true);
    try {
      if (employee) {
        await employeesAPI.update(employee._id, formData);
      } else {
        await employeesAPI.create(formData);
      }
      onSubmit();
    } catch (error) {
      if (error.response?.data?.errors) {
        // Handle field-specific validation errors
        setErrors(error.response.data.errors);
        // Navigate to tab with first error
        navigateToErrorTab(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ submit: error.response.data.message });
      } else {
        setErrors({ submit: 'An error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Prevent form submission on Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault();
    }
  };

  // Get current tab index
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="overflow-hidden">
      {/* Step Indicator */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          {tabs.map((tab, index) => (
            <React.Fragment key={tab.id}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-110'
                      : hasTabErrors(tab.id)
                      ? 'bg-red-100 border-red-500 text-red-600'
                      : index < currentTabIndex
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {index < currentTabIndex ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    tab.icon
                  )}
                </button>
                <span className={`mt-2 text-sm font-medium ${
                  activeTab === tab.id ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {tab.label}
                  {hasTabErrors(tab.id) && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      !
                    </span>
                  )}
                </span>
              </div>
              {index < tabs.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded-full ${
                  index < currentTabIndex ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="px-8 pb-8">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {errors.submit}
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FloatingInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
              />

              <FloatingInput
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />

              <FloatingInput
                label="Gender"
                name="gender"
                type="select"
                value={formData.gender}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select Gender' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' }
                ]}
                 required
              />

              <FloatingInput
                label="Date of Birth"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
              />

              <FloatingInput
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                required
                maxLength={10}
              />

              <FloatingInput
                label="Aadhar Number"
                name="aadhar"
                value={formData.aadhar}
                onChange={handleChange}
                error={errors.aadhar}
                maxLength={12}
                 required
              />

              <div className="md:col-span-2">
                <FloatingInput
                  label="Address"
                  name="address"
                  type="textarea"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <BriefcaseIcon className="h-5 w-5 mr-2 text-blue-600" />
              Professional Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FloatingInput
                label="Qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
              />

              <FloatingInput
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
              />

              <FloatingInput
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />

              <FloatingInput
                label="PAN Number"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                error={errors.pan}
                maxLength={10}
                 required
              />

              <FloatingInput
                label="UAN Number"
                name="uan"
                value={formData.uan}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
              <BanknotesIcon className="h-5 w-5 mr-2 text-blue-600" />
              Bank Account Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FloatingInput
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
              />

              <FloatingInput
                label="Account Number"
                name="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={handleChange}
              />

              <FloatingInput
                label="Branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-8 mt-8 border-t border-gray-200">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); // Explicitly prevent form submission
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1].id);
              }
            }}
            disabled={activeTab === 'personal'}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="flex space-x-3">
            
            {activeTab === 'bank' ? (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : employee ? 'Update Employee' : 'Create Employee'}
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault(); // Explicitly prevent form submission
                  const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1].id);
                  }
                }}
                className="px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 flex items-center"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
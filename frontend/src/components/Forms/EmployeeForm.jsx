// frontend/src/components/Forms/EmployeeForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { employeesAPI, authAPI } from '../../services/api';
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
  const [touchedFields, setTouchedFields] = useState({});
  const [visitedTabs, setVisitedTabs] = useState(new Set(['personal']));
  const [showNextError, setShowNextError] = useState(false);
  const [nextErrorMessage, setNextErrorMessage] = useState('');
  const formRef = useRef(null);

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

  // Define required fields for each tab
  const tabRequiredFields = {
    personal: ['name', 'email', 'phone', 'aadhar', 'gender'], // Added 'gender' here
    professional: ['pan'],
    bank: []
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

  // Function to check if all required fields in a tab are valid
  const isTabValid = (tabId) => {
    const requiredFields = tabRequiredFields[tabId] || [];
    const tabFields = Object.keys(fieldToTabMap).filter(field => fieldToTabMap[field] === tabId);
    
    // Check if all required fields are filled and valid
    const allRequiredValid = requiredFields.every(field => {
      const value = formData[field];
      const error = validateField(field, value, true); // Force required validation
      return !error && value && value.trim() !== '';
    });
    
    // Check if any field in the tab has errors
    const hasAnyErrors = tabFields.some(field => {
      const value = formData[field];
      const error = validateField(field, value, touchedFields[field]);
      return error;
    });
    
    return allRequiredValid && !hasAnyErrors;
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

  // Real-time validation functions
  const validateField = (name, value, forceRequired = false) => {
    let error = '';
    
    // Check if field is required
    const isRequired = tabRequiredFields[fieldToTabMap[name]]?.includes(name) || false;
    const shouldValidateRequired = forceRequired || touchedFields[name];
    
    if (isRequired && shouldValidateRequired && (!value || value.trim() === '')) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    
    switch (name) {
      case 'email':
        if (value && !/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'phone':
        if (value && !/^\d{10}$/.test(value)) {
          error = 'Phone number must be exactly 10 digits';
        }
        break;
        
      case 'aadhar':
        if (value && !/^\d{12}$/.test(value)) {
          error = 'Aadhaar must be exactly 12 digits';
        }
        break;
        
      case 'pan':
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          error = 'PAN must be in format ABCDE1234F';
        }
        break;
        
      case 'uan':
        if (value && !/^\d{12}$/.test(value)) {
          error = 'UAN must be exactly 12 digits';
        }
        break;
        
      case 'name':
        if (value.length > 50) error = 'Name must be 50 characters or less';
        break;
        
      case 'dob':
        if (value) {
          const dobDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (dobDate > today) {
            error = 'Date of birth cannot be a future date';
          }
        }
        break;
        
      case 'qualification':
        if (value.length > 30) error = 'Qualification must be 30 characters or less';
        break;
        
      case 'designation':
        if (value.length > 30) error = 'Designation must be 30 characters or less';
        break;
        
      case 'department':
        if (value.length > 30) error = 'Department must be 30 characters or less';
        break;
        
      case 'bankName':
        if (value.length > 20) error = 'Bank name must be 20 characters or less';
        break;
        
      case 'branch':
        if (value.length > 20) error = 'Branch must be 20 characters or less';
        break;
        
      default:
        break;
    }
    
    return error;
  };

  // Function to get error messages for current tab
  const getCurrentTabErrors = () => {
    const tabFields = Object.keys(fieldToTabMap).filter(field => fieldToTabMap[field] === activeTab);
    const requiredFields = tabRequiredFields[activeTab] || [];
    const errorMessages = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      const value = formData[field];
      if (!value || value.trim() === '') {
        errorMessages.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });
    
    // Check validation errors
    tabFields.forEach(field => {
      if (errors[field]) {
        errorMessages.push(errors[field]);
      }
    });
    
    return errorMessages;
  };

  // Function to validate all fields in a specific tab
  const validateTab = (tabId) => {
    const tabFields = Object.keys(fieldToTabMap).filter(field => fieldToTabMap[field] === tabId);
    const newErrors = { ...errors };
    let hasError = false;
    
    tabFields.forEach(field => {
      const value = formData[field];
      const isRequired = tabRequiredFields[tabId]?.includes(field);
      const error = validateField(field, value, isRequired);
      
      if (error) {
        newErrors[field] = error;
        hasError = true;
      } else {
        delete newErrors[field];
      }
    });
    
    setErrors(newErrors);
    return !hasError;
  };

  // Function to navigate to tab containing validation errors
  const navigateToErrorTab = (errors) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const targetTab = fieldToTabMap[firstErrorField];
      if (targetTab && targetTab !== activeTab) {
        setActiveTab(targetTab);
        setVisitedTabs(prev => new Set([...prev, targetTab]));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({ ...prev, [name]: true }));
    }
    
    // Hide error popup when user starts typing
    if (showNextError) {
      setShowNextError(false);
    }
    
    // Validation for specific fields
    let validatedValue = value;
    if (name === 'name') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 50);
    } else if (name === 'aadhar') {
      validatedValue = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'pan') {
      validatedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (name === 'phone') {
      validatedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'uan') {
      validatedValue = value.replace(/\D/g, '').slice(0, 12);
    } else if (name === 'bankAccountNumber') {
      validatedValue = value.replace(/\D/g, '').slice(0, 16);
    } else if (name === 'department') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 30);
    } else if (name === 'bankName') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 20);
    } else if (name === 'branch') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 20);
    } else if (name === 'qualification') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 30);
    } else if (name === 'designation') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 30);
    }

    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));

    // Validate field in real-time
    const fieldError = validateField(name, validatedValue, touchedFields[name]);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({ ...prev, [name]: true }));
    }
    
    // Validate on blur
    const isRequired = tabRequiredFields[fieldToTabMap[name]]?.includes(name);
    const fieldError = validateField(name, value, isRequired);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  // Check if current tab is valid for navigation
  const isCurrentTabValid = () => {
    return isTabValid(activeTab);
  };

  // Check if a tab can be navigated to
  const canNavigateToTab = (tabId) => {
    const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
    const targetTabIndex = tabs.findIndex(tab => tab.id === tabId);
    
    // Allow navigation to already visited tabs
    if (visitedTabs.has(tabId)) {
      return true;
    }
    
    // Allow navigation to next tab if current is valid
    if (targetTabIndex === currentTabIndex + 1) {
      return isCurrentTabValid();
    }
    
    // Allow navigation to previous tabs
    if (targetTabIndex < currentTabIndex) {
      return true;
    }
    
    // Don't allow skipping ahead to unvisited tabs
    return false;
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Validate all tabs
    tabs.forEach(tab => {
      const tabFields = Object.keys(fieldToTabMap).filter(field => fieldToTabMap[field] === tab.id);
      const requiredFields = tabRequiredFields[tab.id] || [];
      
      requiredFields.forEach(field => {
        const value = formData[field];
        const error = validateField(field, value, true);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });
      
      tabFields.forEach(field => {
        const value = formData[field];
        const error = validateField(field, value, touchedFields[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });
    });

    setErrors(newErrors);
    
    // Navigate to tab with first error if there are errors
    if (!isValid) {
      navigateToErrorTab(newErrors);
    }
    
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (employee) {
        await employeesAPI.update(employee._id, formData);
        try {
          const usersRes = await authAPI.getAllUsers();
          const existingUser = usersRes.data?.find(u => u.email === employee.email);
          if (existingUser) {
            await authAPI.updateUser(existingUser._id, { name: formData.name, email: formData.email });
          }
        } catch (_) {}
      } else {
        await employeesAPI.create(formData);
      }
      onSubmit();
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
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

  // Function to handle tab click
  const handleTabClick = (tabId) => {
    if (canNavigateToTab(tabId)) {
      // Validate current tab before leaving (except when going back)
      const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);
      const targetTabIndex = tabs.findIndex(tab => tab.id === tabId);
      
      if (targetTabIndex > currentTabIndex) {
        if (!isCurrentTabValid()) {
          validateTab(activeTab);
          return;
        }
      }
      
      setActiveTab(tabId);
      setVisitedTabs(prev => new Set([...prev, tabId]));
    }
  };

  // Function to handle next button click
  const handleNext = (e) => {
    e.preventDefault();
    
    // Hide any previous error popup
    setShowNextError(false);
    
    // Validate current tab before proceeding
    if (validateTab(activeTab)) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      if (currentIndex < tabs.length - 1) {
        setActiveTab(tabs[currentIndex + 1].id);
        setVisitedTabs(prev => new Set([...prev, tabs[currentIndex + 1].id]));
      }
    } else {
      // Get error messages for current tab
      const errorMessages = getCurrentTabErrors();
      if (errorMessages.length > 0) {
        // Show red popup with error messages
        setNextErrorMessage(errorMessages[0]); // Show first error message
        setShowNextError(true);
        
        // Auto-hide the popup after 5 seconds
        setTimeout(() => {
          setShowNextError(false);
        }, 5000);
      }
    }
  };

  // Function to handle previous button click
  const handlePrevious = (e) => {
    e.preventDefault();
    setShowNextError(false); // Hide error popup when going back
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].id);
    }
  };

  // Get current tab index
  const currentTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className="flex flex-col h-full max-h-[70vh] relative">
      {/* Red Error Popup */}
      {showNextError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 max-w-md">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{nextErrorMessage}</p>
              <p className="text-xs text-red-600 mt-1">Please fix the error before proceeding</p>
            </div>
            <button
              type="button"
              onClick={() => setShowNextError(false)}
              className="flex-shrink-0 text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Tabs Section */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          {tabs.map((tab, index) => {
            const isTabValidStatus = isTabValid(tab.id);
            const canNavigate = canNavigateToTab(tab.id);
            
            return (
              <React.Fragment key={tab.id}>
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    disabled={!canNavigate}
                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg transform scale-110'
                        : hasTabErrors(tab.id)
                        ? 'bg-red-100 border-red-500 text-red-600'
                        : visitedTabs.has(tab.id) && isTabValidStatus
                        ? 'bg-green-100 border-green-500 text-green-600'
                        : visitedTabs.has(tab.id) && !isTabValidStatus
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600'
                    } ${!canNavigate ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={!canNavigate ? "Complete previous steps first" : ""}
                  >
                    {visitedTabs.has(tab.id) && isTabValidStatus ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : visitedTabs.has(tab.id) && !isTabValidStatus && tab.id !== activeTab ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      React.cloneElement(tab.icon, { className: "h-5 w-5" })
                    )}
                  </button>
                  <span className={`mt-2 text-xs font-medium ${
                    activeTab === tab.id ? 'text-blue-600' : 
                    visitedTabs.has(tab.id) && !isTabValidStatus ? 'text-yellow-600' :
                    'text-gray-600'
                  } ${!canNavigate ? 'opacity-50' : ''}`}>
                    {tab.label}
                    {hasTabErrors(tab.id) && (
                      <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                        !
                      </span>
                    )}
                  </span>
                </div>
                {index < tabs.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${
                    visitedTabs.has(tabs[index + 1].id) ? 'bg-green-500' :
                    isTabValid(tab.id) ? 'bg-blue-300' : 'bg-gray-300'
                  }`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto">
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="h-full">
          <div className="p-6">
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
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information <span className="ml-2 text-sm text-red-500">* Required</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingInput
                    label="Name "
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.name}
                    maxLength={50}
                    required
                  />

                  <FloatingInput
                    label="Email "
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.email}
                    required
                  />

                  <FloatingInput
                    label="Gender "
                    name="gender"
                    type="select"
                    value={formData.gender}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.gender}
                    options={[
                      { value: '', label: 'Select Gender' },
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    required
                  />

                  <FloatingInput
                    label="Date of Birth"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.dob}
                  />

                  <FloatingInput
                    label="Phone "
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.phone}
                    required
                    maxLength={10}
                  />

                  <FloatingInput
                    label="Aadhaar Number "
                    name="aadhar"
                    value={formData.aadhar}
                    onChange={handleChange}
                    onBlur={handleBlur}
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
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'professional' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <BriefcaseIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Professional Information <span className="ml-2 text-sm text-red-500">* Required</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingInput
                    label="Qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.qualification}
                    maxLength={30}
                  />

                  <FloatingInput
                    label="Designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.designation}
                    maxLength={30}
                  />

                  <FloatingInput
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.department}
                    maxLength={30}
                  />

                  <FloatingInput
                    label="PAN Number "
                    name="pan"
                    value={formData.pan}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.pan}
                    maxLength={10}
                    required
                  />

                  <FloatingInput
                    label="UAN Number"
                    name="uan"
                    value={formData.uan}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.uan}
                    maxLength={12}
                  />
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <BanknotesIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Bank Account Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingInput
                    label="Bank Name"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.bankName}
                    maxLength={20}
                  />

                  <FloatingInput
                    label="Account Number"
                    name="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength={16}
                  />

                  <FloatingInput
                    label="Branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.branch}
                    maxLength={20}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fixed Navigation Buttons */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={activeTab === 'personal'}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex space-x-3">
                {activeTab === 'bank' ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200 flex items-center"
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
                    onClick={handleNext}
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 flex items-center"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
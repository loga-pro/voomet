import React, { useState, useEffect, useRef, useCallback } from 'react';
import { vendorsAPI, vendorPaymentsAPI, qualityAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import useNotification from '../../hooks/useNotification';

const categoryOptions = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'contractor', label: 'Contractor' },
];

const VendorForm = ({ vendor, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    category: 'vendor',
    vendorName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    bankAccountNumber: '',
    email: '',
    gstNumber: '',
    mobileNumber: '',
    contactPerson: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [originalVendorName, setOriginalVendorName] = useState('');
  const [touchedFields, setTouchedFields] = useState({});
  const { notification, showSuccess, showError } = useNotification();

  useEffect(() => {
    if (vendor) {
      const vendorData = {
        category: vendor.category || "vendor",
        vendorName: vendor.vendorName || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        zipCode: vendor.zipCode || '',
        country: vendor.country || '',
        bankAccountNumber: vendor.bankAccountNumber || '',
        email: vendor.email || '',
        gstNumber: vendor.gstNumber || '',
        mobileNumber: vendor.mobileNumber || '',
        contactPerson: vendor.contactPerson || ''
      };

      setFormData(vendorData);
      setOriginalVendorName(vendor.vendorName || '');
      setErrors({});
    }
  }, [vendor]);

  const validateGSTNumber = (gstNumber) => {
    const cleanGST = gstNumber.replace(/\s+/g, '').toUpperCase();

    if (cleanGST.length !== 15) {
      return { isValid: false, message: 'GST number must be 15 characters' };
    }

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;

    if (!gstRegex.test(cleanGST)) {
      return { isValid: false, message: 'Invalid GST number format' };
    }

    const stateCode = parseInt(cleanGST.substring(0, 2));
    const validStateCodes = [
      ...Array.from({ length: 37 }, (_, i) => i + 1),
      97
    ];

    if (!validStateCodes.includes(stateCode)) {
      return { isValid: false, message: 'Invalid state code in GST number' };
    }

    return { isValid: true, message: '' };
  };

  // Real-time validation functions
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'email':
        if (!value) {
          error = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'mobileNumber':
        if (!value) {
          error = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(value)) {
          error = 'Mobile number must be exactly 10 digits';
        }
        break;
        
      case 'gstNumber':
        if (!value) {
          error = 'GST number is required';
        } else {
          const gstValidation = validateGSTNumber(value);
          if (!gstValidation.isValid) {
            error = gstValidation.message;
          }
        }
        break;
        
      case 'bankAccountNumber':
        if (!value) {
          error = 'Bank account number is required';
        } else if (!/^\d{16}$/.test(value)) {
          error = 'Bank account number must be exactly 16 digits';
        }
        break;
        
      case 'vendorName':
        if (!value.trim()) {
          error = `${formData.category === 'vendor' ? 'Vendor' : 'Contractor'} name is required`;
        } else if (value.trim().length < 2) {
          error = `${formData.category === 'vendor' ? 'Vendor' : 'Contractor'} name must be at least 2 characters`;
        } else if (value.length > 25) {
          error = `${formData.category === 'vendor' ? 'Vendor' : 'Contractor'} name must be 25 characters or less`;
        }
        break;
        
      case 'address':
        if (!value.trim()) {
          error = 'Street address is required';
        } else if (value.trim().length < 5) {
          error = 'Address must be at least 5 characters long';
        }
        break;
        
      case 'city':
        if (!value.trim()) {
          error = 'City is required';
        }
        break;
        
      case 'state':
        if (!value.trim()) {
          error = 'State/Province is required';
        }
        break;
        
      case 'zipCode':
        if (!value.trim()) {
          error = 'ZIP/Postal code is required';
        }
        break;
        
      case 'country':
        if (!value.trim()) {
          error = 'Country is required';
        }
        break;
        
      case 'contactPerson':
        if (value && value.length > 50) {
          error = 'Contact person name must be 50 characters or less';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Mark field as touched
    if (!touchedFields[name]) {
      setTouchedFields(prev => ({ ...prev, [name]: true }));
    }

    let validatedValue = value;
    if (name === 'vendorName') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '').slice(0, 25);
    } else if (name === 'contactPerson') {
      validatedValue = value.replace(/[^A-Za-z\s]/g, '');
    } else if (name === 'mobileNumber') {
      validatedValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'bankAccountNumber') {
      validatedValue = value.replace(/\D/g, '').slice(0, 16);
    } else if (name === 'gstNumber') {
      validatedValue = value.replace(/\s+/g, '').toUpperCase();
      validatedValue = validatedValue.replace(/[^A-Z0-9]/g, '').slice(0, 15);
    } else if (name === 'address') {
      validatedValue = value.slice(0, 200);
    } else if (name === 'city') {
      validatedValue = value.replace(/[^A-Za-z\s\-']/g, '').slice(0, 50);
    } else if (name === 'state') {
      validatedValue = value.replace(/[^A-Za-z\s\-']/g, '').slice(0, 50);
    } else if (name === 'zipCode') {
      validatedValue = value.replace(/[^A-Z0-9\s\-]/g, '').slice(0, 20);
    } else if (name === 'country') {
      validatedValue = value.replace(/[^A-Za-z\s\-']/g, '').slice(0, 50);
    }

    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));

    // Validate field in real-time
    const fieldError = validateField(name, validatedValue);
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
    const fieldError = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const fieldsToValidate = [
      'category',
      'vendorName',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'bankAccountNumber',
      'email',
      'gstNumber',
      'mobileNumber'
    ];
    
    fieldsToValidate.forEach(field => {
      const value = formData[field];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const syncVendorNameToPayments = async (oldVendorName, newVendorName) => {
    if (!oldVendorName || oldVendorName === newVendorName) {
      return { success: true, updatedCount: 0 };
    }

    try {
      const response = await vendorPaymentsAPI.updateVendorName(oldVendorName, newVendorName);

      if (response.data && response.data.updatedCount > 0) {
        showSuccess(`Updated vendor name in ${response.data.updatedCount} payment record(s)`);
      }

      return { success: true, updatedCount: response.data.updatedCount || 0 };
    } catch (error) {
      console.error('Error syncing vendor name to payments:', error);
      showError('Failed to update vendor name in payment records');
      return { success: false, error: error.message };
    }
  };

  const syncVendorNameToQuality = async (oldVendorName, newVendorName) => {
    if (!oldVendorName || oldVendorName === newVendorName) {
      return { success: true, updatedCount: 0 };
    }

    try {
      const response = await qualityAPI.updateVendorName(oldVendorName, newVendorName);

      if (response.data && response.data.updatedCount > 0) {
        showSuccess(`Updated vendor name in ${response.data.updatedCount} quality issue(s)`);
      }

      return { success: true, updatedCount: response.data.updatedCount || 0 };
    } catch (error) {
      console.error('Error syncing vendor name to quality management:', error);
      showError('Failed to update vendor name in quality issues');
      return { success: false, error: error.message };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        category: formData.category,
        gstNumber: formData.gstNumber.replace(/\s+/g, '').toUpperCase(),
        vendorName: formData.vendorName.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country.trim(),
        email: formData.email.trim().toLowerCase(),
        contactPerson: formData.contactPerson.trim()
      };

      if (vendor) {
        await vendorsAPI.update(vendor._id, submitData);

        if (originalVendorName && originalVendorName !== submitData.vendorName) {
          await syncVendorNameToPayments(originalVendorName, submitData.vendorName);
          await syncVendorNameToQuality(originalVendorName, submitData.vendorName);
        }
      } else {
        await vendorsAPI.create(submitData);
      }

      onSubmit();
    } catch (error) {
      if (error.response?.data?.message) {
        const errorData = error.response.data;

        if (errorData.field) {
          const fieldErrors = {};
          const fieldName = errorData.field;
          fieldErrors[fieldName] = errorData.message;
          setErrors(prev => ({ ...prev, ...fieldErrors }));
        } else {
          setErrors(prev => ({ ...prev, submit: errorData.message }));
        }
      } else {
        setErrors(prev => ({ ...prev, submit: 'An error occurred. Please try again.' }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if required fields are filled with correct format
  const isFormComplete = () => {
    const requiredFields = [
      'vendorName',
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'bankAccountNumber',
      'email',
      'gstNumber',
      'mobileNumber'
    ];
    
    return requiredFields.every(field => {
      const value = formData[field];
      const error = validateField(field, value);
      return !error && value && value.trim() !== '';
    });
  };

  return (
    <div className="h-full flex flex-col max-h-[70vh] min-h-[500px]">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {notification.isVisible && (
            <div className={`p-4 rounded-md border ${notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              {notification.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FloatingInput
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              onBlur={handleBlur}
              type="select"
              options={categoryOptions}
              error={errors.category}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FloatingInput
              label={formData.category === 'vendor' ? 'Vendor Name ' : 'Contractor Name '}
              name="vendorName"
              type="text"
              value={formData.vendorName}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.vendorName}
              required={true}
              maxLength="25"
            
            />

            <FloatingInput
              label="Email "
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              required={true}
            />

            <FloatingInput
              label="GST Number "
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.gstNumber}
              required={true}
              maxLength="15"
            />

            <FloatingInput
              label="Mobile Number "
              name="mobileNumber"
              type="tel"
              value={formData.mobileNumber}
              onChange={handleChange}
              onBlur={handleBlur}
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
              onBlur={handleBlur}
              error={errors.contactPerson}
              maxLength="50"
            />

            <FloatingInput
              label="Bank Account Number"
              name="bankAccountNumber"
              type="text"
              value={formData.bankAccountNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.bankAccountNumber}
              required={true}
              maxLength="16"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Address Information</h3>

            <FloatingInput
              label="Street Address "
              name="address"
              type="text"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.address}
              required={true}
              rows={3}
              maxLength="200"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="City "
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.city}
                required={true}
                maxLength="50"
              />

              <FloatingInput
                label="State/Province "
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.state}
                required={true}
                maxLength="50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FloatingInput
                label="ZIP/Postal Code "
                name="zipCode"
                type="text"
                value={formData.zipCode}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.zipCode}
                required={true}
                maxLength="20"
              />

              <FloatingInput
                label="Country "
                name="country"
                type="text"
                value={formData.country}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.country}
                required={true}
                maxLength="50"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <p className="text-sm text-gray-500"> Please fill all required fields (*) </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isFormComplete()}
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : vendor ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorForm;
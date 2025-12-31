import React, { useState, useEffect, useCallback } from 'react';
import { vendorPaymentsAPI, vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import NotificationComponent from '../Notifications/Notification';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';

const VendorPaymentForm = ({ payment, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendorType: 'vendor',
    vendor: '',
    vendorGstNumber: '',
    vendorAccountNumber: '',
    uploadImg: '',
    image: null,
    invoices: [{
      invoiceNumber: '',
      invoiceValue: '',
      invoiceDate: '',
      payments: [{
        transactionId: '',
        bankName: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0], // Default to today
        remarks: ''
      }]
    }]
  });
  const [vendors, setVendors] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingPayments, setExistingPayments] = useState([]);
  const [bankNameWarnings, setBankNameWarnings] = useState({});
  const [selectedVendorCategory, setSelectedVendorCategory] = useState('');

  const showLocalNotification = useCallback((message, type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      type
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchExistingPayments();

    if (payment) {
      setIsEditMode(true);

      // Set vendor category from payment data
      if (payment.vendor?.category) {
        setSelectedVendorCategory(payment.vendor.category);
      }

      setFormData({
        vendorType: payment.vendorType || payment.vendor?.category || 'vendor',
        vendor: payment.vendor?._id || payment.vendor || '',
        vendorGstNumber: payment.vendorGstNumber || '',
        vendorAccountNumber: payment.vendorAccountNumber || '',
        image: payment.image
          ? {
            name: payment.uploadImg || payment.image.split("/").pop(),
            url: payment.image,
            status: "done"
          }
          : null,
        uploadImg: payment.uploadImg || '',
        invoices: payment.invoices && payment.invoices.length > 0
          ? payment.invoices.slice(0, 1).map(invoice => ({
            invoiceNumber: invoice.invoiceNumber || '',
            invoiceValue: invoice.invoiceValue || '',
            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
            payments: invoice.payments && invoice.payments.length > 0
              ? invoice.payments.map(pmt => ({
                transactionId: pmt.transactionId || '',
                bankName: pmt.bankName || '',
                amount: pmt.amount || '',
                paymentDate: pmt.date ? new Date(pmt.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Fallback to today
                remarks: pmt.remarks || ''
              }))
              : [{
                transactionId: '',
                bankName: '',
                amount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                remarks: ''
              }]
          }))
          : [{
            invoiceNumber: '',
            invoiceValue: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            payments: [{
              transactionId: '',
              bankName: '',
              amount: '',
              paymentDate: new Date().toISOString().split('T')[0],
              remarks: ''
            }]
          }]
      });
    }
  }, [payment]);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showNotification('Error fetching vendors data', 'error');
    }
  }, []);

  const fetchExistingPayments = async () => {
    try {
      const response = await vendorPaymentsAPI.getAll();
      setExistingPayments(response.data?.payments || []);
    } catch (error) {
      console.error('Error fetching existing vendor payments:', error);
    }
  };

  const checkDuplicatePayment = (vendorId, invoiceNumber) => {
    // If in edit mode and data hasn't changed, don't show duplicate error
    if (isEditMode && payment) {
      const currentVendorId = payment.vendor?._id || payment.vendor;
      const currentInvoiceNumber = payment.invoices?.[0]?.invoiceNumber;
      
      if (currentVendorId === vendorId && currentInvoiceNumber === invoiceNumber) {
        return false;
      }
    }

    // Check if same vendor and invoice number already exists
    const existing = existingPayments.find(pmt => {
      const pmtVendorId = pmt.vendor?._id || pmt.vendor;
      const pmtInvoiceNumber = pmt.invoices?.[0]?.invoiceNumber;
      
      return pmtVendorId === vendorId && pmtInvoiceNumber === invoiceNumber;
    });
    
    return !!existing;
  };

  // Add bank name validation function
  const handleBankNameChange = (e, paymentIndex) => {
    const { value } = e.target;

    // Only allow alphabets and spaces
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');

    // Check if value contains non-alphabet characters and show warning
    if (/[^a-zA-Z\s]/.test(value)) {
      setBankNameWarnings(prev => ({
        ...prev,
        [paymentIndex]: 'Only letters and spaces are allowed in bank name'
      }));
    } else {
      setBankNameWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[paymentIndex];
        return newWarnings;
      });
    }

    // Create a new event with the filtered value
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: filteredValue,
        name: e.target.name
      }
    };

    // Call the original handleChange with filtered value
    handleChange(newEvent);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const nameParts = name.split('.');

      if (nameParts.length === 3) {
        const [parent, index, field] = nameParts;
        const arrayIndex = parseInt(index);

        setFormData(prev => ({
          ...prev,
          [parent]: prev[parent].map((item, i) =>
            i === arrayIndex ? { ...item, [field]: value } : item
          )
        }));

        // Check for duplicates when invoice number changes
        if (field === 'invoiceNumber' && formData.vendor) {
          const invoiceNumber = value;
          const isDuplicate = checkDuplicatePayment(formData.vendor, invoiceNumber);
          
          if (isDuplicate) {
            setErrors(prev => ({
              ...prev,
              duplicate: 'Invoice number already exists for this vendor'
            }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.duplicate;
              return newErrors;
            });
          }
        }
      } else if (nameParts.length === 5) {
        const [parent, invoiceIndex, paymentsKey, paymentIndex, field] = nameParts;
        const invIndex = parseInt(invoiceIndex);
        const payIndex = parseInt(paymentIndex);

        // Since we only have one invoice now, we can simplify this
        setFormData(prev => ({
          ...prev,
          invoices: [{
            ...prev.invoices[0],
            payments: prev.invoices[0].payments.map((payment, j) =>
              j === payIndex ? { ...payment, [field]: value } : payment
            )
          }]
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Reset vendor selection when vendor type changes
      if (name === 'vendorType') {
        setFormData(prev => ({
          ...prev,
          vendor: '',
          vendorGstNumber: '',
          vendorAccountNumber: '',
          image: null,
          uploadImg: ''
        }));
        setSelectedVendorCategory(value);
        
        // Clear duplicate error when vendor type changes
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.duplicate;
          return newErrors;
        });
      }

      // Auto-fill vendor details when vendor is selected
      if (name === 'vendor') {
        const selectedVendor = vendors.find(v => v._id === value);
        if (selectedVendor) {
          setFormData(prev => ({
            ...prev,
            vendorGstNumber: selectedVendor.gstNumber || '',
            vendorAccountNumber: selectedVendor.bankAccountNumber || ''
          }));
        }

        // Check for duplicates when vendor changes
        if (value && formData.invoices[0].invoiceNumber) {
          const isDuplicate = checkDuplicatePayment(value, formData.invoices[0].invoiceNumber);
          if (isDuplicate) {
            setErrors(prev => ({
              ...prev,
              duplicate: 'Invoice number already exists for this vendor'
            }));
          } else {
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors.duplicate;
              return newErrors;
            });
          }
        }
      }

      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleVendorSelect = (vendorId) => {
    const selectedVendor = vendors.find(v => v._id === vendorId);
    if (selectedVendor) {
      const invoiceNumber = formData.invoices[0].invoiceNumber;
      const isDuplicate = checkDuplicatePayment(vendorId, invoiceNumber);

      if (isDuplicate) {
        setErrors(prev => ({
          ...prev,
          duplicate: 'Invoice number already exists for this vendor'
        }));
        return;
      }

      // Set the vendor category
      setSelectedVendorCategory(selectedVendor.category || '');

      setFormData(prev => ({
        ...prev,
        vendor: selectedVendor._id,
        vendorGstNumber: selectedVendor.gstNumber || '',
        vendorAccountNumber: selectedVendor.bankAccountNumber || '',
        // Clear image if switching to contractor
        image: selectedVendor.category === 'contractor' ? null : prev.image,
        uploadImg: selectedVendor.category === 'contractor' ? '' : prev.uploadImg
      }));

      // Clear duplicate error if any
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.duplicate;
        return newErrors;
      });
    }
  };

  const addPayment = () => {
    setFormData(prev => ({
      ...prev,
      invoices: [{
        ...prev.invoices[0],
        payments: [...prev.invoices[0].payments, {
          transactionId: '',
          bankName: '',
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0], // Always set default date
          remarks: ''
        }]
      }]
    }));
  };

  const removePayment = (paymentIndex) => {
    setFormData(prev => ({
      ...prev,
      invoices: [{
        ...prev.invoices[0],
        payments: prev.invoices[0].payments.filter((_, j) => j !== paymentIndex)
      }]
    }));
  };

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      type
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vendor) newErrors.vendor = 'Vendor is required';
    if (!formData.vendorGstNumber) newErrors.vendorGstNumber = 'Vendor GST number is required';
    if (!formData.vendorAccountNumber) newErrors.vendorAccountNumber = 'Vendor account number is required';

    // Check for duplicate payment based on vendor and invoice number
    const invoice = formData.invoices[0];
    if (formData.vendor && invoice.invoiceNumber) {
      const isDuplicate = checkDuplicatePayment(formData.vendor, invoice.invoiceNumber);
      if (isDuplicate) {
        newErrors.duplicate = 'Invoice number already exists for this vendor';
      }
    }

    // Only check the first (and only) invoice
    if (!invoice.invoiceNumber) newErrors['invoices.0.invoiceNumber'] = 'Invoice number is required';
    if (!invoice.invoiceValue || invoice.invoiceValue <= 0) newErrors['invoices.0.invoiceValue'] = 'Valid invoice value is required';

    invoice.payments.forEach((payment, pIndex) => {
      if (!payment.transactionId) newErrors[`invoices.0.payments.${pIndex}.transactionId`] = 'Transaction ID is required';
      if (!payment.bankName) newErrors[`invoices.0.payments.${pIndex}.bankName`] = 'Bank name is required';
      if (!payment.amount || payment.amount <= 0) newErrors[`invoices.0.payments.${pIndex}.amount`] = 'Valid amount is required';
      // Add validation for payment date
      if (!payment.paymentDate) newErrors[`invoices.0.payments.${pIndex}.paymentDate`] = 'Payment date is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Final duplicate check before submission
    const invoice = formData.invoices[0];
    if (formData.vendor && invoice.invoiceNumber) {
      const isDuplicate = checkDuplicatePayment(formData.vendor, invoice.invoiceNumber);
      if (isDuplicate) {
        setErrors({ duplicate: 'Invoice number already exists for this vendor' });
        showNotification('Invoice number already exists for this vendor', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add basic fields
      formDataToSend.append('vendorType', formData.vendorType);
      formDataToSend.append('vendor', formData.vendor);
      formDataToSend.append('vendorGstNumber', formData.vendorGstNumber);
      formDataToSend.append('vendorAccountNumber', formData.vendorAccountNumber);

      // Add image only if vendor category is 'vendor' (not 'contractor')
      if (selectedVendorCategory === 'vendor' && formData.image instanceof File) {
        formDataToSend.append('image', formData.image);
      }

      // Add invoice as JSON string (only one invoice now)
      const invoiceData = {
        invoiceNumber: formData.invoices[0].invoiceNumber,
        invoiceValue: parseFloat(formData.invoices[0].invoiceValue),
        invoiceDate: formData.invoices[0].invoiceDate,
        payments: formData.invoices[0].payments.map(payment => ({
          transactionId: payment.transactionId,
          bankName: payment.bankName,
          amount: parseFloat(payment.amount),
          date: payment.paymentDate, // This is now required
          remarks: payment.remarks
        }))
      };

      formDataToSend.append('invoices', JSON.stringify([invoiceData]));

      await onSubmit(formDataToSend);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleFileUpload = (file) => {
    // Allow only PDF
    const isPDF = file.type === 'application/pdf';
    if (!isPDF) {
      showLocalNotification('Only PDF files are allowed!', "error");
      return false;
    }

    // Limit 5MB
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      showLocalNotification('PDF must be smaller than 5MB!', "error");
      return false;
    }

    setFormData(prev => ({
      ...prev,
      image: file,
      uploadImg: file.name
    }));

    showLocalNotification(`${file.name} uploaded successfully`, "success");
    return false;
  };

  const handleSingleFileRemove = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      uploadImg: ""
    }));
  };

  const createSingleUploadProps = () => {
    const img = formData.image;

    return {
      name: "file",
      multiple: false,
      beforeUpload: handleSingleFileUpload,
      onRemove: handleSingleFileRemove,
      fileList: img
        ? [{
          uid: img.uid || "1",
          name: img.name,
          status: img.status || "done",
          url: img.url
        }]
        : []
    };
  };

  // Get the single invoice
  const invoice = formData.invoices[0];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        {errors.duplicate && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded">
            {errors.duplicate}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor Type Selection */}
          <FloatingInput
            label="Type"
            name="vendorType"
            value={formData.vendorType}
            onChange={handleChange}
            error={errors.vendorType}
            type="select"
            options={[
              { value: 'vendor', label: 'Vendor' },
              { value: 'contractor', label: 'Contractor' }
            ]}
            required
            readOnly={isEditMode}
          />

          <FloatingInput
            label={formData.vendorType === 'contractor' ? 'Contractor' : 'Vendor'}
            name="vendor"
            value={isEditMode && payment?.vendor?.vendorName ? payment.vendor.vendorName : formData.vendor}
            onChange={(e) => handleVendorSelect(e.target.value)}
            error={errors.vendor}
            type={isEditMode ? "text" : "select"}
            options={vendors
              .filter(vendor => vendor.category === formData.vendorType)
              .map(vendor => ({
                value: vendor._id,
                label: vendor.vendorName
              }))}
            required
            readOnly={isEditMode}
          />

          <FloatingInput
            label="GST Number"
            name="vendorGstNumber"
            value={formData.vendorGstNumber}
            onChange={handleChange}
            error={errors.vendorGstNumber}
            required
            readOnly={isEditMode}
          />

          <FloatingInput
            label="Account Number"
            name="vendorAccountNumber"
            value={formData.vendorAccountNumber}
            onChange={handleChange}
            error={errors.vendorAccountNumber}
            required
            readOnly={isEditMode}
          />
        </div>

        {/* PDF Upload Section - Only show for vendors, not contractors */}
        {selectedVendorCategory === 'vendor' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Payment Document (PDF)
            </label>
            <Upload {...createSingleUploadProps()}>
              <Button icon={<UploadOutlined />} className="w-full">
                {formData.image ? (formData.image.name || 'Document Uploaded') : 'Click to Upload PDF'}
              </Button>
            </Upload>

            {formData.image && (
              <div className="mt-2 text-sm text-gray-600">
                <p>File: {formData.image.name || formData.uploadImg}</p>
                {formData.image.size && <p>Size: {(formData.image.size / 1024).toFixed(2)} KB</p>}
              </div>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>

          <div className="bg-gray-50 p-4 rounded-lg border mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <FloatingInput
                label="Invoice Number *"
                name="invoices.0.invoiceNumber"
                value={invoice.invoiceNumber}
                onChange={handleChange}
                error={errors['invoices.0.invoiceNumber']}
                required
              />

              <FloatingInput
                label="Invoice Value (₹) *"
                name="invoices.0.invoiceValue"
                value={invoice.invoiceValue}
                onChange={handleChange}
                error={errors['invoices.0.invoiceValue']}
                type="number"
                step="0.01"
                min="0"
                required
              />

              <FloatingInput
                label="Invoice Date"
                name="invoices.0.invoiceDate"
                value={invoice.invoiceDate}
                onChange={handleChange}
                type="date"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Payments</h4>
                <button
                  type="button"
                  onClick={addPayment}
                  className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                >
                  + Add Payment
                </button>
              </div>

              <div className="space-y-4">
                {invoice.payments.map((payment, paymentIndex) => (
                  <div key={paymentIndex} className="py-3 border-b last:border-b-0">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium">Payment #{paymentIndex + 1}</span>
                      {invoice.payments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(paymentIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <FloatingInput
                        label="Transaction ID *"
                        name={`invoices.0.payments.${paymentIndex}.transactionId`}
                        value={payment.transactionId}
                        onChange={handleChange}
                        error={errors[`invoices.0.payments.${paymentIndex}.transactionId`]}
                        required
                      />

                      <FloatingInput
                        label="Bank Name *"
                        name={`invoices.0.payments.${paymentIndex}.bankName`}
                        value={payment.bankName}
                        onChange={(e) => handleBankNameChange(e, paymentIndex)}
                        error={errors[`invoices.0.payments.${paymentIndex}.bankName`] || bankNameWarnings[paymentIndex]}
                        required
                      />

                      <FloatingInput
                        label="Amount (₹) *"
                        name={`invoices.0.payments.${paymentIndex}.amount`}
                        value={payment.amount}
                        onChange={handleChange}
                        error={errors[`invoices.0.payments.${paymentIndex}.amount`]}
                        type="number"
                        step="0.01"
                        min="0"
                        required
                      />

                      <FloatingInput
                        label="Payment Date *"
                        name={`invoices.0.payments.${paymentIndex}.paymentDate`}
                        value={payment.paymentDate}
                        onChange={handleChange}
                        error={errors[`invoices.0.payments.${paymentIndex}.paymentDate`]}
                        type="date"
                        required
                      />
                    </div>

                    <div className="mt-3">
                      <FloatingInput
                        label="Remarks"
                        name={`invoices.0.payments.${paymentIndex}.remarks`}
                        value={payment.remarks}
                        onChange={handleChange}
                        type="textarea"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || errors.duplicate}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${errors.duplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Saving...' : payment ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      <NotificationComponent
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </>
  );
};

export default VendorPaymentForm;
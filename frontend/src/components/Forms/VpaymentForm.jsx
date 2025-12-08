import React, { useState, useEffect, useCallback } from 'react';
import { vendorPaymentsAPI, vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import NotificationComponent from '../Notifications/Notification';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Upload } from 'antd';

const VendorPaymentForm = ({ payment, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
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
        paymentDate: '',
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
        // Handle both populated vendor object and vendor ID
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
          ? payment.invoices.map(invoice => ({
            invoiceNumber: invoice.invoiceNumber || '',
            invoiceValue: invoice.invoiceValue || '',
            invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
            payments: invoice.payments && invoice.payments.length > 0
              ? invoice.payments.map(pmt => ({
                transactionId: pmt.transactionId || '',
                bankName: pmt.bankName || '',
                amount: pmt.amount || '',
                paymentDate: pmt.date ? new Date(pmt.date).toISOString().split('T')[0] : '',
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

  const checkDuplicatePayment = (vendorId) => {
    // If in edit mode and vendor hasn't changed, don't show duplicate error
    if (isEditMode && payment && (payment.vendor?._id === vendorId || payment.vendor === vendorId)) {
      return false;
    }

    // Check if vendor ID already has a payment
    const existing = existingPayments.find(pmt =>
      (pmt.vendor?._id === vendorId) || (pmt.vendor === vendorId)
    );
    return !!existing;
  };

  // Add bank name validation function
  const handleBankNameChange = (e, invoiceIndex, paymentIndex) => {
    const { value } = e.target;

    // Only allow alphabets and spaces
    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');

    // Check if value contains non-alphabet characters and show warning
    if (/[^a-zA-Z\s]/.test(value)) {
      setBankNameWarnings(prev => ({
        ...prev,
        [`${invoiceIndex}-${paymentIndex}`]: 'Only letters and spaces are allowed in bank name'
      }));
    } else {
      setBankNameWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[`${invoiceIndex}-${paymentIndex}`];
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
      } else if (nameParts.length === 5) {
        const [parent, invoiceIndex, paymentsKey, paymentIndex, field] = nameParts;
        const invIndex = parseInt(invoiceIndex);
        const payIndex = parseInt(paymentIndex);

        setFormData(prev => ({
          ...prev,
          [parent]: prev[parent].map((invoice, i) =>
            i === invIndex ? {
              ...invoice,
              [paymentsKey]: invoice[paymentsKey].map((payment, j) =>
                j === payIndex ? { ...payment, [field]: value } : payment
              )
            } : invoice
          )
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

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
        if (value) {
          const isDuplicate = checkDuplicatePayment(value);
          if (isDuplicate) {
            setErrors(prev => ({
              ...prev,
              duplicate: 'Payment for this vendor already exists'
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
      const isDuplicate = checkDuplicatePayment(vendorId);

      if (isDuplicate) {
        setErrors(prev => ({
          ...prev,
          duplicate: 'Payment for this vendor already exists'
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
        const newWarnings = { ...prev };
        delete newWarnings.duplicate;
        return newWarnings;
      });
    }
  };

  const addInvoice = () => {
    setFormData(prev => ({
      ...prev,
      invoices: [...prev.invoices, {
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
    }));
  };

  const removeInvoice = (index) => {
    if (formData.invoices.length > 1) {
      setFormData(prev => ({
        ...prev,
        invoices: prev.invoices.filter((_, i) => i !== index)
      }));
    }
  };

  const addPayment = (invoiceIndex) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.map((invoice, i) =>
        i === invoiceIndex ? {
          ...invoice,
          payments: [...invoice.payments, {
            transactionId: '',
            bankName: '',
            amount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            remarks: ''
          }]
        } : invoice
      )
    }));
  };

  const removePayment = (invoiceIndex, paymentIndex) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.map((invoice, i) =>
        i === invoiceIndex && invoice.payments.length > 1 ? {
          ...invoice,
          payments: invoice.payments.filter((_, j) => j !== paymentIndex)
        } : invoice
      )
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

    // Check for duplicate payment
    if (checkDuplicatePayment(formData.vendor)) {
      newErrors.duplicate = 'Payment for this vendor already exists';
    }

    formData.invoices.forEach((invoice, index) => {
      if (!invoice.invoiceNumber) newErrors[`invoices.${index}.invoiceNumber`] = 'Invoice number is required';
      if (!invoice.invoiceValue || invoice.invoiceValue <= 0) newErrors[`invoices.${index}.invoiceValue`] = 'Valid invoice value is required';

      invoice.payments.forEach((payment, pIndex) => {
        if (!payment.transactionId) newErrors[`invoices.${index}.payments.${pIndex}.transactionId`] = 'Transaction ID is required';
        if (!payment.bankName) newErrors[`invoices.${index}.payments.${pIndex}.bankName`] = 'Bank name is required';
        if (!payment.amount || payment.amount <= 0) newErrors[`invoices.${index}.payments.${pIndex}.amount`] = 'Valid amount is required';
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add basic fields
      formDataToSend.append('vendor', formData.vendor);
      formDataToSend.append('vendorGstNumber', formData.vendorGstNumber);
      formDataToSend.append('vendorAccountNumber', formData.vendorAccountNumber);

      // Add image only if vendor category is 'vendor' (not 'contractor')
      if (selectedVendorCategory === 'vendor' && formData.image instanceof File) {
        formDataToSend.append('image', formData.image);
      }

      // Add invoices as JSON string
      const invoicesData = formData.invoices.map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceValue: parseFloat(invoice.invoiceValue),
        invoiceDate: invoice.invoiceDate,
        payments: invoice.payments.map(payment => ({
          transactionId: payment.transactionId,
          bankName: payment.bankName,
          amount: parseFloat(payment.amount),
          date: payment.paymentDate,
          remarks: payment.remarks
        }))
      }));

      formDataToSend.append('invoices', JSON.stringify(invoicesData));

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
      image: file,           // PDF file
      uploadImg: file.name   // PDF name
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

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
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
          <FloatingInput
            label="Vendor"
            name="vendor"
            value={isEditMode && payment?.vendor?.vendorName ? payment.vendor.vendorName : formData.vendor}
            onChange={(e) => handleVendorSelect(e.target.value)}
            error={errors.vendor}
            type={isEditMode ? "text" : "select"}
            options={vendors.map(vendor => ({
              value: vendor._id,
              label: vendor.vendorName
            }))}
            required
            readOnly={isEditMode}
          />

          <FloatingInput
            label="Vendor GST Number"
            name="vendorGstNumber"
            value={formData.vendorGstNumber}
            onChange={handleChange}
            error={errors.vendorGstNumber}
            required
            readOnly={isEditMode}
          />

          <FloatingInput
            label="Vendor Account Number"
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

        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
            <button
              type="button"
              onClick={addInvoice}
              className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
            >
              + Add Invoice
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {formData.invoices.map((invoice, invoiceIndex) => (
              <div key={invoiceIndex} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Invoice #{invoiceIndex + 1}</h4>
                  {formData.invoices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInvoice(invoiceIndex)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <FloatingInput
                    label="Invoice Number"
                    name={`invoices.${invoiceIndex}.invoiceNumber`}
                    value={invoice.invoiceNumber}
                    onChange={handleChange}
                    error={errors[`invoices.${invoiceIndex}.invoiceNumber`]}
                    required
                  />

                  <FloatingInput
                    label="Invoice Value (₹)"
                    name={`invoices.${invoiceIndex}.invoiceValue`}
                    value={invoice.invoiceValue}
                    onChange={handleChange}
                    error={errors[`invoices.${invoiceIndex}.invoiceValue`]}
                    type="number"
                    step="0.01"
                    min="0"
                    required
                  />

                  <FloatingInput
                    label="Invoice Date"
                    name={`invoices.${invoiceIndex}.invoiceDate`}
                    value={invoice.invoiceDate}
                    onChange={handleChange}
                    type="date"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">Payments</h5>
                    <button
                      type="button"
                      onClick={() => addPayment(invoiceIndex)}
                      className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
                    >
                      + Add Payment
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {invoice.payments.map((payment, paymentIndex) => (
                      <div key={paymentIndex} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Payment #{paymentIndex + 1}</span>
                          {invoice.payments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePayment(invoiceIndex, paymentIndex)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <FloatingInput
                            label="Transaction ID"
                            name={`invoices.${invoiceIndex}.payments.${paymentIndex}.transactionId`}
                            value={payment.transactionId}
                            onChange={handleChange}
                            error={errors[`invoices.${invoiceIndex}.payments.${paymentIndex}.transactionId`]}
                            required
                          />

                          {/* Updated Bank Name input with validation */}
                          <FloatingInput
                            label="Bank Name"
                            name={`invoices.${invoiceIndex}.payments.${paymentIndex}.bankName`}
                            value={payment.bankName}
                            onChange={(e) => handleBankNameChange(e, invoiceIndex, paymentIndex)}
                            error={errors[`invoices.${invoiceIndex}.payments.${paymentIndex}.bankName`] || bankNameWarnings[`${invoiceIndex}-${paymentIndex}`]}
                            required
                          />

                          <FloatingInput
                            label="Amount (₹)"
                            name={`invoices.${invoiceIndex}.payments.${paymentIndex}.amount`}
                            value={payment.amount}
                            onChange={handleChange}
                            error={errors[`invoices.${invoiceIndex}.payments.${paymentIndex}.amount`]}
                            type="number"
                            step="0.01"
                            min="0"
                            required
                          />

                          <FloatingInput
                            label="Payment Date"
                            name={`invoices.${invoiceIndex}.payments.${paymentIndex}.paymentDate`}
                            value={payment.paymentDate}
                            onChange={handleChange}
                            type="date"
                          />
                        </div>

                        <FloatingInput
                          label="Remarks"
                          name={`invoices.${invoiceIndex}.payments.${paymentIndex}.remarks`}
                          value={payment.remarks}
                          onChange={handleChange}
                          type="textarea"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
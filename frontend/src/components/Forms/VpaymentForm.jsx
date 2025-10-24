import React, { useState, useEffect } from 'react';
import { vendorPaymentsAPI, vendorsAPI } from '../../services/api';
import FloatingInput from './FloatingInput';
import NotificationComponent from '../Notifications/Notification';

const VendorPaymentForm = ({ payment, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    vendor: '',
    vendorGstNumber: '',
    vendorAccountNumber: '',
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

  useEffect(() => {
    fetchVendors();
    
    if (payment) {
      setFormData({
        vendor: payment.vendor || '',
        vendorGstNumber: payment.vendorGstNumber || '',
        vendorAccountNumber: payment.vendorAccountNumber || '',
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

  const fetchVendors = async () => {
    try {
      const response = await vendorsAPI.getAll();
      setVendors(response.data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      showNotification('Error fetching vendors data', 'error');
    }
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
        const selectedVendor = vendors.find(v => v.vendorName === value);
        if (selectedVendor) {
          setFormData(prev => ({
            ...prev,
            vendorGstNumber: selectedVendor.gstNumber || '',
            vendorAccountNumber: selectedVendor.bankAccountNumber || ''
          }));
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

  const showNotification = (message, type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      type
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vendor) newErrors.vendor = 'Vendor is required';
    if (!formData.vendorGstNumber) newErrors.vendorGstNumber = 'Vendor GST number is required';
    if (!formData.vendorAccountNumber) newErrors.vendorAccountNumber = 'Vendor account number is required';

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
      const submitData = {
        vendor: formData.vendor,
        vendorGstNumber: formData.vendorGstNumber,
        vendorAccountNumber: formData.vendorAccountNumber,
        invoices: formData.invoices.map(invoice => ({
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
        }))
      };

      await onSubmit(submitData);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ submit: errorMessage });
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput
            label="Vendor"
            name="vendor"
            value={formData.vendor}
            onChange={handleChange}
            error={errors.vendor}
            type="select"
            options={vendors.map(vendor => ({ 
              value: vendor.vendorName, 
              label: vendor.vendorName 
            }))}
            required
          
          />

          <FloatingInput
            label="Vendor GST Number"
            name="vendorGstNumber"
            value={formData.vendorGstNumber}
            onChange={handleChange}
            error={errors.vendorGstNumber}
            required
          />

          <FloatingInput
            label="Vendor Account Number"
            name="vendorAccountNumber"
            value={formData.vendorAccountNumber}
            onChange={handleChange}
            error={errors.vendorAccountNumber}
            required
          />
        </div>

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

          {formData.invoices.map((invoice, invoiceIndex) => (
            <div key={invoiceIndex} className="bg-gray-50 p-4 rounded-lg mb-4">
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

                {invoice.payments.map((payment, paymentIndex) => (
                  <div key={paymentIndex} className="bg-white p-3 rounded border mb-3">
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FloatingInput
                        label="Transaction ID"
                        name={`invoices.${invoiceIndex}.payments.${paymentIndex}.transactionId`}
                        value={payment.transactionId}
                        onChange={handleChange}
                        error={errors[`invoices.${invoiceIndex}.payments.${paymentIndex}.transactionId`]}
                        required
                      />

                      <FloatingInput
                        label="Bank Name"
                        name={`invoices.${invoiceIndex}.payments.${paymentIndex}.bankName`}
                        value={payment.bankName}
                        onChange={handleChange}
                        error={errors[`invoices.${invoiceIndex}.payments.${paymentIndex}.bankName`]}
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

                    <div className="mt-3">
                      <FloatingInput
                        label="Remarks"
                        name={`invoices.${invoiceIndex}.payments.${paymentIndex}.remarks`}
                        value={payment.remarks}
                        onChange={handleChange}
                        type="textarea"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </form>
      
      {notification.isVisible && (
        <NotificationComponent 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
        />
      )}
    </>
  );
};

export default VendorPaymentForm;
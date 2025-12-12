import React, { useState, useEffect } from 'react';
import { Building2, FileText, Plus, Trash2, Wallet } from 'lucide-react';
import FloatingInput from './FloatingInput';
import { customersAPI, paymentsAPI, projectsAPI } from '../../services/api';

const PaymentForm = ({ payment, onSubmit, onCancel }) => {
  const [activeTab, setActiveTab] = useState('project');
  const [formData, setFormData] = useState({
    customer: '',
    project: '',
    projectName: '',
    projectCost: '',
    paymentType: 'advance',
    includeGST: false,
    gstPercentage: 18,
    invoices: [],
    payments: []
  });
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const paymentTypeOptions = [
    { value: 'advance', label: 'Advance Payment' },
    { value: 'final', label: 'Final Payment' }
  ];

  useEffect(() => {
    fetchCustomers();
    if (payment) {
      setFormData({
        customer: payment.customer || '',
        project: payment.project || '',
        projectName: payment.projectName || '',
        projectCost: payment.projectCost || '',
        paymentType: payment.paymentType || 'advance',
        includeGST: payment.includeGST || false,
        gstPercentage: payment.gstPercentage || 18,
        invoices: payment.invoices || [],
        payments: payment.payments || []
      });
      if (payment.customer) {
        fetchProjects(payment.customer);
      }
    }
  }, [payment]);

  // Update project details when projects are loaded
  useEffect(() => {
    if (projects.length > 0 && formData.customer && formData.project) {
      const selectedProject = projects.find(p => 
        p._id === formData.project || 
        p.projectName === formData.project ||
        p.projectName === formData.projectName
      );
      if (selectedProject && (!formData.projectCost || formData.projectCost !== selectedProject.totalProjectValue)) {
        setFormData(prev => ({
          ...prev,
          project: selectedProject.projectName,
          projectName: selectedProject.projectName,
          projectCost: selectedProject.totalProjectValue || prev.projectCost
        }));
      }
    }
  }, [projects]);

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProjects = async (customerName) => {
    try {
      if (!customerName) {
        setProjects([]);
        return [];
      }
      const response = await projectsAPI.getAll({ customerName, stage: 'awarded' });
      const projectsList = response.data || [];
      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to load projects for selected customer' }));
      setProjects([]);
      return [];
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'customer') {
      setFormData(prev => ({
        ...prev,
        customer: value,
        project: '',
        projectName: '',
        projectCost: ''
      }));
      setProjects([]);
      if (value) {
        fetchProjects(value);
      }
      return;
    }

    if (name === 'project' && value) {
      const selectedProject = projects.find(p => p._id === value || p.projectName === value);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          project: selectedProject.projectName,
          projectName: selectedProject.projectName,
          projectCost: selectedProject.totalProjectValue || selectedProject.projectCost || ''
        }));
      }
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const calculateAmounts = () => {
    const cost = parseFloat(formData.projectCost) || 0;
    const gst = formData.includeGST ? (cost * parseFloat(formData.gstPercentage || 0)) / 100 : 0;
    const totalAmount = cost + gst;
    
    const paidAmount = formData.payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
    
    const remainingAmount = totalAmount - paidAmount;
    
    return {
      baseAmount: cost,
      gstAmount: gst,
      totalAmount,
      paidAmount,
      remainingAmount
    };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.project) newErrors.project = 'Project is required';
    if (!formData.projectCost || parseFloat(formData.projectCost) <= 0) {
      newErrors.projectCost = 'Valid project cost is required';
    }
    if (formData.includeGST && (!formData.gstPercentage || parseFloat(formData.gstPercentage) <= 0)) {
      newErrors.gstPercentage = 'Valid GST percentage is required';
    }

    // Invoices and payments are now optional - no validation required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const amounts = calculateAmounts();

  const addInvoice = () => {
    setFormData(prev => ({
      ...prev,
      invoices: [
        ...prev.invoices,
        {
          id: Date.now().toString(),
          invoiceNumber: '',
          invoiceValue: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          paymentType: 'advance'
        }
      ]
    }));
  };

  const removeInvoice = (index) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.filter((_, i) => i !== index)
    }));
  };

  const updateInvoice = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.map((inv, i) => 
        i === index ? { ...inv, [field]: value } : inv
      )
    }));
  };

  const addPayment = () => {
    setFormData(prev => ({
      ...prev,
      payments: [
        ...prev.payments,
        {
          id: Date.now().toString(),
          transactionId: '',
          bankName: '',
          gst: '',
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'advance',
          remarks: ''
        }
      ]
    }));
  };

  const removePayment = (index) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const updatePayment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map((pmt, i) => 
        i === index ? { ...pmt, [field]: value } : pmt
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    console.log('=== Payment Form Submission ===');
    console.log('Raw formData.payments:', formData.payments);
    console.log('Number of payments before filtering:', formData.payments.length);

    // Clean up form data
    const cleanedData = {
      ...formData,
      customer: formData.customer?.trim() || undefined,
      project: formData.project?.trim() || undefined,
      projectName: formData.projectName?.trim() || undefined,
      projectCost: formData.projectCost ? parseFloat(formData.projectCost) : undefined,
      paymentType: formData.paymentType?.trim() || 'advance',
      includeGST: Boolean(formData.includeGST),
      gstPercentage: formData.includeGST ? parseFloat(formData.gstPercentage) : undefined,
      invoices: formData.invoices.map(invoice => ({
        ...invoice,
        invoiceNumber: invoice.invoiceNumber?.trim() || undefined,
        invoiceValue: invoice.invoiceValue ? parseFloat(invoice.invoiceValue) : undefined,
        invoiceDate: invoice.invoiceDate || undefined,
        paymentType: invoice.paymentType?.trim() || 'advance'
      })).filter(invoice => invoice.invoiceNumber), // Remove empty invoices
      payments: formData.payments.map(payment => ({
        ...payment,
        transactionId: payment.transactionId?.trim() || undefined,
        bankName: payment.bankName?.trim() || undefined,
        gst: payment.gst ? parseFloat(payment.gst) : undefined,
        amount: payment.amount ? parseFloat(payment.amount) : undefined,
        paymentDate: payment.paymentDate || undefined,
        paymentType: payment.paymentType?.trim() || 'advance',
        remarks: payment.remarks?.trim() || undefined
      })).filter(payment => {
        // Only require amount to be present (transactionId is optional)
        const isValid = payment.amount && payment.amount > 0;
        if (!isValid) {
          console.log('Filtering out payment (missing or invalid amount):', payment);
        }
        return isValid;
      }) // Remove empty payments
    };

    console.log('Number of payments after filtering:', cleanedData.payments.length);
    console.log('Cleaned payments data:', cleanedData.payments);

    // Remove any undefined values
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === undefined) {
        delete cleanedData[key];
      }
    });

    console.log('Submitting payment form with cleaned data:', cleanedData);

    setLoading(true);
    try {
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to save payment';
      
      setErrors({ submit: `Failed to save payment: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-h-[80vh] min-h-[600px]">


      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'project'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building2 size={18} />
            <span className="font-medium">Project Information</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText size={18} />
            <span className="font-medium">Invoices</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Wallet size={18} />
            <span className="font-medium">Payments</span>
          </button>
        </div>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {errors.submit}
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-6">
              {/* Project Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Project Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FloatingInput
                    label="Client Name"
                    name="customer"
                    type="select"
                    value={formData.customer}
                    onChange={handleChange}
                    error={errors.customer}
                    required={true}
                    options={[
                      { value: '', label: 'Select Customer' },
                      ...customers.map(c => ({ value: c.customerName, label: c.customerName }))
                    ]}
                  />

                  <FloatingInput
                    label="Project Name"
                    name="project"
                    type="select"
                    value={formData.project}
                    onChange={handleChange}
                    error={errors.project}
                    required={true}
                    options={[
                      { value: '', label: 'Select Project' },
                      ...projects.map(p => ({ value: p.projectName, label: p.projectName }))
                    ]}
                  />

                  <FloatingInput
                    label="Project Cost (₹)"
                    name="projectCost"
                    type="number"
                    value={formData.projectCost}
                    onChange={handleChange}
                    error={errors.projectCost}
                    required={true}
                  />
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="includeGST"
                      checked={formData.includeGST}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">Include GST</span>
                  
                  {formData.includeGST && (
                    <div className="ml-4 w-32">
                      <FloatingInput
                        label="GST %"
                        name="gstPercentage"
                        type="number"
                        value={formData.gstPercentage}
                        onChange={handleChange}
                        error={errors.gstPercentage}
                        required={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Calculation Section */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Amount Calculation</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Base Amount</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{amounts.baseAmount.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{amounts.totalAmount.toFixed(2)}
                    </p>
                    {formData.includeGST && (
                      <p className="text-xs text-gray-500 mt-1">
                        (incl. GST ₹{amounts.gstAmount.toFixed(2)})
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{amounts.remainingAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Invoices</h3>
                </div>
                <button
                  type="button"
                  onClick={addInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  Add Invoice
                </button>
              </div>

              {formData.invoices.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No invoices added yet. Click "Add Invoice" to get started.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {formData.invoices.map((invoice, invoiceIndex) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg bg-gray-50">
                      {/* Invoice Header */}
                      <div className="bg-orange-50 px-4 py-3 flex items-center justify-between rounded-t-lg border-b border-orange-200">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-orange-600" />
                          <span className="font-semibold text-gray-800">Invoice #{invoiceIndex + 1}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {invoice.paymentType || 'Advance Payment'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeInvoice(invoiceIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Invoice Details */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <FloatingInput
                            label="Invoice Number"
                            name="invoiceNumber"
                            value={invoice.invoiceNumber}
                            onChange={(e) => updateInvoice(invoiceIndex, 'invoiceNumber', e.target.value)}
                            error={errors[`invoiceNumber_${invoiceIndex}`]}
                            required
                          />
                          <FloatingInput
                            label="Invoice Value (₹)"
                            name="invoiceValue"
                            type="number"
                            value={invoice.invoiceValue}
                            onChange={(e) => updateInvoice(invoiceIndex, 'invoiceValue', e.target.value)}
                            error={errors[`invoiceValue_${invoiceIndex}`]}
                            required
                          />
                          <FloatingInput
                            label="Payment Type"
                            name="paymentType"
                            type="select"
                            value={invoice.paymentType || 'advance'}
                            onChange={(e) => updateInvoice(invoiceIndex, 'paymentType', e.target.value)}
                            options={paymentTypeOptions}
                            required
                          />
                          <FloatingInput
                            label="Invoice Date"
                            name="invoiceDate"
                            type="date"
                            value={invoice.invoiceDate}
                            onChange={(e) => updateInvoice(invoiceIndex, 'invoiceDate', e.target.value)}
                            error={errors[`invoiceDate_${invoiceIndex}`]}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Payments</h3>
                </div>
                <button
                  type="button"
                  onClick={addPayment}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus size={18} />
                  Add Payment
                </button>
              </div>

              {formData.payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Wallet size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No payments added yet. Click "Add Payment" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {formData.payments.map((payment, paymentIndex) => (
                    <div key={payment.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Wallet size={18} className="text-green-600" />
                          <span className="font-semibold text-gray-800">Payment #{paymentIndex + 1}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {payment.paymentType || 'Advance'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePayment(paymentIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <FloatingInput
                          label="Transaction ID"
                          name="transactionId"
                          value={payment.transactionId}
                          onChange={(e) => updatePayment(paymentIndex, 'transactionId', e.target.value)}
                          error={errors[`transactionId_${paymentIndex}`]}
                          required={false}
                        />
                        <FloatingInput
                          label="Bank Name"
                          name="bankName"
                          value={payment.bankName}
                          onChange={(e) => updatePayment(paymentIndex, 'bankName', e.target.value)}
                          error={errors[`bankName_${paymentIndex}`]}
                          required={false}
                        />
                        <FloatingInput
                          label="GST (₹)"
                          name="gst"
                          type="number"
                          value={payment.gst || ''}
                          onChange={(e) => updatePayment(paymentIndex, 'gst', e.target.value)}
                        />
                        <FloatingInput
                          label="Amount (₹)"
                          name="amount"
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(paymentIndex, 'amount', e.target.value)}
                          error={errors[`amount_${paymentIndex}`]}
                          required={false}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <FloatingInput
                          label="Payment Date"
                          name="paymentDate"
                          type="date"
                          value={payment.paymentDate}
                          onChange={(e) => updatePayment(paymentIndex, 'paymentDate', e.target.value)}
                          error={errors[`paymentDate_${paymentIndex}`]}
                          required={false}
                        />
                        <FloatingInput
                          label="Payment Type"
                          name="paymentType"
                          type="select"
                          value={payment.paymentType}
                          onChange={(e) => updatePayment(paymentIndex, 'paymentType', e.target.value)}
                          options={paymentTypeOptions}
                        />
                      </div>
                      
                      <div className="mt-3">
                        <FloatingInput
                          label="Remarks"
                          name="remarks"
                          value={payment.remarks}
                          onChange={(e) => updatePayment(paymentIndex, 'remarks', e.target.value)}
                          type="textarea"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Fixed actions at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : payment ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;

import React, { useState, useEffect } from 'react';
import { Building2, FileText, Plus, Trash2, Wallet, Truck } from 'lucide-react';
import FloatingInput from './FloatingInput';
import { customersAPI, paymentsAPI, projectsAPI, boqAPI } from '../../services/api';

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

  const dispatchedThroughOptions = [
    { value: '', label: 'Select Option' },
    { value: 'road', label: 'By Road' },
    { value: 'rail', label: 'By Rail' },
    { value: 'air', label: 'By Air' },
    { value: 'courier', label: 'Courier' },
    { value: 'hand_delivery', label: 'Hand Delivery' },
    { value: 'other', label: 'Other' }
  ];

  const destinationOptions = [
    { value: '', label: 'Select Destination' },
    { value: 'factory', label: 'Factory' },
    { value: 'site', label: 'Site' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'office', label: 'Office' },
    { value: 'other', label: 'Other' }
  ];

  const termsForDeliveryOptions = [
    { value: '', label: 'Select Terms' },
    { value: 'ex_works', label: 'Ex Works' },
    { value: 'fob', label: 'FOB' },
    { value: 'cif', label: 'CIF' },
    { value: 'door_delivery', label: 'Door Delivery' },
    { value: 'installation_included', label: 'Installation Included' },
    { value: 'as_per_order', label: 'As per Order' }
  ];

  // Helper function to convert ISO date to yyyy-MM-dd format
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return new Date().toISOString().split('T')[0];
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  useEffect(() => {
    fetchCustomers();
    if (payment) {
      // Convert dates in invoices and payments to yyyy-MM-dd format
      const formattedInvoices = (payment.invoices || []).map((invoice, index) => ({
        ...invoice,
        id: invoice.id || invoice._id || `invoice-${Date.now()}-${index}`,
        invoiceDate: formatDateForInput(invoice.invoiceDate)
      }));

      const formattedPayments = (payment.payments || []).map((pmt, index) => ({
        ...pmt,
        id: pmt.id || pmt._id || `payment-${Date.now()}-${index}`,
        paymentDate: formatDateForInput(pmt.paymentDate || pmt.date)
      }));

      setFormData({
        customer: payment.customer || '',
        project: payment.project || '',
        projectName: payment.projectName || '',
        projectCost: payment.projectCost || '',
        paymentType: payment.paymentType || 'advance',
        includeGST: payment.includeGST || false,
        gstPercentage: payment.gstPercentage || 18,
        invoices: formattedInvoices,
        payments: formattedPayments
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
      // Fetch all BOQ records to get unique customers
      const boqResponse = await boqAPI.getAll();
      
      console.log('BOQ Response:', boqResponse);
      console.log('BOQ Response data:', boqResponse.data);
      
      // Handle different response structures
      let boqList = [];
      if (boqResponse.data && boqResponse.data.data) {
        // Response structure: { data: { data: [...] } }
        boqList = boqResponse.data.data;
      } else if (boqResponse.data && Array.isArray(boqResponse.data)) {
        // Response structure: { data: [...] }
        boqList = boqResponse.data;
      } else if (Array.isArray(boqResponse)) {
        // Direct array response
        boqList = boqResponse;
      }
      
      console.log('BOQ List:', boqList);
      console.log('Is BOQ List an array?', Array.isArray(boqList));
      
      if (!Array.isArray(boqList)) {
        console.error('BOQ List is not an array:', typeof boqList, boqList);
        throw new Error('BOQ data is not in expected format');
      }
      
      // Extract unique customer names from BOQ records
      const uniqueCustomerNames = [...new Set(boqList.map(boq => boq.customer))].filter(Boolean);
      
      console.log('Customers with BOQ records:', uniqueCustomerNames);
      
      // Create customer objects for the dropdown
      const customersWithBOQ = uniqueCustomerNames.map(name => ({
        _id: name,
        customerName: name
      }));
      
      setCustomers(customersWithBOQ);
    } catch (error) {
      console.error('Error fetching customers with BOQ:', error);
      // Fallback to all customers if BOQ fetch fails
      try {
        const response = await customersAPI.getAll();
        setCustomers(response.data || []);
      } catch (fallbackError) {
        console.error('Error fetching all customers:', fallbackError);
      }
    }
  };

  const fetchProjects = async (customerName) => {
    try {
      if (!customerName) {
        setProjects([]);
        return [];
      }
      
      console.log('Fetching projects for customer:', customerName);
      
      // Fetch all projects for the customer
      const projectsResponse = await projectsAPI.getAll({ customerName });
      const allProjects = projectsResponse.data || [];
      
      console.log('All projects for customer:', allProjects);
      
      // Fetch BOQ records for this customer to filter projects
      const boqResponse = await boqAPI.getAll({ customer: customerName });
      
      // Handle different response structures for BOQ
      let boqList = [];
      if (boqResponse.data && boqResponse.data.data) {
        boqList = boqResponse.data.data;
      } else if (boqResponse.data && Array.isArray(boqResponse.data)) {
        boqList = boqResponse.data;
      } else if (Array.isArray(boqResponse)) {
        boqList = boqResponse;
      }
      
      console.log('BOQ records for customer:', boqList);
      
      // Extract project names that have BOQ records
      const projectNamesWithBOQ = boqList.map(boq => boq.projectName).filter(Boolean);
      
      console.log('Project names with BOQ:', projectNamesWithBOQ);
      
      // Filter projects to only show those with BOQ records
      const projectsWithBOQ = allProjects.filter(project => 
        projectNamesWithBOQ.includes(project.projectName)
      );
      
      console.log('Filtered projects with BOQ:', projectsWithBOQ);
      console.log('Number of projects with BOQ:', projectsWithBOQ.length);
      
      setProjects(projectsWithBOQ);
      return projectsWithBOQ;
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to load projects for selected customer' }));
      setProjects([]);
      return [];
    }
  };

  const fetchBOQData = async (customerName, projectName, selectedProject) => {
    try {
      if (!customerName || !projectName) {
        console.log('Missing customer or project name for BOQ fetch');
        return;
      }

      console.log('Fetching BOQ for customer:', customerName, 'project:', projectName);
      
      // Fetch BOQ data filtered by customer and project name
      const response = await boqAPI.getAll({ customer: customerName });
      const boqList = response.data || [];
      
      console.log('BOQ data received:', boqList);

      // Find the BOQ that matches the project name
      const projectBOQ = boqList.find(boq => 
        boq.projectName === projectName || 
        boq.projectName?.toLowerCase() === projectName?.toLowerCase()
      );

      console.log('Matching BOQ found:', projectBOQ);

      if (projectBOQ) {
        // Update form data with BOQ information
        setFormData(prev => ({
          ...prev,
          project: selectedProject.projectName,
          projectName: selectedProject.projectName,
          projectCost: projectBOQ.totalWithGST || selectedProject.totalProjectValue || selectedProject.projectCost || '',
          includeGST: projectBOQ.gstPercentage > 0,
          gstPercentage: projectBOQ.gstPercentage || 18
        }));
      } else {
        // No BOQ found, use project data
        console.log('No BOQ found for project, using project data');
        setFormData(prev => ({
          ...prev,
          project: selectedProject.projectName,
          projectName: selectedProject.projectName,
          projectCost: selectedProject.totalProjectValue || selectedProject.projectCost || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
      // Fall back to project data if BOQ fetch fails
      setFormData(prev => ({
        ...prev,
        project: selectedProject.projectName,
        projectName: selectedProject.projectName,
        projectCost: selectedProject.totalProjectValue || selectedProject.projectCost || ''
      }));
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
        // Fetch BOQ data for the selected project
        fetchBOQData(formData.customer, selectedProject.projectName, selectedProject);
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
          paymentType: 'advance',
          voucherNo: '',
          buyersRef: '',
          dispatchedThrough: '',
          destination: '',
          termsForDelivery: '',
          hsnSac: '',
          cgst: '',
          sgst: '',
          roundOff: '',
          cgstAmount: 0,
          sgstAmount: 0,
          totalWithTax: 0
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
    const updatedInvoices = [...formData.invoices];
    updatedInvoices[index] = { ...updatedInvoices[index], [field]: value };
    
    // Get the current invoice after the field update
    const invoice = updatedInvoices[index];
    
    // Calculate tax amounts whenever invoice value, cgst%, sgst%, or roundOff changes
    if (field === 'invoiceValue' || field === 'cgst' || field === 'sgst' || field === 'roundOff' || field === 'hsnSac') {
      const invoiceValue = parseFloat(invoice.invoiceValue) || 0;
      const cgstRate = parseFloat(invoice.cgst) || 9; // Default to 9% if empty
      const sgstRate = parseFloat(invoice.sgst) || 9; // Default to 9% if empty
      const roundOff = parseFloat(invoice.roundOff) || 0;
      
      // Calculate tax amounts
      const cgstAmount = (invoiceValue * cgstRate) / 100;
      const sgstAmount = (invoiceValue * sgstRate) / 100;
      const totalWithTax = invoiceValue + cgstAmount + sgstAmount + roundOff;
      
      // Update the invoice with calculated values
      updatedInvoices[index] = {
        ...updatedInvoices[index],
        cgst: cgstRate.toString(),
        sgst: sgstRate.toString(),
        cgstAmount,
        sgstAmount,
        totalWithTax
      };
    }
    
    setFormData(prev => ({
      ...prev,
      invoices: updatedInvoices
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
        paymentType: invoice.paymentType?.trim() || 'advance',
        voucherNo: invoice.voucherNo?.trim() || undefined,
        buyersRef: invoice.buyersRef?.trim() || undefined,
        dispatchedThrough: invoice.dispatchedThrough?.trim() || undefined,
        destination: invoice.destination?.trim() || undefined,
        termsForDelivery: invoice.termsForDelivery?.trim() || undefined,
        hsnSac: invoice.hsnSac?.trim() || undefined,
        cgst: invoice.cgst ? parseFloat(invoice.cgst) : undefined,
        sgst: invoice.sgst ? parseFloat(invoice.sgst) : undefined,
        roundOff: invoice.roundOff ? parseFloat(invoice.roundOff) : undefined,
        cgstAmount: invoice.cgstAmount ? parseFloat(invoice.cgstAmount) : 0,
        sgstAmount: invoice.sgstAmount ? parseFloat(invoice.sgstAmount) : 0,
        totalWithTax: invoice.totalWithTax ? parseFloat(invoice.totalWithTax) : invoice.invoiceValue
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
        const isValid = payment.amount && payment.amount > 0;
        if (!isValid) {
          console.log('Filtering out payment (missing or invalid amount):', payment);
        }
        return isValid;
      })
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

                        {/* Voucher and Buyer's Reference */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FloatingInput
                            label="Voucher No"
                            name="voucherNo"
                            value={invoice.voucherNo}
                            onChange={(e) => updateInvoice(invoiceIndex, 'voucherNo', e.target.value)}
                          />
                          <FloatingInput
                            label="Buyer's Ref / Order No"
                            name="buyersRef"
                            value={invoice.buyersRef}
                            onChange={(e) => updateInvoice(invoiceIndex, 'buyersRef', e.target.value)}
                          />
                        </div>

                        {/* Delivery Information */}
                        <div className="flex items-center gap-2 mb-4 text-gray-700">
                          <Truck size={18} />
                          <span className="font-medium">Delivery Information</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <FloatingInput
                            label="Dispatched Through"
                            name="dispatchedThrough"
                            type="select"
                            value={invoice.dispatchedThrough}
                            onChange={(e) => updateInvoice(invoiceIndex, 'dispatchedThrough', e.target.value)}
                            options={dispatchedThroughOptions}
                          />
                          <FloatingInput
                            label="Destination"
                            name="destination"
                            type="select"
                            value={invoice.destination}
                            onChange={(e) => updateInvoice(invoiceIndex, 'destination', e.target.value)}
                            options={destinationOptions}
                          />
                          <FloatingInput
                            label="Terms for Delivery"
                            name="termsForDelivery"
                            type="select"
                            value={invoice.termsForDelivery}
                            onChange={(e) => updateInvoice(invoiceIndex, 'termsForDelivery', e.target.value)}
                            options={termsForDeliveryOptions}
                          />
                        </div>

                        {/* Tax Information */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-blue-600" />
                            <span className="font-semibold text-gray-800">Tax Information</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <FloatingInput
                              label="HSN/SAC Code"
                              name="hsnSac"
                              value={invoice.hsnSac}
                              onChange={(e) => updateInvoice(invoiceIndex, 'hsnSac', e.target.value)}
  
                            />
                            <FloatingInput
                              label="CGST %"
                              name="cgst"
                              type="number"
                              value={invoice.cgst}
                              onChange={(e) => updateInvoice(invoiceIndex, 'cgst', e.target.value)}
                            />
                            <FloatingInput
                              label="SGST %"
                              name="sgst"
                              type="number"
                              value={invoice.sgst}
                              onChange={(e) => updateInvoice(invoiceIndex, 'sgst', e.target.value)}

                            />
                            <FloatingInput
                              label="Round Off (₹)"
                              name="roundOff"
                              type="number"
                              value={invoice.roundOff}
                              onChange={(e) => updateInvoice(invoiceIndex, 'roundOff', e.target.value)}
                            />
                          </div>

                          {/* Calculated Tax Amounts */}
                          {invoice.invoiceValue && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                              <div className="text-center">
                                <p className="text-sm text-gray-600">CGST Amount</p>
                                <p className="text-lg font-semibold text-blue-600">
                                  ₹{(invoice.cgstAmount || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-600">SGST Amount</p>
                                <p className="text-lg font-semibold text-green-600">
                                  ₹{(invoice.sgstAmount || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-600">Total with Tax</p>
                                <p className="text-lg font-bold text-purple-600">
                                  ₹{(invoice.totalWithTax || invoice.invoiceValue || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}
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
import React, { useState, useEffect } from 'react';
import { Building2, FileText, Plus, Trash2, Wallet, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
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
    consigneeAddress: '',
    buyerAddress: '',
    invoices: [{
      id: 'default-invoice-1',
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
      cgst: '9',
      sgst: '9',
      cgstAmount: 0,
      sgstAmount: 0,
      totalWithTax: 0
    }],
    payments: [{
      id: 'default-payment-1',
      transactionId: '',
      bankName: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paymentType: 'advance',
      remarks: ''
    }]
  });
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [boqInstallments, setBoqInstallments] = useState([]);
  const [totalAlreadyInvoiced, setTotalAlreadyInvoiced] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [invoiceErrors, setInvoiceErrors] = useState({});
  const [usedInvoiceNumbers, setUsedInvoiceNumbers] = useState(new Set());

  const fetchProjectInvoicedAmount = async (customerName, projectName) => {
    try {
      if (!customerName || !projectName) return;

      const response = await paymentsAPI.getAll({
        customer: customerName,
        project: projectName,
        limit: 1000
      });

      const paymentsList = response.payments || (Array.isArray(response) ? response : []);
      const usedNumbers = new Set();

      const total = paymentsList.reduce((sum, p) => {
        // Collect invoice numbers
        if (p.invoices) {
          p.invoices.forEach(inv => {
            if (inv.invoiceNumber) usedNumbers.add(inv.invoiceNumber.toLowerCase());
          });
        }

        if (payment && (p._id === payment._id || p.id === payment.id)) return sum;

        const paymentInvoicesTotal = (p.invoices || []).reduce((invSum, inv) => {
          const val = parseFloat(inv.totalWithTax) || parseFloat(inv.invoiceValue) || 0;
          return invSum + (Math.round(val * 100) / 100);
        }, 0);

        return sum + (Math.round(paymentInvoicesTotal * 100) / 100);
      }, 0);

      setUsedInvoiceNumbers(usedNumbers);
      setTotalAlreadyInvoiced(total);
    } catch (error) {
      console.error('Error fetching invoiced amount:', error);
    }
  };

  const paymentTypeOptions = [
    { value: 'advance', label: 'Advance Payment' },
    { value: 'final', label: 'Final Payment' }
  ];

  const dispatchedThroughOptions = [
    { value: '', label: 'Select Option' },
    { value: 'By Road', label: 'By Road' },
    { value: 'By Rail', label: 'By Rail' },
    { value: 'By Air', label: 'By Air' },
    { value: 'Courier', label: 'Courier' },
    { value: 'Hand Delivery', label: 'Hand Delivery' },
    { value: 'Other', label: 'Other' }
  ];

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

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue || '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting display date:', error);
      return dateValue || '';
    }
  };

  useEffect(() => {
    fetchCustomers();
    if (payment) {
      const formattedInvoices = (payment.invoices || []).map((invoice, index) => ({
        ...invoice,
        id: invoice.id || invoice._id || `invoice-${Date.now()}-${index}`,
        invoiceDate: formatDateForInput(invoice.invoiceDate),
        overdueDate: invoice.overdueDate || invoice.dueDate,
        cgst: invoice.cgst || '9',
        sgst: invoice.sgst || '9',
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
        projectCost: payment.projectCost !== undefined ? payment.projectCost : '',
        paymentType: payment.paymentType || 'advance',
        includeGST: payment.includeGST ?? false,
        gstPercentage: payment.gstPercentage !== undefined ? payment.gstPercentage : 18,
        consigneeAddress: payment.consigneeAddress || '',
        buyerAddress: payment.buyerAddress || '',
        invoices: formattedInvoices,
        payments: formattedPayments.length > 0 ? formattedPayments : [{
          id: `payment-default-${Date.now()}`,
          transactionId: '',
          bankName: '',
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'advance',
          remarks: ''
        }]
      });
      if (payment.customer) {
        fetchProjects(payment.customer);
        if (payment.project || payment.projectName) {
          fetchProjectInvoicedAmount(payment.customer, payment.project || payment.projectName);
          fetchBoqTerms(payment.customer, payment.project || payment.projectName);
        }
      }
    }
  }, [payment]);

  const fetchBoqTerms = async (customerName, projectName) => {
    try {
      if (!customerName || !projectName) return;
      const response = await boqAPI.getAll({ customer: customerName });
      let boqList = [];
      if (response.data && Array.isArray(response.data.data)) {
        boqList = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        boqList = response.data;
      } else if (Array.isArray(response.data)) {
        boqList = response.data;
      } else if (Array.isArray(response)) {
        boqList = response;
      }

      const projectBOQ = boqList.find(boq =>
        boq.projectName === projectName ||
        boq.projectName?.toLowerCase() === projectName?.toLowerCase()
      );

      if (projectBOQ) {
        setBoqInstallments(projectBOQ.paymentTerms || []);
      }
    } catch (error) {
      console.error('Error fetching BOQ terms:', error);
      }
  };

  const fetchCustomers = async () => {
    try {
      const boqResponse = await boqAPI.getAll();
      let boqList = [];
      if (boqResponse.data && boqResponse.data.data) {
        boqList = boqResponse.data.data;
      } else if (boqResponse.data && Array.isArray(boqResponse.data)) {
        boqList = boqResponse.data;
      } else if (Array.isArray(boqResponse)) {
        boqList = boqResponse;
      }
      
      if (!Array.isArray(boqList)) {
        throw new Error('BOQ data is not in expected format');
      }
      
      const uniqueCustomerNames = [...new Set(boqList.map(boq => boq.customer))].filter(Boolean);
      const customersWithBOQ = uniqueCustomerNames.map(name => ({
        _id: name,
        customerName: name
      }));
      
      setCustomers(customersWithBOQ);
    } catch (error) {
      console.error('Error fetching customers with BOQ:', error);
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
      
      const projectsResponse = await projectsAPI.getAll({ customerName });
      const allProjects = projectsResponse.data || [];
      
      const boqResponse = await boqAPI.getAll({ customer: customerName });
      let boqList = [];
      if (boqResponse.data && boqResponse.data.data) {
        boqList = boqResponse.data.data;
      } else if (boqResponse.data && Array.isArray(boqResponse.data)) {
        boqList = boqResponse.data;
      } else if (Array.isArray(boqResponse)) {
        boqList = boqResponse;
      }
      
      setProjects(allProjects);
      return allProjects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrors(prev => ({ ...prev, submit: 'Failed to load projects for selected customer' }));
      setProjects([]);
      return [];
    }
  };

  const fetchBOQData = async (customerName, projectName, selectedProject) => {
    try {
      if (!customerName || !projectName) return;

      const response = await boqAPI.getAll({ customer: customerName });
      let boqList = [];
      if (response.data && Array.isArray(response.data.data)) {
        boqList = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        boqList = response.data;
      } else if (Array.isArray(response.data)) {
        boqList = response.data;
      } else if (Array.isArray(response)) {
        boqList = response;
      } else {
        boqList = [];
      }

      const projectBOQ = boqList.find(boq => 
        boq.projectName === projectName || 
        boq.projectName?.toLowerCase() === projectName?.toLowerCase()
      );

      if (projectBOQ) {
        setFormData(prev => ({
          ...prev,
          project: selectedProject?._id || projectName,
          projectName: projectName,
          projectCost: projectBOQ.totalWithGST || '',
          includeGST: false,
          gstPercentage: projectBOQ.gstPercentage || 18,
        }));
        setBoqInstallments(projectBOQ.paymentTerms || []);
      } else {
        setFormData(prev => ({
          ...prev,
          project: selectedProject?._id || projectName,
          projectName: projectName,
          projectCost: ''
        }));
      }
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
      setFormData(prev => ({
        ...prev,
        project: selectedProject?._id || projectName,
        projectName: projectName,
        projectCost: ''
      }));
    }
  };

  const fetchCustomerDetails = async (customerName) => {
    try {
      if (!customerName) return;
      const response = await customersAPI.getAll();
      const customersList = response.data || [];

      const customer = customersList.find(c =>
        c.customerName === customerName ||
        c.customerName?.toLowerCase() === customerName?.toLowerCase()
      );

      if (customer) {
        const billingAddress = customer.billingAddress ||
          `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} - ${customer.zipCode || ''}, ${customer.country || ''}`.trim();

        setFormData(prev => ({
          ...prev,
          consigneeAddress: billingAddress,
          buyerAddress: billingAddress
        }));
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
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
      setErrors(prev => ({ ...prev, submit: '', customer: '' }));
      setProjects([]);
      if (value) {
        fetchProjects(value);
        fetchCustomerDetails(value);
      }
      return;
    }

    if (name === 'project' && value) {
      const selectedProject = projects.find(p => p._id === value || p.projectName === value);
      if (selectedProject) {
        setFormData(prev => ({
          ...prev,
          project: selectedProject._id || selectedProject.projectName,
          projectName: selectedProject.projectName
        }));
        fetchBOQData(formData.customer, selectedProject.projectName, selectedProject);
        fetchProjectInvoicedAmount(formData.customer, selectedProject.projectName);
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

  const validateInvoiceAmount = (invoiceValue, invoiceIndex) => {
    if (!formData.projectCost || !invoiceValue) return true;

    const currentInvoiceValue = parseFloat(invoiceValue) || 0;
    const projectTotalCost = parseFloat(formData.projectCost) || 0;

    const otherInvoicesTotal = formData.invoices.reduce((sum, inv, idx) => {
      if (idx === invoiceIndex) return sum;
      return sum + (parseFloat(inv.totalWithTax) || parseFloat(inv.invoiceValue) || 0);
    }, 0);

    const totalInvoiced = totalAlreadyInvoiced + otherInvoicesTotal + currentInvoiceValue;

    if (totalInvoiced > projectTotalCost) {
      const remaining = Math.max(0, projectTotalCost - totalAlreadyInvoiced - otherInvoicesTotal);
      setInvoiceErrors(prev => ({
        ...prev,
        [invoiceIndex]: `Invoice amount exceeds available limit. Maximum allowed: ₹${remaining.toFixed(2)}`
      }));
      return false;
    }

    setInvoiceErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[invoiceIndex];
      return newErrors;
    });
    return true;
  };

  const validateInvoiceNumberUniqueness = (number, invoiceIndex) => {
    if (!number) return true;

    // Check against database used numbers
    if (usedInvoiceNumbers.has(number.toLowerCase())) {
      // If editing existing payment, allow its own invoice numbers
      const isOwnInvoice = payment?.invoices?.some(inv => inv.invoiceNumber?.toLowerCase() === number.toLowerCase());
      if (!isOwnInvoice) {
        setErrors(prev => ({
          ...prev,
          [`invoiceNumber_${invoiceIndex}`]: 'Invoice Number already exists for this project'
        }));
        return false;
      }
    }

    // Check against other invoices in current form
    const isDuplicateInForm = formData.invoices.some((inv, idx) =>
      idx !== invoiceIndex && inv.invoiceNumber?.toLowerCase() === number.toLowerCase()
    );

    if (isDuplicateInForm) {
      setErrors(prev => ({
        ...prev,
        [`invoiceNumber_${invoiceIndex}`]: 'Duplicate Invoice Number in current form'
      }));
      return false;
    }

    // Clear error if valid
    if (errors[`invoiceNumber_${invoiceIndex}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`invoiceNumber_${invoiceIndex}`];
        return newErrors;
      });
    }
    return true;
  };

  const validateProjectTab = () => {
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

  const validateInvoiceTab = () => {
    const newErrors = {};

    if (formData.invoices.length === 0) {
      newErrors.submit = 'At least one invoice is required';
      setErrors(newErrors);
      return false;
    }

    let hasValidInvoice = false;
    formData.invoices.forEach((invoice, index) => {
      if (!invoice.invoiceNumber) {
        newErrors[`invoiceNumber_${index}`] = 'Invoice number is required';
      } else if (invoice.invoiceValue === '' || isNaN(parseFloat(invoice.invoiceValue)) || parseFloat(invoice.invoiceValue) < 0) {
        newErrors[`invoiceValue_${index}`] = 'Valid invoice value is required';
      } else if (!invoice.invoiceDate) {
        newErrors[`invoiceDate_${index}`] = 'Invoice date is required';
      } else {
        hasValidInvoice = true;
      }
    });

    if (!hasValidInvoice) {
      newErrors.submit = 'Please fill at least one invoice completely';
    }

    if (Object.keys(invoiceErrors).length > 0) {
      newErrors.submit = 'Please fix invoice amount errors before proceeding';
    }

    // Check for invoice number uniqueness/errors
    formData.invoices.forEach((invoice, index) => {
      if (invoice.invoiceNumber && !validateInvoiceNumberUniqueness(invoice.invoiceNumber, index)) {
        newErrors[`invoiceNumber_${index}`] = 'Invoice Number already exists or is duplicate';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

    if (formData.invoices.length === 0) {
      newErrors.submit = 'At least one invoice is required';
    }

    let hasValidInvoice = false;
    formData.invoices.forEach((invoice, index) => {
      if (!invoice.invoiceNumber) {
        newErrors[`invoiceNumber_${index}`] = 'Invoice number is required';
      } else if (invoice.invoiceValue === '' || isNaN(parseFloat(invoice.invoiceValue)) || parseFloat(invoice.invoiceValue) < 0) {
        newErrors[`invoiceValue_${index}`] = 'Valid invoice value is required';
      } else if (!invoice.invoiceDate) {
        newErrors[`invoiceDate_${index}`] = 'Invoice date is required';
      } else {
        hasValidInvoice = true;
      }
    });

    if (!hasValidInvoice && formData.invoices.length > 0) {
      newErrors.submit = 'Please fill at least one invoice completely';
    }

    if (Object.keys(invoiceErrors).length > 0) {
      newErrors.submit = 'Please fix invoice amount errors before submitting';
    }

    const currentInvoicesTotal = formData.invoices.reduce((sum, inv) => {
      return sum + (parseFloat(inv.totalWithTax) || parseFloat(inv.invoiceValue) || 0);
    }, 0);

    const projectTotalCost = parseFloat(formData.projectCost) || 0;

    if (projectTotalCost > 0) {
      if (totalAlreadyInvoiced + currentInvoicesTotal > projectTotalCost) {
        const remaining = Math.max(0, projectTotalCost - totalAlreadyInvoiced);
        newErrors.submit = `Total invoice amount (₹${(totalAlreadyInvoiced + currentInvoicesTotal).toFixed(2)}) exceeds Project Cost (₹${projectTotalCost.toFixed(2)}). Remaining limit: ₹${remaining.toFixed(2)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const amounts = calculateAmounts();

  const addInvoice = () => {
    const newInvoice = {
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
      cgst: '9',
      sgst: '9',
          cgstAmount: 0,
          sgstAmount: 0,
          totalWithTax: 0
    };

    setFormData(prev => ({
      ...prev,
      invoices: [...prev.invoices, newInvoice]
    }));
  };

  const removeInvoice = (index) => {
    if (formData.invoices.length <= 1) {
      setErrors(prev => ({ ...prev, submit: 'At least one invoice is required' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      invoices: prev.invoices.filter((_, i) => i !== index)
    }));

    setInvoiceErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      const reindexedErrors = {};
      Object.keys(newErrors).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          reindexedErrors[keyNum - 1] = newErrors[key];
        } else {
          reindexedErrors[keyNum] = newErrors[key];
        }
      });
      return reindexedErrors;
    });
  };

  const updateInvoice = (index, field, value) => {
    setFormData(prev => {
      const updatedInvoices = [...prev.invoices];
      let invoice = { ...updatedInvoices[index], [field]: value };
    
      if (field === 'cgst' || field === 'sgst') {
        if (value === '') {
          invoice = { ...invoice, [field]: '' };
        } else {
          let numericValue = value.replace(/[^0-9.]/g, '');
          const parts = numericValue.split('.');
          if (parts.length > 2) {
            numericValue = parts[0] + '.' + parts.slice(1).join('');
          }

          const floatValue = parseFloat(numericValue);
          if (!isNaN(floatValue)) {
            if (floatValue > 100) {
              numericValue = '100';
            } else if (floatValue < 0) {
              numericValue = '0';
            }
          }

          invoice = { ...invoice, [field]: numericValue };
        }
      }

      if (field === 'invoiceValue' || field === 'cgst' || field === 'sgst' || field === 'hsnSac') {
      const invoiceValue = parseFloat(invoice.invoiceValue) || 0;
        const cgstRate = parseFloat(invoice.cgst) || 0;
        const sgstRate = parseFloat(invoice.sgst) || 0;
      
      const cgstAmount = (invoiceValue * cgstRate) / 100;
      const sgstAmount = (invoiceValue * sgstRate) / 100;
        const totalWithTax = invoiceValue + cgstAmount + sgstAmount;
      
        invoice = {
          ...invoice,
        cgstAmount,
        sgstAmount,
        totalWithTax
      };
    }
    
      updatedInvoices[index] = invoice;

      if (field === 'invoiceValue') {
        setTimeout(() => {
          validateInvoiceAmount(value, index);
        }, 100);
      }

      if (field === 'invoiceNumber') {
        setTimeout(() => {
          validateInvoiceNumberUniqueness(value, index);
        }, 100);
      }

      if (errors[`${field}_${index}`]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${field}_${index}`];
          return newErrors;
        });
      }

      return {
      ...prev,
      invoices: updatedInvoices
      };
    });
  };

  // Add a new payment
  const addPayment = () => {
    const newPayment = {
          id: Date.now().toString(),
          transactionId: '',
          bankName: '',
          amount: '',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'advance',
          remarks: ''
    };

    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, newPayment]
    }));
  };

  // Remove a payment
  const removePayment = (index) => {
    if (formData.payments.length <= 1) return;

    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  // Update payment field
  const updatePayment = (index, field, value) => {
    setFormData(prev => {
      const updatedPayments = [...prev.payments];
      updatedPayments[index] = {
        ...updatedPayments[index],
        [field]: value
      };

      return {
      ...prev,
        payments: updatedPayments
      };
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (!validateProjectTab()) {
      setErrors(prev => ({ ...prev, submit: 'Please complete project information first' }));
      return;
    }
    if (!validateInvoiceTab()) return;

    const cleanedData = {
      ...formData,
      customer: formData.customer?.trim() || '',
      project: formData.project?.trim() || '',
      projectName: formData.projectName?.trim() || '',
      projectCost: formData.projectCost ? parseFloat(formData.projectCost) : 0,
      paymentType: formData.paymentType?.trim() || 'advance',
      includeGST: Boolean(formData.includeGST),
      gstPercentage: formData.includeGST ? parseFloat(formData.gstPercentage) : 0,
      consigneeAddress: formData.consigneeAddress?.trim() || '',
      buyerAddress: formData.buyerAddress?.trim() || '',
      invoices: formData.invoices.map(invoice => {
        const value = parseFloat(invoice.invoiceValue) || 0;
        const cgst = invoice.cgst !== '' ? parseFloat(invoice.cgst) : 9;
        const sgst = invoice.sgst !== '' ? parseFloat(invoice.sgst) : 9;
        const cgstAmt = (value * cgst) / 100;
        const sgstAmt = (value * sgst) / 100;

        return {
          invoiceNumber: invoice.invoiceNumber?.trim() || '',
          invoiceValue: value,
          invoiceDate: invoice.invoiceDate || new Date().toISOString(),
          paymentType: invoice.paymentType?.trim() || '',
          voucherNo: invoice.voucherNo?.trim() || '',
          buyersRef: invoice.buyersRef?.trim() || '',
          dispatchedThrough: invoice.dispatchedThrough?.trim() || '',
          destination: invoice.destination?.trim() || '',
          termsForDelivery: invoice.termsForDelivery?.trim() || '',
          hsnSac: invoice.hsnSac?.trim() || '',
          cgst: cgst,
          sgst: sgst,
          cgstAmount: invoice.cgstAmount ? parseFloat(invoice.cgstAmount) : cgstAmt,
          sgstAmount: invoice.sgstAmount ? parseFloat(invoice.sgstAmount) : sgstAmt,
          totalWithTax: invoice.totalWithTax ? parseFloat(invoice.totalWithTax) : (value + cgstAmt + sgstAmt),
          overdueDate: invoice.overdueDate || invoice.dueDate
        };
      }).filter(invoice => invoice.invoiceNumber && invoice.invoiceValue >= 0),
      // Preserve existing payments if updating, otherwise empty array
      payments: payment ? formData.payments : []
    };

    console.log('Sending Invoice Data:', cleanedData);

    setLoading(true);
    try {
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        JSON.stringify(error.response?.data) ||
        'Failed to save payment';

      setErrors({ submit: `Failed to save payment: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const cleanedData = {
      ...formData,
      customer: formData.customer?.trim() || '',
      project: formData.project?.trim() || '',
      projectName: formData.projectName?.trim() || '',
      projectCost: formData.projectCost ? parseFloat(formData.projectCost) : 0,
      paymentType: formData.paymentType?.trim() || 'advance',
      includeGST: Boolean(formData.includeGST),
      gstPercentage: formData.includeGST ? parseFloat(formData.gstPercentage) : 0,
      consigneeAddress: formData.consigneeAddress?.trim() || '',
      buyerAddress: formData.buyerAddress?.trim() || '',
      invoices: formData.invoices.map(invoice => {
        const value = parseFloat(invoice.invoiceValue) || 0;
        const cgst = invoice.cgst !== '' ? parseFloat(invoice.cgst) : 9;
        const sgst = invoice.sgst !== '' ? parseFloat(invoice.sgst) : 9;
        const cgstAmt = (value * cgst) / 100;
        const sgstAmt = (value * sgst) / 100;

        return {
          invoiceNumber: invoice.invoiceNumber?.trim() || '',
          invoiceValue: value,
          invoiceDate: invoice.invoiceDate || new Date().toISOString(),
          paymentType: invoice.paymentType?.trim() || '',
          voucherNo: invoice.voucherNo?.trim() || '',
          buyersRef: invoice.buyersRef?.trim() || '',
          dispatchedThrough: invoice.dispatchedThrough?.trim() || '',
          destination: invoice.destination?.trim() || '',
          termsForDelivery: invoice.termsForDelivery?.trim() || '',
          hsnSac: invoice.hsnSac?.trim() || '',
          cgst: cgst,
          sgst: sgst,
          cgstAmount: invoice.cgstAmount ? parseFloat(invoice.cgstAmount) : cgstAmt,
          sgstAmount: invoice.sgstAmount ? parseFloat(invoice.sgstAmount) : sgstAmt,
          totalWithTax: invoice.totalWithTax ? parseFloat(invoice.totalWithTax) : (value + cgstAmt + sgstAmt),
          overdueDate: invoice.overdueDate || invoice.dueDate
        };
      }).filter(invoice => invoice.invoiceNumber && invoice.invoiceValue >= 0),
      payments: formData.payments.map(payment => ({
        transactionId: payment.transactionId?.trim() || '',
        bankName: payment.bankName?.trim() || '',
        gst: 0,
        amount: payment.amount !== '' ? parseFloat(payment.amount) : 0,
        paymentDate: payment.paymentDate || new Date().toISOString(),
        paymentType: payment.paymentType?.trim() || 'advance',
        remarks: payment.remarks?.trim() || ''
      })).filter(payment => payment.amount !== 0) // Only send payments with amount
    };

    console.log('Sending Payment Data:', cleanedData);

    setLoading(true);
    try {
      await onSubmit(cleanedData);
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
        JSON.stringify(error.response?.data) ||
                          'Failed to save payment';
      
      setErrors({ submit: `Failed to save payment: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  };

  const handleNextClick = () => {
    if (activeTab === 'project') {
      if (validateProjectTab()) {
        setActiveTab('invoices');
      }
    } else if (activeTab === 'invoices') {
      if (validateInvoiceTab()) {
        setActiveTab('payments');
      }
    }
  };

  const handlePreviousClick = () => {
    if (activeTab === 'invoices') {
      setActiveTab('project');
    } else if (activeTab === 'payments') {
      setActiveTab('invoices');
    }
  };

  const handleTabClick = (tab) => {
    // If we are in edit mode, allow navigating to any tab directly
    if (payment) {
      setActiveTab(tab);
      return;
    }

    if (tab === 'payments') {
      if (activeTab === 'invoices') {
        if (validateInvoiceTab()) {
          setActiveTab('payments');
        }
      } else if (activeTab === 'project') {
        if (validateProjectTab() && validateInvoiceTab()) {
          setActiveTab('payments');
        }
      } else {
        setActiveTab('payments');
      }
    } else if (tab === 'invoices') {
      if (activeTab === 'project') {
        if (validateProjectTab()) {
          setActiveTab('invoices');
        }
      } else {
        setActiveTab('invoices');
      }
    } else {
      setActiveTab(tab);
    }
  };

  const currentInvoicesTotal = formData.invoices.reduce((sum, inv) => {
    const val = parseFloat(inv.totalWithTax) || parseFloat(inv.invoiceValue) || 0;
    return sum + (Math.round(val * 100) / 100);
  }, 0);

  const totalInvoicedSoFar = Math.round((totalAlreadyInvoiced + currentInvoicesTotal) * 100) / 100;
  const projectTotalCost = parseFloat(formData.projectCost || 0);
  const remainingBudget = Math.max(0, Math.round((projectTotalCost - totalInvoicedSoFar) * 100) / 100);

  return (
    <div className="h-full flex flex-col max-h-[80vh] min-h-[600px]">
      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${activeTab === 'project'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building2 size={18} />
            <span className="font-medium">Project Information</span>
          </button>
          <button
            onClick={() => handleTabClick('invoices')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText size={18} />
            <span className="font-medium">Invoices</span>
          </button>
          <button
            onClick={() => handleTabClick('payments')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${activeTab === 'payments'
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
        <div className="p-6">
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
                </div>

                {/* Address Fields Section */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck size={20} className="text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Shipping & Billing Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingInput
                      label="Consignee (Ship To) Address"
                      name="consigneeAddress"
                      type="textarea"
                      value={formData.consigneeAddress}
                      onChange={handleChange}
                      rows={4}
                    />

                    <FloatingInput
                      label="Buyer (Bill To) Address"
                      name="buyerAddress"
                      type="textarea"
                      value={formData.buyerAddress}
                      onChange={handleChange}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Project Cost & GST Section */}
                <div className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Amount Calculation Section */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Amount Calculation</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'invoices' || activeTab === 'payments') && (
            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between border border-blue-200 mb-6 mx-0">
              <div>
                <h4 className="text-sm font-medium text-blue-900">Project Financial Summary</h4>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 text-sm text-blue-800">
                  <span>Total Budget: <span className="font-bold whitespace-nowrap">₹{projectTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                  <span>Total Invoiced: <span className="font-bold whitespace-nowrap">₹{totalInvoicedSoFar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                  <span>Remaining: <span className={`font-bold whitespace-nowrap ${remainingBudget === 0 ? 'text-red-600' : 'text-green-700'}`}>₹{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
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
                {!payment && (
                <button
                  type="button"
                  onClick={addInvoice}
                    disabled={projectTotalCost > 0 && totalInvoicedSoFar >= projectTotalCost}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${projectTotalCost > 0 && totalInvoicedSoFar >= projectTotalCost
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    title={projectTotalCost > 0 && totalInvoicedSoFar >= projectTotalCost ? "Project full amount already invoiced" : "Add New Invoice"}
                >
                  <Plus size={18} />
                  Add Invoice
                </button>
                )}
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
                        </div>
                        <button
                          type="button"
                          onClick={() => removeInvoice(invoiceIndex)}
                          disabled={formData.invoices.length <= 1}
                          className={`${formData.invoices.length <= 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                            } transition-colors p-1 rounded-full hover:bg-red-50`}
                          title={formData.invoices.length <= 1 ? "At least one invoice is required" : "Remove Invoice"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Invoice Details */}
                      <div className="p-4">
                        {/* Invoice Amount Error Display */}
                        {invoiceErrors[invoiceIndex] && (
                          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {invoiceErrors[invoiceIndex]}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FloatingInput
                            label="Invoice Date"
                            name="invoiceDate"
                            type="date"
                            value={invoice.invoiceDate}
                            onChange={(e) => updateInvoice(invoiceIndex, 'invoiceDate', e.target.value)}
                            error={errors[`invoiceDate_${invoiceIndex}`]}
                            required
                          />
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
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FloatingInput
                            label="Payment Type"
                            name="paymentType"
                            type="select"
                            value={invoice.paymentType || ''}
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              updateInvoice(invoiceIndex, 'paymentType', selectedValue);

                              if (selectedValue && selectedValue.startsWith('installment-')) {
                                const index = parseInt(selectedValue.split('-')[1]);
                                const installment = boqInstallments[index];
                                if (installment && installment.dueDate) {
                                  updateInvoice(invoiceIndex, 'overdueDate', installment.dueDate);
                                } else {
                                  updateInvoice(invoiceIndex, 'overdueDate', null);
                                }
                              } else {
                                updateInvoice(invoiceIndex, 'overdueDate', null);
                              }
                            }}
                            options={[
                              { value: '', label: 'Select Payment Type' },
                              { value: 'advance', label: 'Advance Payment' },
                              { value: 'final', label: 'Final Payment' },
                              ...boqInstallments.map((inst, idx) => ({
                                value: `installment-${idx}`,
                                label: `Installment ${inst.Installment || idx + 1}`
                              }))
                            ]}
                          />
                          <FloatingInput
                            label="Overdue Date"
                            name="overdueDate"
                            type="text"
                            value={formatDateForDisplay(invoice.overdueDate) || '-'}
                            readOnly={true}
                            onChange={(e) => updateInvoice(invoiceIndex, 'overdueDate', e.target.value)}
                          />
                        </div>

                        {/* Voucher and Buyer's Reference */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FloatingInput
                            label="Buyer's Ref / Order No"
                            name="buyersRef"
                            value={invoice.buyersRef}
                            onChange={(e) => updateInvoice(invoiceIndex, 'buyersRef', e.target.value)}
                          />
                          <FloatingInput
                            label="Buyer's Ref Date"
                            name="buyersRefDate"
                            type="date"
                            value={invoice.buyersRefDate}
                            onChange={(e) => updateInvoice(invoiceIndex, 'buyersRefDate', e.target.value)}
                            error={errors[`buyersRefDate_${invoiceIndex}`]}
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
                            type="text"
                            value={invoice.destination}
                            onChange={(e) => updateInvoice(invoiceIndex, 'destination', e.target.value)}
                          />
                          <FloatingInput
                            label="Terms for Delivery"
                            name="termsForDelivery"
                            type="text"
                            value={invoice.termsForDelivery}
                            onChange={(e) => updateInvoice(invoiceIndex, 'termsForDelivery', e.target.value)}
                          />
                        </div>

                        {/* Tax Information */}
                        <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-blue-600" />
                            <span className="font-semibold text-gray-800">Tax Information</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <FloatingInput
                              label="HSN/SAC Code"
                              name="hsnSac"
                              value={invoice.hsnSac}
                              onChange={(e) => updateInvoice(invoiceIndex, 'hsnSac', e.target.value)}
                            />
                            <FloatingInput
                              label="CGST %"
                              name="cgst"
                              type="text"
                              value={invoice.cgst}
                              onChange={(e) => updateInvoice(invoiceIndex, 'cgst', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue > 100) {
                                  updateInvoice(invoiceIndex, 'cgst', '100');
                                } else if (value === '') {
                                  updateInvoice(invoiceIndex, 'cgst', '');
                                }
                              }}
                            />
                            <FloatingInput
                              label="SGST %"
                              name="sgst"
                              type="text"
                              value={invoice.sgst}
                              onChange={(e) => updateInvoice(invoiceIndex, 'sgst', e.target.value)}
                              onBlur={(e) => {
                                const value = e.target.value;
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue > 100) {
                                  updateInvoice(invoiceIndex, 'sgst', '100');
                                } else if (value === '') {
                                  updateInvoice(invoiceIndex, 'sgst', '');
                                }
                              }}
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
                                <p className="text-sm text-gray-600">Gross Total</p>
                                <p className="text-lg font-bold text-purple-600">
                                  ₹{(Math.round((parseFloat(invoice.totalWithTax) || parseFloat(invoice.invoiceValue) || 0) * 100) / 100).toFixed(2)}
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {formData.payments.map((payment, paymentIndex) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg bg-gray-50">
                      {/* Payment Header */}
                      <div className="bg-green-50 px-4 py-3 flex items-center justify-between rounded-t-lg border-b border-green-200">
                        <div className="flex items-center gap-2">
                          <Wallet size={18} className="text-green-600" />
                          <span className="font-semibold text-gray-800">Payment #{paymentIndex + 1}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {payment.paymentType || 'Advance Payment'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePayment(paymentIndex)}
                          disabled={formData.payments.length <= 1}
                          className={`${formData.payments.length <= 1
                            ? 'text-gray-100 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                            } transition-colors p-1 rounded-full hover:bg-red-50`}
                          title={formData.payments.length <= 1 ? "At least one payment record is required" : "Remove Payment"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      {/* Payment Details */}
                      <div className="p-4">
                        {/* Transaction ID and Bank Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FloatingInput
                          label="Transaction ID"
                          name="transactionId"
                          value={payment.transactionId}
                          onChange={(e) => updatePayment(paymentIndex, 'transactionId', e.target.value)}
                        />
                        <FloatingInput
                          label="Bank Name"
                          name="bankName"
                          value={payment.bankName}
                          onChange={(e) => updatePayment(paymentIndex, 'bankName', e.target.value)}
                        />
                        </div>

                        {/* Amount */}
                        <div className="mb-4">
                        <FloatingInput
                          label="Amount (₹)"
                          name="amount"
                          type="number"
                          value={payment.amount}
                          onChange={(e) => updatePayment(paymentIndex, 'amount', e.target.value)}
                            required
                        />
                      </div>
                      
                        {/* Payment Date and Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <FloatingInput
                          label="Payment Date"
                          name="paymentDate"
                          type="date"
                          value={payment.paymentDate}
                          onChange={(e) => updatePayment(paymentIndex, 'paymentDate', e.target.value)}
                            required
                        />
                        <FloatingInput
                          label="Payment Type"
                          name="paymentType"
                          type="select"
                            value={payment.paymentType || 'advance'}
                          onChange={(e) => updatePayment(paymentIndex, 'paymentType', e.target.value)}
                          options={paymentTypeOptions}
                            required
                        />
                      </div>
                      
                        {/* Remarks */}
                        <FloatingInput
                          label="Remarks"
                          name="remarks"
                          type="textarea"
                          value={payment.remarks}
                          onChange={(e) => updatePayment(paymentIndex, 'remarks', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed actions at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {activeTab !== 'project' && (
              <button
                type="button"
                onClick={handlePreviousClick}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
            {activeTab === 'project' && (
          <button
                type="button"
                onClick={handleNextClick}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                Next
              </button>
            )}
            {activeTab === 'invoices' && (
              <>
                <button
                  type="button"
                  onClick={handleCreateInvoice}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : payment ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={handleNextClick}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  Next to Payments
                  <ChevronRight size={18} className="ml-2 inline" />
                </button>
              </>
            )}
            {activeTab === 'payments' && (
              <button
                type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
                {loading ? 'Saving...' : payment ? 'Update Payment' : 'Create Payment'}
          </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
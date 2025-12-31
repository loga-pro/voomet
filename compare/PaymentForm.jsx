import React, { useState, useEffect } from 'react';
import { Building2, FileText, Plus, Trash2, Wallet, Truck, ChevronLeft, ChevronRight, AlertCircle, CreditCard } from 'lucide-react';
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
      invoiceDate: '', // Changed from current date to empty
      paymentType: 'advance',
      voucherNo: '',
      buyersRef: '',
      dispatchedThrough: '',
      destination: '',
      termsForDelivery: '',
      dueDate: '', // Changed from overdueDate to dueDate
      hsnSac: '',
      cgst: '0', // Changed default from '9' to '0'
      sgst: '0', // Changed default from '9' to '0'
      cgstAmount: 0,
      sgstAmount: 0,
      totalWithTax: 0
    }],
    payments: [{
      id: 'default-payment-1',
      transactionId: '',
      bankName: '',
      amount: '',
      paymentDate: '', // Changed from current date to empty
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
  const [usedInvoiceNumbers, setUsedInvoiceNumbers] = useState(new Set());
  const [boqData, setBoqData] = useState(null);
  const [invoiceValueErrors, setInvoiceValueErrors] = useState({}); // Store invoice value validation errors
  const [showAddPayment, setShowAddPayment] = useState(false); // New state for showing add payment button

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
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
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
        dueDate: formatDateForInput(invoice.dueDate || invoice.overdueDate), // Map overdueDate to dueDate
        cgst: invoice.cgst || '0',
        sgst: invoice.sgst || '0',
      }));

      const formattedPayments = (payment.payments || []).map((pmt, index) => ({
        ...pmt,
        id: pmt.id || pmt._id || `payment-${Date.now()}-${index}`,
        paymentDate: formatDateForInput(pmt.paymentDate || pmt.date)
      }));

      setFormData({
        customer: payment.customer || '',
        project: payment.projectName || payment.project || '',
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
          paymentDate: '',
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

      const boqResponse = await boqAPI.getAll({ customer: customerName });
      let boqList = [];
      if (boqResponse.data && boqResponse.data.data) {
        boqList = boqResponse.data.data;
      } else if (boqResponse.data && Array.isArray(boqResponse.data)) {
        boqList = boqResponse.data;
      } else if (Array.isArray(boqResponse)) {
        boqList = boqResponse;
      }

      const projectList = boqList.map(boq => ({
        _id: boq._id || boq.id,
        projectName: boq.projectName,
        customer: boq.customer,
        boqData: boq // Store full BOQ data
      }));

      setProjects(projectList);
      return projectList;
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
        setBoqData(projectBOQ);
        
        // Always use finalTotalWithoutGST as the base project cost
        const baseCost = projectBOQ.finalTotalWithoutGST || '';
        
        setFormData(prev => ({
          ...prev,
          project: selectedProject?.projectName || projectName,
          projectName: projectName,
          projectCost: baseCost, // Set to finalTotalWithoutGST
          // Keep includeGST as is, but update gstPercentage from BOQ
          gstPercentage: projectBOQ.gstPercentage || 18,
        }));
        setBoqInstallments(projectBOQ.paymentTerms || []);
      } else {
        setBoqData(null);
        setFormData(prev => ({
          ...prev,
          project: selectedProject?.projectName || projectName,
          projectName: projectName,
          projectCost: ''
        }));
      }
    } catch (error) {
      console.error('Error fetching BOQ data:', error);
      setBoqData(null);
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
        projectCost: '',
        includeGST: false,
        gstPercentage: 18
      }));
      setErrors(prev => ({ ...prev, submit: '', customer: '' }));
      setProjects([]);
      setBoqData(null);
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
          project: selectedProject.projectName,
          projectName: selectedProject.projectName
        }));
        fetchBOQData(formData.customer, selectedProject.projectName, selectedProject);
        fetchProjectInvoicedAmount(formData.customer, selectedProject.projectName);
      }
      return;
    }

    if (name === 'includeGST') {
      // When GST is toggled, update the form data
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // If turning on GST and we have BOQ data with GST percentage, use it
        gstPercentage: checked && boqData?.gstPercentage ? boqData.gstPercentage : prev.gstPercentage
      }));
      return;
    }

    if (name === 'gstPercentage') {
      // Allow manual editing of GST percentage
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
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
    // Base amount is always the finalTotalWithoutGST from BOQ
    const baseAmount = parseFloat(formData.projectCost) || 0;
    
    // Calculate GST amount if includeGST is checked
    const gstAmount = formData.includeGST 
      ? (baseAmount * parseFloat(formData.gstPercentage || 0)) / 100 
      : 0;
    
    // Total amount is base + GST
    const totalAmount = baseAmount + gstAmount;

    const paidAmount = formData.payments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    const remainingAmount = totalAmount - paidAmount;

    return {
      baseAmount,
      gstAmount,
      totalAmount,
      paidAmount,
      remainingAmount
    };
  };

  // Calculate budget based on includeGST - if GST is included, use total amount, otherwise use base amount
  const amounts = calculateAmounts();
  const budgetAmount = formData.includeGST ? amounts.totalAmount : amounts.baseAmount;

  // Calculate maximum allowed invoice value for a specific invoice
  const getMaxInvoiceValueForIndex = (invoiceIndex) => {
    const otherInvoicesTotal = formData.invoices.reduce((sum, inv, idx) => {
      if (idx === invoiceIndex) return sum;
      const val = parseFloat(inv.invoiceValue) || 0;
      return sum + val;
    }, 0);
    
    return Math.max(0, budgetAmount - (totalAlreadyInvoiced + otherInvoicesTotal));
  };

  // Enhanced validation function for invoice value
  const validateInvoiceValue = (invoiceValue, invoiceIndex) => {
    if (!budgetAmount || invoiceValue === '' || invoiceValue === null) {
      return { isValid: true, error: '' };
    }

    const currentInvoiceValue = parseFloat(invoiceValue) || 0;
    
    // Check if current invoice value exceeds budget
    if (currentInvoiceValue > budgetAmount) {
      return {
        isValid: false,
        error: `Invoice value cannot exceed budget of ₹${budgetAmount.toFixed(2)}`
      };
    }

    // Check if current invoice value + already invoiced + other invoices exceeds budget
    const otherInvoicesTotal = formData.invoices.reduce((sum, inv, idx) => {
      if (idx === invoiceIndex) return sum; // Skip current invoice
      const val = parseFloat(inv.invoiceValue) || 0;
      return sum + val;
    }, 0);

    const totalWithCurrentInvoice = totalAlreadyInvoiced + otherInvoicesTotal + currentInvoiceValue;
    
    if (totalWithCurrentInvoice > budgetAmount) {
      const remainingBudgetForThisInvoice = Math.max(0, budgetAmount - (totalAlreadyInvoiced + otherInvoicesTotal));
      return {
        isValid: false,
        error: `Total invoices would exceed budget. Maximum allowed: ₹${remainingBudgetForThisInvoice.toFixed(2)}`
      };
    }

    return { isValid: true, error: '' };
  };

  // Validate all invoice values at once
  const validateAllInvoiceValues = () => {
    let hasErrors = false;
    const newInvoiceValueErrors = {};
    
    formData.invoices.forEach((invoice, index) => {
      const validation = validateInvoiceValue(invoice.invoiceValue, index);
      if (!validation.isValid) {
        newInvoiceValueErrors[index] = validation.error;
        hasErrors = true;
      }
    });
    
    setInvoiceValueErrors(newInvoiceValueErrors);
    return !hasErrors;
  };

  const validateInvoiceNumberUniqueness = (number, invoiceIndex) => {
    if (!number) return true;

    if (usedInvoiceNumbers.has(number.toLowerCase())) {
      const isOwnInvoice = payment?.invoices?.some(inv => inv.invoiceNumber?.toLowerCase() === number.toLowerCase());
      if (!isOwnInvoice) {
        setErrors(prev => ({
          ...prev,
          [`invoiceNumber_${invoiceIndex}`]: 'Invoice Number already exists for this project'
        }));
        return false;
      }
    }

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
      } else if (!invoice.dueDate) {
        newErrors[`dueDate_${index}`] = 'Due date is required';
      } else {
        // Check if invoice value exceeds budget (enhanced validation)
        const validation = validateInvoiceValue(invoice.invoiceValue, index);
        if (!validation.isValid) {
          newErrors[`invoiceValue_${index}`] = validation.error;
        } else {
          hasValidInvoice = true;
        }
      }
    });

    if (!hasValidInvoice) {
      newErrors.submit = 'Please fill at least one invoice completely';
    }

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
      } else if (!invoice.dueDate) {
        newErrors[`dueDate_${index}`] = 'Due date is required';
      } else {
        // Check if invoice value exceeds budget (enhanced validation)
        const validation = validateInvoiceValue(invoice.invoiceValue, index);
        if (!validation.isValid) {
          newErrors[`invoiceValue_${index}`] = validation.error;
        } else {
          hasValidInvoice = true;
        }
      }
    });

    if (!hasValidInvoice && formData.invoices.length > 0) {
      newErrors.submit = 'Please fill at least one invoice completely';
    }

    formData.payments.forEach((payment, index) => {
      if (payment.paymentDate && new Date(payment.paymentDate) > new Date()) {
        newErrors[`paymentDate_${index}`] = 'Payment date cannot be in the future';
        newErrors.submit = 'Payment date cannot be in the future';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addInvoice = () => {
    // Check if there's budget remaining before adding invoice
    const maxAllowed = getMaxInvoiceValueForIndex(formData.invoices.length);
    if (maxAllowed <= 0) {
      setErrors(prev => ({ ...prev, submit: 'No budget remaining to add new invoice' }));
      return;
    }

    const newInvoice = {
      id: Date.now().toString(),
      invoiceNumber: '',
      invoiceValue: '',
      invoiceDate: '',
      paymentType: 'advance',
      voucherNo: '',
      buyersRef: '',
      dispatchedThrough: '',
      destination: '',
      termsForDelivery: '',
      dueDate: '',
      hsnSac: '',
      cgst: '0',
      sgst: '0',
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

    // Clear invoice value error for removed invoice
    setInvoiceValueErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const updateInvoice = (index, field, value) => {
    setFormData(prev => {
      const updatedInvoices = [...prev.invoices];
      let invoice = { ...updatedInvoices[index], [field]: value };

      // Auto-cap invoice value if it exceeds budget
      if (field === 'invoiceValue' && value !== '') {
        const numericValue = parseFloat(value) || 0;
        
        // Calculate maximum allowed for this invoice
        const otherInvoicesTotal = prev.invoices.reduce((sum, inv, idx) => {
          if (idx === index) return sum;
          const val = parseFloat(inv.invoiceValue) || 0;
          return sum + val;
        }, 0);
        
        const maxAllowed = Math.max(0, budgetAmount - (totalAlreadyInvoiced + otherInvoicesTotal));
        
        // If value exceeds max allowed, cap it
        if (numericValue > maxAllowed && maxAllowed >= 0) {
          invoice = { ...invoice, invoiceValue: maxAllowed.toString() };
          value = maxAllowed.toString(); // Update value for validation
        }
      }

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
        // Validate invoice value against budget
        const validation = validateInvoiceValue(value, index);
        if (!validation.isValid) {
          setInvoiceValueErrors(prev => ({
            ...prev,
            [index]: validation.error
          }));
        } else {
          setInvoiceValueErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[index];
            return newErrors;
          });
        }
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

  const addPayment = () => {
    const newPayment = {
      id: Date.now().toString(),
      transactionId: '',
      bankName: '',
      amount: '',
      paymentDate: '',
      paymentType: 'advance',
      remarks: ''
    };

    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, newPayment]
    }));
  };

  const removePayment = (index) => {
    if (formData.payments.length <= 1) return;

    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

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
    
    // Check all invoice values against budget
    if (!validateAllInvoiceValues()) {
      setErrors(prev => ({ ...prev, submit: 'Please fix invoice value errors before creating invoice' }));
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
        const cgst = invoice.cgst !== '' ? parseFloat(invoice.cgst) : 0;
        const sgst = invoice.sgst !== '' ? parseFloat(invoice.sgst) : 0;
        const cgstAmt = (value * cgst) / 100;
        const sgstAmt = (value * sgst) / 100;

        return {
          invoiceNumber: invoice.invoiceNumber?.trim() || '',
          invoiceValue: value,
          invoiceDate: invoice.invoiceDate || '',
          paymentType: invoice.paymentType?.trim() || '',
          voucherNo: invoice.voucherNo?.trim() || '',
          buyersRef: invoice.buyersRef?.trim() || '',
          dispatchedThrough: invoice.dispatchedThrough?.trim() || '',
          destination: invoice.destination?.trim() || '',
          termsForDelivery: invoice.termsForDelivery?.trim() || '',
          dueDate: invoice.dueDate || '',
          hsnSac: invoice.hsnSac?.trim() || '',
          cgst: cgst,
          sgst: sgst,
          cgstAmount: invoice.cgstAmount ? parseFloat(invoice.cgstAmount) : cgstAmt,
          sgstAmount: invoice.sgstAmount ? parseFloat(invoice.sgstAmount) : sgstAmt,
          totalWithTax: invoice.totalWithTax ? parseFloat(invoice.totalWithTax) : (value + cgstAmt + sgstAmt),
        };
      }).filter(invoice => invoice.invoiceNumber && invoice.invoiceValue >= 0),
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
        const cgst = invoice.cgst !== '' ? parseFloat(invoice.cgst) : 0;
        const sgst = invoice.sgst !== '' ? parseFloat(invoice.sgst) : 0;
        const cgstAmt = (value * cgst) / 100;
        const sgstAmt = (value * sgst) / 100;

        return {
          invoiceNumber: invoice.invoiceNumber?.trim() || '',
          invoiceValue: value,
          invoiceDate: invoice.invoiceDate || '',
          paymentType: invoice.paymentType?.trim() || '',
          voucherNo: invoice.voucherNo?.trim() || '',
          buyersRef: invoice.buyersRef?.trim() || '',
          dispatchedThrough: invoice.dispatchedThrough?.trim() || '',
          destination: invoice.destination?.trim() || '',
          termsForDelivery: invoice.termsForDelivery?.trim() || '',
          dueDate: invoice.dueDate || '',
          hsnSac: invoice.hsnSac?.trim() || '',
          cgst: cgst,
          sgst: sgst,
          cgstAmount: invoice.cgstAmount ? parseFloat(invoice.cgstAmount) : cgstAmt,
          sgstAmount: invoice.sgstAmount ? parseFloat(invoice.sgstAmount) : sgstAmt,
          totalWithTax: invoice.totalWithTax ? parseFloat(invoice.totalWithTax) : (value + cgstAmt + sgstAmt),
        };
      }).filter(invoice => invoice.invoiceNumber && invoice.invoiceValue >= 0),
      payments: formData.payments.map(payment => ({
        transactionId: payment.transactionId?.trim() || '',
        bankName: payment.bankName?.trim() || '',
        gst: 0,
        amount: payment.amount !== '' ? parseFloat(payment.amount) : 0,
        paymentDate: payment.paymentDate || '',
        paymentType: payment.paymentType?.trim() || 'advance',
        remarks: payment.remarks?.trim() || ''
      })).filter(payment => payment.amount !== 0)
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
  const remainingBudget = Math.max(0, Math.round((budgetAmount - totalInvoicedSoFar) * 100) / 100);

  const isProjectFullyInvoiced = budgetAmount > 0 && totalAlreadyInvoiced >= budgetAmount;

  // Calculate if project cost comes from BOQ
  const isProjectCostFromBOQ = boqData && formData.projectCost === (boqData.finalTotalWithoutGST || '');

  // Helper function to get installment value
  const getInstallmentValue = (installmentIndex) => {
    if (!boqInstallments || !boqInstallments[installmentIndex]) return 0;
    const installment = boqInstallments[installmentIndex];
    return parseFloat(installment.value) || parseFloat(installment.amount) || 0;
  };

  return (
    <div className="h-full flex flex-col max-h-[90vh] min-h-[450px]">
      {/* Tabs - Compact */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1 px-3 py-1.5 border-b-2 transition-colors text-xs ${activeTab === 'project'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
          >
            <Building2 size={14} />
            <span className="font-medium">Project</span>
          </button>
          <button
            onClick={() => handleTabClick('invoices')}
            className={`flex items-center gap-1 px-3 py-1.5 border-b-2 transition-colors text-xs ${activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
          >
            <FileText size={14} />
            <span className="font-medium">Invoice</span>
          </button>
          <button
            onClick={() => handleTabClick('payments')}
            className={`flex items-center gap-1 px-3 py-1.5 border-b-2 transition-colors text-xs ${activeTab === 'payments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
          >
            <Wallet size={14} />
            <span className="font-medium">Payments</span>
          </button>
        </div>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-2 py-1.5 rounded mb-3 text-xs">
              {errors.submit}
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-3">
              {/* Project Information Section */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Project Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                      ...projects.map(p => ({ value: p._id, label: p.projectName }))
                    ]}
                  />
                </div>

                {/* Address Fields Section */}
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Truck size={16} className="text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Shipping & Billing</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FloatingInput
                      label="Consignee Address"
                      name="consigneeAddress"
                      type="textarea"
                      value={formData.consigneeAddress}
                      onChange={handleChange}
                      rows={2}
                    />

                    <FloatingInput
                      label="Buyer Address"
                      name="buyerAddress"
                      type="textarea"
                      value={formData.buyerAddress}
                      onChange={handleChange}
                      rows={2}
                    />
                  </div>
                </div>

                {/* Project Cost & GST Section */}
                <div className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FloatingInput
                      label="Project Cost (Base Amount) (₹)"
                      name="projectCost"
                      type="number"
                      value={formData.projectCost}
                      onChange={handleChange}
                      error={errors.projectCost}
                      required={true}
                      readOnly={isProjectCostFromBOQ}
                      className={isProjectCostFromBOQ ? "bg-gray-100" : ""}
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="includeGST"
                        checked={formData.includeGST}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-xs font-medium text-gray-700">Include GST</span>

                    {formData.includeGST && (
                      <div className="ml-2">
                        <div className="relative">
                          <label className="absolute -top-2 left-2 text-xs text-gray-500 bg-white px-1">
                            GST 
                          </label>
                          <div className="pt-3 pb-2 px-3 border border-gray-300 rounded-md bg-gray-50 min-h-[44px]">
                            <span className="text-sm font-medium text-gray-700">
                              {formData.gstPercentage}%
                            </span>
                          </div>
                          <input
                            type="hidden"
                            name="gstPercentage"
                            value={formData.gstPercentage}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount Calculation Section - Compact with side-by-side layout */}
              <div className="bg-blue-50 rounded p-3 border border-blue-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 size={16} className="text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Amount Calculation</h3>
                </div>

                {/* Side by side layout for Base Amount and Final Amount */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Base Amount */}
                  <div className="bg-white rounded p-2 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-0.5">Base Amount</p>
                    <p className="text-base font-bold text-blue-600">
                      ₹{amounts.baseAmount.toFixed(2)}
                    </p>
                  </div>

                  {/* Final Amount */}
                  <div className="bg-white rounded p-2 border border-purple-200">
                    <p className="text-xs text-gray-600 mb-0.5">
                      {formData.includeGST ? 'Final Amount (with GST)' : 'Final Amount (without GST)'}
                    </p>
                    <p className="text-base font-bold text-purple-600">
                      ₹{amounts.totalAmount.toFixed(2)}
                    </p>
                    {formData.includeGST && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        (Base: ₹{amounts.baseAmount.toFixed(2)} + GST: ₹{amounts.gstAmount.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project Financial Summary - Only in Invoices tab */}
          {activeTab === 'invoices' && (
            <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-3 text-xs">
              <h4 className="font-medium text-blue-900">Project Financial Summary</h4>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5 text-xs text-blue-800">
                <span>Budget: <span className="font-bold">₹{budgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                <span>Invoiced: <span className="font-bold">₹{totalInvoicedSoFar.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                <span>Remaining: <span className={`font-bold ${remainingBudget === 0 ? 'text-red-600' : 'text-green-700'}`}>₹{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText size={16} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Invoice</h3>
                </div>
              </div>

              {formData.invoices.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No invoices added yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {formData.invoices.map((invoice, invoiceIndex) => {
                    // Calculate validation for this invoice
                    const invoiceValueValidation = validateInvoiceValue(invoice.invoiceValue, invoiceIndex);
                    
                    return (
                      <div key={invoice.id} className="border border-gray-200 rounded bg-gray-50">
                        {/* Invoice Header
                        <div className="bg-orange-50 px-2 py-1.5 flex items-center justify-between rounded-t border-b border-orange-200">
                          <div className="flex items-center gap-1">
                            <FileText size={14} className="text-orange-600" />
                            <span className="font-semibold text-gray-800 text-xs">Invoice #{invoiceIndex + 1}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeInvoice(invoiceIndex)}
                            disabled={formData.invoices.length <= 1 || isProjectFullyInvoiced}
                            className={`${(formData.invoices.length <= 1 || isProjectFullyInvoiced)
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800'
                              } transition-colors p-0.5 rounded hover:bg-red-50`}
                            title={isProjectFullyInvoiced ? "Project fully invoiced" : formData.invoices.length <= 1 ? "At least one invoice is required" : "Remove Invoice"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div> */}

                        {/* Invoice Details */}
                        <div className="p-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                            <FloatingInput
                              label="Invoice Date"
                              name="invoiceDate"
                              type="date"
                              value={invoice.invoiceDate}
                              onChange={(e) => updateInvoice(invoiceIndex, 'invoiceDate', e.target.value)}
                              error={errors[`invoiceDate_${invoiceIndex}`]}
                              required
                              disabled={isProjectFullyInvoiced}
                            />
                            <FloatingInput
                              label="Invoice Number"
                              name="invoiceNumber"
                              value={invoice.invoiceNumber}
                              onChange={(e) => updateInvoice(invoiceIndex, 'invoiceNumber', e.target.value)}
                              error={errors[`invoiceNumber_${invoiceIndex}`]}
                              required
                              disabled={isProjectFullyInvoiced}
                            />
                            <div>
                              <FloatingInput
                                label="Invoice Value (₹)"
                                name="invoiceValue"
                                type="number"
                                value={invoice.invoiceValue}
                                onChange={(e) => updateInvoice(invoiceIndex, 'invoiceValue', e.target.value)}
                                error={errors[`invoiceValue_${invoiceIndex}`] || invoiceValueErrors[invoiceIndex]}
                                required
                                disabled={isProjectFullyInvoiced || (invoice.paymentType && invoice.paymentType.startsWith('installment-'))}
                                readOnly={invoice.paymentType && invoice.paymentType.startsWith('installment-')}
                                className={invoice.paymentType && invoice.paymentType.startsWith('installment-') ? "bg-gray-100" : ""}
                                max={budgetAmount} // HTML max attribute
                              />
                              {invoiceValueErrors[invoiceIndex] && (
                                <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
                                  <AlertCircle size={12} />
                                  <span>{invoiceValueErrors[invoiceIndex]}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <FloatingInput
                              label="Payment Type"
                              name="paymentType"
                              type="select"
                              value={invoice.paymentType || ''}
                              disabled={isProjectFullyInvoiced}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                updateInvoice(invoiceIndex, 'paymentType', selectedValue);

                                // Auto-fill invoice value if installment is selected
                                if (selectedValue && selectedValue.startsWith('installment-')) {
                                  const index = parseInt(selectedValue.split('-')[1]);
                                  const installmentValue = getInstallmentValue(index);
                                  updateInvoice(invoiceIndex, 'invoiceValue', installmentValue.toString());
                                }
                              }}
                              options={[
                                { value: '', label: 'Select Payment Type' },
                                { value: 'advance', label: 'Advance Payment' },
                                { value: 'final', label: 'Final Payment' },
                                // Create 5 installment options (or use BOQ installments if available)
                                ...(boqInstallments.length > 0 
                                  ? boqInstallments.map((inst, idx) => ({
                                      value: `installment-${idx}`,
                                      label: `Installment ${inst.Installment || idx + 1}`
                                    }))
                                  : Array.from({ length: 5 }, (_, i) => ({
                                      value: `installment-${i}`,
                                      label: `Installment ${i + 1}`
                                    }))
                                )
                              ]}
                            />
                            <FloatingInput
                              label="Due Date"
                              name="dueDate"
                              type="date"
                              value={invoice.dueDate}
                              onChange={(e) => updateInvoice(invoiceIndex, 'dueDate', e.target.value)}
                              error={errors[`dueDate_${invoiceIndex}`]}
                              required
                              disabled={isProjectFullyInvoiced}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                            <FloatingInput
                              label="Buyer's Ref / Order No"
                              name="buyersRef"
                              value={invoice.buyersRef}
                              onChange={(e) => updateInvoice(invoiceIndex, 'buyersRef', e.target.value)}
                              disabled={isProjectFullyInvoiced}
                            />
                            <FloatingInput
                              label="Buyer's Ref Date"
                              name="buyersRefDate"
                              type="date"
                              value={invoice.buyersRefDate}
                              onChange={(e) => updateInvoice(invoiceIndex, 'buyersRefDate', e.target.value)}
                              error={errors[`buyersRefDate_${invoiceIndex}`]}
                              disabled={isProjectFullyInvoiced}
                            />
                          </div>

                          <div className="flex items-center gap-1.5 mb-2 text-gray-700 text-xs">
                            <Truck size={14} />
                            <span className="font-medium">Delivery Information</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                            <FloatingInput
                              label="Dispatched Through"
                              name="dispatchedThrough"
                              type="select"
                              value={invoice.dispatchedThrough}
                              onChange={(e) => updateInvoice(invoiceIndex, 'dispatchedThrough', e.target.value)}
                              options={dispatchedThroughOptions}
                              disabled={isProjectFullyInvoiced}
                            />
                            <FloatingInput
                              label="Destination"
                              name="destination"
                              type="text"
                              value={invoice.destination}
                              onChange={(e) => updateInvoice(invoiceIndex, 'destination', e.target.value)}
                              disabled={isProjectFullyInvoiced}
                            />
                            <FloatingInput
                              label="Terms for Delivery"
                              name="termsForDelivery"
                              type="text"
                              value={invoice.termsForDelivery}
                              onChange={(e) => updateInvoice(invoiceIndex, 'termsForDelivery', e.target.value)}
                              disabled={isProjectFullyInvoiced}
                            />
                          </div>

                          {/* Tax Information - Compact */}
                          <div className="bg-white rounded p-2 border border-gray-200 mb-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FileText size={14} className="text-blue-600" />
                              <span className="font-semibold text-gray-800 text-xs">Tax Information</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                              <FloatingInput
                                label="HSN/SAC Code"
                                name="hsnSac"
                                value={invoice.hsnSac}
                                onChange={(e) => updateInvoice(invoiceIndex, 'hsnSac', e.target.value)}
                                disabled={isProjectFullyInvoiced}
                              />
                              <FloatingInput
                                label="CGST %"
                                name="cgst"
                                type="text"
                                value={invoice.cgst}
                                onChange={(e) => updateInvoice(invoiceIndex, 'cgst', e.target.value)}
                                disabled={isProjectFullyInvoiced}
                              />
                              <FloatingInput
                                label="SGST %"
                                name="sgst"
                                type="text"
                                value={invoice.sgst}
                                onChange={(e) => updateInvoice(invoiceIndex, 'sgst', e.target.value)}
                                disabled={isProjectFullyInvoiced}
                              />
                            </div>

                            {invoice.invoiceValue && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <div className="text-center">
                                  <p className="text-xs text-gray-600">CGST</p>
                                  <p className="text-sm font-semibold text-blue-600">
                                    ₹{(invoice.cgstAmount || 0).toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600">SGST</p>
                                  <p className="text-sm font-semibold text-green-600">
                                    ₹{(invoice.sgstAmount || 0).toFixed(2)}
                                  </p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600">Total</p>
                                  <p className="text-sm font-bold text-purple-600">
                                    ₹{(Math.round((parseFloat(invoice.totalWithTax) || parseFloat(invoice.invoiceValue) || 0) * 100) / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Wallet size={16} className="text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Payment</h3>
                </div>
                
                {/* Add Payment Button - Only show when editing an existing payment */}
                {payment && (
                  <button
                    type="button"
                    onClick={addPayment}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <CreditCard size={14} />
                    Add Payment
                  </button>
                )}
              </div>

              {formData.payments.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <Wallet size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>No payments added yet.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {formData.payments.map((payment, paymentIndex) => (
                    <div key={payment.id} className="border border-gray-200 rounded bg-gray-50">
                      {/* Payment Header */}
                      <div className="bg-green-50 px-2 py-1.5 flex items-center justify-between rounded-t border-b border-green-200">
                        <div className="flex items-center gap-1">
                          <Wallet size={14} className="text-green-600" />
                          <span className="font-semibold text-gray-800 text-xs">Payment #{paymentIndex + 1}</span>
                          <span className="px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {payment.paymentType || 'Advance'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePayment(paymentIndex)}
                          disabled={formData.payments.length <= 1}
                          className={`${formData.payments.length <= 1
                            ? 'text-gray-100 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                            } transition-colors p-0.5 rounded hover:bg-red-50`}
                          title={formData.payments.length <= 1 ? "At least one payment record is required" : "Remove Payment"}
                        >
                        </button>
                      </div>

                      {/* Payment Details */}
                      <div className="p-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
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

                        <div className="mb-2">
                          <FloatingInput
                            label="Amount (₹)"
                            name="amount"
                            type="number"
                            value={payment.amount}
                            onChange={(e) => updatePayment(paymentIndex, 'amount', e.target.value)}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          <FloatingInput
                            label="Payment Date "
                            name="paymentDate"
                            type="date"
                            value={payment.paymentDate}
                            onChange={(e) => updatePayment(paymentIndex, 'paymentDate', e.target.value)}
                            required
                            error={errors[`paymentDate_${paymentIndex}`]}
                          />
                          <FloatingInput
                            label="Payment Type"
                            name="paymentType"
                            type="select"
                            value={payment.paymentType || 'advance'}
                            onChange={(e) => updatePayment(paymentIndex, 'paymentType', e.target.value)}
                            options={[
                              { value: 'advance', label: 'Advance Payment' },
                              { value: 'final', label: 'Final Payment' },
                              // Create 5 installment options
                              ...Array.from({ length: 5 }, (_, i) => ({
                                value: `installment-${i}`,
                                label: `Installment ${i + 1}`
                              }))
                            ]}
                            required
                          />
                        </div>

                        <FloatingInput
                          label="Remarks"
                          name="remarks"
                          type="textarea"
                          value={payment.remarks}
                          onChange={(e) => updatePayment(paymentIndex, 'remarks', e.target.value)}
                          rows={2}
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

      {/* Fixed actions at bottom - Compact */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <div>
            {activeTab !== 'project' && (
              <button
                type="button"
                onClick={handlePreviousClick}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary-500"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary-500"
            >
              Cancel
            </button>
            {activeTab === 'project' && (
              <button
                type="button"
                onClick={handleNextClick}
                disabled={loading}
                className="px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-50"
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
                  className="px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : payment ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={handleNextClick}
                  disabled={loading}
                  className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={14} className="ml-0.5 inline" />
                </button>
              </>
            )}
            {activeTab === 'payments' && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary-500 disabled:opacity-50"
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
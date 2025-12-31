const express = require('express');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const BOQ = require('../models/BOQ');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper function to safely parse dates from various formats
const parseSafeDate = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

  // Try direct parsing
  let date = new Date(dateVal);
  if (!isNaN(date.getTime())) return date;

  // Try DD-MM-YYYY format
  if (typeof dateVal === 'string' && dateVal.includes('-')) {
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      // Assuming DD-MM-YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }

  return null;
};

// Get all payments with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customer, project, projectId, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (customer) filter.customer = new RegExp(customer, 'i');
    if (project) {
      filter.$or = [
        { project: new RegExp(project, 'i') },
        { projectName: new RegExp(project, 'i') }
      ];
    }
    if (projectId) {
      // Get project by ID to get the project name
      const Project = require('../models/Project');
      const projectDoc = await Project.findById(projectId);
      if (projectDoc) {
        filter.projectName = projectDoc.projectName;
      }
    }

    const payments = await Payment.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(filter);

    // Map payments to match frontend expectations
    const mappedPayments = payments.map(payment => {
      const paymentObj = payment.toObject();

      // Ensure we have the correct field names for frontend
      return {
        ...paymentObj,
        projectName: paymentObj.projectName || paymentObj.project,
        balanceAmount: paymentObj.balanceAmount || (paymentObj.totalInvoiceRaised - paymentObj.totalPayments),
        status: paymentObj.status || (
          (paymentObj.totalInvoiceRaised > 0 && (paymentObj.totalInvoiceRaised - paymentObj.totalPayments) <= 0) ? 'paid' : 'pending'
        )
      };
    });

    res.json({
      data: {
        payments: mappedPayments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({
      message: 'Server error fetching payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get payment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const paymentObj = payment.toObject();
    const mappedPayment = {
      ...paymentObj,
      projectName: paymentObj.projectName || paymentObj.project,
      balanceAmount: paymentObj.balanceAmount || (paymentObj.totalInvoiceRaised - paymentObj.totalPayments)
    };

    res.json(mappedPayment);
  } catch (error) {
    console.error('Payment fetch by ID error:', error);
    res.status(500).json({
      message: 'Server error fetching payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new payment
router.post('/', auth, async (req, res) => {
  try {
    const user = req.user;

    console.log('=== Payment Creation Request ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', user);

    // Validate required fields
    const { customer, projectName, project, projectCost, invoices, payments, consigneeAddress, buyerAddress } = req.body;

    if (!customer) {
      console.log('Validation failed: Customer is required');
      return res.status(400).json({ message: 'Customer is required' });
    }

    if (!projectName && !project) {
      console.log('Validation failed: Project name is required');
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!projectCost || isNaN(projectCost)) {
      console.log('Validation failed: Valid project cost is required');
      return res.status(400).json({ message: 'Valid project cost is required' });
    }

    // Fetch BOQ data for validation
    const boqData = await BOQ.findOne({
      customer: customer,
      projectName: projectName || project
    });

    const boqTotalWithGST = boqData ? boqData.totalWithGST : Infinity;
    if (boqData) {
      console.log('BOQ Total with GST:', boqTotalWithGST);
    } else {
      console.log('No BOQ found for this project. Skipping budget validation.');
    }

    // Validate invoice numbers are unique within this payment
    const invoiceNumbers = (invoices || []).map(inv => inv.invoiceNumber).filter(Boolean);
    const uniqueInvoiceNumbers = new Set(invoiceNumbers);
    if (invoiceNumbers.length !== uniqueInvoiceNumbers.size) {
      return res.status(400).json({ message: 'Invoice numbers must be unique within the payment' });
    }

    // Check for duplicate invoice numbers across all payments for this customer and project
    const existingPayments = await Payment.find({
      customer: customer,
      $or: [
        { project: projectName || project },
        { projectName: projectName || project }
      ]
    });

    const existingInvoiceNumbers = new Set();
    existingPayments.forEach(payment => {
      payment.invoices.forEach(invoice => {
        if (invoice.invoiceNumber) {
          existingInvoiceNumbers.add(invoice.invoiceNumber);
        }
      });
    });

    const duplicateInvoices = invoiceNumbers.filter(num => existingInvoiceNumbers.has(num));
    if (duplicateInvoices.length > 0) {
      return res.status(400).json({
        message: `Invoice number(s) already exist for this project: ${duplicateInvoices.join(', ')}`
      });
    }

    // Calculate total invoice value with tax
    const totalInvoiceValue = (invoices || []).reduce((sum, invoice) => {
      return sum + (parseFloat(invoice.totalWithTax) || parseFloat(invoice.invoiceValue) || 0);
    }, 0);

    // Calculate total of all existing invoices for this project
    const existingInvoiceTotal = existingPayments.reduce((sum, payment) => {
      return sum + payment.invoices.reduce((invSum, invoice) => {
        return invSum + (invoice.totalWithTax || invoice.invoiceValue || 0);
      }, 0);
    }, 0);

    const grandTotalInvoices = existingInvoiceTotal + totalInvoiceValue;
    console.log('Existing invoice total:', existingInvoiceTotal);
    console.log('New invoice total:', totalInvoiceValue);
    console.log('Grand total invoices:', grandTotalInvoices);

    // Validate that total invoices don't exceed BOQ total with GST (if BOQ exists)
    if (boqData && grandTotalInvoices > boqTotalWithGST) {
      return res.status(400).json({
        message: `Total invoice amount (₹${grandTotalInvoices.toFixed(2)}) exceeds BOQ total with GST (₹${boqTotalWithGST.toFixed(2)}). Remaining amount: ₹${(boqTotalWithGST - existingInvoiceTotal).toFixed(2)}`
      });
    }

    const paymentData = {
      customer,
      project: projectName || project,
      projectName: projectName || project,
      projectCost: parseFloat(projectCost),
      paymentType: req.body.paymentType || '',
      includeGST: req.body.includeGST || false,
      gstPercentage: req.body.gstPercentage || 0,
      consigneeAddress: consigneeAddress || '',
      buyerAddress: buyerAddress || '',
      invoices: (invoices || []).map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceValue: parseFloat(invoice.invoiceValue) || 0,
        invoiceDate: parseSafeDate(invoice.invoiceDate) || new Date(),
        paymentType: invoice.paymentType || '',
        voucherNo: invoice.voucherNo || '',
        buyersRef: invoice.buyersRef || '',
        dispatchedThrough: invoice.dispatchedThrough || '',
        destination: invoice.destination || '',
        termsForDelivery: invoice.termsForDelivery || '',
        hsnSac: invoice.hsnSac || '',
        cgst: parseFloat(invoice.cgst) || 0,
        sgst: parseFloat(invoice.sgst) || 0,
        roundOff: parseFloat(invoice.roundOff) || 0,
        cgstAmount: parseFloat(invoice.cgstAmount) || 0,
        sgstAmount: parseFloat(invoice.sgstAmount) || 0,
        totalWithTax: parseFloat(invoice.totalWithTax) || 0,
        overdueDate: parseSafeDate(invoice.overdueDate || invoice.dueDate)
      })),
      payments: (payments || []).map(payment => ({
        transactionId: payment.transactionId,
        bankName: payment.bankName,
        gst: payment.gst ? parseFloat(payment.gst) : 0,
        amount: parseFloat(payment.amount) || 0,
        date: parseSafeDate(payment.paymentDate || payment.date) || new Date(),
        paymentDate: parseSafeDate(payment.paymentDate || payment.date) || new Date(),
        paymentType: payment.paymentType || '',
        remarks: payment.remarks || ''
      })),
      createdBy: (user && (user.name || user.username)) || 'System'
    };
    console.log('Mapped payment data:', JSON.stringify(paymentData, null, 2));

    console.log('Payment data to save:', JSON.stringify(paymentData, null, 2));

    const payment = new Payment(paymentData);
    console.log('Payment model created, attempting to save...');
    await payment.save();
    console.log('Payment saved successfully:', payment._id);

    res.status(201).json({
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Payment creation error detail:', error);
    res.status(500).json({
      message: 'Server error creating payment',
      error: error.message,
      details: error.errors,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update payment (recalculates totals via pre-save)
router.put('/:id', auth, async (req, res) => {
  try {
    const { customer, projectName, project, projectCost, invoices, payments, consigneeAddress, buyerAddress } = req.body;

    // Validate required fields
    if (!customer) {
      return res.status(400).json({ message: 'Customer is required' });
    }

    if (!projectName && !project) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!projectCost || isNaN(projectCost)) {
      return res.status(400).json({ message: 'Valid project cost is required' });
    }

    // Fetch BOQ data for validation
    const boqData = await BOQ.findOne({
      customer: customer,
      projectName: projectName || project
    });

    const boqTotalWithGST = boqData ? boqData.totalWithGST : Infinity;
    if (boqData) {
      console.log('BOQ Total with GST:', boqTotalWithGST);
    } else {
      console.log('No BOQ found for this project. Skipping budget validation.');
    }

    // Validate invoice numbers are unique within this payment
    const invoiceNumbers = (invoices || []).map(inv => inv.invoiceNumber).filter(Boolean);
    const uniqueInvoiceNumbers = new Set(invoiceNumbers);
    if (invoiceNumbers.length !== uniqueInvoiceNumbers.size) {
      return res.status(400).json({ message: 'Invoice numbers must be unique within the payment' });
    }

    // Check for duplicate invoice numbers across all OTHER payments for this customer and project
    const existingPayments = await Payment.find({
      _id: { $ne: req.params.id }, // Exclude current payment being updated
      customer: customer,
      $or: [
        { project: projectName || project },
        { projectName: projectName || project }
      ]
    });

    const existingInvoiceNumbers = new Set();
    existingPayments.forEach(payment => {
      payment.invoices.forEach(invoice => {
        if (invoice.invoiceNumber) {
          existingInvoiceNumbers.add(invoice.invoiceNumber);
        }
      });
    });

    const duplicateInvoices = invoiceNumbers.filter(num => existingInvoiceNumbers.has(num));
    if (duplicateInvoices.length > 0) {
      return res.status(400).json({
        message: `Invoice number(s) already exist for this project: ${duplicateInvoices.join(', ')}`
      });
    }

    // Calculate total invoice value with tax
    const totalInvoiceValue = (invoices || []).reduce((sum, invoice) => {
      return sum + (parseFloat(invoice.totalWithTax) || parseFloat(invoice.invoiceValue) || 0);
    }, 0);

    // Calculate total of all existing invoices for this project (excluding current payment)
    const existingInvoiceTotal = existingPayments.reduce((sum, payment) => {
      return sum + payment.invoices.reduce((invSum, invoice) => {
        return invSum + (invoice.totalWithTax || invoice.invoiceValue || 0);
      }, 0);
    }, 0);

    const grandTotalInvoices = existingInvoiceTotal + totalInvoiceValue;

    // Validate that total invoices don't exceed BOQ total with GST (if BOQ exists)
    if (boqData && grandTotalInvoices > boqTotalWithGST) {
      return res.status(400).json({
        message: `Total invoice amount (₹${grandTotalInvoices.toFixed(2)}) exceeds BOQ total with GST (₹${boqTotalWithGST.toFixed(2)}). Remaining amount: ₹${(boqTotalWithGST - existingInvoiceTotal).toFixed(2)}`
      });
    }

    const updateData = {
      customer,
      project: projectName || project,
      projectName: projectName || project,
      projectCost: parseFloat(projectCost),
      paymentType: req.body.paymentType || '',
      includeGST: req.body.includeGST || false,
      gstPercentage: req.body.gstPercentage || 0,
      consigneeAddress: consigneeAddress || '',
      buyerAddress: buyerAddress || '',
      invoices: (invoices || []).map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceValue: parseFloat(invoice.invoiceValue) || 0,
        invoiceDate: parseSafeDate(invoice.invoiceDate) || new Date(),
        paymentType: invoice.paymentType || '',
        voucherNo: invoice.voucherNo || '',
        buyersRef: invoice.buyersRef || '',
        dispatchedThrough: invoice.dispatchedThrough || '',
        destination: invoice.destination || '',
        termsForDelivery: invoice.termsForDelivery || '',
        hsnSac: invoice.hsnSac || '',
        cgst: parseFloat(invoice.cgst) || 0,
        sgst: parseFloat(invoice.sgst) || 0,
        cgstAmount: parseFloat(invoice.cgstAmount) || 0,
        sgstAmount: parseFloat(invoice.sgstAmount) || 0,
        totalWithTax: parseFloat(invoice.totalWithTax) || 0,
        overdueDate: parseSafeDate(invoice.overdueDate || invoice.dueDate)
      })),
      payments: (payments || []).map(payment => ({
        transactionId: payment.transactionId,
        bankName: payment.bankName,
        gst: payment.gst ? parseFloat(payment.gst) : 0,
        amount: parseFloat(payment.amount) || 0,
        date: parseSafeDate(payment.paymentDate || payment.date) || new Date(),
        paymentDate: parseSafeDate(payment.paymentDate || payment.date) || new Date(),
        paymentType: payment.paymentType || '',
        remarks: payment.remarks || ''
      }))
    };

    let payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    payment.set(updateData);
    await payment.save();

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Payment update error detail:', error);
    res.status(500).json({
      message: 'Server error updating payment',
      error: error.message,
      details: error.errors,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete payment
router.delete('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Payment deletion error:', error);
    res.status(500).json({
      message: 'Server error deleting payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: error.errors
    });
  }
});

// Get customers from awarded projects
router.get('/customers/awarded', auth, async (req, res) => {
  try {
    const projects = await Project.find({ stage: 'awarded' });
    const customers = [...new Set(projects.map(project => project.customerName))];
    res.json(customers);
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({
      message: 'Server error fetching customers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get projects by customer
router.get('/projects/by-customer/:customer', auth, async (req, res) => {
  try {
    const { customer } = req.params;
    const projects = await Project.find({
      customerName: customer,
      stage: 'awarded'
    });
    res.json(projects);
  } catch (error) {
    console.error('Projects by customer fetch error:', error);
    res.status(500).json({
      message: 'Server error fetching projects',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
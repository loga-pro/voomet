const express = require('express');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

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
          (paymentObj.totalInvoiceRaised - paymentObj.totalPayments) === 0 ? 'paid' : 
          (paymentObj.totalInvoiceRaised - paymentObj.totalPayments) > 0 ? 'pending' : 'overdue'
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
    
    // Validate required fields
    const { customer, projectName, project, projectCost, invoices } = req.body;
    
    if (!customer) {
      return res.status(400).json({ message: 'Customer is required' });
    }
    
    if (!projectName && !project) {
      return res.status(400).json({ message: 'Project name is required' });
    }
    
    if (!projectCost || isNaN(projectCost)) {
      return res.status(400).json({ message: 'Valid project cost is required' });
    }
    
    if (!invoices || !invoices.length) {
      return res.status(400).json({ message: 'At least one invoice is required' });
    }

    // Validate invoices and payments
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      if (!invoice.invoiceNumber) {
        return res.status(400).json({ message: `Invoice ${i+1} must have an invoice number` });
      }
      if (!invoice.invoiceValue || isNaN(invoice.invoiceValue)) {
        return res.status(400).json({ message: `Invoice ${i+1} must have a valid value` });
      }
      
      if (invoice.payments && invoice.payments.length) {
        for (let j = 0; j < invoice.payments.length; j++) {
          const payment = invoice.payments[j];
          if (!payment.transactionId) {
            return res.status(400).json({ message: `Payment ${j+1} in Invoice ${i+1} must have a transaction ID` });
          }
          if (!payment.amount || isNaN(payment.amount)) {
            return res.status(400).json({ message: `Payment ${j+1} in Invoice ${i+1} must have a valid amount` });
          }
        }
      }
    }

    const paymentData = {
      customer,
      project: projectName || project,
      projectName: projectName || project,
      projectCost: parseFloat(projectCost),
      invoices: invoices.map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceValue: parseFloat(invoice.invoiceValue),
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
        payments: invoice.payments.map(payment => ({
          transactionId: payment.transactionId,
          bankName: payment.bankName,
          amount: parseFloat(payment.amount),
          date: payment.paymentDate || payment.date ? new Date(payment.paymentDate || payment.date) : new Date(),
          paymentDate: payment.paymentDate || payment.date ? new Date(payment.paymentDate || payment.date) : new Date(),
          remarks: payment.remarks || ''
        }))
      })),
      createdBy: user.name || user.username || 'Unknown'
    };

    const payment = new Payment(paymentData);
    await payment.save();
    
    res.status(201).json({
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ 
      message: 'Server error creating payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update payment (recalculates totals via pre-save)
router.put('/:id', auth, async (req, res) => {
  try {
    const { customer, projectName, project, projectCost, invoices } = req.body;
    
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
    
    if (!invoices || !invoices.length) {
      return res.status(400).json({ message: 'At least one invoice is required' });
    }

    const updateData = {
      customer,
      project: projectName || project,
      projectName: projectName || project,
      projectCost: parseFloat(projectCost),
      invoices: invoices.map(invoice => ({
        invoiceNumber: invoice.invoiceNumber,
        invoiceValue: parseFloat(invoice.invoiceValue),
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(),
        payments: invoice.payments.map(payment => ({
          transactionId: payment.transactionId,
          bankName: payment.bankName,
          amount: parseFloat(payment.amount),
          date: payment.paymentDate || payment.date ? new Date(payment.paymentDate || payment.date) : new Date(),
          paymentDate: payment.paymentDate || payment.date ? new Date(payment.paymentDate || payment.date) : new Date(),
          remarks: payment.remarks || ''
        }))
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
    console.error('Payment update error:', error);
    res.status(500).json({ 
      message: 'Server error updating payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
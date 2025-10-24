const express = require('express');
const VendorPayment = require('../models/VendorPayment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all vendor payments with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { vendor, projectId, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (vendor) filter.vendor = new RegExp(vendor, 'i');
    // Note: Vendor payments don't have a direct project relationship in the current model
    // projectId parameter is accepted for API consistency but not used for filtering

    const payments = await VendorPayment.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await VendorPayment.countDocuments(filter);

    const mappedPayments = payments.map(payment => {
      const paymentObj = payment.toObject();
      return {
        ...paymentObj,
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
    console.error('Vendor payment fetch error:', error);
    res.status(500).json({ 
      message: 'Server error fetching vendor payments', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get vendor payment by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await VendorPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Vendor payment not found' });
    }
    
    const paymentObj = payment.toObject();
    const mappedPayment = {
      ...paymentObj,
      balanceAmount: paymentObj.balanceAmount || (paymentObj.totalInvoiceRaised - paymentObj.totalPayments)
    };
    
    res.json(mappedPayment);
  } catch (error) {
    console.error('Vendor payment fetch by ID error:', error);
    res.status(500).json({ 
      message: 'Server error fetching vendor payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new vendor payment
router.post('/', auth, async (req, res) => {
  try {
    const user = req.user;
    
    const { vendor, vendorGstNumber, vendorAccountNumber, invoices } = req.body;
    
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor is required' });
    }
    
    if (!vendorGstNumber) {
      return res.status(400).json({ message: 'Vendor GST number is required' });
    }
    
    if (!vendorAccountNumber) {
      return res.status(400).json({ message: 'Vendor account number is required' });
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
      vendor,
      vendorGstNumber,
      vendorAccountNumber,
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

    const payment = new VendorPayment(paymentData);
    await payment.save();
    
    res.status(201).json({
      message: 'Vendor payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Vendor payment creation error:', error);
    res.status(500).json({ 
      message: 'Server error creating vendor payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update vendor payment
router.put('/:id', auth, async (req, res) => {
  try {
    const { vendor, vendorGstNumber, vendorAccountNumber, invoices } = req.body;
    
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor is required' });
    }
    
    if (!vendorGstNumber) {
      return res.status(400).json({ message: 'Vendor GST number is required' });
    }
    
    if (!vendorAccountNumber) {
      return res.status(400).json({ message: 'Vendor account number is required' });
    }
    
    if (!invoices || !invoices.length) {
      return res.status(400).json({ message: 'At least one invoice is required' });
    }

    const updateData = {
      vendor,
      vendorGstNumber,
      vendorAccountNumber,
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

    let payment = await VendorPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Vendor payment not found' });
    }
    payment.set(updateData);
    await payment.save();
    
    res.json({
      message: 'Vendor payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Vendor payment update error:', error);
    res.status(500).json({ 
      message: 'Server error updating vendor payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete vendor payment
router.delete('/:id', auth, async (req, res) => {
  try {
    const payment = await VendorPayment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Vendor payment not found' });
    }
    res.json({ message: 'Vendor payment deleted successfully' });
  } catch (error) {
    console.error('Vendor payment deletion error:', error);
    res.status(500).json({ 
      message: 'Server error deleting vendor payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
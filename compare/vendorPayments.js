const express = require('express');
const VendorPayment = require('../models/VendorPayment');
const auth = require('../middleware/auth');
const upload = require('../middleware/uploadVendorImage');

const router = express.Router();

// Helper function to check for duplicate payment
const checkDuplicatePayment = async (vendor, invoiceNumber, excludeId = null) => {
  const query = {
    vendor: vendor,
    'invoices.invoiceNumber': invoiceNumber
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingPayment = await VendorPayment.findOne(query);
  return !!existingPayment;
};

// Get all vendor payments with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { vendor, projectId, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Note: vendor filter now needs to search by vendor name in populated data
    // We'll handle this after population

    const payments = await VendorPayment.find(filter)
      .populate('vendor', 'vendorName category gstNumber bankAccountNumber email mobileNumber')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    // Filter by vendor name if provided (after population)
    let filteredPayments = payments;
    if (vendor) {
      filteredPayments = payments.filter(payment =>
        payment.vendor && payment.vendor.vendorName &&
        payment.vendor.vendorName.toLowerCase().includes(vendor.toLowerCase())
      );
    }

    const total = await VendorPayment.countDocuments(filter);

    const mappedPayments = filteredPayments.map(payment => {
      const paymentObj = payment.toObject();
      
      // Calculate totals from invoices
      let totalInvoiceRaised = 0;
      let totalPayments = 0;
      
      if (paymentObj.invoices && paymentObj.invoices.length > 0) {
        paymentObj.invoices.forEach(invoice => {
          totalInvoiceRaised += invoice.invoiceValue || 0;
          if (invoice.payments && invoice.payments.length > 0) {
            invoice.payments.forEach(payment => {
              totalPayments += payment.amount || 0;
            });
          }
        });
      }
      
      const balanceAmount = totalInvoiceRaised - totalPayments;
      
      return {
        ...paymentObj,
        vendor: paymentObj.vendor ? {
          _id: paymentObj.vendor._id,
          vendorName: paymentObj.vendor.vendorName,
          category: paymentObj.vendor.category,
          gstNumber: paymentObj.vendor.gstNumber,
          bankAccountNumber: paymentObj.vendor.bankAccountNumber,
          email: paymentObj.vendor.email,
          mobileNumber: paymentObj.vendor.mobileNumber
        } : null,
        totalInvoiceRaised: totalInvoiceRaised,
        totalPayments: totalPayments,
        balanceAmount: balanceAmount,
        status: paymentObj.status || (
          balanceAmount === 0 ? 'paid' :
            balanceAmount > 0 ? 'pending' : 'overdue'
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
    const payment = await VendorPayment.findById(req.params.id)
      .populate('vendor', 'vendorName category gstNumber bankAccountNumber email mobileNumber address city state zipCode country contactPerson');

    if (!payment) {
      return res.status(404).json({ message: 'Vendor payment not found' });
    }

    const paymentObj = payment.toObject();
    
    // Calculate totals from invoices
    let totalInvoiceRaised = 0;
    let totalPayments = 0;
    
    if (paymentObj.invoices && paymentObj.invoices.length > 0) {
      paymentObj.invoices.forEach(invoice => {
        totalInvoiceRaised += invoice.invoiceValue || 0;
        if (invoice.payments && invoice.payments.length > 0) {
          invoice.payments.forEach(payment => {
            totalPayments += payment.amount || 0;
          });
        }
      });
    }
    
    const balanceAmount = totalInvoiceRaised - totalPayments;
    
    const mappedPayment = {
      ...paymentObj,
      vendor: paymentObj.vendor ? {
        _id: paymentObj.vendor._id,
        vendorName: paymentObj.vendor.vendorName,
        category: paymentObj.vendor.category,
        gstNumber: paymentObj.vendor.gstNumber,
        bankAccountNumber: paymentObj.vendor.bankAccountNumber,
        email: paymentObj.vendor.email,
        mobileNumber: paymentObj.vendor.mobileNumber,
        address: paymentObj.vendor.address,
        city: paymentObj.vendor.city,
        state: paymentObj.vendor.state,
        zipCode: paymentObj.vendor.zipCode,
        country: paymentObj.vendor.country,
        contactPerson: paymentObj.vendor.contactPerson
      } : null,
      totalInvoiceRaised: totalInvoiceRaised,
      totalPayments: totalPayments,
      balanceAmount: balanceAmount
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
router.post('/', auth, upload.single("image"), async (req, res) => {
  try {
    const user = req.user;
    const payload = req.body;

    if (req.file) {
      payload.image = `/uploads/vendors_payment_pdf/${req.file.filename}`;
      payload.uploadImg = req.file.originalname;
    }

    // Parse invoices if it comes as a JSON string (from FormData)
    let invoices = payload.invoices;
    if (typeof invoices === 'string') {
      try {
        invoices = JSON.parse(invoices);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid invoices data format' });
      }
    }

    const { vendor, vendorGstNumber, vendorAccountNumber, vendorType } = payload;

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
        return res.status(400).json({ message: `Invoice ${i + 1} must have an invoice number` });
      }
      if (!invoice.invoiceValue || isNaN(invoice.invoiceValue)) {
        return res.status(400).json({ message: `Invoice ${i + 1} must have a valid value` });
      }

      if (invoice.payments && invoice.payments.length) {
        for (let j = 0; j < invoice.payments.length; j++) {
          const payment = invoice.payments[j];
          if (!payment.transactionId) {
            return res.status(400).json({ message: `Payment ${j + 1} in Invoice ${i + 1} must have a transaction ID` });
          }
          if (!payment.amount || isNaN(payment.amount)) {
            return res.status(400).json({ message: `Payment ${j + 1} in Invoice ${i + 1} must have a valid amount` });
          }
        }
      }
    }

    // Check for duplicate payment (first invoice only for now)
    const firstInvoiceNumber = invoices[0].invoiceNumber;
    const isDuplicate = await checkDuplicatePayment(vendor, firstInvoiceNumber);
    
    if (isDuplicate) {
      return res.status(400).json({
        message: 'Invoice number already exists for this vendor'
      });
    }

    const paymentData = {
      vendor,
      vendorType: vendorType || 'vendor',
      vendorGstNumber,
      vendorAccountNumber,
      uploadImg: payload.uploadImg || '',
      image: payload.image || '',
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

    // Populate vendor data before sending response
    await payment.populate('vendor', 'vendorName category gstNumber bankAccountNumber email mobileNumber');

    res.status(201).json({
      message: 'Vendor payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Vendor payment creation error:', error);
    
    // Check if it's a MongoDB duplicate error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Invoice number already exists for this vendor'
      });
    }
    
    res.status(500).json({
      message: 'Server error creating vendor payment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update vendor payment
router.put('/:id', auth, upload.single("image"), async (req, res) => {
  try {
    const payload = req.body;

    if (req.file) {
      payload.image = `/uploads/vendors_payment_pdf/${req.file.filename}`;
      payload.uploadImg = req.file.originalname;
    }

    // Parse invoices if it comes as a JSON string (from FormData)
    let invoices = payload.invoices;
    if (typeof invoices === 'string') {
      try {
        invoices = JSON.parse(invoices);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid invoices data format' });
      }
    }

    const { vendor, vendorGstNumber, vendorAccountNumber, vendorType } = payload;

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
        return res.status(400).json({ message: `Invoice ${i + 1} must have an invoice number` });
      }
      if (!invoice.invoiceValue || isNaN(invoice.invoiceValue)) {
        return res.status(400).json({ message: `Invoice ${i + 1} must have a valid value` });
      }

      if (invoice.payments && invoice.payments.length) {
        for (let j = 0; j < invoice.payments.length; j++) {
          const payment = invoice.payments[j];
          if (!payment.transactionId) {
            return res.status(400).json({ message: `Payment ${j + 1} in Invoice ${i + 1} must have a transaction ID` });
          }
          if (!payment.amount || isNaN(payment.amount)) {
            return res.status(400).json({ message: `Payment ${j + 1} in Invoice ${i + 1} must have a valid amount` });
          }
        }
      }
    }

    // Check for duplicate payment excluding current payment
    const firstInvoiceNumber = invoices[0].invoiceNumber;
    const isDuplicate = await checkDuplicatePayment(vendor, firstInvoiceNumber, req.params.id);
    
    if (isDuplicate) {
      return res.status(400).json({
        message: 'Invoice number already exists for this vendor'
      });
    }

    const updateData = {
      vendor,
      vendorType: vendorType || 'vendor',
      vendorGstNumber,
      vendorAccountNumber,
      uploadImg: payload.uploadImg,
      image: payload.image,
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

    // Populate vendor data before sending response
    await payment.populate('vendor', 'vendorName category gstNumber bankAccountNumber email mobileNumber');

    res.json({
      message: 'Vendor payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Vendor payment update error:', error);
    
    // Check if it's a MongoDB duplicate error
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Invoice number already exists for this vendor'
      });
    }
    
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

// Update vendor name in all vendor payments (for vendor name synchronization)
router.patch('/update-vendor-name', auth, async (req, res) => {
  try {
    const { oldVendorName, newVendorName } = req.body;

    if (!oldVendorName || !newVendorName) {
      return res.status(400).json({
        message: 'Both oldVendorName and newVendorName are required'
      });
    }

    if (oldVendorName === newVendorName) {
      return res.status(400).json({
        message: 'Old and new vendor names cannot be the same'
      });
    }

    // Find all vendor payments with the old vendor name
    const paymentsToUpdate = await VendorPayment.find({ vendor: oldVendorName });

    if (paymentsToUpdate.length === 0) {
      return res.json({
        message: 'No vendor payments found with the specified vendor name',
        updatedCount: 0
      });
    }

    // Update all matching payments
    const updateResult = await VendorPayment.updateMany(
      { vendor: oldVendorName },
      { $set: { vendor: newVendorName } }
    );

    console.log(`Updated ${updateResult.modifiedCount} vendor payments from "${oldVendorName}" to "${newVendorName}"`);

    res.json({
      message: `Successfully updated ${updateResult.modifiedCount} vendor payment(s)`,
      updatedCount: updateResult.modifiedCount,
      oldVendorName,
      newVendorName
    });

  } catch (error) {
    console.error('Vendor name update error:', error);
    res.status(500).json({
      message: 'Server error updating vendor name in payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
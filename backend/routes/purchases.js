const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const auth = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Get all purchases with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      voucherNo,
      workCategory,
      partName,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (voucherNo) {
      filter.voucherNo = { $regex: voucherNo, $options: 'i' };
    }
    
    if (workCategory) {
      filter.workCategory = workCategory;
    }
    
    if (partName) {
      filter.partName = { $regex: partName, $options: 'i' };
    }
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const purchases = await Purchase.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Purchase.countDocuments(filter);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchases',
      error: error.message
    });
  }
});

// Get purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase',
      error: error.message
    });
  }
});

// Create new purchase
router.post('/', async (req, res) => {
  try {
    // Note: Multiple purchases can have the same voucher number (for different line items)
    // So we don't check for duplicate voucher numbers here

    const purchaseData = {
      voucherNo: req.body.voucherNo,
      date: req.body.date,
      vendorName: req.body.vendorName,
      modeOfPayment: req.body.modeOfPayment || 'Cash',
      referenceNo: req.body.referenceNo,
      referenceDate: req.body.referenceDate,
      otherReference: req.body.otherReference,
      dispatchedThrough: req.body.dispatchedThrough,
      destination: req.body.destination,
      termsOfDelivery: req.body.termsOfDelivery,
      supplier: req.body.supplier,
      cgst: req.body.cgst,
      sgst: req.body.sgst,
      workCategory: req.body.workCategory,
      partName: req.body.partName,
      unit: req.body.unit,
      quantity: req.body.quantity,
      invoiceValueWithoutGST: req.body.invoiceValueWithoutGST,
      gstPercentage: req.body.gstPercentage || 18,
      gstValue: req.body.gstValue,
      totalValue: req.body.totalValue
    };

    const purchase = await Purchase.create(purchaseData);

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating purchase',
      error: error.message
    });
  }
});

// Update purchase
router.put('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Update fields
    const updateData = {
      voucherNo: req.body.voucherNo,
      date: req.body.date,
      vendorName: req.body.vendorName,
      modeOfPayment: req.body.modeOfPayment,
      referenceNo: req.body.referenceNo,
      referenceDate: req.body.referenceDate,
      otherReference: req.body.otherReference,
      dispatchedThrough: req.body.dispatchedThrough,
      destination: req.body.destination,
      termsOfDelivery: req.body.termsOfDelivery,
      supplier: req.body.supplier,
      cgst: req.body.cgst,
      sgst: req.body.sgst,
      workCategory: req.body.workCategory,
      partName: req.body.partName,
      unit: req.body.unit,
      quantity: req.body.quantity,
      invoiceValueWithoutGST: req.body.invoiceValueWithoutGST,
      gstPercentage: req.body.gstPercentage,
      gstValue: req.body.gstValue,
      totalValue: req.body.totalValue
    };

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Purchase updated successfully',
      data: updatedPurchase
    });
  } catch (error) {
    console.error('Error updating purchase:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating purchase',
      error: error.message
    });
  }
});

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    await Purchase.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting purchase',
      error: error.message
    });
  }
});

// Bulk delete purchases by voucher number
router.delete('/voucher/:voucherNo', async (req, res) => {
  try {
    const result = await Purchase.deleteMany({ voucherNo: req.params.voucherNo });

    res.json({
      success: true,
      message: `${result.deletedCount} purchase(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting purchases',
      error: error.message
    });
  }
});

// Get unique work categories
router.get('/filters/work-categories', async (req, res) => {
  try {
    const workCategories = await Purchase.distinct('workCategory');
    
    res.json({
      success: true,
      data: workCategories
    });
  } catch (error) {
    console.error('Error fetching work categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching work categories',
      error: error.message
    });
  }
});

// Check if voucher number exists
router.get('/check-voucher/:voucherNo', async (req, res) => {
  try {
    const existingPurchase = await Purchase.findOne({ voucherNo: req.params.voucherNo });
    
    res.json({
      success: true,
      exists: !!existingPurchase,
      data: existingPurchase
    });
  } catch (error) {
    console.error('Error checking voucher:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking voucher',
      error: error.message
    });
  }
});

module.exports = router;

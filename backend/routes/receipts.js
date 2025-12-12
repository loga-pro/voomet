const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const auth = require('../middleware/auth');

// Get all receipts
router.get('/', auth, async (req, res) => {
  try {
    const { receiptCategory, partName, vendorName, workCategory } = req.query;
    
    let query = {};
    
    if (receiptCategory) query.receiptCategory = receiptCategory;
    if (partName) query.partName = partName;
    if (vendorName) query.vendorName = vendorName;
    if (workCategory) query.workCategory = workCategory;
    
    const receipts = await Receipt.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: receipts
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipts',
      error: error.message
    });
  }
});

// Get receipt by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt',
      error: error.message
    });
  }
});

// Create new receipt
router.post('/', auth, async (req, res) => {
  try {
    const receiptData = req.body;
    
    // Calculate total value
    if (receiptData.invoiceValueWithoutGST && receiptData.gstValue && receiptData.quantity) {
      receiptData.totalValue = (parseFloat(receiptData.invoiceValueWithoutGST) + parseFloat(receiptData.gstValue)) * parseFloat(receiptData.quantity);
    }
    
    const receipt = new Receipt(receiptData);
    await receipt.save();
    
    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating receipt',
      error: error.message
    });
  }
});

// Update receipt
router.put('/:id', auth, async (req, res) => {
  try {
    const receiptData = req.body;
    
    // Calculate total value
    if (receiptData.invoiceValueWithoutGST && receiptData.gstValue && receiptData.quantity) {
      receiptData.totalValue = (parseFloat(receiptData.invoiceValueWithoutGST) + parseFloat(receiptData.gstValue)) * parseFloat(receiptData.quantity);
    }
    
    const receipt = await Receipt.findByIdAndUpdate(
      req.params.id,
      receiptData,
      { new: true, runValidators: true }
    );
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Receipt updated successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating receipt',
      error: error.message
    });
  }
});

// Delete receipt
router.delete('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findByIdAndDelete(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting receipt',
      error: error.message
    });
  }
});

module.exports = router;

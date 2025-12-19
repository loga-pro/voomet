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
    console.log('Creating receipt with data:', req.body);
    
    const receiptData = req.body;
    const { partName, workCategory, receiptCategory, quantity } = receiptData;
    
    // Validation: For return receipts on bought-out parts, ensure we have enough stock to return
    if (receiptCategory === 'return' && partName && workCategory) {
      const Inventory = require('../models/Inventory');
      const Part = require('../models/Part');
      
      // Check if this is a bought-out part
      const part = await Part.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        scopeOfWork: { $regex: new RegExp(`^${workCategory}$`, 'i') }
      });
      
      if (part && part.category === 'bought_out') {
        // Find the inventory item
        const inventory = await Inventory.findOne({ 
          partName: { $regex: new RegExp(`^${partName}$`, 'i') },
          workCategory: workCategory 
        });
        
        if (inventory) {
          // Get all receipts and calculate available stock
          const Receipt = require('../models/Receipt');
          const allReceipts = await Receipt.find({ _id: { $in: inventory.receipts } });
          
          const regularReceipts = allReceipts.filter(r => r.receiptCategory !== 'return');
          const existingReturns = allReceipts.filter(r => r.receiptCategory === 'return');
          
          const totalReceived = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
          const totalReturned = existingReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
          
          // Get dispatches to calculate what's been sent out
          const Dispatch = require('../models/Dispatch');
          const allDispatches = await Dispatch.find({ _id: { $in: inventory.dispatches } });
          const totalDispatched = allDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
          
          // Available stock = Total Received - Total Dispatched - Already Returned
          const availableForReturn = totalReceived - totalDispatched - totalReturned;
          
          if (quantity > availableForReturn) {
            return res.status(400).json({
              success: false,
              message: `Cannot return ${quantity} units. Only ${availableForReturn} units available for return to vendor. (Received: ${totalReceived}, Dispatched: ${totalDispatched}, Already Returned: ${totalReturned})`
            });
          }
        }
      }
    }
    
    // Calculate total value
    if (receiptData.invoiceValueWithoutGST && receiptData.gstValue && receiptData.quantity) {
      receiptData.totalValue = (parseFloat(receiptData.invoiceValueWithoutGST) + parseFloat(receiptData.gstValue)) * parseFloat(receiptData.quantity);
    }
    
    console.log('Step 1: Creating receipt document');
    const receipt = new Receipt(receiptData);
    await receipt.save();
    console.log('Receipt saved with ID:', receipt._id);
    
    // If partName and workCategory are provided, link to inventory
    if (partName && workCategory) {
      const Inventory = require('../models/Inventory');
      
      console.log('Step 2: Finding inventory item');
      let inventory = await Inventory.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        workCategory: workCategory 
      });
      
      if (!inventory) {
        console.log('Step 3: Creating new inventory item');
        inventory = new Inventory({
          partName,
          workCategory,
          customerVendorName: (receiptData.vendorNames && receiptData.vendorNames[0]) || 'New Vendor',
          receipts: [receipt._id],
          dispatches: [],
          rowData: [{
            id: 1,
            category: receiptData.category || 'In house',
            vendorNames: receiptData.vendorNames || []
          }]
        });
      } else {
        console.log('Step 3: Adding receipt to existing inventory');
        inventory.receipts.push(receipt._id);
        
        // Update rowData metadata
        if (!inventory.rowData || inventory.rowData.length === 0) {
           inventory.rowData = [{
             id: 1,
             category: receiptData.category || 'In house',
             vendorNames: receiptData.vendorNames || []
           }];
        } else {
           // Update category if provided
           if (receiptData.category) {
             inventory.rowData[0].category = receiptData.category;
           }
           // Merge vendor names
           if (receiptData.vendorNames && receiptData.vendorNames.length > 0) {
             const existingVendors = inventory.rowData[0].vendorNames || [];
             const newVendors = [...new Set([...existingVendors, ...receiptData.vendorNames])];
             inventory.rowData[0].vendorNames = newVendors;
           }
        }
      }
      
      inventory.markModified('rowData');
      await inventory.save();
      console.log('Inventory saved with ID:', inventory._id);
      
      // Recalculate inventory summary
      console.log('Step 4: Recalculating inventory summary');
      await Inventory.calculateSummary(inventory._id);
      console.log('Summary calculated successfully');
    }
    
    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Error creating receipt:', error);
    console.error('Error stack:', error.stack);
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
    const { partName, workCategory, receiptCategory, quantity } = receiptData;
    
    // Validation: For return receipts on bought-out parts, ensure we have enough stock to return
    if (receiptCategory === 'return' && partName && workCategory) {
      const Inventory = require('../models/Inventory');
      const Part = require('../models/Part');
      
      // Check if this is a bought-out part
      const part = await Part.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        scopeOfWork: { $regex: new RegExp(`^${workCategory}$`, 'i') }
      });
      
      if (part && part.category === 'bought_out') {
        // Find the inventory item
        const inventory = await Inventory.findOne({ 
          partName: { $regex: new RegExp(`^${partName}$`, 'i') },
          workCategory: workCategory 
        });
        
        if (inventory) {
          // Get all receipts and calculate available stock (excluding the current receipt being updated)
          const Receipt = require('../models/Receipt');
          const allReceipts = await Receipt.find({ 
            _id: { $in: inventory.receipts, $ne: req.params.id } 
          });
          
          const regularReceipts = allReceipts.filter(r => r.receiptCategory !== 'return');
          const existingReturns = allReceipts.filter(r => r.receiptCategory === 'return');
          
          const totalReceived = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
          const totalReturned = existingReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
          
          // Get dispatches to calculate what's been sent out
          const Dispatch = require('../models/Dispatch');
          const allDispatches = await Dispatch.find({ _id: { $in: inventory.dispatches } });
          const totalDispatched = allDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
          
          // Available stock = Total Received - Total Dispatched - Already Returned
          const availableForReturn = totalReceived - totalDispatched - totalReturned;
          
          if (quantity > availableForReturn) {
            return res.status(400).json({
              success: false,
              message: `Cannot return ${quantity} units. Only ${availableForReturn} units available for return to vendor. (Received: ${totalReceived}, Dispatched: ${totalDispatched}, Already Returned: ${totalReturned})`
            });
          }
        }
      }
    }
    
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
    
    // Recalculate inventory summary if receipt is linked to inventory
    const Inventory = require('../models/Inventory');
    const inventory = await Inventory.findOne({ receipts: req.params.id });
    if (inventory) {
      await Inventory.calculateSummary(inventory._id);
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
    // Find and remove receipt from inventory first
    const Inventory = require('../models/Inventory');
    const inventory = await Inventory.findOne({ receipts: req.params.id });
    
    const receipt = await Receipt.findByIdAndDelete(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }
    
    // Remove receipt reference from inventory and recalculate
    if (inventory) {
      inventory.receipts = inventory.receipts.filter(r => r.toString() !== req.params.id);
      await inventory.save();
      await Inventory.calculateSummary(inventory._id);
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

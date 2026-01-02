const express = require('express');
const router = express.Router();
const Dispatch = require('../models/Dispatch');
const auth = require('../middleware/auth');

// Get all dispatches
router.get('/', auth, async (req, res) => {
  try {
    const { dispatchCategory, partName, customerName, workCategory } = req.query;
    
    let query = {};
    
    if (dispatchCategory) query.dispatchCategory = dispatchCategory;
    if (partName) query.partName = partName;
    if (customerName) query.customerName = customerName;
    if (workCategory) query.workCategory = workCategory;
    
    const dispatches = await Dispatch.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: dispatches
    });
  } catch (error) {
    console.error('Error fetching dispatches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dispatches',
      error: error.message
    });
  }
});

// Get dispatch by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const dispatch = await Dispatch.findById(req.params.id);
    
    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found'
      });
    }
    
    res.json({
      success: true,
      data: dispatch
    });
  } catch (error) {
    console.error('Error fetching dispatch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dispatch',
      error: error.message
    });
  }
});

// Create new dispatch
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating dispatch with data:', req.body);
    
    const dispatchData = req.body;
    const { partName, workCategory, quantity, dispatchCategory } = dispatchData;
    
    console.log('=== DISPATCH VALIDATION DEBUG ===');
    console.log('dispatchCategory:', dispatchCategory);
    console.log('partName:', partName);
    console.log('workCategory:', workCategory);
    console.log('quantity:', quantity);
    
    // Validation: For regular dispatches, ensure we have enough stock available
    if (dispatchCategory !== 'return' && partName && workCategory && quantity) {
      console.log('✓ Validation check triggered');
      const Inventory = require('../models/Inventory');
      
      // Find the inventory item
      const inventory = await Inventory.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        workCategory: workCategory 
      });
      
      console.log('Inventory found:', inventory ? 'YES' : 'NO');
      
      if (inventory) {
        // Get all receipts and dispatches to calculate available stock
        const Receipt = require('../models/Receipt');
        const allReceipts = await Receipt.find({ _id: { $in: inventory.receipts } });
        
        const regularReceipts = allReceipts.filter(r => r.receiptCategory !== 'return');
        const receiptReturns = allReceipts.filter(r => r.receiptCategory === 'return');
        
        const totalReceived = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const totalReturnedToVendor = receiptReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
        
        // Get existing dispatches
        const allDispatches = await Dispatch.find({ _id: { $in: inventory.dispatches } });
        const regularDispatches = allDispatches.filter(d => d.dispatchCategory === 'dispatch');
        const dispatchRejects = allDispatches.filter(d => d.dispatchCategory === 'reject');
        
        const totalDispatched = regularDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
        const totalRejected = dispatchRejects.reduce((sum, d) => sum + (d.quantity || 0), 0);
        
        // Available stock = Total Received - Total Dispatched - Total Rejected - Returned to Vendor
        const availableStock = totalReceived - totalDispatched - totalRejected - totalReturnedToVendor;
        
        console.log('Stock Calculation:');
        console.log('  Total Received:', totalReceived);
        console.log('  Total Dispatched:', totalDispatched);
        console.log('  Total Rejected:', totalRejected);
        console.log('  Returned to Vendor:', totalReturnedToVendor);
        console.log('  Available Stock:', availableStock);
        console.log('  Requested Quantity:', quantity);
        
        if (quantity > availableStock) {
          console.log('❌ VALIDATION FAILED - Insufficient stock');
          return res.status(400).json({
            success: false,
            message: `⚠️ Cannot dispatch ${quantity} units. Only ${availableStock} units available in receipt!\n\nStock Details:\n• Total Received: ${totalReceived} units\n• Already Dispatched: ${totalDispatched} units\n• Rejected: ${totalRejected} units\n• Returned to Vendor: ${totalReturnedToVendor} units\n• Available for Dispatch: ${availableStock} units`
          });
        }
        console.log('✓ Validation passed');
      } else {
        // No inventory record exists, cannot dispatch
        console.log('❌ VALIDATION FAILED - No inventory found');
        return res.status(400).json({
          success: false,
          message: `No inventory found for ${partName} (${workCategory}). Please add receipts first before dispatching.`
        });
      }
    } else {
      console.log('⚠ Validation skipped - conditions not met');
    }
    console.log('=== END VALIDATION DEBUG ===');
    
    // Calculate total value
    if (dispatchData.invoiceValueWithoutGST && dispatchData.gstValue && dispatchData.quantity) {
      dispatchData.totalValue = (parseFloat(dispatchData.invoiceValueWithoutGST) + parseFloat(dispatchData.gstValue)) * parseFloat(dispatchData.quantity);
    }
    
    console.log('Step 1: Creating dispatch document');
    const dispatch = new Dispatch(dispatchData);
    await dispatch.save();
    console.log('Dispatch saved with ID:', dispatch._id);
    
    // If partName and workCategory are provided, link to inventory
    if (partName && workCategory) {
      const Inventory = require('../models/Inventory');
      
      console.log('Step 2: Finding inventory item');
      let inventory = await Inventory.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        workCategory: workCategory 
      });
      
      if (inventory) {
        console.log('Step 3: Adding dispatch to existing inventory');
        inventory.dispatches.push(dispatch._id);
        await inventory.save();
        console.log('Inventory saved with ID:', inventory._id);
        
        // Recalculate inventory summary
        console.log('Step 4: Recalculating inventory summary');
        await Inventory.calculateSummary(inventory._id);
        console.log('Summary calculated successfully');
      } else {
        console.log('Step 3: No matching inventory found, dispatch created standalone');
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Dispatch created successfully',
      data: dispatch
    });
  } catch (error) {
    console.error('Error creating dispatch:', error);
    console.error('Error stack:', error.stack);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${messages.join(', ')}`,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error creating dispatch',
      error: error.message
    });
  }
});

// Update dispatch
router.put('/:id', auth, async (req, res) => {
  try {
    const dispatchData = req.body;
    const { partName, workCategory, quantity, dispatchCategory } = dispatchData;
    
    // Validation: For regular dispatches, ensure we have enough stock available
    if (dispatchCategory !== 'return' && partName && workCategory && quantity) {
      const Inventory = require('../models/Inventory');
      
      // Find the inventory item
      const inventory = await Inventory.findOne({ 
        partName: { $regex: new RegExp(`^${partName}$`, 'i') },
        workCategory: workCategory 
      });
      
      if (inventory) {
        // Get all receipts and dispatches to calculate available stock (excluding current dispatch being updated)
        const Receipt = require('../models/Receipt');
        const allReceipts = await Receipt.find({ _id: { $in: inventory.receipts } });
        
        const regularReceipts = allReceipts.filter(r => r.receiptCategory !== 'return');
        const receiptReturns = allReceipts.filter(r => r.receiptCategory === 'return');
        
        const totalReceived = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const totalReturnedToVendor = receiptReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
        
        // Get existing dispatches (excluding the one being updated)
        const allDispatches = await Dispatch.find({ 
          _id: { $in: inventory.dispatches, $ne: req.params.id } 
        });
        const regularDispatches = allDispatches.filter(d => d.dispatchCategory === 'dispatch');
        const dispatchRejects = allDispatches.filter(d => d.dispatchCategory === 'reject');
        
        const totalDispatched = regularDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
        const totalRejected = dispatchRejects.reduce((sum, d) => sum + (d.quantity || 0), 0);
        
        // Available stock = Total Received - Total Dispatched - Total Rejected - Returned to Vendor
        const availableStock = totalReceived - totalDispatched - totalRejected - totalReturnedToVendor;
        
        if (quantity > availableStock) {
          return res.status(400).json({
            success: false,
            message: `⚠️ Cannot dispatch ${quantity} units. Only ${availableStock} units available in receipt!\n\nStock Details:\n• Total Received: ${totalReceived} units\n• Already Dispatched: ${totalDispatched} units\n• Rejected: ${totalRejected} units\n• Returned to Vendor: ${totalReturnedToVendor} units\n• Available for Dispatch: ${availableStock} units`
          });
        }
      }
    }
    
    // Calculate total value
    if (dispatchData.invoiceValueWithoutGST && dispatchData.gstValue && dispatchData.quantity) {
      dispatchData.totalValue = (parseFloat(dispatchData.invoiceValueWithoutGST) + parseFloat(dispatchData.gstValue)) * parseFloat(dispatchData.quantity);
    }
    
    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      dispatchData,
      { new: true, runValidators: true }
    );
    
    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found'
      });
    }
    
    // Recalculate inventory summary if dispatch is linked to inventory
    const Inventory = require('../models/Inventory');
    const inventory = await Inventory.findOne({ dispatches: req.params.id });
    if (inventory) {
      await Inventory.calculateSummary(inventory._id);
    }
    
    res.json({
      success: true,
      message: 'Dispatch updated successfully',
      data: dispatch
    });
  } catch (error) {
    console.error('Error updating dispatch:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${messages.join(', ')}`,
        error: error.message
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Error updating dispatch',
      error: error.message
    });
  }
});

// Delete dispatch
router.delete('/:id', auth, async (req, res) => {
  try {
    // Find and remove dispatch from inventory first
    const Inventory = require('../models/Inventory');
    const inventory = await Inventory.findOne({ dispatches: req.params.id });
    
    const dispatch = await Dispatch.findByIdAndDelete(req.params.id);
    
    if (!dispatch) {
      return res.status(404).json({
        success: false,
        message: 'Dispatch not found'
      });
    }
    
    // Remove dispatch reference from inventory and recalculate
    if (inventory) {
      inventory.dispatches = inventory.dispatches.filter(d => d.toString() !== req.params.id);
      await inventory.save();
      await Inventory.calculateSummary(inventory._id);
    }
    
    res.json({
      success: true,
      message: 'Dispatch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting dispatch:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting dispatch',
      error: error.message
    });
  }
});

module.exports = router;

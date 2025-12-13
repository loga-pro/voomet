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
    const { partName, workCategory } = dispatchData;
    
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

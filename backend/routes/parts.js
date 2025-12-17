const express = require('express');
const Part = require('../models/Part');
const Inventory = require('../models/Inventory');
const BOQ = require('../models/BOQ');
const ProjectBudget = require('../models/ProjectBudget');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all parts with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { scopeOfWork, category, partName } = req.query;
    let filter = {};

    if (scopeOfWork) filter.scopeOfWork = scopeOfWork;
    if (category) filter.category = category;
    if (partName) filter.partName = new RegExp(partName, 'i');

    const parts = await Part.find(filter);
    res.json(parts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get part by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }
    res.json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new part
router.post('/', auth, async (req, res) => {
  try {
    // Allow custom unitType values by removing enum constraint if it exists
    const partData = { ...req.body };
    
    console.log('Creating part with data:', partData);
    
    // Create part instance but don't save it yet
    const part = new Part(partData);
    
    // Use collection.insertOne to bypass Mongoose validation entirely
    const result = await Part.collection.insertOne(partData);
    
    // Return the created document
    const createdPart = await Part.findById(result.insertedId);
    res.status(201).json(createdPart);
  } catch (error) {
    console.error('Part creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update part
router.put('/:id', auth, async (req, res) => {
  try {
    // Get the original part data first
    const originalPart = await Part.findById(req.params.id);
    if (!originalPart) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Use collection.updateOne to bypass Mongoose validation entirely
    // Ensure we cast the id to ObjectId for native collection operations
    const mongoose = require('mongoose');
    const objectId = new mongoose.Types.ObjectId(req.params.id);
    const result = await Part.collection.updateOne(
      { _id: objectId },
      { $set: req.body }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Handle cascading updates if key fields changed
    const updatedFields = req.body;
    const cascadeUpdates = [];

    // If partName changed, update all references
    if (updatedFields.partName && updatedFields.partName !== originalPart.partName) {
      // Get Receipt and Dispatch models
      const Receipt = require('../models/Receipt');
      const Dispatch = require('../models/Dispatch');
      
      // Update Receipt collection directly (not Inventory.receipts which are ObjectId references)
      cascadeUpdates.push(
        Receipt.updateMany(
          { partName: originalPart.partName, scopeOfWork: originalPart.scopeOfWork },
          { $set: { partName: updatedFields.partName } }
        )
      );
      
      // Update Dispatch collection directly (not Inventory.dispatches which are ObjectId references)
      cascadeUpdates.push(
        Dispatch.updateMany(
          { partName: originalPart.partName, workCategory: originalPart.scopeOfWork },
          { $set: { partName: updatedFields.partName } }
        )
      );
      
      // Update Inventory collection (partName field at root level)
      cascadeUpdates.push(
        Inventory.updateMany(
          { partName: originalPart.partName, workCategory: originalPart.scopeOfWork },
          { $set: { partName: updatedFields.partName } }
        )
      );
      
      // Update BOQ items
      cascadeUpdates.push(
        BOQ.updateMany(
          { 'items.partName': originalPart.partName },
          { $set: { 'items.$[elem].partName': updatedFields.partName } },
          { arrayFilters: [{ 'elem.partName': originalPart.partName }] }
        )
      );
      
      // Update ProjectBudget expenditures
      cascadeUpdates.push(
        ProjectBudget.updateMany(
          { 'projectExpenditures.partName': originalPart.partName },
          { $set: { 'projectExpenditures.$[elem].partName': updatedFields.partName } },
          { arrayFilters: [{ 'elem.partName': originalPart.partName }] }
        )
      );
    }

    // If unitType changed, update unitType references
    if (updatedFields.unitType && updatedFields.unitType !== originalPart.unitType) {
      cascadeUpdates.push(
        // Update BOQ items unitType
        BOQ.updateMany(
          { 'items.partName': originalPart.partName },
          { $set: { 'items.$[elem].unitType': updatedFields.unitType } },
          { arrayFilters: [{ 'elem.partName': originalPart.partName }] }
        )
      );
    }

    // If category changed, update category references
    if (updatedFields.category && updatedFields.category !== originalPart.category) {
      // Note: Currently no child modules reference category directly
      // This is here for future expansion if needed
    }

    // Execute all cascade updates
    if (cascadeUpdates.length > 0) {
      await Promise.all(cascadeUpdates);
    }
    
    // Return the updated document
    const updatedPart = await Part.findById(req.params.id);
    res.json(updatedPart);
  } catch (error) {
    console.error('Part update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete part
router.delete('/:id', auth, async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }

    // Check for child records in Receipt and Dispatch collections
    const Receipt = require('../models/Receipt');
    const Dispatch = require('../models/Dispatch');
    
    const receiptRecords = await Receipt.countDocuments({ partName: part.partName, scopeOfWork: part.scopeOfWork });
    const dispatchRecords = await Dispatch.countDocuments({ partName: part.partName, workCategory: part.scopeOfWork });
    
    // Check for child records in BOQ
    const boqItems = await BOQ.countDocuments({ 'items.partName': part.partName });
    
    // Check for child records in ProjectBudget
    const projectExpenditures = await ProjectBudget.countDocuments({ 'projectExpenditures.partName': part.partName });

    // Build detailed error message if child records exist
    const childRecords = [];
    if (receiptRecords > 0) childRecords.push(`${receiptRecords} receipt(s)`);
    if (dispatchRecords > 0) childRecords.push(`${dispatchRecords} dispatch(es)`);
    if (boqItems > 0) childRecords.push(`${boqItems} BOQ item(s)`);
    if (projectExpenditures > 0) childRecords.push(`${projectExpenditures} project expenditure(s)`);

    if (childRecords.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete part "${part.partName}" because it has associated child records`, 
        childRecords: childRecords,
        details: `Please delete or reassign the following child records first: ${childRecords.join(', ')}`
      });
    }

    // If no child records exist, proceed with deletion
    await Part.findByIdAndDelete(req.params.id);
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Part deletion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

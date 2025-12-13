const express = require('express');
const Inventory = require('../models/Inventory');
const Receipt = require('../models/Receipt');
const Dispatch = require('../models/Dispatch');
const auth = require('../middleware/auth');
const dailyEmailScheduler = require('../services/dailyEmailScheduler');
const dailyReportAggregator = require('../services/dailyReportAggregator');
const pdfReportGenerator = require('../services/pdfReportGenerator');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { scopeOfWork, partName } = req.query;
    let filter = {};

    if (scopeOfWork) filter.scopeOfWork = scopeOfWork;
    if (partName) filter.partName = new RegExp(partName, 'i');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const inventoryItems = await Inventory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Inventory.countDocuments(filter);

    // Return just the array of items as the frontend expects
    res.json(inventoryItems);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Receipts Routes ---

// Get all receipts
router.get('/receipts/all', auth, async (req, res) => {
  try {
    const allReceipts = await Receipt.find().sort({ date: -1 });
    res.json(allReceipts);
  } catch (error) {
    console.error('Error fetching all receipts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create receipt
router.post('/receipts', auth, async (req, res) => {
  try {
    console.log('Creating receipt with data:', req.body);
    
    const { partName, workCategory } = req.body;
    if (!partName || !workCategory) {
      return res.status(400).json({ message: 'Part Name and Work Category are required' });
    }

    // Create the receipt in the Receipt collection
    console.log('Step 1: Creating receipt document');
    const receipt = new Receipt(req.body);
    await receipt.save();
    console.log('Receipt saved with ID:', receipt._id);

    // Find or create inventory item
    console.log('Step 2: Finding inventory item');
    let inventory = await Inventory.findOne({ 
      partName: { $regex: new RegExp(`^${partName}$`, 'i') },
      workCategory: workCategory 
    });

    if (!inventory) {
      // Create new inventory item if not exists
      console.log('Step 3: Creating new inventory item');
      inventory = new Inventory({
        partName,
        workCategory,
        customerVendorName: req.body.vendorName || 'New Vendor',
        receipts: [receipt._id],
        dispatches: []
      });
    } else {
      // Add receipt reference to existing inventory
      console.log('Step 3: Adding receipt to existing inventory');
      inventory.receipts.push(receipt._id);
    }

    await inventory.save();
    console.log('Inventory saved with ID:', inventory._id);
    
    // Recalculate inventory summary
    console.log('Step 4: Recalculating inventory summary');
    await Inventory.calculateSummary(inventory._id);
    console.log('Summary calculated successfully');
    
    res.status(201).json(receipt);
  } catch (error) {
    console.error('Error creating receipt:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: error.stack 
    });
  }
});

// Update receipt
router.put('/receipts/:id', auth, async (req, res) => {
  try {
    // Update the receipt in the Receipt collection
    const receipt = await Receipt.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Find inventory that contains this receipt and recalculate summary
    const inventory = await Inventory.findOne({ receipts: req.params.id });
    if (inventory) {
      await Inventory.calculateSummary(inventory._id);
    }

    res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete receipt
router.delete('/receipts/:id', auth, async (req, res) => {
  try {
    // Find inventory that contains this receipt
    const inventory = await Inventory.findOne({ receipts: req.params.id });
    
    // Delete the receipt from the Receipt collection
    const receipt = await Receipt.findByIdAndDelete(req.params.id);

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    // Remove receipt reference from inventory
    if (inventory) {
      inventory.receipts = inventory.receipts.filter(r => r.toString() !== req.params.id);
      await inventory.save();
      
      // Recalculate inventory summary
      await Inventory.calculateSummary(inventory._id);
    }

    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Dispatches Routes ---

// Get all dispatches
router.get('/dispatches/all', auth, async (req, res) => {
  try {
    const allDispatches = await Dispatch.find().sort({ date: -1 });
    res.json(allDispatches);
  } catch (error) {
    console.error('Error fetching all dispatches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create dispatch
router.post('/dispatches', auth, async (req, res) => {
  try {
    console.log('Creating dispatch with data:', req.body);
    
    const { partName, workCategory } = req.body;
    
    // Create the dispatch in the Dispatch collection
    console.log('Step 1: Creating dispatch document');
    const dispatch = new Dispatch(req.body);
    await dispatch.save();
    console.log('Dispatch saved with ID:', dispatch._id);

    // Find inventory item
    console.log('Step 2: Finding inventory item');
    const inventory = await Inventory.findOne({ 
      partName: { $regex: new RegExp(`^${partName}$`, 'i') },
      workCategory: workCategory 
    });

    if (!inventory) {
      // Delete the dispatch if inventory doesn't exist
      console.log('Step 3: Inventory not found, deleting dispatch');
      await Dispatch.findByIdAndDelete(dispatch._id);
      return res.status(404).json({ message: 'Inventory item not found for this part and category. Cannot dispatch.' });
    }

    // Add dispatch reference to inventory
    console.log('Step 3: Adding dispatch to existing inventory');
    inventory.dispatches.push(dispatch._id);
    await inventory.save();
    console.log('Inventory saved with ID:', inventory._id);
    
    // Recalculate inventory summary
    console.log('Step 4: Recalculating inventory summary');
    await Inventory.calculateSummary(inventory._id);
    console.log('Summary calculated successfully');
    
    res.status(201).json(dispatch);
  } catch (error) {
    console.error('Error creating dispatch:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: error.stack 
    });
  }
});

// Update dispatch
router.put('/dispatches/:id', auth, async (req, res) => {
  try {
    // Update the dispatch in the Dispatch collection
    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    // Find inventory that contains this dispatch and recalculate summary
    const inventory = await Inventory.findOne({ dispatches: req.params.id });
    if (inventory) {
      await Inventory.calculateSummary(inventory._id);
    }

    res.json(dispatch);
  } catch (error) {
    console.error('Error updating dispatch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete dispatch
router.delete('/dispatches/:id', auth, async (req, res) => {
  try {
    // Find inventory that contains this dispatch
    const inventory = await Inventory.findOne({ dispatches: req.params.id });
    
    // Delete the dispatch from the Dispatch collection
    const dispatch = await Dispatch.findByIdAndDelete(req.params.id);

    if (!dispatch) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    // Remove dispatch reference from inventory
    if (inventory) {
      inventory.dispatches = inventory.dispatches.filter(d => d.toString() !== req.params.id);
      await inventory.save();
      
      // Recalculate inventory summary
      await Inventory.calculateSummary(inventory._id);
    }

    res.json({ message: 'Dispatch deleted successfully' });
  } catch (error) {
    console.error('Error deleting dispatch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const inventoryItem = await Inventory.findById(req.params.id)
      .populate('receipts')
      .populate('dispatches');
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(inventoryItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new inventory item
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating inventory item with data:', JSON.stringify(req.body, null, 2));
    
    const requiredFields = ['customerVendorName', 'workCategory', 'partName'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: missingFields.map(field => `${field} is required`)
      });
    }

    // Ensure receipts and dispatches are arrays
    const receiptsData = Array.isArray(req.body.receipts) ? req.body.receipts : [];
    const dispatchesData = Array.isArray(req.body.dispatches) ? req.body.dispatches : [];

    // Ensure remarks is a string
    req.body.remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim() : '';

    // Create receipts in Receipt collection
    const receiptIds = [];
    if (receiptsData.length > 0) {
      for (const receiptData of receiptsData) {
        // Validate and process receipt data
        if (receiptData.partName && receiptData.partName.trim() !== '' && receiptData.quantity > 0) {
          const receipt = new Receipt(receiptData);
          await receipt.save();
          receiptIds.push(receipt._id);
        }
      }
    }

    // Create dispatches in Dispatch collection
    const dispatchIds = [];
    if (dispatchesData.length > 0) {
      for (const dispatchData of dispatchesData) {
        // Validate and process dispatch data
        if (dispatchData.partName && dispatchData.partName.trim() !== '' && dispatchData.quantity > 0) {
          const dispatch = new Dispatch(dispatchData);
          await dispatch.save();
          dispatchIds.push(dispatch._id);
        }
      }
    }

    // Create inventory with references
    const inventoryData = {
      customerVendorName: req.body.customerVendorName,
      workCategory: req.body.workCategory,
      partName: req.body.partName,
      reOrderLevel: req.body.reOrderLevel || 0,
      receipts: receiptIds,
      dispatches: dispatchIds,
      rowData: req.body.rowData || [],
      remarks: req.body.remarks
    };

    const inventoryItem = new Inventory(inventoryData);
    
    // Validate before saving
    const validationError = inventoryItem.validateSync();
    if (validationError) {
      console.error('Validation error before save:', validationError);
      const messages = Object.values(validationError.errors).map(val => val.message);
      return res.status(400).json({ 
        message: 'Validation error: ' + messages.join(', '), 
        details: messages,
        errors: validationError.errors
      });
    }
    
    const savedItem = await inventoryItem.save();
    if (!savedItem) {
      return res.status(400).json({ message: 'Failed to save inventory item' });
    }
    
    // Calculate summary values
    await Inventory.calculateSummary(savedItem._id);
    
    // Fetch the updated inventory with populated receipts and dispatches
    const populatedItem = await Inventory.findById(savedItem._id)
      .populate('receipts')
      .populate('dispatches');
    
    console.log('Inventory item saved successfully:', savedItem._id);
    res.status(201).json(populatedItem);
  } catch (error) {
    console.error('Error saving inventory item:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      const errorDetails = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
      return res.status(400).json({ 
        message: 'Validation error: ' + messages.join(', '), 
        details: messages,
        errors: errorDetails
      });
    }
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update inventory item
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating inventory item with ID:', req.params.id);
    console.log('Update data:', JSON.stringify(req.body, null, 2));
    
    const requiredFields = ['customerVendorName', 'workCategory', 'partName'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: missingFields.map(field => `${field} is required`)
      });
    }

    // Only update basic inventory fields
    // Receipts and dispatches should be managed through their dedicated endpoints
    const updateData = {
      customerVendorName: req.body.customerVendorName,
      workCategory: req.body.workCategory,
      partName: req.body.partName,
      reOrderLevel: req.body.reOrderLevel,
      rowData: req.body.rowData,
      remarks: req.body.remarks
    };

    const inventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('receipts').populate('dispatches');
    
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    // Recalculate summary after update
    await Inventory.calculateSummary(inventoryItem._id);
    
    // Fetch updated inventory with populated data
    const updatedItem = await Inventory.findById(inventoryItem._id)
      .populate('receipts')
      .populate('dispatches');
    
    console.log('Inventory item updated successfully:', inventoryItem._id);
    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    console.error('Request body:', req.body);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', '), details: messages });
    } else if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid inventory ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
});

// Delete inventory item
router.delete('/:id', auth, async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByIdAndDelete(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manual trigger for daily inventory report
router.post('/reports/daily', async (req, res) => {
  try {
    const { date, emails } = req.body;
    
    console.log(`Manual daily report requested for date: ${date || 'yesterday'}`);
    
    const result = await dailyEmailScheduler.sendDailyInventoryReport(date, emails);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Daily inventory report sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send daily inventory report',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in manual daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating daily report',
      error: error.message
    });
  }
});

// Manual trigger for weekly inventory report
router.post('/reports/weekly', async (req, res) => {
  try {
    const { endDate, emails } = req.body;
    
    console.log(`Manual weekly report requested for end date: ${endDate || 'today'}`);
    
    const result = await dailyEmailScheduler.sendWeeklyInventoryReport(endDate, emails);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Weekly inventory report sent successfully',
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send weekly inventory report',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in manual weekly report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating weekly report',
      error: error.message
    });
  }
});

// Generate daily report data (without sending email)
router.get('/reports/daily/:date?', async (req, res) => {
  try {
    const { date } = req.params;
    
    console.log(`Generating daily report data for date: ${date || 'yesterday'}`);
    
    const reportData = await dailyReportAggregator.generateDailyReport(date);
    
    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Error generating daily report data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating daily report data',
      error: error.message
    });
  }
});

// Generate PDF report (without sending email)
router.post('/reports/pdf', async (req, res) => {
  try {
    const { date } = req.body;
    
    console.log(`Generating PDF report for date: ${date || 'yesterday'}`);
    
    // Generate report data
    const reportData = await dailyReportAggregator.generateDailyReport(date);
    
    // Generate PDF
    const pdfBuffer = await pdfReportGenerator.generateDailyInventoryReport(reportData);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-daily-report-${reportData.date.replace(/\//g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);
    
    // Send PDF buffer
    res.send(Buffer.from(pdfBuffer));
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating PDF report',
      error: error.message
    });
  }
});

// Test email configuration
router.post('/reports/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }
    
    console.log(`Testing email configuration for: ${email}`);
    
    const emailService = require('../services/emailService');
    const result = await emailService.sendTestEmail(email);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
      error: error.message
    });
  }
});

// Get scheduled jobs status
router.get('/reports/scheduler-status', async (req, res) => {
  try {
    const jobs = dailyEmailScheduler.getScheduledJobs();
    
    res.json({
      success: true,
      data: {
        isInitialized: dailyEmailScheduler.isInitialized,
        jobs: jobs
      }
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting scheduler status',
      error: error.message
    });
  }
});

module.exports = router;

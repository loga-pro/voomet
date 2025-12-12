const express = require('express');
const Inventory = require('../models/Inventory');
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
    const items = await Inventory.find().select('receipts workCategory partName');
    const allReceipts = items.flatMap(item => 
      (item.receipts || []).map(r => ({
        ...r.toObject(),
        parentId: item._id,
        workCategory: r.workCategory || item.workCategory,
        partName: r.partName || item.partName
      }))
    );
    allReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(allReceipts);
  } catch (error) {
    console.error('Error fetching all receipts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create receipt
router.post('/receipts', auth, async (req, res) => {
  try {
    const { partName, workCategory } = req.body;
    if (!partName || !workCategory) {
      return res.status(400).json({ message: 'Part Name and Work Category are required' });
    }

    let inventory = await Inventory.findOne({ 
      partName: { $regex: new RegExp(`^${partName}$`, 'i') },
      workCategory: workCategory 
    });

    if (!inventory) {
      // Create new inventory item if not exists
      inventory = new Inventory({
        partName,
        workCategory,
        customerVendorName: req.body.vendorName || 'New Vendor',
        receipts: [req.body],
        dispatches: []
      });
    } else {
      inventory.receipts.push(req.body);
    }

    await inventory.save();
    res.status(201).json(inventory);
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update receipt
router.put('/receipts/:id', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ "receipts._id": req.params.id });
    if (!inventory) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const receipt = inventory.receipts.id(req.params.id);
    if (!receipt) {
        return res.status(404).json({ message: 'Receipt not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'parentId') {
        receipt[key] = req.body[key];
      }
    });

    // Recalculate total value
    const invoiceVal = parseFloat(receipt.invoiceValueWithoutGST) || 0;
    const gstVal = parseFloat(receipt.gstValue) || 0;
    const qty = parseFloat(receipt.quantity) || 0;
    receipt.totalValue = (invoiceVal + gstVal) * qty;

    await inventory.save();
    res.json(receipt);
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete receipt
router.delete('/receipts/:id', auth, async (req, res) => {
  try {
    const result = await Inventory.findOneAndUpdate(
      { "receipts._id": req.params.id },
      { $pull: { receipts: { _id: req.params.id } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Receipt not found' });
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
    const items = await Inventory.find().select('dispatches workCategory partName');
    const allDispatches = items.flatMap(item => 
      (item.dispatches || []).map(d => ({
        ...d.toObject(),
        parentId: item._id,
        workCategory: d.workCategory || item.workCategory,
        partName: d.partName || item.partName
      }))
    );
    allDispatches.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(allDispatches);
  } catch (error) {
    console.error('Error fetching all dispatches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create dispatch
router.post('/dispatches', auth, async (req, res) => {
  try {
    const { partName, workCategory } = req.body;
    
    const inventory = await Inventory.findOne({ 
      partName: { $regex: new RegExp(`^${partName}$`, 'i') },
      workCategory: workCategory 
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found for this part and category. Cannot dispatch.' });
    }

    inventory.dispatches.push(req.body);
    await inventory.save();
    res.status(201).json(inventory);
  } catch (error) {
    console.error('Error creating dispatch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update dispatch
router.put('/dispatches/:id', auth, async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ "dispatches._id": req.params.id });
    if (!inventory) {
      return res.status(404).json({ message: 'Dispatch not found' });
    }

    const dispatch = inventory.dispatches.id(req.params.id);
    if (!dispatch) {
        return res.status(404).json({ message: 'Dispatch not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== 'parentId') {
        dispatch[key] = req.body[key];
      }
    });

    // Recalculate total value
    const invoiceVal = parseFloat(dispatch.invoiceValueWithoutGST) || 0;
    const gstVal = parseFloat(dispatch.gstValue) || 0;
    const qty = parseFloat(dispatch.quantity) || 0;
    dispatch.totalValue = (invoiceVal + gstVal) * qty;

    await inventory.save();
    res.json(dispatch);
  } catch (error) {
    console.error('Error updating dispatch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete dispatch
router.delete('/dispatches/:id', auth, async (req, res) => {
  try {
    const result = await Inventory.findOneAndUpdate(
      { "dispatches._id": req.params.id },
      { $pull: { dispatches: { _id: req.params.id } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Dispatch not found' });
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
    const inventoryItem = await Inventory.findById(req.params.id);
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

    // Ensure receipts is an array
    if (!Array.isArray(req.body.receipts)) {
      req.body.receipts = [];
    }

    // Ensure dispatches is an array
    if (!Array.isArray(req.body.dispatches)) {
      req.body.dispatches = [];
    }

    // Ensure remarks is a string
    req.body.remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim() : '';

    // Process receipts - preserve invoiceValueWithoutGST and gstValue
    if (req.body.receipts && req.body.receipts.length > 0) {
      req.body.receipts = req.body.receipts.map(receipt => {
        const quantity = parseFloat(receipt.quantity);
        const invoiceValueWithoutGST = parseFloat(receipt.invoiceValueWithoutGST);
        const gstValue = parseFloat(receipt.gstValue);
        const date = receipt.date ? new Date(receipt.date) : new Date();
        const invoiceDate = receipt.invoiceDate ? new Date(receipt.invoiceDate) : null;
        
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        const validInvoiceDate = invoiceDate && !isNaN(invoiceDate.getTime()) ? invoiceDate : null;
        const validInvoiceValue = isNaN(invoiceValueWithoutGST) || invoiceValueWithoutGST < 0 ? 0 : invoiceValueWithoutGST;
        const validGstValue = isNaN(gstValue) || gstValue < 0 ? 0 : gstValue;
        const validQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
        const validUnit = receipt.unit && ['nos', 'meter', 'sq-feet', 'pcs', 'kg', 'liters'].includes(receipt.unit) 
          ? receipt.unit 
          : 'nos';
        
        // Calculate total value: (invoiceValue + GST) * quantity
        const totalValue = (validInvoiceValue + validGstValue) * validQuantity;
        
        return {
          date: validDate,
          workCategory: receipt.workCategory || '',
          partName: (receipt.partName || '').trim(),
          receiptCategory: receipt.receiptCategory || 'buy',
          vendorName: receipt.vendorName || receipt.customerVendorName || '',
          invoiceNo: receipt.invoiceNo || '',
          invoiceDate: validInvoiceDate,
          invoiceValueWithoutGST: validInvoiceValue,
          gstValue: validGstValue,
          quantity: validQuantity,
          unit: validUnit,
          upload: receipt.upload || '',
          reasonForReturn: receipt.reasonForReturn || '',
          totalValue: totalValue
        };
      }).filter(receipt => 
        receipt.partName && 
        receipt.partName.trim() !== '' && 
        receipt.quantity > 0
      );
    }

    // Process dispatches - preserve invoiceValueWithoutGST and gstValue
    if (req.body.dispatches && req.body.dispatches.length > 0) {
      req.body.dispatches = req.body.dispatches.map(dispatch => {
        const quantity = parseFloat(dispatch.quantity);
        const invoiceValueWithoutGST = parseFloat(dispatch.invoiceValueWithoutGST);
        const gstValue = parseFloat(dispatch.gstValue);
        const date = dispatch.date ? new Date(dispatch.date) : new Date();
        const invoiceDate = dispatch.invoiceDate ? new Date(dispatch.invoiceDate) : null;
        
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        const validInvoiceDate = invoiceDate && !isNaN(invoiceDate.getTime()) ? invoiceDate : null;
        const validInvoiceValue = isNaN(invoiceValueWithoutGST) || invoiceValueWithoutGST < 0 ? 0 : invoiceValueWithoutGST;
        const validGstValue = isNaN(gstValue) || gstValue < 0 ? 0 : gstValue;
        const validQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
        const validUnit = dispatch.unit && ['nos', 'meter', 'sq-feet', 'pcs', 'kg', 'liters'].includes(dispatch.unit) 
          ? dispatch.unit 
          : 'nos';
        
        // Calculate total value: (invoiceValue + GST) * quantity
        const totalValue = (validInvoiceValue + validGstValue) * validQuantity;
        
        return {
          date: validDate,
          workCategory: dispatch.workCategory || '',
          partName: (dispatch.partName || '').trim(),
          dispatchCategory: dispatch.dispatchCategory || 'dispatch',
          customerName: dispatch.customerName || dispatch.customerVendorName || '',
          invoiceNo: dispatch.invoiceNo || '',
          invoiceDate: validInvoiceDate,
          invoiceValueWithoutGST: validInvoiceValue,
          gstValue: validGstValue,
          quantity: validQuantity,
          unit: validUnit,
          upload: dispatch.upload || '',
          reasonForRejection: dispatch.reasonForRejection || '',
          totalValue: totalValue
        };
      }).filter(dispatch => 
        dispatch.partName && 
        dispatch.partName.trim() !== '' && 
        dispatch.quantity > 0
      );
    }

    // Log the processed data before saving
    console.log('Processed data before save:', JSON.stringify(req.body, null, 2));
    
    const inventoryItem = new Inventory(req.body);
    
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
    console.log('Inventory item saved successfully:', savedItem._id);
    res.status(201).json(savedItem);
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

    // Ensure arrays exist
    req.body.receipts = Array.isArray(req.body.receipts) ? req.body.receipts : [];
    req.body.dispatches = Array.isArray(req.body.dispatches) ? req.body.dispatches : [];

    // Process receipts - preserve invoiceValueWithoutGST and gstValue
    if (req.body.receipts && req.body.receipts.length > 0) {
      req.body.receipts = req.body.receipts.map(receipt => {
        const quantity = parseFloat(receipt.quantity);
        const invoiceValueWithoutGST = parseFloat(receipt.invoiceValueWithoutGST);
        const gstValue = parseFloat(receipt.gstValue);
        const date = receipt.date ? new Date(receipt.date) : new Date();
        const invoiceDate = receipt.invoiceDate ? new Date(receipt.invoiceDate) : null;
        
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        const validInvoiceDate = invoiceDate && !isNaN(invoiceDate.getTime()) ? invoiceDate : null;
        const validInvoiceValue = isNaN(invoiceValueWithoutGST) || invoiceValueWithoutGST < 0 ? 0 : invoiceValueWithoutGST;
        const validGstValue = isNaN(gstValue) || gstValue < 0 ? 0 : gstValue;
        const validQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
        const validUnit = receipt.unit && ['nos', 'meter', 'sq-feet', 'pcs', 'kg', 'liters'].includes(receipt.unit) 
          ? receipt.unit 
          : 'nos';
        
        // Calculate total value: (invoiceValue + GST) * quantity
        const totalValue = (validInvoiceValue + validGstValue) * validQuantity;
        
        return {
          date: validDate,
          workCategory: receipt.workCategory || '',
          partName: (receipt.partName || '').trim(),
          receiptCategory: receipt.receiptCategory || 'buy',
          vendorName: receipt.vendorName || receipt.customerVendorName || '',
          invoiceNo: receipt.invoiceNo || '',
          invoiceDate: validInvoiceDate,
          invoiceValueWithoutGST: validInvoiceValue,
          gstValue: validGstValue,
          quantity: validQuantity,
          unit: validUnit,
          upload: receipt.upload || '',
          reasonForReturn: receipt.reasonForReturn || '',
          totalValue: totalValue
        };
      }).filter(receipt => 
        receipt.partName && 
        receipt.partName.trim() !== '' && 
        receipt.quantity > 0
      );
    }

    // Process dispatches - preserve invoiceValueWithoutGST and gstValue
    if (req.body.dispatches && req.body.dispatches.length > 0) {
      req.body.dispatches = req.body.dispatches.map(dispatch => {
        const quantity = parseFloat(dispatch.quantity);
        const invoiceValueWithoutGST = parseFloat(dispatch.invoiceValueWithoutGST);
        const gstValue = parseFloat(dispatch.gstValue);
        const date = dispatch.date ? new Date(dispatch.date) : new Date();
        const invoiceDate = dispatch.invoiceDate ? new Date(dispatch.invoiceDate) : null;
        
        const validDate = isNaN(date.getTime()) ? new Date() : date;
        const validInvoiceDate = invoiceDate && !isNaN(invoiceDate.getTime()) ? invoiceDate : null;
        const validInvoiceValue = isNaN(invoiceValueWithoutGST) || invoiceValueWithoutGST < 0 ? 0 : invoiceValueWithoutGST;
        const validGstValue = isNaN(gstValue) || gstValue < 0 ? 0 : gstValue;
        const validQuantity = isNaN(quantity) || quantity < 0 ? 0 : quantity;
        const validUnit = dispatch.unit && ['nos', 'meter', 'sq-feet', 'pcs', 'kg', 'liters'].includes(dispatch.unit) 
          ? dispatch.unit 
          : 'nos';
        
        // Calculate total value: (invoiceValue + GST) * quantity
        const totalValue = (validInvoiceValue + validGstValue) * validQuantity;
        
        return {
          date: validDate,
          workCategory: dispatch.workCategory || '',
          partName: (dispatch.partName || '').trim(),
          dispatchCategory: dispatch.dispatchCategory || 'dispatch',
          customerName: dispatch.customerName || dispatch.customerVendorName || '',
          invoiceNo: dispatch.invoiceNo || '',
          invoiceDate: validInvoiceDate,
          invoiceValueWithoutGST: validInvoiceValue,
          gstValue: validGstValue,
          quantity: validQuantity,
          unit: validUnit,
          upload: dispatch.upload || '',
          reasonForRejection: dispatch.reasonForRejection || '',
          totalValue: totalValue
        };
      }).filter(dispatch => 
        dispatch.partName && 
        dispatch.partName.trim() !== '' && 
        dispatch.quantity > 0
      );
    }

    const inventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    console.log('Inventory item updated successfully:', inventoryItem._id);
    res.json(inventoryItem);
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

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
    const inventoryItem = new Inventory(req.body);
    const savedItem = await inventoryItem.save();
    if (!savedItem) {
      return res.status(400).json({ message: 'Failed to save inventory item' });
    }
    res.status(201).json(savedItem);
  } catch (error) {
    console.error('Error saving inventory item:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inventory item
router.put('/:id', auth, async (req, res) => {
  try {
    const inventoryItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    res.json(inventoryItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    } else if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid inventory ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
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
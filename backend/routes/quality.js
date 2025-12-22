const express = require('express');
const Quality = require('../models/Quality');
const auth = require('../middleware/auth');
const uploadQualityImage = require('../middleware/uploadQualityImage');

const router = express.Router();

// Get all quality issues with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customer, scopeOfWork, category, status, responsibility } = req.query;
    let filter = {};

    if (customer) filter.customer = new RegExp(customer, 'i');
    if (scopeOfWork) filter.scopeOfWork = scopeOfWork;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (responsibility) filter.responsibility = new RegExp(responsibility, 'i');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const qualityIssues = await Quality.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quality.countDocuments(filter);

    res.json({
      qualityIssues,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quality issue by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const qualityIssue = await Quality.findById(req.params.id);
    if (!qualityIssue) {
      return res.status(404).json({ message: 'Quality issue not found' });
    }
    res.json(qualityIssue);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new quality issue
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating quality issue with data:', req.body);
    const qualityIssue = new Quality(req.body);
    await qualityIssue.save();
    console.log('Quality issue created successfully:', qualityIssue._id);
    res.status(201).json(qualityIssue);
  } catch (error) {
    console.error('Error creating quality issue:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: error.errors || error
    });
  }
});

// Update quality issue
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('Updating quality issue:', req.params.id, 'with data:', req.body);
    const qualityIssue = await Quality.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!qualityIssue) {
      return res.status(404).json({ message: 'Quality issue not found' });
    }
    console.log('Quality issue updated successfully:', qualityIssue._id);
    res.json(qualityIssue);
  } catch (error) {
    console.error('Error updating quality issue:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      details: error.errors || error
    });
  }
});

// Delete quality issue
router.delete('/:id', auth, async (req, res) => {
  try {
    const qualityIssue = await Quality.findByIdAndDelete(req.params.id);
    if (!qualityIssue) {
      return res.status(404).json({ message: 'Quality issue not found' });
    }
    res.json({ message: 'Quality issue deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vendor name in quality issues (bulk update)
router.patch('/update-vendor-name', auth, async (req, res) => {
  try {
    const { oldVendorName, newVendorName } = req.body;
    if (!oldVendorName || !newVendorName) {
      return res.status(400).json({ message: 'Both oldVendorName and newVendorName are required' });
    }
    const updateResult = await Quality.updateMany(
      { responsibility: oldVendorName },
      { $set: { responsibility: newVendorName } }
    );
    res.json({ message: `Successfully updated ${updateResult.modifiedCount} quality issue(s)`, updatedCount: updateResult.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating vendor name in quality issues' });
  }
});

// Upload quality issue image (damage or fixed image)
router.post('/upload-image', auth, uploadQualityImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    // Return the file path that can be used to access the image
    const imageUrl = `/uploads/quality/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading quality image:', error);
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
});

module.exports = router;
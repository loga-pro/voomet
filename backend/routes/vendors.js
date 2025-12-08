const express = require('express');
const Vendor = require('../models/Vendor');
const VendorPayment = require('../models/VendorPayment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all vendors with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { vendorName, email, mobileNumber, gstNumber, excludeId, exactMatch } = req.query;
    let filter = {};

    console.log('Vendor filter request:', { vendorName, email, mobileNumber, gstNumber, excludeId, exactMatch });

    if (vendorName) {
      if (exactMatch === 'true') {
        // Case-insensitive exact match using regex with anchors
        filter.vendorName = new RegExp(`^${vendorName}$`, 'i');
        console.log('Using exact match for vendorName:', vendorName);
      } else {
        filter.vendorName = new RegExp(vendorName, 'i'); // Partial match for search
        console.log('Using regex match for vendorName:', vendorName);
      }
    }

    if (email) {
      if (exactMatch === 'true') {
        // Case-insensitive exact match
        filter.email = new RegExp(`^${email.toLowerCase()}$`, 'i');
        console.log('Using exact match for email:', email.toLowerCase());
      } else {
        filter.email = new RegExp(email, 'i'); // Partial match for search
        console.log('Using regex match for email:', email);
      }
    }

    if (mobileNumber) {
      // Always exact match for mobile number (no regex needed for numbers)
      filter.mobileNumber = mobileNumber;
      console.log('Using exact match for mobileNumber:', mobileNumber);
    }

    if (gstNumber) {
      // Normalize GST: remove spaces, convert to uppercase
      const normalizedGST = gstNumber.toUpperCase().replace(/\s+/g, '');
      // Exact match using regex with anchors to ensure complete match
      filter.gstNumber = new RegExp(`^${normalizedGST}$`, 'i');
      console.log('Using exact match for gstNumber:', normalizedGST);
    }

    // Exclude a specific vendor ID (useful for duplicate checks when editing)
    if (excludeId) {
      filter._id = { $ne: excludeId };
      console.log('Excluding vendor ID:', excludeId);
    }

    console.log('Final filter:', JSON.stringify(filter, null, 2));
    const vendors = await Vendor.find(filter);
    console.log('Found vendors:', vendors.length);

    // Log the first result for debugging if any found
    if (vendors.length > 0) {
      console.log('First matching vendor:', {
        id: vendors[0]._id,
        vendorName: vendors[0].vendorName,
        email: vendors[0].email,
        mobileNumber: vendors[0].mobileNumber,
        gstNumber: vendors[0].gstNumber
      });
    }

    res.json(vendors);
  } catch (error) {
    console.error('Error in vendor filter:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get vendor by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new vendor
router.post('/', auth, async (req, res) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      let message = '';

      switch (field) {
        case 'email':
          message = 'A vendor with this email already exists';
          break;
        case 'mobileNumber':
          message = 'A vendor with this mobile number already exists';
          break;
        case 'gstNumber':
          message = 'A vendor with this GST number already exists';
          break;
        default:
          message = 'Duplicate value provided';
      }

      return res.status(400).json({ message, field });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    console.error('Error creating vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update vendor
router.put('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      let message = '';

      switch (field) {
        case 'email':
          message = 'A vendor with this email already exists';
          break;
        case 'mobileNumber':
          message = 'A vendor with this mobile number already exists';
          break;
        case 'gstNumber':
          message = 'A vendor with this GST number already exists';
          break;
        default:
          message = 'Duplicate value provided';
      }

      return res.status(400).json({ message, field });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    console.error('Error updating vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete vendor
router.delete('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
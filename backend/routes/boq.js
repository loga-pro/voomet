const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
// Ensure upload directory exists
const uploadDir = path.join('uploads', 'boq');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'), false);
    }
  }
});

const BOQ = require('../models/BOQ');

// Helper function to transform BOQ data for frontend compatibility
const transformBOQData = (boqItem) => {
  const transformed = boqItem.toObject();
  
  // Map backend fields to frontend expected fields
  transformed.projectName = transformed.customer;
  transformed.itemDescription = transformed.items.length > 0 ? transformed.items[0].partName : '';
  transformed.quantity = transformed.items.length > 0 ? transformed.items[0].numberOfUnits : 0;
  transformed.unit = transformed.items.length > 0 ? transformed.items[0].unitType : '';
  transformed.unitPrice = transformed.items.length > 0 ? transformed.items[0].unitPrice : 0;
  transformed.totalAmount = transformed.totalWithGST;
  
  // Ensure numeric fields are numbers
  transformed.quantity = Number(transformed.quantity) || 0;
  transformed.unitPrice = Number(transformed.unitPrice) || 0;
  transformed.totalAmount = Number(transformed.totalAmount) || 0;
  
  return transformed;
};

// Get all BOQ items
router.get('/', auth, async (req, res) => {
  try {
    const { customer, scopeOfWork, status } = req.query;
    let filter = {};

    if (customer) filter.customer = new RegExp(customer, 'i');
    if (scopeOfWork) filter.scopeOfWork = { $in: [new RegExp(scopeOfWork, 'i')] };
    if (status) filter.status = status;

    const boqItems = await BOQ.find(filter).sort({ createdAt: -1 });
    
    // Transform data for frontend compatibility
    const transformedItems = boqItems.map(transformBOQData);
    
    console.log('Fetched BOQ items:', transformedItems.length);
    res.json({ data: transformedItems });
  } catch (error) {
    console.error('Error fetching BOQ items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get BOQ item by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const boqItem = await BOQ.findById(req.params.id);
    if (!boqItem) {
      return res.status(404).json({ message: 'BOQ item not found' });
    }
    
    const transformedItem = transformBOQData(boqItem);
    res.json(transformedItem);
  } catch (error) {
    console.error('Error fetching BOQ item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new BOQ item
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Creating BOQ item with data:', req.body);
    
    const boqData = { ...req.body };
    
    // Parse scopeOfWork if it's a string
    if (typeof boqData.scopeOfWork === 'string') {
      boqData.scopeOfWork = boqData.scopeOfWork.split(',');
    }
    
    // Parse items if it's a string
    if (typeof boqData.items === 'string') {
      boqData.items = JSON.parse(boqData.items);
    }
    
    // Ensure numeric fields are properly converted
    if (boqData.finalTotalWithoutGST) boqData.finalTotalWithoutGST = parseFloat(boqData.finalTotalWithoutGST);
    if (boqData.transportationCharges) boqData.transportationCharges = parseFloat(boqData.transportationCharges);
    if (boqData.gstPercentage) boqData.gstPercentage = parseFloat(boqData.gstPercentage);
    if (boqData.totalWithGST) boqData.totalWithGST = parseFloat(boqData.totalWithGST);
    
    // Process items
    if (boqData.items && Array.isArray(boqData.items)) {
      boqData.items = boqData.items.map(item => ({
        ...item,
        numberOfUnits: parseFloat(item.numberOfUnits || 0),
        unitPrice: parseFloat(item.unitPrice || 0),
        totalPrice: parseFloat(item.totalPrice || 0)
      }));
    }
    
    if (req.file) {
      boqData.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/boq/${req.file.filename}`,
        size: req.file.size
      };
    }

    const boqItem = new BOQ(boqData);
    const savedItem = await boqItem.save();
    
    console.log('BOQ item created successfully:', savedItem._id);
    
    const transformedItem = transformBOQData(savedItem);
    res.status(201).json(transformedItem);
  } catch (error) {
    console.error('Error creating BOQ item:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

// Update BOQ item
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Updating BOQ item:', req.params.id, 'with data:', req.body);
    
    const updateData = { ...req.body };
    
    // Parse scopeOfWork if it's a string
    if (typeof updateData.scopeOfWork === 'string') {
      updateData.scopeOfWork = updateData.scopeOfWork.split(',');
    }
    
    // Parse items if it's a string
    if (typeof updateData.items === 'string') {
      updateData.items = JSON.parse(updateData.items);
    }
    
    // Ensure numeric fields are properly converted
    if (updateData.finalTotalWithoutGST) updateData.finalTotalWithoutGST = parseFloat(updateData.finalTotalWithoutGST);
    if (updateData.transportationCharges) updateData.transportationCharges = parseFloat(updateData.transportationCharges);
    if (updateData.gstPercentage) updateData.gstPercentage = parseFloat(updateData.gstPercentage);
    if (updateData.totalWithGST) updateData.totalWithGST = parseFloat(updateData.totalWithGST);
    
    // Process items
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map(item => ({
        ...item,
        numberOfUnits: parseFloat(item.numberOfUnits || 0),
        unitPrice: parseFloat(item.unitPrice || 0),
        totalPrice: parseFloat(item.totalPrice || 0)
      }));
    }
    
    if (req.file) {
      updateData.image = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/boq/${req.file.filename}`,
        size: req.file.size
      };
    }

    const boqItem = await BOQ.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!boqItem) {
      return res.status(404).json({ message: 'BOQ item not found' });
    }
    
    console.log('BOQ item updated successfully:', boqItem._id);
    
    const transformedItem = transformBOQData(boqItem);
    res.json(transformedItem);
  } catch (error) {
    console.error('Error updating BOQ item:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : undefined
    });
  }
});

// Delete BOQ item
router.delete('/:id', auth, async (req, res) => {
  try {
    const boqItem = await BOQ.findByIdAndDelete(req.params.id);
    if (!boqItem) {
      return res.status(404).json({ message: 'BOQ item not found' });
    }
    console.log('BOQ item deleted successfully:', req.params.id);
    res.json({ message: 'BOQ item deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOQ item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
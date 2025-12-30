const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const PurchaseRequest = require('../models/PurchaseRequest');

// Configure multer for file uploads
const uploadDir = path.join('uploads', 'purchase-requests');
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

// Validation middleware
const validatePurchaseRequest = [
  body('customerName').notEmpty().trim().withMessage('Customer name is required'),
  body('projectName').notEmpty().trim().withMessage('Project name is required'),
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required'),
  body('endDate').isISO8601().toDate().withMessage('Valid end date is required'),
  body('overallProduction').optional().trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').notEmpty().trim().withMessage('Description is required'),
  body('items.*.area').notEmpty().trim().withMessage('Area is required'),
  body('items.*.code').notEmpty().trim().withMessage('Code is required'),
  body('items.*.specification').optional().trim(),
  body('items.*.unitType').optional().trim(),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be at least 0.01'),
  body('items.*.thickness').optional().trim(),
  body('items.*.remark').optional().trim(),
  body('status').optional().isIn(['pending', 'approved', 'rejected', 'completed']).withMessage('Invalid status'),
  body('remarks').optional().trim()
];

// @route   GET /api/purchase-requests
// @desc    Get all purchase requests with filters
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      customerName,
      projectName,
      status,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (customerName) filter.customerName = { $regex: customerName, $options: 'i' };
    if (projectName) filter.projectName = { $regex: projectName, $options: 'i' };
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { overallProduction: { $regex: search, $options: 'i' } },
        { 'items.description': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch data with pagination
    const purchaseRequests = await PurchaseRequest.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    // Get total count
    const total = await PurchaseRequest.countDocuments(filter);

    // Get status summary
    const statusSummary = await PurchaseRequest.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: purchaseRequests,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        status: statusSummary.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching purchase requests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   GET /api/purchase-requests/customers
// @desc    Get unique customers from purchase requests
// @access  Private
router.get('/customers', auth, async (req, res) => {
  try {
    const customers = await PurchaseRequest.distinct('customerName');
    res.json({
      success: true,
      data: customers.filter(c => c).sort()
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/purchase-requests/projects
// @desc    Get unique projects from purchase requests
// @access  Private
router.get('/projects', auth, async (req, res) => {
  try {
    const { customerName } = req.query;
    const filter = customerName ? { customerName } : {};
    const projects = await PurchaseRequest.distinct('projectName', filter);
    res.json({
      success: true,
      data: projects.filter(p => p).sort()
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/purchase-requests/:id
// @desc    Get purchase request by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const purchaseRequest = await PurchaseRequest.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!purchaseRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase request not found' 
      });
    }

    res.json({
      success: true,
      data: purchaseRequest
    });
  } catch (error) {
    console.error('Error fetching purchase request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/purchase-requests
// @desc    Create a new purchase request
// @access  Private
router.post('/', auth, upload.any(), async (req, res) => {
  try {
    console.log('Creating purchase request with data:', req.body);
    console.log('Files received:', req.files);

    const purchaseData = { ...req.body };

    // Parse items if it's a string
    if (typeof purchaseData.items === 'string') {
      purchaseData.items = JSON.parse(purchaseData.items);
    }

    // Parse hardwareItems if it's a string
    if (typeof purchaseData.hardwareItems === 'string') {
      purchaseData.hardwareItems = JSON.parse(purchaseData.hardwareItems);
    }

    // Process items - convert numeric fields
    if (purchaseData.items && Array.isArray(purchaseData.items)) {
      purchaseData.items = purchaseData.items.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity || 0)
      }));
    }

    // Process hardwareItems - convert numeric fields
    if (purchaseData.hardwareItems && Array.isArray(purchaseData.hardwareItems)) {
      purchaseData.hardwareItems = purchaseData.hardwareItems.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity || 0)
      }));
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname.startsWith('itemImage_')) {
          const index = Number(file.fieldname.split('_')[1]);
          if (purchaseData.items[index]) {
            purchaseData.items[index].image = {
              filename: file.filename,
              originalName: file.originalname,
              path: `/uploads/purchase-requests/${file.filename}`,
              size: file.size,
              type: file.mimetype
            };
          }
        } else if (file.fieldname.startsWith('hardwareItemImage_')) {
          const index = Number(file.fieldname.split('_')[1]);
          if (purchaseData.hardwareItems && purchaseData.hardwareItems[index]) {
            purchaseData.hardwareItems[index].image = {
              filename: file.filename,
              originalName: file.originalname,
              path: `/uploads/purchase-requests/${file.filename}`,
              size: file.size,
              type: file.mimetype
            };
          }
        }
      });
    }

    // Check for validation errors (manual validation since we're using upload.any())
    if (!purchaseData.customerName || !purchaseData.projectName) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and project name are required'
      });
    }

    // Check if end date is after start date
    if (new Date(purchaseData.endDate) <= new Date(purchaseData.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Create new purchase request
    const purchaseRequest = new PurchaseRequest({
      ...purchaseData,
      createdBy: req.user.id
    });

    await purchaseRequest.save();

    // Populate createdBy field
    await purchaseRequest.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Purchase request created successfully',
      data: purchaseRequest
    });
  } catch (error) {
    console.error('Error creating purchase request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   PUT /api/purchase-requests/:id
// @desc    Update a purchase request
// @access  Private
router.put('/:id', auth, upload.any(), async (req, res) => {
  try {
    console.log('Updating purchase request:', req.params.id, 'with data:', req.body);
    console.log('Files received:', req.files);

    const updateData = { ...req.body };

    // Parse items if it's a string
    if (typeof updateData.items === 'string') {
      updateData.items = JSON.parse(updateData.items);
    }

    // Parse hardwareItems if it's a string
    if (typeof updateData.hardwareItems === 'string') {
      updateData.hardwareItems = JSON.parse(updateData.hardwareItems);
    }

    // Process items - convert numeric fields
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity || 0)
      }));
    }

    // Process hardwareItems - convert numeric fields
    if (updateData.hardwareItems && Array.isArray(updateData.hardwareItems)) {
      updateData.hardwareItems = updateData.hardwareItems.map(item => ({
        ...item,
        quantity: parseFloat(item.quantity || 0)
      }));
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.fieldname.startsWith('itemImage_')) {
          const index = Number(file.fieldname.split('_')[1]);
          if (updateData.items[index]) {
            updateData.items[index].image = {
              filename: file.filename,
              originalName: file.originalname,
              path: `/uploads/purchase-requests/${file.filename}`,
              size: file.size,
              type: file.mimetype
            };
          }
        } else if (file.fieldname.startsWith('hardwareItemImage_')) {
          const index = Number(file.fieldname.split('_')[1]);
          if (updateData.hardwareItems && updateData.hardwareItems[index]) {
            updateData.hardwareItems[index].image = {
              filename: file.filename,
              originalName: file.originalname,
              path: `/uploads/purchase-requests/${file.filename}`,
              size: file.size,
              type: file.mimetype
            };
          }
        }
      });
    }

    // Check if end date is after start date
    if (new Date(updateData.endDate) <= new Date(updateData.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Find and update purchase request
    const purchaseRequest = await PurchaseRequest.findById(req.params.id);

    if (!purchaseRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase request not found' 
      });
    }

    // Check if user can update (creator or admin)
    if (purchaseRequest.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this purchase request'
      });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      purchaseRequest[key] = updateData[key];
    });

    await purchaseRequest.save();

    // Populate fields
    await purchaseRequest.populate('createdBy', 'name email');
    await purchaseRequest.populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: 'Purchase request updated successfully',
      data: purchaseRequest
    });
  } catch (error) {
    console.error('Error updating purchase request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   PATCH /api/purchase-requests/:id/status
// @desc    Update purchase request status
// @access  Private (Admin/Manager)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Validate status
    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find purchase request
    const purchaseRequest = await PurchaseRequest.findById(id);

    if (!purchaseRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase request not found' 
      });
    }

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update status'
      });
    }

    // Update status
    purchaseRequest.status = status;
    
    // If approving, record who approved and when
    if (status === 'approved') {
      purchaseRequest.approvedBy = req.user.id;
      purchaseRequest.approvedAt = new Date();
    }

    await purchaseRequest.save();

    // Populate fields
    await purchaseRequest.populate('createdBy', 'name email');
    await purchaseRequest.populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Purchase request ${status} successfully`,
      data: purchaseRequest
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// @route   DELETE /api/purchase-requests/:id
// @desc    Delete a purchase request
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const purchaseRequest = await PurchaseRequest.findById(req.params.id);

    if (!purchaseRequest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Purchase request not found' 
      });
    }

    // Check if user can delete (creator or admin)
    if (purchaseRequest.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this purchase request'
      });
    }

    // Check if purchase request can be deleted (not completed or approved)
    if (['approved', 'completed'].includes(purchaseRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an approved or completed purchase request'
      });
    }

    await purchaseRequest.deleteOne();

    res.json({
      success: true,
      message: 'Purchase request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/purchase-requests/reports/summary
// @desc    Get purchase request summary report
// @access  Private
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate, customerName } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (customerName) filter.customerName = customerName;

    // Get summary data
    const summary = await PurchaseRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalItems: { $sum: '$totalItems' },
          totalQuantity: { $sum: '$totalQuantity' },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          completedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get monthly trend
    const monthlyTrend = await PurchaseRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$totalQuantity' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {
          totalRequests: 0,
          totalItems: 0,
          totalQuantity: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          completedRequests: 0
        },
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/purchase-requests/export/csv
// @desc    Export purchase requests to CSV
// @access  Private
router.post('/export/csv', auth, async (req, res) => {
  try {
    const { filters = {} } = req.body;

    const purchaseRequests = await PurchaseRequest.find(filters)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    // Format data for CSV
    const csvData = purchaseRequests.map((pr, index) => ({
      'S.No': index + 1,
      'Customer Name': pr.customerName,
      'Project Name': pr.projectName,
      'Start Date': pr.formattedStartDate,
      'End Date': pr.formattedEndDate,
      'Overall Production': pr.overallProduction,
      'Total Items': pr.totalItems,
      'Total Quantity': pr.totalQuantity,
      'Status': pr.status,
      'Created By': pr.createdBy?.name || 'N/A',
      'Created At': pr.createdAt.toLocaleDateString(),
      'Remarks': pr.remarks || ''
    }));

    res.json({
      success: true,
      data: csvData
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
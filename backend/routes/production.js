const express = require('express');
const router = express.Router();
const Production = require('../models/Production');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Validation middleware
const validateProduction = [
  check('customerName', 'Customer name is required').not().isEmpty().trim(),
  check('projectName', 'Project name is required').not().isEmpty().trim(),
  check('startDate', 'Start date is required').not().isEmpty().isISO8601(),
  check('endDate', 'End date is required').not().isEmpty().isISO8601(),
  check('productionDetails', 'Production details are required').isArray({ min: 1 }),
  check('productionDetails.*.date', 'Date is required in production details').not().isEmpty().isISO8601(),
  check('productionDetails.*.partName', 'Part name is required in production details').not().isEmpty().trim(),
  check('productionDetails.*.productionQuantityPlan', 'Production quantity plan is required in production details')
    .not().isEmpty().isFloat({ min: 0 }),
  check('productionDetails.*.actualProduction', 'Actual production is required in production details')
    .not().isEmpty().isFloat({ min: 0 })
];

// @route   GET /api/production
// @desc    Get all production records
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      customerName,
      projectName,
      partName,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    if (projectName) {
      filter.projectName = { $regex: projectName, $options: 'i' };
    }

    if (partName) {
      filter['productionDetails.partName'] = { $regex: partName, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter['startDate'] = {};
      if (dateFrom) {
        filter['startDate'].$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter['startDate'].$lte = new Date(dateTo);
      }
    }

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const productions = await Production.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await Production.countDocuments(filter);

    res.json({
      success: true,
      count: productions.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: productions
    });
  } catch (error) {
    console.error('Error fetching productions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/production/summary
// @desc    Get production summary and KPIs
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const summary = await Production.aggregate([
      {
        $group: {
          _id: null,
          totalProductions: { $sum: 1 },
          totalPlanned: { $sum: "$totalPlanned" },
          totalActual: { $sum: "$totalActual" },
          totalGap: { $sum: "$totalGap" },
          avgEfficiency: { $avg: "$efficiency" }
        }
      },
      {
        $project: {
          _id: 0,
          totalProductions: 1,
          totalPlanned: 1,
          totalActual: 1,
          totalGap: 1,
          avgEfficiency: { $round: ["$avgEfficiency", 2] }
        }
      }
    ]);

    // Get status-wise counts
    const statusCounts = await Production.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top customers by production
    const topCustomers = await Production.aggregate([
      {
        $group: {
          _id: "$customerName",
          totalProductions: { $sum: 1 },
          totalPlanned: { $sum: "$totalPlanned" },
          totalActual: { $sum: "$totalActual" }
        }
      },
      { $sort: { totalProductions: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0] || {},
        statusCounts,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching production summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/production/export/csv
// @desc    Export production data to CSV
// @access  Private
router.get('/export/csv', auth, async (req, res) => {
  try {
    const productions = await Production.find().populate('createdBy', 'name email');

    // Convert to CSV format
    const csvData = [];
    
    // Header row
    csvData.push([
      'Customer Name',
      'Project Name',
      'Start Date',
      'End Date',
      'Part Name',
      'Planned Quantity',
      'Actual Quantity',
      'Gap',
      'Reason for Delay',
      'Remarks',
      'Status',
      'Total Planned',
      'Total Actual',
      'Total Gap',
      'Efficiency (%)',
      'Created By',
      'Created Date'
    ].join(','));

    // Data rows
    productions.forEach(production => {
      if (production.productionDetails.length > 0) {
        production.productionDetails.forEach(detail => {
          csvData.push([
            `"${production.customerName}"`,
            `"${production.projectName}"`,
            `"${production.startDate.toISOString().split('T')[0]}"`,
            `"${production.endDate.toISOString().split('T')[0]}"`,
            `"${detail.partName}"`,
            detail.productionQuantityPlan,
            detail.actualProduction,
            detail.gap,
            `"${detail.reasonForDelay || ''}"`,
            `"${detail.remarks || ''}"`,
            production.status,
            production.totalPlanned,
            production.totalActual,
            production.totalGap,
            production.efficiency.toFixed(2),
            `"${production.createdBy?.name || 'N/A'}"`,
            `"${production.createdAt.toISOString().split('T')[0]}"`
          ].join(','));
        });
      } else {
        csvData.push([
          `"${production.customerName}"`,
          `"${production.projectName}"`,
          `"${production.startDate.toISOString().split('T')[0]}"`,
          `"${production.endDate.toISOString().split('T')[0]}"`,
          '',
          '',
          '',
          '',
          '',
          '',
          production.status,
          production.totalPlanned,
          production.totalActual,
          production.totalGap,
          production.efficiency.toFixed(2),
          `"${production.createdBy?.name || 'N/A'}"`,
          `"${production.createdAt.toISOString().split('T')[0]}"`
        ].join(','));
      }
    });

    const csvContent = csvData.join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`production_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

// @route   GET /api/production/:id
// @desc    Get production record by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }

    res.json({
      success: true,
      data: production
    });
  } catch (error) {
    console.error('Error fetching production:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/production
// @desc    Create a new production record
// @access  Private
router.post('/', auth, validateProduction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Check if production record already exists for this customer and project
    const existingProduction = await Production.findOne({
      customerName: req.body.customerName,
      projectName: req.body.projectName
    });

    if (existingProduction) {
      return res.status(400).json({
        success: false,
        message: 'Production record already exists for this customer and project'
      });
    }

    // Validate that end date is after start date
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Validate production details dates are within overall production period
    for (const detail of req.body.productionDetails) {
      const detailDate = new Date(detail.date);
      if (detailDate < startDate || detailDate > endDate) {
        return res.status(400).json({
          success: false,
          message: `Production detail date (${detail.date}) must be within overall production period`
        });
      }
    }

    // Create new production record
    const productionData = {
      ...req.body,
      createdBy: req.user.id
    };

    const production = new Production(productionData);
    await production.save();

    // Populate createdBy field
    await production.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Production record created successfully',
      data: production
    });
  } catch (error) {
    console.error('Error creating production:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Production record already exists for this customer and project combination'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/production/:id
// @desc    Update a production record
// @access  Private
router.put('/:id', auth, validateProduction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let production = await Production.findById(req.params.id);

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }

    // Check if updating would create a duplicate (excluding current record)
    if (req.body.customerName !== production.customerName || 
        req.body.projectName !== production.projectName) {
      const existingProduction = await Production.findOne({
        customerName: req.body.customerName,
        projectName: req.body.projectName,
        _id: { $ne: req.params.id }
      });

      if (existingProduction) {
        return res.status(400).json({
          success: false,
          message: 'Production record already exists for this customer and project'
        });
      }
    }

    // Validate that end date is after start date
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Validate production details dates are within overall production period
    for (const detail of req.body.productionDetails) {
      const detailDate = new Date(detail.date);
      if (detailDate < startDate || detailDate > endDate) {
        return res.status(400).json({
          success: false,
          message: `Production detail date (${detail.date}) must be within overall production period`
        });
      }
    }

    // Update production record
    production = await Production.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Production record updated successfully',
      data: production
    });
  } catch (error) {
    console.error('Error updating production:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Production record already exists for this customer and project combination'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/production/:id
// @desc    Delete a production record
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const production = await Production.findById(req.params.id);

    if (!production) {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }

    await production.deleteOne();

    res.json({
      success: true,
      message: 'Production record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting production:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Production record not found'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/production/filters/unique-values
// @desc    Get unique values for filters
// @access  Private
router.get('/filters/unique-values', auth, async (req, res) => {
  try {
    const [customers, projects, parts] = await Promise.all([
      Production.distinct('customerName'),
      Production.distinct('projectName'),
      Production.distinct('productionDetails.partName')
    ]);

    res.json({
      success: true,
      data: {
        customers: customers.filter(Boolean).sort(),
        projects: projects.filter(Boolean).sort(),
        parts: parts.filter(Boolean).sort()
      }
    });
  } catch (error) {
    console.error('Error fetching unique values:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/production/customer/:customerName/projects
// @desc    Get projects by customer name
// @access  Private
router.get('/customer/:customerName/projects', auth, async (req, res) => {
  try {
    const projects = await Production.distinct('projectName', {
      customerName: req.params.customerName
    });

    res.json({
      success: true,
      data: projects.filter(Boolean).sort()
    });
  } catch (error) {
    console.error('Error fetching projects by customer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/production/status/:status
// @desc    Get productions by status
// @access  Private
router.get('/status/:status', auth, async (req, res) => {
  try {
    const productions = await Production.find({ status: req.params.status })
      .populate('createdBy', 'name email')
      .sort({ 'startDate': 1 });

    res.json({
      success: true,
      count: productions.length,
      data: productions
    });
  } catch (error) {
    console.error('Error fetching productions by status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
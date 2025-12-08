const express = require('express');
const router = express.Router();
const ProjectExpenditure = require('../models/ProjectExpenditure');
const auth = require('../middleware/auth');

// Get all project expenditures
router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      customer,
      project,
      typeOfWork,
      status,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let query = {};

    // Build query based on filters
    if (financialYear) query.financialYear = financialYear;
    if (customer) query.customer = customer;
    if (project) query.project = project;
    if (status) query.status = status;
    if (typeOfWork) {
      query['items.typeOfWork'] = typeOfWork;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } }
      ];
    }

    const expenditures = await ProjectExpenditure.find(query)
      .populate('customer', 'customerName customerEmail')
      .populate('project', 'projectName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ProjectExpenditure.countDocuments(query);

    res.json({
      expenditures,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching project expenditures:', error);
    res.status(500).json({ message: 'Error fetching project expenditures', error: error.message });
  }
});

// Get expenditure by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const expenditure = await ProjectExpenditure.findById(req.params.id)
      .populate('customer', 'customerName customerEmail')
      .populate('project', 'projectName');

    if (!expenditure) {
      return res.status(404).json({ message: 'Project expenditure not found' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error('Error fetching project expenditure:', error);
    res.status(500).json({ message: 'Error fetching project expenditure', error: error.message });
  }
});

// Get expenditures by project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const expenditures = await ProjectExpenditure.find({ project: req.params.projectId })
      .populate('customer', 'customerName customerEmail')
      .sort({ createdAt: -1 });

    res.json(expenditures);
  } catch (error) {
    console.error('Error fetching project expenditures by project:', error);
    res.status(500).json({ message: 'Error fetching project expenditures', error: error.message });
  }
});

// Get expenditures by customer
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const expenditures = await ProjectExpenditure.find({ customer: req.params.customerId })
      .populate('project', 'projectName')
      .sort({ createdAt: -1 });

    res.json(expenditures);
  } catch (error) {
    console.error('Error fetching project expenditures by customer:', error);
    res.status(500).json({ message: 'Error fetching project expenditures', error: error.message });
  }
});

// Create new project expenditure
router.post('/', auth, async (req, res) => {
  try {
    console.log('=== CREATE PROJECT EXPENDITURE REQUEST ===');
    console.log('User ID from auth:', req.user?.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields before creating the document
    const requiredFields = ['financialYear', 'customer', 'customerName', 'project', 'projectName', 'items', 'totalAmount'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields: missingFields,
        receivedData: Object.keys(req.body)
      });
    }
    
    // Validate items array
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      console.error('Items must be a non-empty array');
      return res.status(400).json({
        message: 'Items must be a non-empty array',
        receivedItems: req.body.items
      });
    }
    
    // Validate each item has required fields
    const itemRequiredFields = ['description', 'typeOfWork', 'quantity', 'unit', 'rate', 'amount'];
    for (let i = 0; i < req.body.items.length; i++) {
      const item = req.body.items[i];
      const itemMissingFields = itemRequiredFields.filter(field => !item[field] && item[field] !== 0);
      if (itemMissingFields.length > 0) {
        console.error(`Item ${i} missing fields:`, itemMissingFields);
        return res.status(400).json({
          message: `Item ${i} is missing required fields`,
          missingFields: itemMissingFields,
          item: item
        });
      }
    }
    
    const expenditureData = {
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    console.log('Creating expenditure with data:', JSON.stringify(expenditureData, null, 2));

    const expenditure = new ProjectExpenditure(expenditureData);
    
    console.log('Saving expenditure to database...');
    await expenditure.save();
    console.log('Expenditure saved successfully with ID:', expenditure._id);

    console.log('Populating customer and project references...');
    await expenditure.populate('customer', 'customerName customerEmail');
    await expenditure.populate('project', 'projectName');

    console.log('Sending success response');
    res.status(201).json(expenditure);
  } catch (error) {
    console.error('=== ERROR CREATING PROJECT EXPENDITURE ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      }));
      console.error('Validation errors:', validationErrors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors,
        details: error.message 
      });
    }
    
    if (error.name === 'CastError') {
      console.error('Cast error - Invalid ObjectId:', error.path, error.value);
      return res.status(400).json({
        message: 'Invalid reference ID',
        field: error.path,
        value: error.value,
        details: 'The provided ID is not a valid MongoDB ObjectId'
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating project expenditure', 
      error: error.message,
      errorType: error.name,
      details: error.toString()
    });
  }
});

// Update project expenditure
router.put('/:id', auth, async (req, res) => {
  try {
    const expenditure = await ProjectExpenditure.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'customerName customerEmail')
      .populate('project', 'projectName');

    if (!expenditure) {
      return res.status(404).json({ message: 'Project expenditure not found' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error('Error updating project expenditure:', error);
    res.status(500).json({ message: 'Error updating project expenditure', error: error.message });
  }
});

// Update expenditure status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const expenditure = await ProjectExpenditure.findByIdAndUpdate(
      req.params.id,
      {
        status,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'customerName customerEmail')
      .populate('project', 'projectName');

    if (!expenditure) {
      return res.status(404).json({ message: 'Project expenditure not found' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error('Error updating expenditure status:', error);
    res.status(500).json({ message: 'Error updating expenditure status', error: error.message });
  }
});

// Delete project expenditure
router.delete('/:id', auth, async (req, res) => {
  try {
    const expenditure = await ProjectExpenditure.findByIdAndDelete(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ message: 'Project expenditure not found' });
    }

    res.json({ message: 'Project expenditure deleted successfully' });
  } catch (error) {
    console.error('Error deleting project expenditure:', error);
    res.status(500).json({ message: 'Error deleting project expenditure', error: error.message });
  }
});

// Get summary report
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { financialYear, customer, project } = req.query;
    
    let matchStage = {};
    if (financialYear) matchStage.financialYear = financialYear;
    if (customer) matchStage.customer = customer;
    if (project) matchStage.project = project;

    const summary = await ProjectExpenditure.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenditures: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          approvedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Approved'] }, '$totalAmount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Pending'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);

    res.json(summary[0] || {
      totalExpenditures: 0,
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0
    });
  } catch (error) {
    console.error('Error generating summary report:', error);
    res.status(500).json({ message: 'Error generating summary report', error: error.message });
  }
});

// Get status-wise report
router.get('/reports/status-wise', auth, async (req, res) => {
  try {
    const { financialYear, customer, project } = req.query;
    
    let matchStage = {};
    if (financialYear) matchStage.financialYear = financialYear;
    if (customer) matchStage.customer = customer;
    if (project) matchStage.project = project;

    const statusReport = await ProjectExpenditure.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          totalAmount: 1,
          _id: 0
        }
      }
    ]);

    res.json(statusReport);
  } catch (error) {
    console.error('Error generating status report:', error);
    res.status(500).json({ message: 'Error generating status report', error: error.message });
  }
});

module.exports = router;
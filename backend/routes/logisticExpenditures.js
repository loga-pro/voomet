const express = require('express');
const router = express.Router();
const LogisticExpenditure = require('../models/LogisticExpenditure');
const auth = require('../middleware/auth');

// Get all logistic expenditures
router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      customer,
      project,
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

    // Search functionality
    if (search) {
      query.$or = [
        { expenditureNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } }
      ];
    }

    const expenditures = await LogisticExpenditure.find(query)
      .populate('customer', 'name email')
      .populate('project', 'name projectNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LogisticExpenditure.countDocuments(query);

    // Return data in the format frontend expects
    res.json(expenditures);
  } catch (error) {
    console.error('Error fetching logistic expenditures:', error);
    res.status(500).json({ message: 'Error fetching logistic expenditures', error: error.message });
  }
});


// Create new logistic expenditure
router.post('/', auth, async (req, res) => {
  try {
    const { financialYear, customerName, projectName, expenditures, total } = req.body;

    // Look up customer and project by name
    const Customer = require('../models/Customer');
    const Project = require('../models/Project');

    let customer = null;
    let project = null;

    if (customerName) {
      customer = await Customer.findOne({ 
        $or: [
          { name: customerName },
          { customerName: customerName }
        ]
      });
    }

    if (projectName) {
      project = await Project.findOne({ 
        $or: [
          { name: projectName },
          { projectName: projectName }
        ]
      });
    }

    const expenditureData = {
      financialYear,
      customerName,
      projectName,
      customer: customer?._id,
      project: project?._id,
      projectNumber: project?.projectNumber,
      items: expenditures || [], // Map expenditures to items
      totalAmount: total || 0,
      status: 'Draft',
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // Generate expenditure number if not provided
    if (!expenditureData.expenditureNumber) {
      const lastExpenditure = await LogisticExpenditure.findOne().sort({ createdAt: -1 });
      const lastNumber = lastExpenditure && lastExpenditure.expenditureNumber 
        ? parseInt(lastExpenditure.expenditureNumber.replace('LOG', '')) 
        : 0;
      expenditureData.expenditureNumber = `LOG${String(lastNumber + 1).padStart(6, '0')}`;
    }

    const expenditure = new LogisticExpenditure(expenditureData);
    await expenditure.save();

    if (customer) {
      await expenditure.populate('customer', 'name email');
    }
    if (project) {
      await expenditure.populate('project', 'name projectNumber');
    }

    res.status(201).json(expenditure);
  } catch (error) {
    console.error('Error creating logistic expenditure:', error);
    res.status(500).json({ message: 'Error creating logistic expenditure', error: error.message });
  }
});


// Update logistic expenditure
router.put('/:id', auth, async (req, res) => {
  try {
    const { financialYear, customerName, projectName, expenditures, total } = req.body;

    // Look up customer and project by name if provided
    const Customer = require('../models/Customer');
    const Project = require('../models/Project');

    let customer = null;
    let project = null;

    if (customerName) {
      customer = await Customer.findOne({ 
        $or: [
          { name: customerName },
          { customerName: customerName }
        ]
      });
    }

    if (projectName) {
      project = await Project.findOne({ 
        $or: [
          { name: projectName },
          { projectName: projectName }
        ]
      });
    }

    const updateData = {
      financialYear,
      customerName,
      projectName,
      customer: customer?._id,
      project: project?._id,
      projectNumber: project?.projectNumber,
      items: expenditures || [],
      totalAmount: total || 0,
      updatedBy: req.user.id,
      updatedAt: Date.now()
    };

    const expenditure = await LogisticExpenditure.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email')
      .populate('project', 'name projectNumber');

    if (!expenditure) {
      return res.status(404).json({ message: 'Logistic expenditure not found' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error('Error updating logistic expenditure:', error);
    res.status(500).json({ message: 'Error updating logistic expenditure', error: error.message });
  }
});

// Delete logistic expenditure
router.delete('/:id', auth, async (req, res) => {
  try {
    const expenditure = await LogisticExpenditure.findByIdAndDelete(req.params.id);

    if (!expenditure) {
      return res.status(404).json({ message: 'Logistic expenditure not found' });
    }

    res.json({ message: 'Logistic expenditure deleted successfully' });
  } catch (error) {
    console.error('Error deleting logistic expenditure:', error);
    res.status(500).json({ message: 'Error deleting logistic expenditure', error: error.message });
  }
});

module.exports = router;
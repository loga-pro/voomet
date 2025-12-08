const express = require('express');
const router = express.Router();
const ProjectBudget = require('../models/ProjectBudget');
const auth = require('../middleware/auth');

// Utility: safe number parser
const toNumber = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Clean arrays by removing empty/partial rows
function cleanProjectExpenditures(arr = []) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(item => ({
      typeOfWork: item.typeOfWork && item.typeOfWork.toString().trim(),
      partName: item.partName && item.partName.toString().trim(),
      quantityToBeOrdered: toNumber(item.quantityToBeOrdered),
      quantityOrderedActual: toNumber(item.quantityOrderedActual),
      unit: item.unit || 'nos',
      price: toNumber(item.price),
      totalPrice: toNumber(item.totalPrice)
    }))
    .filter(i => i.typeOfWork && i.partName && i.quantityToBeOrdered > 0 && i.price >= 0 && i.totalPrice >= 0);
}

function cleanLogisticExpenditures(arr = []) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(item => ({
      purpose: item.purpose && item.purpose.toString().trim(),
      vehicleType: item.vehicleType && item.vehicleType.toString().trim(),
      transporterName: item.transporterName && item.transporterName.toString().trim(),
      from: item.from && item.from.toString().trim(),
      to: item.to && item.to.toString().trim(),
      kmTravelled: toNumber(item.kmTravelled),
      totalPrice: toNumber(item.totalPrice)
    }))
    .filter(i => i.purpose && i.vehicleType && i.transporterName && i.kmTravelled >= 0 && i.totalPrice >= 0);
}

// GET /api/project-budgets
router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      projectName,
      customerName,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let filter = {};
    if (financialYear) filter.financialYear = financialYear;
    if (projectName) filter.projectName = { $regex: projectName, $options: 'i' };
    if (customerName) filter.customerName = { $regex: customerName, $options: 'i' };
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { siteLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const lim = Math.max(1, Math.min(1000, parseInt(limit, 10) || 10));
    const pg = Math.max(1, parseInt(page, 10) || 1);

    const budgets = await ProjectBudget.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(lim)
      .skip((pg - 1) * lim)
      .lean();

    const total = await ProjectBudget.countDocuments(filter);

    res.json({ budgets, totalPages: Math.ceil(total / lim), currentPage: pg, total });
  } catch (error) {
    console.error('Error fetching project budgets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/project-budgets/financial-years
router.get('/financial-years', async (req, res) => {
  try {
    const financialYears = await ProjectBudget.distinct('financialYear');
    const sortedYears = financialYears.sort().reverse();
    res.json({ financialYears: sortedYears });
  } catch (error) {
    console.error('Error fetching financial years:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/project-budgets/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const budget = await ProjectBudget.findById(req.params.id).populate('createdBy', 'name email');
    if (!budget) return res.status(404).json({ message: 'Project budget not found' });
    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/project-budgets
router.post('/', auth, async (req, res) => {
  try {
    // Clean arrays (backend-side guard)
    const projectExpenditures = cleanProjectExpenditures(req.body.projectExpenditures || []);
    const logisticExpenditures = cleanLogisticExpenditures(req.body.logisticExpenditures || []);

    const quotedPrice = toNumber(req.body.quotedPrice);
    const negotiatedPrice = toNumber(req.body.negotiatedPrice);

    const amountSpent = (projectExpenditures.reduce((s, x) => s + (x.totalPrice || 0), 0)
      + logisticExpenditures.reduce((s, x) => s + (x.totalPrice || 0), 0));

    const netProfitLoss = negotiatedPrice - amountSpent;

    const budgetData = {
      financialYear: req.body.financialYear,
      projectName: req.body.projectName,
      customerName: req.body.customerName,
      siteLocation: req.body.siteLocation,
      quotedPrice,
      negotiatedPrice,
      amountSpent,
      netProfitLoss,
      overallBusinessImpact: req.body.overallBusinessImpact || 'Medium',
      projectExpenditures,
      logisticExpenditures,
      createdBy: req.user.id
    };

    // Create and save
    const budget = new ProjectBudget(budgetData);
    await budget.save();

    const populatedBudget = await ProjectBudget.findById(budget._id).populate('createdBy', 'name email');
    res.status(201).json(populatedBudget);
  } catch (error) {
    console.error('Error creating project budget:', error);
    // If validation error, return helpful message
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ message: messages.join('; ') || error.message });
    }
    res.status(400).json({ message: error.message || 'Bad request' });
  }
});

// PUT /api/project-budgets/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const projectExpenditures = cleanProjectExpenditures(req.body.projectExpenditures || []);
    const logisticExpenditures = cleanLogisticExpenditures(req.body.logisticExpenditures || []);

    const quotedPrice = toNumber(req.body.quotedPrice);
    const negotiatedPrice = toNumber(req.body.negotiatedPrice);

    const amountSpent = (projectExpenditures.reduce((s, x) => s + (x.totalPrice || 0), 0)
      + logisticExpenditures.reduce((s, x) => s + (x.totalPrice || 0), 0));

    const netProfitLoss = negotiatedPrice - amountSpent;

    const update = {
      financialYear: req.body.financialYear,
      projectName: req.body.projectName,
      customerName: req.body.customerName,
      siteLocation: req.body.siteLocation,
      quotedPrice,
      negotiatedPrice,
      amountSpent,
      netProfitLoss,
      overallBusinessImpact: req.body.overallBusinessImpact || 'Medium',
      projectExpenditures,
      logisticExpenditures
    };

    const updatedBudget = await ProjectBudget.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('createdBy', 'name email');

    if (!updatedBudget) return res.status(404).json({ message: 'Project budget not found' });
    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating project budget:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ message: messages.join('; ') || error.message });
    }
    res.status(400).json({ message: error.message || 'Bad request' });
  }
});

// PATCH /api/project-budgets/:id/project-expenditures
// Update only project expenditures for a budget
router.patch('/:id/project-expenditures', auth, async (req, res) => {
  try {
    const { projectExpenditures } = req.body;
    
    if (!Array.isArray(projectExpenditures)) {
      return res.status(400).json({ message: 'projectExpenditures must be an array' });
    }

    const cleanedExpenditures = cleanProjectExpenditures(projectExpenditures);
    
    const budget = await ProjectBudget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Project budget not found' });

    // Update project expenditures
    budget.projectExpenditures = cleanedExpenditures;
    
    // Save will trigger pre-save hook to recalculate amountSpent and netProfitLoss
    await budget.save();
    
    const updatedBudget = await ProjectBudget.findById(budget._id).populate('createdBy', 'name email');
    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating project expenditures:', error);
    res.status(400).json({ message: error.message || 'Bad request' });
  }
});

// PATCH /api/project-budgets/:id/logistic-expenditures
// Update only logistic expenditures for a budget
router.patch('/:id/logistic-expenditures', auth, async (req, res) => {
  try {
    const { logisticExpenditures } = req.body;
    
    if (!Array.isArray(logisticExpenditures)) {
      return res.status(400).json({ message: 'logisticExpenditures must be an array' });
    }

    const cleanedExpenditures = cleanLogisticExpenditures(logisticExpenditures);
    
    const budget = await ProjectBudget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Project budget not found' });

    // Update logistic expenditures
    budget.logisticExpenditures = cleanedExpenditures;
    
    // Save will trigger pre-save hook to recalculate amountSpent and netProfitLoss
    await budget.save();
    
    const updatedBudget = await ProjectBudget.findById(budget._id).populate('createdBy', 'name email');
    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating logistic expenditures:', error);
    res.status(400).json({ message: error.message || 'Bad request' });
  }
});

// DELETE /api/project-budgets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const budget = await ProjectBudget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Project budget not found' });
    await ProjectBudget.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting project budget:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Export CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const budgets = await ProjectBudget.find().populate('createdBy', 'name email');

    const csvData = [
      [
        'Financial Year','Project Name','Customer Name','Site Location','Quoted Price (₹)','Negotiated Price (₹)','Amount Spent (₹)','Net Profit/Loss (₹)','Overall Business Impact','Created By','Created Date'
      ]
    ];

    budgets.forEach(budget => {
      csvData.push([
        budget.financialYear,
        budget.projectName,
        budget.customerName,
        budget.siteLocation,
        budget.quotedPrice,
        budget.negotiatedPrice,
        budget.amountSpent,
        budget.netProfitLoss,
        budget.overallBusinessImpact,
        budget.createdBy?.name || 'N/A',
        new Date(budget.createdAt).toLocaleDateString()
      ]);
    });

    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-budgets-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting csv:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Create project budget
router.post('/', auth, async (req, res) => {
  try {
    console.log('Received project budget data:', req.body);
    
    // Validate required fields
    const requiredFields = ['financialYear', 'projectName', 'customerName', 'siteLocation', 'quotedPrice', 'negotiatedPrice'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields 
      });
    }

    const budgetData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Calculate amount spent from expenditures
    const projectExpendituresTotal = budgetData.projectExpenditures?.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0) || 0;
    const logisticExpendituresTotal = budgetData.logisticExpenditures?.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0) || 0;
    budgetData.amountSpent = projectExpendituresTotal + logisticExpendituresTotal;

    // Calculate net profit/loss
    budgetData.netProfitLoss = (parseFloat(budgetData.negotiatedPrice) || 0) - budgetData.amountSpent;

    console.log('Processed budget data:', budgetData);

    const budget = new ProjectBudget(budgetData);
    await budget.save();
    
    const populatedBudget = await ProjectBudget.findById(budget._id).populate('createdBy', 'name email');
    res.status(201).json(populatedBudget);
  } catch (error) {
    console.error('Error creating project budget:', error);
    res.status(400).json({ 
      message: error.message,
      details: error.errors 
    });
  }
});
module.exports = router;

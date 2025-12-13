const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const MiscellaneousExpenditure = require('../models/MiscellaneousExpenditure');
const ProjectBudget = require('../models/ProjectBudget');

// @route   GET /api/miscellaneous-expenditures
// @desc    Get all miscellaneous expenditures
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      customer,
      project,
      status,
      search,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    // Filter by financial year
    if (financialYear) {
      query.financialYear = financialYear;
    }

    // Filter by customer
    if (customer) {
      query.customer = customer;
    }

    // Filter by project
    if (project) {
      query.project = project;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { 'expenses.expenseDescription': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const expenditures = await MiscellaneousExpenditure.find(query)
      .populate('customer', 'name email phone')
      .populate('project', 'name projectNumber')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await MiscellaneousExpenditure.countDocuments(query);

    res.json({
      expenditures,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching miscellaneous expenditures:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/miscellaneous-expenditures/:id
// @desc    Get miscellaneous expenditure by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const expenditure = await MiscellaneousExpenditure.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('project', 'name projectNumber')
      .populate('createdBy', 'name email');

    if (!expenditure) {
      return res.status(404).json({ message: 'Miscellaneous expenditure not found' });
    }

    res.json(expenditure);
  } catch (error) {
    console.error('Error fetching miscellaneous expenditure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/miscellaneous-expenditures
// @desc    Create new miscellaneous expenditure
// @access  Private
router.post('/', auth, upload.array('receipts', 10), async (req, res) => {
  try {
    const {
      financialYear,
      customer,
      customerName,
      project,
      projectName,
      expenses,
      status
    } = req.body;

    // Parse expenses if it's a string
    let parsedExpenses = [];
    if (typeof expenses === 'string') {
      try {
        parsedExpenses = JSON.parse(expenses);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid expenses format' });
      }
    } else {
      parsedExpenses = expenses;
    }

    // Attach receipt files to expenses
    const receipts = req.files || [];
    const expensesWithReceipts = parsedExpenses.map((expense, index) => {
      const receiptFile = receipts.find(f => f.originalname === expense.receiptName);
      return {
        ...expense,
        date: new Date(expense.date),
        amount: parseFloat(expense.amount),
        receipt: receiptFile ? {
          filename: receiptFile.filename,
          path: receiptFile.path,
          originalName: receiptFile.originalname
        } : undefined
      };
    });

    // Calculate total amount
    const totalAmount = expensesWithReceipts.reduce((total, expense) => total + expense.amount, 0);

    // Create new expenditure
    const miscellaneousExpenditure = new MiscellaneousExpenditure({
      financialYear,
      customer,
      customerName,
      project,
      projectName,
      expenses: expensesWithReceipts,
      totalAmount,
      status: status || 'Draft',
      createdBy: req.user.id
    });

    await miscellaneousExpenditure.save();

    // Update project budget's miscellaneous expenditures
    await updateProjectBudgetExpenditures(financialYear, customerName, projectName, miscellaneousExpenditure);

    res.status(201).json({
      message: 'Miscellaneous expenditure created successfully',
      expenditure: miscellaneousExpenditure
    });
  } catch (error) {
    console.error('Error creating miscellaneous expenditure:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/miscellaneous-expenditures/:id
// @desc    Update miscellaneous expenditure
// @access  Private
router.put('/:id', auth, upload.array('receipts', 10), async (req, res) => {
  try {
    const {
      financialYear,
      customer,
      customerName,
      project,
      projectName,
      expenses,
      status
    } = req.body;

    // Find existing expenditure
    const existingExpenditure = await MiscellaneousExpenditure.findById(req.params.id);
    if (!existingExpenditure) {
      return res.status(404).json({ message: 'Miscellaneous expenditure not found' });
    }

    // Parse expenses
    let parsedExpenses = [];
    if (typeof expenses === 'string') {
      try {
        parsedExpenses = JSON.parse(expenses);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid expenses format' });
      }
    } else {
      parsedExpenses = expenses;
    }

    // Attach receipt files to expenses
    const receipts = req.files || [];
    const expensesWithReceipts = parsedExpenses.map((expense, index) => {
      const receiptFile = receipts.find(f => f.originalname === expense.receiptName);
      return {
        ...expense,
        date: new Date(expense.date),
        amount: parseFloat(expense.amount),
        receipt: receiptFile ? {
          filename: receiptFile.filename,
          path: receiptFile.path,
          originalName: receiptFile.originalname
        } : expense.receipt // Keep existing receipt if no new file
      };
    });

    // Update expenditure
    existingExpenditure.financialYear = financialYear || existingExpenditure.financialYear;
    existingExpenditure.customer = customer || existingExpenditure.customer;
    existingExpenditure.customerName = customerName || existingExpenditure.customerName;
    existingExpenditure.project = project || existingExpenditure.project;
    existingExpenditure.projectName = projectName || existingExpenditure.projectName;
    existingExpenditure.expenses = expensesWithReceipts;
    existingExpenditure.status = status || existingExpenditure.status;

    await existingExpenditure.save();

    // Update project budget's miscellaneous expenditures
    await updateProjectBudgetExpenditures(
      existingExpenditure.financialYear,
      existingExpenditure.customerName,
      existingExpenditure.projectName,
      existingExpenditure
    );

    res.json({
      message: 'Miscellaneous expenditure updated successfully',
      expenditure: existingExpenditure
    });
  } catch (error) {
    console.error('Error updating miscellaneous expenditure:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/miscellaneous-expenditures/:id
// @desc    Delete miscellaneous expenditure
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expenditure = await MiscellaneousExpenditure.findById(req.params.id);
    
    if (!expenditure) {
      return res.status(404).json({ message: 'Miscellaneous expenditure not found' });
    }

    // Remove from project budget
    await removeFromProjectBudget(expenditure);

    // Delete the expenditure
    await expenditure.deleteOne();

    res.json({ message: 'Miscellaneous expenditure deleted successfully' });
  } catch (error) {
    console.error('Error deleting miscellaneous expenditure:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/miscellaneous-expenditures/financial-years
// @desc    Get unique financial years
// @access  Private
router.get('/financial-years', auth, async (req, res) => {
  try {
    const years = await MiscellaneousExpenditure.distinct('financialYear');
    res.json({ financialYears: years.sort().reverse() });
  } catch (error) {
    console.error('Error fetching financial years:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/miscellaneous-expenditures/export/csv
// @desc    Export expenditures to CSV
// @access  Private
router.post('/export/csv', auth, async (req, res) => {
  try {
    const { filters } = req.body;
    
    let query = {};
    
    if (filters) {
      if (filters.financialYear) query.financialYear = filters.financialYear;
      if (filters.customer) query.customer = filters.customer;
      if (filters.project) query.project = filters.project;
      if (filters.status) query.status = filters.status;
      if (filters.search) {
        query.$or = [
          { customerName: { $regex: filters.search, $options: 'i' } },
          { projectName: { $regex: filters.search, $options: 'i' } }
        ];
      }
    }

    const expenditures = await MiscellaneousExpenditure.find(query)
      .populate('customer', 'name')
      .populate('project', 'name projectNumber')
      .sort({ createdAt: -1 });

    // Prepare CSV data
    const csvRows = [];
    
    // Header row
    csvRows.push([
      'Financial Year',
      'Customer Name',
      'Project Name',
      'Date',
      'Expense Category',
      'Expense Description',
      'Amount',
      'Payment Method',
      'Status',
      'Created Date'
    ].join(','));

    // Data rows
    expenditures.forEach(expenditure => {
      expenditure.expenses.forEach(expense => {
        csvRows.push([
          `"${expenditure.financialYear}"`,
          `"${expenditure.customerName}"`,
          `"${expenditure.projectName}"`,
          `"${new Date(expense.date).toLocaleDateString()}"`,
          `"${expense.expenseCategory}"`,
          `"${expense.expenseDescription}"`,
          `"${expense.amount}"`,
          `"${expense.paymentMethod}"`,
          `"${expenditure.status}"`,
          `"${new Date(expenditure.createdAt).toLocaleDateString()}"`
        ].join(','));
      });
    });

    const csvContent = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=miscellaneous-expenditures.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update project budget
async function updateProjectBudgetExpenditures(financialYear, customerName, projectName, miscellaneousExpenditure) {
  try {
    const projectBudget = await ProjectBudget.findOne({
      financialYear,
      customerName,
      projectName
    });

    if (projectBudget) {
      // Remove existing entries for this expenditure
      projectBudget.miscellaneousExpenditures = projectBudget.miscellaneousExpenditures?.filter(
        exp => exp.expenditureRef?.toString() !== miscellaneousExpenditure._id.toString()
      ) || [];

      // Add updated entries
      miscellaneousExpenditure.expenses.forEach(expense => {
        projectBudget.miscellaneousExpenditures.push({
          date: expense.date,
          category: expense.expenseCategory,
          description: expense.expenseDescription,
          amount: expense.amount,
          paymentMethod: expense.paymentMethod,
          expenditureRef: miscellaneousExpenditure._id
        });
      });

      // Calculate new totals
      const miscellaneousTotal = projectBudget.miscellaneousExpenditures.reduce((sum, exp) => sum + exp.amount, 0);
      projectBudget.amountSpent = (
        (projectBudget.projectExpenditures?.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0) || 0) +
        (projectBudget.logisticExpenditures?.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0) || 0) +
        miscellaneousTotal
      );
      projectBudget.netProfitLoss = (projectBudget.negotiatedPrice || 0) - projectBudget.amountSpent;

      await projectBudget.save();
    }
  } catch (error) {
    console.error('Error updating project budget:', error);
  }
}

// Helper function to remove from project budget
async function removeFromProjectBudget(miscellaneousExpenditure) {
  try {
    const projectBudget = await ProjectBudget.findOne({
      financialYear: miscellaneousExpenditure.financialYear,
      customerName: miscellaneousExpenditure.customerName,
      projectName: miscellaneousExpenditure.projectName
    });

    if (projectBudget) {
      // Remove entries for this expenditure
      projectBudget.miscellaneousExpenditures = projectBudget.miscellaneousExpenditures?.filter(
        exp => exp.expenditureRef?.toString() !== miscellaneousExpenditure._id.toString()
      ) || [];

      // Recalculate totals
      const miscellaneousTotal = projectBudget.miscellaneousExpenditures.reduce((sum, exp) => sum + exp.amount, 0);
      projectBudget.amountSpent = (
        (projectBudget.projectExpenditures?.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0) || 0) +
        (projectBudget.logisticExpenditures?.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0) || 0) +
        miscellaneousTotal
      );
      projectBudget.netProfitLoss = (projectBudget.negotiatedPrice || 0) - projectBudget.amountSpent;

      await projectBudget.save();
    }
  } catch (error) {
    console.error('Error removing from project budget:', error);
  }
}

module.exports = router;
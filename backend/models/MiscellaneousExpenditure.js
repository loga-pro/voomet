const mongoose = require('mongoose');

const miscellaneousExpenditureSchema = new mongoose.Schema({
  financialYear: {
    type: String,
    required: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  expenses: [{
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    expenseCategory: {
      type: String,
      required: true,
      enum: ['Labour', 'Travel', 'Food', 'Accommodation', 'Transport', 'Office Supplies', 'Utilities', 'Maintenance', 'Others']
    },
    expenseDescription: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI', 'Cheque', 'Others']
    },
    receipt: {
      filename: String,
      path: String,
      originalName: String
    },
    remarks: {
      type: String,
      trim: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'],
    default: 'Draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate total amount before saving
miscellaneousExpenditureSchema.pre('save', function(next) {
  this.totalAmount = this.expenses.reduce((total, expense) => total + expense.amount, 0);
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
miscellaneousExpenditureSchema.index({ financialYear: 1 });
miscellaneousExpenditureSchema.index({ customer: 1 });
miscellaneousExpenditureSchema.index({ project: 1 });
miscellaneousExpenditureSchema.index({ status: 1 });
miscellaneousExpenditureSchema.index({ createdAt: -1 });
miscellaneousExpenditureSchema.index({ customerName: 'text', projectName: 'text' });

module.exports = mongoose.model('MiscellaneousExpenditure', miscellaneousExpenditureSchema);
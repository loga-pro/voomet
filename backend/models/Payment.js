const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: String,
    required: true,
    trim: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  projectCost: {
    type: Number,
    required: true
  },
  paymentType: {
    type: String,
    enum: ['advance', 'final'],
    default: 'advance'
  },
  includeGST: {
    type: Boolean,
    default: false
  },
  gstPercentage: {
    type: Number,
    default: 0
  },
  invoices: [{
    invoiceNumber: {
      type: String,
      trim: true
    },
    invoiceValue: {
      type: Number
    },
    paymentType: {
      type: String,
      enum: ['advance', 'final'],
      default: 'advance'
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    }
  }],
  payments: [{
    transactionId: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    gst: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number
    },
    date: {
      type: Date,
      default: Date.now
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    paymentType: {
      type: String,
      enum: ['advance', 'final'],
      default: 'advance'
    },
    remarks: {
      type: String,
      trim: true
    }
  }],
  totalInvoiceRaised: {
    type: Number,
    default: 0
  },
  totalPayments: {
    type: Number,
    default: 0
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue'],
    default: 'pending'
  },
  createdBy: {
    type: String,
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
});

// Update pre-save hook to calculate balance and status
paymentSchema.pre('save', function(next) {
  this.totalInvoiceRaised = this.invoices.reduce((total, invoice) => {
    return total + (invoice.invoiceValue || 0);
  }, 0);
  
  // Calculate total payments from the separate payments array
  this.totalPayments = (this.payments || []).reduce((total, payment) => {
    return total + (payment.amount || 0);
  }, 0);
  
  this.balanceAmount = this.totalInvoiceRaised - this.totalPayments;
  
  if (this.balanceAmount === 0) {
    this.status = 'paid';
  } else if (this.balanceAmount > 0) {
    this.status = 'pending';
  } else {
    this.status = 'overdue';
  }
  
  // Ensure both project fields are set
  if (this.project && !this.projectName) {
    this.projectName = this.project;
  }
  if (this.projectName && !this.project) {
    this.project = this.projectName;
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
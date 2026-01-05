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
  paymentType: String,
  includeGST: {
    type: Boolean,
    default: false
  },
  gstPercentage: {
    type: Number,
    default: 0
  },
  consigneeAddress: {
    type: String,
    trim: true
  },
  buyerAddress: {
    type: String,
    trim: true
  },
  invoices: [{
    invoiceNumber: {
      type: String,
      trim: true
    },
    invoiceValue: {
      type: Number
    },
    paymentType: String,
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    voucherNo: {
      type: String,
      trim: true
    },
    buyersRef: {
      type: String,
      trim: true
    },
    dispatchedThrough: {
      type: String,
      trim: true
    },
    destination: {
      type: String,
      trim: true
    },
    termsForDelivery: {
      type: String,
      trim: true
    },
    hsnSac: {
      type: String,
      trim: true
    },
    cgst: {
      type: Number,
      default: 0
    },
    sgst: {
      type: Number,
      default: 0
    },
    roundOff: {
      type: Number,
      default: 0
    },
    cgstAmount: {
      type: Number,
      default: 0
    },
    sgstAmount: {
      type: Number,
      default: 0
    },
    totalWithTax: {
      type: Number,
      default: 0
    },
    overdueDate: {
      type: Date
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
    paymentType: String,
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
    default: 'System'
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
paymentSchema.pre('save', function (next) {
  this.totalInvoiceRaised = this.invoices.reduce((total, invoice) => {
    return total + (invoice.totalWithTax || invoice.invoiceValue || 0);
  }, 0);

  // Calculate total payments from the separate payments array
  this.totalPayments = (this.payments || []).reduce((total, payment) => {
    return total + (payment.amount || 0);
  }, 0);

  this.balanceAmount = this.totalInvoiceRaised - this.totalPayments;

  const hasInvoices = this.totalInvoiceRaised > 0;
  const isFullyPaid = this.balanceAmount <= 0;

  if (hasInvoices && isFullyPaid) {
    this.status = 'paid';
  } else {
    // Check if any invoice is overdue
    const now = new Date();
    // Normalize today to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isAnyOverdue = (this.invoices || []).some(invoice => {
      if (!invoice.overdueDate) return false;
      const dueDate = new Date(invoice.overdueDate);
      // Normalize due date to start of day as well
      const normalizedDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      return normalizedDueDate < today;
    });

    if (isAnyOverdue && !isFullyPaid) {
      this.status = 'overdue';
    } else {
      this.status = 'pending';
    }
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
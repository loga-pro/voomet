const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  vendor: {
    type: String,
    required: true,
    trim: true
  },
  vendorGstNumber: {
    type: String,
    required: true,
    trim: true
  },
  vendorAccountNumber: {
    type: String,
    required: true,
    trim: true
  },
  invoices: [{
    invoiceNumber: {
      type: String,
      required: true,
      trim: true
    },
    invoiceValue: {
      type: Number,
      required: true
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    payments: [{
      transactionId: {
        type: String,
        required: true,
        trim: true
      },
      bankName: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
      },
      paymentDate: {
        type: Date,
        default: Date.now
      },
      remarks: {
        type: String,
        trim: true
      }
    }]
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

// Pre-save hook to calculate totals and status
vendorPaymentSchema.pre('save', function(next) {
  this.totalInvoiceRaised = this.invoices.reduce((total, invoice) => {
    return total + (invoice.invoiceValue || 0);
  }, 0);
  
  this.totalPayments = this.invoices.reduce((total, invoice) => {
    return total + invoice.payments.reduce((invoiceTotal, payment) => {
      return invoiceTotal + (payment.amount || 0);
    }, 0);
  }, 0);
  
  this.balanceAmount = this.totalInvoiceRaised - this.totalPayments;
  
  if (this.balanceAmount === 0) {
    this.status = 'paid';
  } else if (this.balanceAmount > 0) {
    this.status = 'pending';
  } else {
    this.status = 'overdue';
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
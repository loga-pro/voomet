const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorType: {
    type: String,
    enum: ['vendor', 'contractor'],
    default: 'vendor'
  },
  vendorGstNumber: {
    type: String,
    required: true
  },
  vendorAccountNumber: {
    type: String,
    required: true
  },
  uploadImg: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  invoices: [{
    invoiceNumber: {
      type: String,
      required: true
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
        required: true
      },
      bankName: {
        type: String,
        required: true
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
        default: ''
      }
    }]
  }],
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

// Add compound unique index for vendor and invoiceNumber
vendorPaymentSchema.index(
  { 
    vendor: 1, 
    'invoices.invoiceNumber': 1 
  }, 
  { 
    unique: true,
    partialFilterExpression: {
      'invoices.invoiceNumber': { $exists: true }
    }
  }
);

// Pre-save middleware to update updatedAt
vendorPaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total invoice raised
vendorPaymentSchema.virtual('totalInvoiceRaised').get(function() {
  return this.invoices.reduce((total, invoice) => total + (invoice.invoiceValue || 0), 0);
});

// Virtual for total payments
vendorPaymentSchema.virtual('totalPayments').get(function() {
  return this.invoices.reduce((total, invoice) => {
    return total + invoice.payments.reduce((paymentTotal, payment) => paymentTotal + (payment.amount || 0), 0);
  }, 0);
});

// Virtual for balance amount
vendorPaymentSchema.virtual('balanceAmount').get(function() {
  return this.totalInvoiceRaised - this.totalPayments;
});

// Virtual for status
vendorPaymentSchema.virtual('status').get(function() {
  const balance = this.balanceAmount;
  if (balance === 0) return 'paid';
  if (balance > 0) return 'pending';
  return 'overdue';
});

// Ensure virtuals are included when converting to JSON
vendorPaymentSchema.set('toJSON', { virtuals: true });
vendorPaymentSchema.set('toObject', { virtuals: true });

const VendorPayment = mongoose.model('VendorPayment', vendorPaymentSchema);

module.exports = VendorPayment;
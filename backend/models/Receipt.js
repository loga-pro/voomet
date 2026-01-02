const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  receiptCategory: {
    type: String,
    enum: ['buy', 'return'],
    default: 'buy'
  },
  workCategory: {
    type: String,
    maxlength: 100
  },
  partName: {
    type: String,
    required: true
  },
  vendorNames: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    enum: ['In house', 'Bought-out'],
    default: 'In house'
  },
  invoiceNo: {
    type: String,
    maxlength: 30
  },
  voucherNo: {
    type: String,
    maxlength: 30
  },
  invoiceDate: {
    type: Date
  },
  invoiceValueWithoutGST: {
    type: Number,
    default: 0
  },
  gstValue: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    max: 9999
  },
  unit: {
    type: String
  },
  upload: {
    type: String // Base64 encoded file or file path
  },
  reasonForReturn: {
    type: String,
    maxlength: 30
  },
  totalValue: {
    type: Number,
    default: 0
  },
  remark: {
    type: String,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Calculate total value before saving
receiptSchema.pre('save', function(next) {
  if (this.invoiceValueWithoutGST && this.gstValue && this.quantity) {
    this.totalValue = (parseFloat(this.invoiceValueWithoutGST) * parseFloat(this.quantity)) + parseFloat(this.gstValue);
  }
  next();
});

module.exports = mongoose.model('Receipt', receiptSchema);

const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  dispatchCategory: {
    type: String,
    enum: ['dispatch', 'return'],
    default: 'dispatch'
  },
  workCategory: {
    type: String,
    maxlength: 30
  },
  partName: {
    type: String,
    required: true
  },
  customerName: {
    type: String
  },
  invoiceNo: {
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
  reasonForRejection: {
    type: String,
    maxlength: 30
  },
  totalValue: {
    type: Number,
    default: 0
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
dispatchSchema.pre('save', function(next) {
  if (this.invoiceValueWithoutGST && this.gstValue && this.quantity) {
    this.totalValue = (parseFloat(this.invoiceValueWithoutGST) + parseFloat(this.gstValue)) * parseFloat(this.quantity);
  }
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);

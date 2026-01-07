const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  workCategory: {
    type: String,
    required: true
  },
  partName: {
    type: String,
    required: true
  },
  dispatchCategory: {
    type: String,
    enum: ['dispatch', 'return', 'reject', 'site'],
    default: 'dispatch'
  },
  deliveryChalan: {
    type: String,
    default: ''
  },
  vehicleNo: {
    type: String,
    default: ''
  },
  ewayBill: {
    type: String,
    default: ''
  },
  poNo: {
    type: String,
    default: ''
  },
  contactNo: {
    type: String,
    default: ''
  },
  customerName: {
    type: String,
    required: true
  },
  invoiceNo: {
    type: String
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
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  upload: {
    type: String
  },
  reasonForRejection: {
    type: String
  },
  totalValue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate total value
dispatchSchema.pre('save', function(next) {
  if (this.invoiceValueWithoutGST && this.gstValue && this.quantity) {
    // Frontend sends gstValue as total GST amount (already multiplied by quantity)
    // So formula is: (price per unit * quantity) + total GST amount
    this.totalValue = (parseFloat(this.invoiceValueWithoutGST) * parseFloat(this.quantity)) + parseFloat(this.gstValue);
  }
  next();
});

module.exports = mongoose.model('Dispatch', dispatchSchema);

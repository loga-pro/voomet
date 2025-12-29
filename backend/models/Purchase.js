const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  voucherNo: {
    type: String,
    required: [true, 'Voucher number is required'],
    trim: true,
    maxlength: [30, 'Voucher number cannot exceed 30 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  modeOfPayment: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Cheque', 'UPI', 'Other'],
    default: 'Cash'
  },
  referenceNo: {
    type: String,
    trim: true,
    maxlength: [30, 'Reference number cannot exceed 30 characters']
  },
  referenceDate: {
    type: Date
  },
  otherReference: {
    type: String,
    trim: true,
    maxlength: [30, 'Other reference cannot exceed 30 characters']
  },
  dispatchedThrough: {
    type: String,
    trim: true,
    maxlength: [30, 'Dispatched through cannot exceed 30 characters']
  },
  destination: {
    type: String,
    trim: true,
    maxlength: [30, 'Destination cannot exceed 30 characters']
  },
  termsOfDelivery: {
    type: String,
    trim: true
  },
  supplier: {
    type: String,
    trim: true
  },
  cgst: {
    type: Number,
    min: [0, 'CGST cannot be negative'],
    max: [100, 'CGST cannot exceed 100']
  },
  sgst: {
    type: Number,
    min: [0, 'SGST cannot be negative'],
    max: [100, 'SGST cannot exceed 100']
  },
  workCategory: {
    type: String,
    required: [true, 'Work category is required']
  },
  partName: {
    type: String,
    required: [true, 'Part name is required']
  },
  unit: {
    type: String,
    required: [true, 'Unit is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    max: [9999, 'Quantity cannot exceed 9999']
  },
  invoiceValueWithoutGST: {
    type: Number,
    required: [true, 'Invoice value without GST is required'],
    min: [0, 'Invoice value cannot be negative']
  },
  gstPercentage: {
    type: Number,
    default: 18,
    min: [0, 'GST percentage cannot be negative'],
    max: [100, 'GST percentage cannot exceed 100']
  },
  gstValue: {
    type: Number,
    required: [true, 'GST value is required'],
    min: [0, 'GST value cannot be negative']
  },
  totalValue: {
    type: Number,
    required: [true, 'Total value is required'],
    min: [0, 'Total value cannot be negative']
  }
}, {
  timestamps: true
});

// Index for faster queries
purchaseSchema.index({ voucherNo: 1, date: -1 });
purchaseSchema.index({ workCategory: 1 });
purchaseSchema.index({ partName: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);

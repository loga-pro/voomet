const mongoose = require('mongoose');

const boqItemSchema = new mongoose.Schema({
  partName: {
    type: String,
    required: true,
    trim: true
  },
  numberOfUnits: {
    type: Number,
    required: true,
    min: 0
  },
  unitType: {
    type: String,
    required: true,
    trim: true
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const boqSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
    trim: true
  },
  scopeOfWork: [{
    type: String,
    required: true,
    trim: true
  }],
  items: [boqItemSchema],
  finalTotalWithoutGST: {
    type: Number,
    required: true,
    min: 0
  },
  transportationCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  gstPercentage: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  totalWithGST: {
    type: Number,
    required: true,
    min: 0
  },
  overallRemarks: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  image: {
    filename: String,
    originalName: String,
    path: String,
    size: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for project name (compatibility)
boqSchema.virtual('projectName').get(function() {
  return this.customer;
});

// Virtual for item description (compatibility)
boqSchema.virtual('itemDescription').get(function() {
  return this.items.length > 0 ? this.items[0].partName : '';
});

// Virtual for quantity (compatibility)
boqSchema.virtual('quantity').get(function() {
  return this.items.length > 0 ? this.items[0].numberOfUnits : 0;
});

// Virtual for unit (compatibility)
boqSchema.virtual('unit').get(function() {
  return this.items.length > 0 ? this.items[0].unitType : '';
});

// Virtual for unit price (compatibility)
boqSchema.virtual('unitPrice').get(function() {
  return this.items.length > 0 ? this.items[0].unitPrice : 0;
});

// Virtual for total amount (compatibility)
boqSchema.virtual('totalAmount').get(function() {
  return this.totalWithGST;
});

module.exports = mongoose.model('BOQ', boqSchema);
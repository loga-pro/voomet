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
  specification: {
    type: String,
    trim: true,
    default: ''
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
  margin: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  scopeOfWork: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    filename: String,
    originalName: String,
    path: String,
    size: Number
  }
});

const boqSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
    trim: true
  },
  projectName: {
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
  others: [boqItemSchema],
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
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    filename: String,
    originalName: String,
    path: String,
    size: Number
  },
  paymentTerms: [{
    discount: {
      type: Number,
      required: true,
      trim: true,
      min: 0,
      max: 100
    },
    Installment: {
      type: Number,
      min: 1
    },
    dueDate: {
      type: String,
      required: true,
      trim: true
    }
  }],
  estimateNumber: {
    type: String,
    trim: true
  },
  customDate: {
    type: String,
    trim: true
  },
  termsAndConditions: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index on customer and projectName
// This ensures that each customer can only have one BOQ per project
boqSchema.index({ customer: 1, projectName: 1 }, { unique: true });

// Virtual for item description (compatibility)
boqSchema.virtual('itemDescription').get(function () {
  return this.items.length > 0 ? this.items[0].partName : '';
});

// Virtual for quantity (compatibility)
boqSchema.virtual('quantity').get(function () {
  return this.items.length > 0 ? this.items[0].numberOfUnits : 0;
});

// Virtual for unit (compatibility)
boqSchema.virtual('unit').get(function () {
  return this.items.length > 0 ? this.items[0].unitType : '';
});

// Virtual for unit price (compatibility)
boqSchema.virtual('unitPrice').get(function () {
  return this.items.length > 0 ? this.items[0].unitPrice : 0;
});

// Virtual for total amount (compatibility)
boqSchema.virtual('totalAmount').get(function () {
  return this.totalWithGST;
});

module.exports = mongoose.model('BOQ', boqSchema);
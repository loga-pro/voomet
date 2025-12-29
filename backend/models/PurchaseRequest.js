const mongoose = require('mongoose');

const purchaseRequestItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  area: {
    type: String,
    required: [true, 'Area is required'],
    trim: true,
    maxlength: [100, 'Area cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Code is required'],
    trim: true,
    maxlength: [50, 'Code cannot exceed 50 characters']
  },
  specification: {
    type: String,
    trim: true,
    maxlength: [300, 'Specification cannot exceed 300 characters']
  },
  unitType: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be at least 0.01']
  },
  thickness: {
    type: String,
    trim: true,
    maxlength: [50, 'Thickness cannot exceed 50 characters']
  },
  remark: {
    type: String,
    trim: true,
    maxlength: [150, 'Remark cannot exceed 150 characters']
  },
  image: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { _id: false });

const purchaseRequestSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  overallProduction: {
    type: String,
    required: false,
    trim: true
  },
  items: {
    type: [purchaseRequestItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items) {
        return items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  totalItems: {
    type: Number,
    default: 0
  },
  totalQuantity: {
    type: Number,
    default: 0
  },
  totalEstimatedCost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate totals before saving
purchaseRequestSchema.pre('save', function(next) {
  this.totalItems = this.items.length;
  this.totalQuantity = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  this.totalEstimatedCost = this.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  next();
});

// Update totals before updating
purchaseRequestSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.items) {
    update.totalItems = update.items.length;
    update.totalQuantity = update.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    update.totalEstimatedCost = update.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  }
  next();
});

// Virtual for formatted dates
purchaseRequestSchema.virtual('formattedStartDate').get(function() {
  return this.startDate ? this.startDate.toISOString().split('T')[0] : '';
});

purchaseRequestSchema.virtual('formattedEndDate').get(function() {
  return this.endDate ? this.endDate.toISOString().split('T')[0] : '';
});

// Indexes for better query performance
purchaseRequestSchema.index({ customerName: 1 });
purchaseRequestSchema.index({ projectName: 1 });
purchaseRequestSchema.index({ status: 1 });
purchaseRequestSchema.index({ createdAt: -1 });
purchaseRequestSchema.index({ customerName: 1, projectName: 1 });
purchaseRequestSchema.index({ createdBy: 1, status: 1 });

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

module.exports = PurchaseRequest;
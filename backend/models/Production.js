const mongoose = require('mongoose');

const productionDetailSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  partName: {
    type: String,
    required: [true, 'Part name is required'],
    trim: true
  },
  productionQuantityPlan: {
    type: Number,
    required: [true, 'Production quantity plan is required'],
    min: [0, 'Production quantity plan cannot be negative']
  },
  actualProduction: {
    type: Number,
    required: [true, 'Actual production is required'],
    min: [0, 'Actual production cannot be negative'],
    default: 0
  },
  gap: {
    type: Number,
    default: 0
  },
  reasonForDelay: {
    type: String,
    trim: true,
    enum: ['', 'Yes', 'No'],
    default: ''
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const productionSchema = new mongoose.Schema({
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
  productionDetails: {
    type: [productionDetailSchema],
    required: [true, 'Production details are required'],
    validate: {
      validator: function(value) {
        return value.length > 0;
      },
      message: 'At least one production detail is required'
    }
  },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'delayed'],
    default: 'planned'
  },
  totalPlanned: {
    type: Number,
    default: 0
  },
  totalActual: {
    type: Number,
    default: 0
  },
  totalGap: {
    type: Number,
    default: 0
  },
  efficiency: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
}, {
  timestamps: true
});

// Calculate totals before saving
productionSchema.pre('save', function(next) {
  // Calculate totals from production details
  this.totalPlanned = this.productionDetails.reduce((sum, detail) => 
    sum + (detail.productionQuantityPlan || 0), 0);
  
  this.totalActual = this.productionDetails.reduce((sum, detail) => 
    sum + (detail.actualProduction || 0), 0);
  
  this.totalGap = this.totalPlanned - this.totalActual;
  
  // Calculate gap for each detail
  this.productionDetails.forEach(detail => {
    detail.gap = detail.productionQuantityPlan - detail.actualProduction;
  });
  
  // Calculate efficiency percentage
  this.efficiency = this.totalPlanned > 0 
    ? (this.totalActual / this.totalPlanned) * 100 
    : 0;
  
  // Auto-update status based on dates and production
  const now = new Date();
  if (this.endDate < now && this.totalGap > 0) {
    this.status = 'delayed';
  } else if (this.endDate < now) {
    this.status = 'completed';
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = 'in-progress';
  }
  
  next();
});

// Indexes for better query performance
productionSchema.index({ customerName: 1 });
productionSchema.index({ projectName: 1 });
productionSchema.index({ status: 1 });
productionSchema.index({ startDate: 1 });
productionSchema.index({ endDate: 1 });
productionSchema.index({ createdAt: -1 });
productionSchema.index({ 
  customerName: 1, 
  projectName: 1 
}, { unique: true }); // Ensure unique customer-project combination

// Static method to get production summary
productionSchema.statics.getSummary = async function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalProductions: { $sum: 1 },
        totalPlanned: { $sum: "$totalPlanned" },
        totalActual: { $sum: "$totalActual" },
        avgEfficiency: { $avg: "$efficiency" }
      }
    }
  ]);
};

// Static method to get production by status
productionSchema.statics.getByStatus = async function(status) {
  return this.find({ status }).sort({ startDate: 1 });
};

// Method to calculate production details summary
productionSchema.methods.getDetailsSummary = function() {
  const summary = {
    totalParts: this.productionDetails.length,
    plannedByPart: {},
    actualByPart: {},
    gapsByPart: {}
  };
  
  this.productionDetails.forEach(detail => {
    if (!summary.plannedByPart[detail.partName]) {
      summary.plannedByPart[detail.partName] = 0;
      summary.actualByPart[detail.partName] = 0;
      summary.gapsByPart[detail.partName] = 0;
    }
    
    summary.plannedByPart[detail.partName] += detail.productionQuantityPlan;
    summary.actualByPart[detail.partName] += detail.actualProduction;
    summary.gapsByPart[detail.partName] += detail.gap;
  });
  
  return summary;
};

const Production = mongoose.model('Production', productionSchema);

module.exports = Production;
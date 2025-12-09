const mongoose = require('mongoose');

// Item schema for individual logistic trips/entries
const logisticItemSchema = new mongoose.Schema({
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  vehicleType: {
    type: String,
    required: true,
    trim: true
  },
  transporterName: {
    type: String,
    required: true,
    trim: true
  },
  from: {
    type: String,
    trim: true
  },
  to: {
    type: String,
    trim: true
  },
  kmTravelled: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: true });

const logisticExpenditureSchema = new mongoose.Schema({
  expenditureNumber: {
    type: String,
    default: null
  },
  financialYear: {
    type: String,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },

  items: [logisticItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
logisticExpenditureSchema.index({ expenditureNumber: 1 });
logisticExpenditureSchema.index({ customer: 1, project: 1 });
logisticExpenditureSchema.index({ financialYear: 1 });
logisticExpenditureSchema.index({ status: 1 });
logisticExpenditureSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate total amount from items
logisticExpenditureSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + (item.totalPrice || 0), 0);
  }
  next();
});

// Pre-save middleware to set customerName and projectName from references if needed
logisticExpenditureSchema.pre('save', async function(next) {
  try {
    if (this.customer && this.isModified('customer') && !this.customerName) {
      const Customer = mongoose.model('Customer');
      const customer = await Customer.findById(this.customer);
      if (customer) {
        this.customerName = customer.name || customer.customerName;
      }
    }
    
    if (this.project && this.isModified('project') && !this.projectName) {
      const Project = mongoose.model('Project');
      const project = await Project.findById(this.project);
      if (project) {
        this.projectName = project.name || project.projectName;
        if (project.projectNumber) {
          this.projectNumber = project.projectNumber;
        }
      }
    }
  } catch (error) {
    console.error('Error populating names:', error);
  }
  next();
});

const LogisticExpenditure = mongoose.model('LogisticExpenditure', logisticExpenditureSchema);

module.exports = LogisticExpenditure;
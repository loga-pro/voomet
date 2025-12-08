const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  typeOfWork: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
}, { _id: false });

const projectExpenditureSchema = new mongoose.Schema({
  financialYear: {
    type: String,
    required: true,
    match: /^\d{4}-\d{4}$/
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  projectName: {
    type: String,
    required: true,
    trim: true
  },
  items: [itemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
projectExpenditureSchema.index({ customer: 1, project: 1 });
projectExpenditureSchema.index({ financialYear: 1 });
projectExpenditureSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate total amount
projectExpenditureSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + (item.amount || 0), 0);
  }
  next();
});

// Pre-save middleware to set customerName and projectName (if not already set)
projectExpenditureSchema.pre('save', async function(next) {
  try {
    // Only populate if the names are not already provided
    if (this.isModified('customer') && !this.customerName) {
      const Customer = mongoose.model('Customer');
      const customer = await Customer.findById(this.customer);
      if (customer) {
        this.customerName = customer.customerName; // Use customerName field
      }
    }
    
    if (this.isModified('project') && !this.projectName) {
      const Project = mongoose.model('Project');
      const project = await Project.findById(this.project);
      if (project) {
        this.projectName = project.projectName; // Use projectName field
      }
    }
  } catch (error) {
    console.error('Error populating names:', error);
  }
  next();
});

// Method to calculate total amount from items
projectExpenditureSchema.methods.calculateTotalAmount = function() {
  if (this.items && this.items.length > 0) {
    return this.items.reduce((total, item) => total + (item.amount || 0), 0);
  }
  return 0;
};


const ProjectExpenditure = mongoose.model('ProjectExpenditure', projectExpenditureSchema);

module.exports = ProjectExpenditure;
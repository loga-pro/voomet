const mongoose = require('mongoose');

// Embedded schema for project expenditures within budget
const projectExpenditureSchema = new mongoose.Schema({
  typeOfWork: { type: String, required: true },
  partName: { type: String, required: true },
  quantityToBeOrdered: { type: Number, required: true },
  unit: { type: String, default: 'nos' },
  quantityOrderedActual: { type: Number, default: 0 },
  price: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
}, { _id: false });

// Embedded schema for logistic expenditures within budget
const logisticExpenditureSchema = new mongoose.Schema({
  purpose: { type: String, required: true },
  vehicleType: { type: String, required: true },
  transporterName: { type: String, required: true },
  from: { type: String },
  to: { type: String },
  kmTravelled: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
}, { _id: false });

const projectBudgetSchema = new mongoose.Schema({
  financialYear: { type: String, required: true },
  projectName: { type: String, required: true },
  customerName: { type: String, required: true },
  siteLocation: { type: String, required: true },
  quotedPrice: { type: Number, required: true },
  negotiatedPrice: { type: Number, required: true },
  amountSpent: { type: Number, default: 0 },
  netProfitLoss: { type: Number, default: 0 },
  overallBusinessImpact: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  projectExpenditures: { type: [projectExpenditureSchema], default: [] },
  logisticExpenditures: { type: [logisticExpenditureSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Calculate amountSpent and net profit/loss before saving
projectBudgetSchema.pre('save', function(next) {
  try {
    // Calculate total from project expenditures
    const projectTotal = (this.projectExpenditures || [])
      .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    
    // Calculate total from logistic expenditures
    const logisticTotal = (this.logisticExpenditures || [])
      .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    
    // Update amountSpent
    this.amountSpent = projectTotal + logisticTotal;
    
    // Calculate net profit/loss
    this.netProfitLoss = (this.negotiatedPrice || 0) - (this.amountSpent || 0);
  } catch (err) {
    console.error('Error calculating budget totals:', err);
  }
  next();
});

// Also recalculate on findOneAndUpdate operations
projectBudgetSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update = this.getUpdate();
    
    // Check if we have expenditures in the update
    if (update.projectExpenditures || update.logisticExpenditures || update.$set) {
      const projectExpenditures = update.projectExpenditures || update.$set?.projectExpenditures || [];
      const logisticExpenditures = update.logisticExpenditures || update.$set?.logisticExpenditures || [];
      const negotiatedPrice = update.negotiatedPrice || update.$set?.negotiatedPrice;
      
      // Calculate totals
      const projectTotal = (projectExpenditures || [])
        .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
      const logisticTotal = (logisticExpenditures || [])
        .reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
      
      const amountSpent = projectTotal + logisticTotal;
      
      // Set the calculated values in the update
      if (update.$set) {
        update.$set.amountSpent = amountSpent;
        if (negotiatedPrice !== undefined) {
          update.$set.netProfitLoss = negotiatedPrice - amountSpent;
        }
      } else {
        update.amountSpent = amountSpent;
        if (negotiatedPrice !== undefined) {
          update.netProfitLoss = negotiatedPrice - amountSpent;
        }
      }
    }
  } catch (err) {
    console.error('Error calculating budget totals on update:', err);
  }
  next();
});

module.exports = mongoose.model('ProjectBudget', projectBudgetSchema);

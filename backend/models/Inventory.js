const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  unit: {
    type: String,
    enum: ['nos', 'metres'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
});

const dispatchSchema = new mongoose.Schema({
  date: {
    type: Date
  },
  unit: {
    type: String,
    enum: ['nos', 'metres']
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  }
});

const returnSchema = new mongoose.Schema({
  date: {
    type: Date
  },
  unit: {
    type: String,
    enum: ['nos', 'metres']
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  }
});

const inventorySchema = new mongoose.Schema({
  scopeOfWork: {
    type: String,
    required: true
  },
  partName: {
    type: String,
    required: true
  },
  partPrice: {
    type: Number,
    required: true,
    min: 0
  },
  dateOfReceipt: {
    type: Date,
    required: true
  },
  receipts: [receiptSchema],
  dispatches: [dispatchSchema],
  returns: [returnSchema],
  cumulativeQuantityAtVoomet: {
    type: Number,
    default: 0,
    min: 0
  },
  cumulativePriceValue: {
    type: Number,
    default: 0,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to ensure data integrity
inventorySchema.pre('save', function(next) {
  try {
    // Ensure receipts have valid data
    if (this.receipts && this.receipts.length > 0) {
      this.receipts.forEach(receipt => {
        if (!receipt.date) {
          throw new Error('Receipt date is required');
        }
        if (receipt.quantity <= 0) {
          throw new Error('Receipt quantity must be greater than 0');
        }
      });
    }
    
    // Calculate cumulative values
    this.calculateCumulativeValues();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to calculate cumulative values
inventorySchema.methods.calculateCumulativeValues = function() {
  let totalReceiptQuantity = 0;
  let totalDispatchQuantity = 0;
  let totalReturnQuantity = 0;
  
  // Calculate from receipts
  if (this.receipts && this.receipts.length > 0) {
    totalReceiptQuantity = this.receipts.reduce((sum, receipt) => {
      return sum + (receipt.quantity || 0);
    }, 0);
  }
  
  // Calculate from dispatches
  if (this.dispatches && this.dispatches.length > 0) {
    totalDispatchQuantity = this.dispatches.reduce((sum, dispatch) => {
      return sum + (dispatch.quantity || 0);
    }, 0);
  }
  
  // Calculate from returns
  if (this.returns && this.returns.length > 0) {
    totalReturnQuantity = this.returns.reduce((sum, returnItem) => {
      return sum + (returnItem.quantity || 0);
    }, 0);
  }
  
  // Update cumulative values
  this.cumulativeQuantityAtVoomet = totalReceiptQuantity - totalDispatchQuantity + totalReturnQuantity;
  this.cumulativePriceValue = this.cumulativeQuantityAtVoomet * this.partPrice;
};

module.exports = mongoose.model('Inventory', inventorySchema);
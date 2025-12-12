// models/Inventory.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  workCategory: String,
  partName: {
    type: String,
    required: true
  },
  receiptCategory: {
    type: String,
    enum: ['buy', 'return'],
    default: 'buy'
  },
  customerVendorName: String,
  invoiceNo: String,
  invoiceDate: Date,
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
  upload: String,
  reasonForReturn: String,
  totalValue: {
    type: Number,
    default: 0
  }
}, { _id: false });

const dispatchSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  workCategory: String,
  partName: {
    type: String,
    required: true
  },
  dispatchCategory: {
    type: String,
    enum: ['dispatch', 'return']
  },
  customerVendorName: String,
  invoiceNo: String,
  invoiceDate: Date,
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
  upload: String,
  reasonForRejection: String,
  totalValue: {
    type: Number,
    default: 0
  }
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  customerVendorName: {
    type: String,
    required: true
  },
  reOrderLevel: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Receipts and Dispatches
  receipts: [receiptSchema],
  dispatches: [dispatchSchema],
  
  // Calculated summary fields
  stockAtFactory: {
    type: Number,
    default: 0
  },
  stockValueAtFactory: {
    type: Number,
    default: 0
  },
  stockSentToCustomer: {
    type: Number,
    default: 0
  },
  stockValueSentToCustomer: {
    type: Number,
    default: 0
  },
  stockReturnFromCustomer: {
    type: Number,
    default: 0
  },
  totalStock: {
    type: Number,
    default: 0
  },
  totalStockValue: {
    type: Number,
    default: 0
  },
  inventoryAtFactoryValue: {
    type: Number,
    default: 0
  },
  inventoryAtCustomerEndValue: {
    type: Number,
    default: 0
  },
  inventoryReturnFromCustomerValue: {
    type: Number,
    default: 0
  },
  totalInventoryValue: {
    type: Number,
    default: 0
  },
  
  // Row-specific data for summary table
  rowData: [{
    id: Number,
    category: {
      type: String,
      enum: ['In house', 'Bought-out'],
      default: 'In house'
    },
    vendorNames: [String]
  }],
  
  remarks: String,
}, {
  timestamps: true
});

// Helper function to calculate summary values
function calculateSummaryValues(doc) {
  // Separate regular receipts from returns
  const regularReceipts = doc.receipts.filter(r => r.receiptCategory !== 'return');
  const returns = doc.receipts.filter(r => r.receiptCategory === 'return');
  
  // Calculate totals for regular receipts only
  const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
  const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
  
  // Calculate dispatch totals
  const dispatchesTotal = doc.dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
  const dispatchesQty = doc.dispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
  
  // Calculate return totals
  const returnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
  const returnsQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
  
  // Stock at Factory: Only regular receipts minus dispatches (NO returns)
  doc.stockAtFactory = Math.max(0, regularReceiptsQty - dispatchesQty);
  doc.stockValueAtFactory = regularReceiptsTotal - dispatchesTotal;
  doc.stockSentToCustomer = dispatchesQty;
  doc.stockValueSentToCustomer = dispatchesTotal;
  doc.stockReturnFromCustomer = returnsQty;
  doc.totalStock = Math.max(0, regularReceiptsQty - dispatchesQty) + returnsQty;
  doc.totalStockValue = (regularReceiptsTotal - dispatchesTotal) + returnsTotal;
  doc.inventoryAtFactoryValue = regularReceiptsTotal - dispatchesTotal;
  doc.inventoryAtCustomerEndValue = dispatchesTotal;
  doc.inventoryReturnFromCustomerValue = returnsTotal;
  doc.totalInventoryValue = regularReceiptsTotal + returnsTotal;
}

// Pre-save middleware to calculate summary values
inventorySchema.pre('save', function(next) {
  calculateSummaryValues(this);
  next();
});

// Pre-update middleware to calculate summary values for findOneAndUpdate
inventorySchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Only calculate if receipts or dispatches are being updated
  if (update.receipts !== undefined || update.dispatches !== undefined) {
    const receipts = update.receipts || [];
    const dispatches = update.dispatches || [];
    
    // Separate regular receipts from returns
    const regularReceipts = receipts.filter(r => r.receiptCategory !== 'return');
    const returns = receipts.filter(r => r.receiptCategory === 'return');
    
    // Calculate totals for regular receipts only
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Calculate dispatch totals
    const dispatchesTotal = dispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchesQty = dispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate return totals
    const returnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const returnsQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Update the calculated fields in the update object
    this.set({
      stockAtFactory: Math.max(0, regularReceiptsQty - dispatchesQty),
      stockValueAtFactory: regularReceiptsTotal - dispatchesTotal,
      stockSentToCustomer: dispatchesQty,
      stockValueSentToCustomer: dispatchesTotal,
      stockReturnFromCustomer: returnsQty,
      totalStock: Math.max(0, regularReceiptsQty - dispatchesQty) + returnsQty,
      totalStockValue: (regularReceiptsTotal - dispatchesTotal) + returnsTotal,
      inventoryAtFactoryValue: regularReceiptsTotal - dispatchesTotal,
      inventoryAtCustomerEndValue: dispatchesTotal,
      inventoryReturnFromCustomerValue: returnsTotal,
      totalInventoryValue: regularReceiptsTotal + returnsTotal
    });
  }
  
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
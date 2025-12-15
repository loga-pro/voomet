// models/Inventory.js
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  customerVendorName: {
    type: String,
  },
  workCategory: {
    type: String,
  
  },
  partName: {
    type: String,
  },
  reOrderLevel: {
    type: Number,
    default: 0
  },
  
  // References to Receipt and Dispatch collections
  receipts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt'
  }],
  dispatches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispatch'
  }],
  
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
  stockValueReturnFromCustomer: {
    type: Number,
    default: 0
  },
  stockReject: {
    type: Number,
    default: 0
  },
  stockValueReject: {
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

// Static method to calculate and update summary values
// This should be called after receipts and dispatches are populated
inventorySchema.statics.calculateSummary = async function(inventoryId) {
  try {
    console.log('calculateSummary called for inventory:', inventoryId);
    
    const Receipt = mongoose.model('Receipt');
    const Dispatch = mongoose.model('Dispatch');
    
    const inventory = await this.findById(inventoryId);
    if (!inventory) {
      console.log('Inventory not found:', inventoryId);
      return null;
    }
    
    console.log('Found inventory with receipts:', inventory.receipts.length, 'dispatches:', inventory.dispatches.length);
    
    // Get all receipts and dispatches for this inventory
    const receipts = await Receipt.find({ _id: { $in: inventory.receipts } });
    const dispatches = await Dispatch.find({ _id: { $in: inventory.dispatches } });
    
    console.log('Fetched receipts:', receipts.length, 'dispatches:', dispatches.length);
    
    // Separate regular receipts from returns
    const regularReceipts = receipts.filter(r => r.receiptCategory !== 'return');
    const returns = receipts.filter(r => r.receiptCategory === 'return');
    
    // Separate dispatches by category
    const regularDispatches = dispatches.filter(d => d.dispatchCategory === 'dispatch');
    const dispatchReturns = dispatches.filter(d => d.dispatchCategory === 'return');
    const dispatchRejects = dispatches.filter(d => d.dispatchCategory === 'reject');
    
    // Calculate totals for regular receipts only
    const regularReceiptsTotal = regularReceipts.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const regularReceiptsQty = regularReceipts.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Calculate regular dispatch totals (excluding returns and rejects)
    const regularDispatchesTotal = regularDispatches.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const regularDispatchesQty = regularDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate reject totals
    const rejectsTotal = dispatchRejects.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const rejectsQty = dispatchRejects.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Calculate return totals from both receipts and dispatches
    const receiptReturnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const receiptReturnsQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchReturnsQty = dispatchReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);
    const totalReturnsQty = receiptReturnsQty + dispatchReturnsQty;
    const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;
    
    // Update inventory with calculated values
    inventory.stockAtFactory = Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty);
    inventory.stockValueAtFactory = regularReceiptsTotal - regularDispatchesTotal - rejectsTotal;
    inventory.stockSentToCustomer = regularDispatchesQty;
    inventory.stockValueSentToCustomer = regularDispatchesTotal;
    inventory.stockReturnFromCustomer = totalReturnsQty;
    inventory.stockValueReturnFromCustomer = totalReturnsValue;
    inventory.stockReject = rejectsQty;
    inventory.stockValueReject = rejectsTotal;
    inventory.totalStock = Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty) + totalReturnsQty;
    inventory.totalStockValue = (regularReceiptsTotal - regularDispatchesTotal - rejectsTotal) + totalReturnsValue;
    inventory.inventoryAtFactoryValue = regularReceiptsTotal - regularDispatchesTotal - rejectsTotal;
    inventory.inventoryAtCustomerEndValue = regularDispatchesTotal;
    inventory.inventoryReturnFromCustomerValue = totalReturnsValue;
    inventory.totalInventoryValue = regularReceiptsTotal + totalReturnsValue;

    // Update Row Data (Category & Vendors) based on receipts
    const sortedReceipts = [...receipts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    let latestCategory = 'In house';
    let allVendorNames = [];

    if (sortedReceipts.length > 0) {
        // Use category from most recent receipt
        latestCategory = sortedReceipts[0].category || 'In house';
        
        // Collect all unique vendors from all receipts
        allVendorNames = [...new Set(receipts.flatMap(r => r.vendorNames || (r.vendorName ? [r.vendorName] : [])))].filter(Boolean);
    }

    if (!inventory.rowData || inventory.rowData.length === 0) {
        inventory.rowData = [{
            id: 1,
            category: latestCategory,
            vendorNames: allVendorNames
        }];
    } else {
        inventory.rowData[0].category = latestCategory;
        inventory.rowData[0].vendorNames = allVendorNames;
    }
    inventory.markModified('rowData');

    // Update Re-order Level from Part Master
    try {
      const Part = mongoose.model('Part');
      if (inventory.partName) {
        const part = await Part.findOne({ 
          partName: { $regex: new RegExp(`^${inventory.partName}$`, 'i') },
          scopeOfWork: { $regex: new RegExp(`^${inventory.workCategory}$`, 'i') }
        });
        if (part) {
          inventory.reOrderLevel = part.reorderLevel || 0;
        }
      }
    } catch (err) {
      console.log('Error fetching Part for reorder level:', err);
    }
    
    console.log('Saving inventory with updated summary values');
    await inventory.save();
    console.log('Inventory summary saved successfully');
    return inventory;
  } catch (error) {
    console.error('Error in calculateSummary:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

module.exports = mongoose.model('Inventory', inventorySchema);
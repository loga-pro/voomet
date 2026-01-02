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
  stockReturnToVendor: {
    type: Number,
    default: 0
  },
  stockValueReturnToVendor: {
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
    console.log('calculateSummary called for inventory ID:', inventoryId);
    
    // Register or get models safely
    let Receipt;
    try {
      Receipt = mongoose.model('Receipt');
    } catch (e) {
      Receipt = require('./Receipt');
    }

    let Dispatch;
    try {
      Dispatch = mongoose.model('Dispatch');
    } catch (e) {
      Dispatch = require('./Dispatch');
    }
    
    const inventory = await this.findById(inventoryId);
    if (!inventory) {
      console.warn('Inventory not found during calculateSummary for ID:', inventoryId);
      return null;
    }
    
    console.log(`Processing inventory: "${inventory.partName}" (${inventory.workCategory})`);
    console.log(`Found ${inventory.receipts?.length || 0} receipts and ${inventory.dispatches?.length || 0} dispatches`);
    
    // Get all receipts and dispatches for this inventory
    const receipts = await Receipt.find({ _id: { $in: inventory.receipts || [] } });
    const dispatches = await Dispatch.find({ _id: { $in: inventory.dispatches || [] } });
    
    console.log(`Successfully fetched ${receipts.length} receipt docs and ${dispatches.length} dispatch docs`);
    
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
    
    // Calculate return totals separately
    // Receipt returns = Stock Return to Vendor
    const receiptReturnsTotal = returns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
    const receiptReturnsQty = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    // Dispatch returns = Stock Return from Customer
    const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (d.totalValue || 0), 0);
    const dispatchReturnsQty = dispatchReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    // Total returns for overall stock calculation
    const totalReturnsQty = receiptReturnsQty + dispatchReturnsQty;
    const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;
    
    // Update inventory with calculated values
    // Stock at Factory: Regular receipts - Regular dispatches - Rejects - Returns to Vendor
    inventory.stockAtFactory = Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty - receiptReturnsQty);
    inventory.stockValueAtFactory = Math.max(0, regularReceiptsTotal - regularDispatchesTotal - rejectsTotal - receiptReturnsTotal);
    inventory.stockSentToCustomer = regularDispatchesQty;
    inventory.stockValueSentToCustomer = regularDispatchesTotal;
    
    // Stock Return from Customer (dispatch returns only)
    inventory.stockReturnFromCustomer = dispatchReturnsQty;
    inventory.stockValueReturnFromCustomer = dispatchReturnsTotal;
    
    // Stock Return to Vendor (receipt returns only)
    inventory.stockReturnToVendor = receiptReturnsQty;
    inventory.stockValueReturnToVendor = receiptReturnsTotal;
    
    inventory.stockReject = rejectsQty;
    inventory.stockValueReject = rejectsTotal;
    // Total Stock: Factory stock + Returns from Customer (returns to vendor already subtracted from factory stock)
    inventory.totalStock = Math.max(0, regularReceiptsQty - regularDispatchesQty - rejectsQty - receiptReturnsQty) + dispatchReturnsQty;
    inventory.totalStockValue = Math.max(0, (regularReceiptsTotal - regularDispatchesTotal - rejectsTotal - receiptReturnsTotal) + dispatchReturnsTotal);
    inventory.inventoryAtFactoryValue = Math.max(0, regularReceiptsTotal - regularDispatchesTotal - rejectsTotal - receiptReturnsTotal);
    inventory.inventoryAtCustomerEndValue = regularDispatchesTotal;
    inventory.inventoryReturnFromCustomerValue = dispatchReturnsTotal;
    inventory.totalInventoryValue = Math.max(0, regularReceiptsTotal + totalReturnsValue);

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
      let Part;
      try {
        Part = mongoose.model('Part');
      } catch (e) {
        Part = require('./Part');
      }
      
      if (inventory.partName) {
        const part = await Part.findOne({ 
          partName: { $regex: new RegExp(`^${inventory.partName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          scopeOfWork: { $regex: new RegExp(`^${(inventory.workCategory || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
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
    console.error('CRITICAL ERROR in calculateSummary:', error);
    console.error('Inventory ID:', inventoryId);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

module.exports = mongoose.model('Inventory', inventorySchema);
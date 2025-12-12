# Receipt and Dispatch Data Flow to Inventory Summary Table

## Overview
This document explains how data from `ReceiptForm` and `DispatchForm` flows to the `InventorySummaryTable`.

## Data Flow Architecture

### 1. Data Entry Points
- **ReceiptForm** (`frontend/src/components/Forms/ReceiptForm.jsx`)
  - Used in `Receipts.jsx` page
  - Saves receipt data via `receiptsAPI.create()` or `receiptsAPI.update()`
  - Stores data in the `receipts` collection in the database
  
- **DispatchForm** (`frontend/src/components/Forms/DispatchForm.jsx`)
  - Used in `Dispatches.jsx` page
  - Saves dispatch data via `dispatchesAPI.create()` or `dispatchesAPI.update()`
  - Stores data in the `dispatches` collection in the database

### 2. Data Aggregation
- **InventoryManagement.jsx** (`frontend/src/pages/InventoryManagement.jsx`)
  - Fetches ALL receipts from the database via `receiptsAPI.getAll()`
  - Fetches ALL dispatches from the database via `dispatchesAPI.getAll()`
  - Aggregates data by creating unique combinations of `workCategory` + `partName`
  - Passes aggregated data to `InventorySummaryTable`

### 3. Data Display
- **InventorySummaryTable** (`frontend/src/components/Inventory/InventorySummaryTable.jsx`)
  - Receives `receipts` and `dispatches` arrays as props
  - Calculates stock values for each work category and part name combination:
    - **Stock at Factory**: Regular receipts (buy) minus dispatches
    - **Stock sent to Customer**: Total dispatches
    - **Stock return from Customer**: Return receipts
    - **Total Stock**: Factory stock + Returns

## How the Data Reflects

When you:
1. **Add a Receipt** in `ReceiptForm`:
   - Data is saved to the `receipts` collection
   - When you navigate to Inventory Management, it fetches all receipts
   - The `InventorySummaryTable` recalculates stock values including the new receipt
   - **Stock at Factory** increases for that part

2. **Add a Dispatch** in `DispatchForm`:
   - Data is saved to the `dispatches` collection
   - When you navigate to Inventory Management, it fetches all dispatches
   - The `InventorySummaryTable` recalculates stock values including the new dispatch
   - **Stock at Factory** decreases, **Stock sent to Customer** increases

## Bug Fixed

### Issue in DispatchForm
**Problem**: Invoice fields were never showing in the dispatch form because of an incorrect conditional check.

**Location**: `DispatchForm.jsx` line 211

**Before**:
```javascript
{formData.receiptCategory === 'return' && (
  // Invoice fields
)}
```

**After**:
```javascript
{formData.dispatchCategory === 'dispatch' && (
  // Invoice fields
)}
```

**Impact**: 
- Previously, invoice fields would never display because `receiptCategory` doesn't exist in dispatch form data
- Now, invoice fields correctly display when dispatch category is "dispatch"
- This ensures proper data capture for dispatches, which then reflects correctly in the Inventory Summary Table

## Data Calculation Logic

The `InventorySummaryTable` uses the `calculateStockForCombination` function to compute stock values:

```javascript
const calculateStockForCombination = (workCategory, partName) => {
  // Filter receipts and dispatches for this specific combination
  const matchingReceipts = receipts.filter(r => 
    r.workCategory === workCategory && r.partName === partName
  );
  
  const matchingDispatches = dispatches.filter(d => 
    d.workCategory === workCategory && d.partName === partName
  );
  
  // Separate regular receipts from returns
  const regularReceipts = matchingReceipts.filter(r => r.receiptCategory !== 'return');
  const returns = matchingReceipts.filter(r => r.receiptCategory === 'return');
  
  // Calculate totals
  return {
    stockAtFactory: regularReceiptsQty - dispatchesQty,
    stockSentToCustomer: dispatchesQty,
    stockReturnFromCustomer: returnsQty,
    totalStock: (regularReceiptsQty - dispatchesQty) + returnsQty
  };
};
```

## Verification Steps

To verify the data flow is working correctly:

1. **Add a Receipt**:
   - Go to Receipts page
   - Add a new receipt with specific work category and part name
   - Navigate to Inventory Management
   - Verify the stock values are updated for that combination

2. **Add a Dispatch**:
   - Go to Dispatches page
   - Add a new dispatch for the same work category and part name
   - Navigate to Inventory Management
   - Verify stock at factory decreased and stock sent to customer increased

3. **Add a Return Receipt**:
   - Go to Receipts page
   - Add a receipt with category "return"
   - Navigate to Inventory Management
   - Verify "Stock return from Customer" column shows the return quantity

## Summary

The data flow is **already correctly implemented**. The forms save to their respective API endpoints, and the Inventory Management page fetches and aggregates this data for display in the summary table. The only issue was the bug in `DispatchForm` which has now been fixed.

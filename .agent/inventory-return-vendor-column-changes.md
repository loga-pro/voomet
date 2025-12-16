# Inventory Management - Stock Return to Vendor Column Addition

## Summary
Added separate columns to distinguish between "Stock Return from Customer" and "Stock Return to Vendor" in the Inventory Management system.

## Changes Made

### 1. Backend Model (`backend/models/Inventory.js`)
**Added new fields:**
- `stockReturnToVendor` (Number): Quantity of stock returned to vendor
- `stockValueReturnToVendor` (Number): Value of stock returned to vendor

**Updated `calculateSummary` method:**
- Separated return calculations:
  - Receipt returns (receiptCategory === 'return') → `stockReturnToVendor` and `stockValueReturnToVendor`
  - Dispatch returns (dispatchCategory === 'return') → `stockReturnFromCustomer` and `stockValueReturnFromCustomer`
- Previously, both types of returns were combined into `stockReturnFromCustomer`

### 2. Frontend Table (`frontend/src/components/Inventory/InventorySummaryTable.jsx`)
**Updated `calculateStockForCombination` function:**
- Separated return calculations to match backend logic
- Receipt returns → `stockReturnToVendor`
- Dispatch returns → `stockReturnFromCustomer`

**Added new table columns:**
- "Stock Return to Vendor" (quantity)
- "Stock value Return to Vendor" (₹)
- Positioned after "Stock Return from Customer" columns

### 3. Reports Page (`frontend/src/pages/Reports.jsx`)
**Updated inventory view modal:**
- Added display fields for:
  - Stock Return to Vendor
  - Stock value Return to Vendor
- Positioned after Stock Return from Customer fields

### 4. PDF Report Generator (`frontend/src/components/Reports/BackgroundReportPDFGenerator.js`)
**Updated inventory report configuration:**
- Added new header columns:
  - `stockReturnToVendor`: "Stock Return to Vendor"
  - `stockValueReturnToVendor`: "Stock Value Return to Vendor (₹)"
- Added alternative field name mappings for data extraction

## Data Flow

### Receipt with Category "return"
```
Receipt (receiptCategory: 'return')
  ↓
Inventory.calculateSummary()
  ↓
stockReturnToVendor += quantity
stockValueReturnToVendor += totalValue
  ↓
Stock at Factory -= quantity (SUBTRACTED)
Stock Value at Factory -= totalValue (SUBTRACTED)
```

### Dispatch with Category "return"
```
Dispatch (dispatchCategory: 'return')
  ↓
Inventory.calculateSummary()
  ↓
stockReturnFromCustomer += quantity
stockValueReturnFromCustomer += totalValue
  ↓
Total Stock += quantity (ADDED)
Total Stock Value += totalValue (ADDED)
```

## Calculation Logic

### Stock at Factory
```
Stock at Factory = Regular Receipts - Regular Dispatches - Rejects - Returns to Vendor
```

### Total Stock
```
Total Stock = Stock at Factory + Returns from Customer
            = (Regular Receipts - Regular Dispatches - Rejects - Returns to Vendor) + Returns from Customer
```

**Key Points:**
- ✅ Returns to Vendor are **SUBTRACTED** from Stock at Factory (items leaving factory)
- ✅ Returns from Customer are **ADDED** to Total Stock (items coming back to us)
- ✅ Rejects are subtracted from both Stock at Factory and Total Stock

## Table Column Order (Inventory Summary)
1. S.No
2. Work Category
3. Part Name
4. Category
5. Vendor Name
6. Re-order level
7. Stock at Factory
8. Stock value at Factory
9. Stock sent to Customer
10. Stock value sent to Customer
11. **Stock return from Customer** (from Dispatches)
12. **Stock value return from Customer** (from Dispatches)
13. **Stock Return to Vendor** ⭐ NEW
14. **Stock value Return to Vendor** ⭐ NEW
15. Stock Reject
16. Stock value Reject
17. Total Stock (After Return)
18. Total Stock value (After Return)

## Testing Recommendations

1. **Create a Receipt with return category:**
   - Go to Receipts
   - Add a new receipt with `receiptCategory: 'return'`
   - Verify it appears in "Stock Return to Vendor" column

2. **Create a Dispatch with return category:**
   - Go to Dispatches
   - Add a new dispatch with `dispatchCategory: 'return'`
   - Verify it appears in "Stock return from Customer" column

3. **Verify calculations:**
   - Check that the values are correctly separated
   - Ensure Total Stock calculation includes both types of returns

4. **Test Reports:**
   - Generate inventory report PDF
   - Verify new columns appear in the PDF
   - Check that data is correctly displayed

5. **Test View Modal:**
   - Click "View" on an inventory item in Reports
   - Verify both return fields are displayed

## Notes

- The separation is based on the source of the return:
  - **Receipt returns** = Items returned TO vendor (we sent back to supplier)
  - **Dispatch returns** = Items returned FROM customer (customer sent back to us)
- Total stock calculation still includes both types of returns
- All currency values are formatted with ₹ symbol
- The changes are backward compatible - existing data will work correctly

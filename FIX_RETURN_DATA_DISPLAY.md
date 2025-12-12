# Fix Applied: Return Data Not Showing in Inventory Table

## Problem Identified

The "Stock return from Customer" column in the Inventory Summary Table was showing **0** even though there was a dispatch with category "RETURN" (5 units returned from customer).

### Root Cause

The calculation logic was only looking for returns in **receipts**:

```javascript
// OLD CODE (INCORRECT)
const returns = matchingReceipts.filter(r => r.receiptCategory === 'return');
```

However, returns from customers are tracked as **dispatches** with `dispatchCategory = 'return'`, not receipts.

### Data Model Clarification

There are two types of returns in the system:

1. **Receipt Returns** (`receiptCategory = 'return'`):
   - Items you return to vendor/supplier
   - Defective items sent back to supplier
   - Tracked in receipts

2. **Dispatch Returns** (`dispatchCategory = 'return'`):
   - Items returned FROM customer
   - Customer returning defective/rejected items
   - Tracked in dispatches ✅ (This is what you have)

## Solution Applied

Updated `InventorySummaryTable.jsx` to handle both types of returns:

### Changes Made

1. **Separate regular dispatches from dispatch returns** (Lines 29-30):
   ```javascript
   const regularDispatches = matchingDispatches.filter(d => d.dispatchCategory !== 'return');
   const dispatchReturns = matchingDispatches.filter(d => d.dispatchCategory === 'return');
   ```

2. **Calculate both receipt and dispatch returns** (Lines 37-44):
   ```javascript
   const receiptReturnsTotal = receiptReturns.reduce((sum, r) => sum + (r.totalValue || 0), 0);
   const receiptReturnsQty = receiptReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
   
   const dispatchReturnsTotal = dispatchReturns.reduce((sum, d) => sum + (d.totalValue || 0), 0);
   const dispatchReturnsQty = dispatchReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);
   
   const totalReturnsQty = receiptReturnsQty + dispatchReturnsQty;
   const totalReturnsValue = receiptReturnsTotal + dispatchReturnsTotal;
   ```

3. **Use only regular dispatches for "Stock sent to Customer"** (Lines 52-53):
   ```javascript
   stockSentToCustomer: regularDispatchesQty,
   stockValueSentToCustomer: regularDispatchesTotal,
   ```

4. **Show total returns from both sources** (Lines 56-57):
   ```javascript
   stockReturnFromCustomer: totalReturnsQty,
   stockValueReturnFromCustomer: totalReturnsValue,
   ```

## Expected Behavior

Based on your data:
- **Receipt**: 120 units bought (USB charging sockets)
- **Dispatch**: 50 units sent to customer
- **Dispatch Return**: 5 units returned from customer

### Before Fix:
| Column | Value |
|--------|-------|
| Stock at Factory | 145 ❌ (120 - 55 = 65, but showing 145) |
| Stock sent to Customer | 55 ❌ (should be 50) |
| Stock return from Customer | 0 ❌ (should be 5) |
| Total Stock | 145 |

### After Fix:
| Column | Value |
|--------|-------|
| Stock at Factory | 70 ✅ (120 - 50 = 70) |
| Stock sent to Customer | 50 ✅ (only regular dispatches) |
| Stock return from Customer | 5 ✅ (dispatch returns) |
| Total Stock | 75 ✅ (70 + 5) |

## Stock Calculation Logic

```
Regular Receipts (Buy):        120 units
Regular Dispatches (Dispatch): -50 units
                               ─────────
Stock at Factory:               70 units

Dispatch Returns (Return):      +5 units
                               ─────────
Total Stock:                    75 units
```

## Files Modified

- `frontend/src/components/Inventory/InventorySummaryTable.jsx`

## Verification Steps

1. **Navigate to Inventory Management**
2. **Check the row** for "USB charging sockets"
3. **Verify columns**:
   - Stock at Factory: 70
   - Stock sent to Customer: 50
   - Stock return from Customer: 5
   - Total Stock: 75

## Related Concepts

### Dispatch Categories:
- **dispatch**: Regular dispatch to customer
- **return**: Items returned FROM customer

### Receipt Categories:
- **buy**: Regular purchase from vendor
- **return**: Items returned TO vendor

The system now correctly handles both types of returns! 🎉

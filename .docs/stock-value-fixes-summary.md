# Stock and Value Calculation Fixes

## Issues Fixed

### 1. **Negative Stock Values** ✅
**Problem:** Stock values were showing negative amounts (e.g., ₹-44911180.00) even though stock quantities were correctly capped at 0.

**Root Cause:** In `Inventory.js`, the `calculateSummary` method was using `Math.max(0, ...)` for stock quantities but not for stock values, allowing values to go negative.

**Solution:** Applied `Math.max(0, ...)` to all stock value calculations:
- `stockValueAtFactory`
- `totalStockValue`
- `inventoryAtFactoryValue`
- `totalInventoryValue`

**Files Modified:**
- `backend/models/Inventory.js` (lines 172, 187-189, 192)

---

### 2. **Receipt Return Validation for Bought-Out Parts** ✅
**Problem:** Users could create receipt returns (returns to vendor) that exceeded the available stock, causing negative inventory values.

**Root Cause:** No validation existed to check if there was enough stock available before allowing a return to vendor.

**Solution:** Added comprehensive validation logic that:
1. Checks if the part is categorized as "bought_out" in the Part Master
2. Calculates available stock: `Total Received - Total Dispatched - Already Returned`
3. Prevents returns that exceed available stock
4. Provides clear error messages showing:
   - Requested return quantity
   - Available quantity for return
   - Breakdown (Received, Dispatched, Already Returned)

**Files Modified:**
- `backend/routes/receipts.js` (POST route - lines 66-113)
- `backend/routes/receipts.js` (PUT route - lines 204-254)

---

### 3. **Dispatch Validation to Prevent Over-Dispatching** ✅
**Problem:** Users could dispatch more units than available in stock (e.g., received 100 units but dispatched 101 units).

**Root Cause:** No validation existed to check available stock before allowing dispatches.

**Solution:** Added comprehensive validation logic that:
1. Calculates available stock: `Total Received - Total Dispatched - Total Rejected - Returned to Vendor`
2. Prevents dispatches (including regular dispatches and rejects) that exceed available stock
3. Prevents dispatches if no inventory exists (must receive items first)
4. Provides clear error messages showing:
   - Requested dispatch quantity
   - Available quantity in stock
   - Breakdown (Received, Already Dispatched, Rejected, Returned to Vendor)

**Files Modified:**
- `backend/routes/dispatches.js` (POST route - lines 66-113)
- `backend/routes/dispatches.js` (PUT route - lines 170-214)

---

## How It Works

### Stock Calculation Flow
```
Regular Receipts (Buy) = Total items purchased from vendor
Regular Dispatches = Total items sent to customers
Receipt Returns = Items returned to vendor
Dispatch Returns = Items returned from customers
Rejects = Rejected items

Stock at Factory = Regular Receipts - Regular Dispatches - Rejects - Receipt Returns
(Now capped at minimum 0 for both quantity and value)
```

### Return Validation Logic
When creating/updating a receipt with `receiptCategory = 'return'`:

1. **Check Part Type:** Only validate for `bought_out` parts
2. **Calculate Available Stock:**
   ```
   Available for Return = Total Received - Total Dispatched - Already Returned
   ```
3. **Validate:** If requested return quantity > available stock, reject with error message
4. **Error Message Example:**
   ```
   "Cannot return 100 units. Only 50 units available for return to vendor. 
   (Received: 1001, Dispatched: 1001, Already Returned: 0)"
   ```

### Dispatch Validation Logic
When creating/updating a dispatch with `dispatchCategory = 'dispatch'` or `'reject'`:

1. **Calculate Available Stock:**
   ```
   Available Stock = Total Received - Total Dispatched - Total Rejected - Returned to Vendor
   ```
2. **Validate:** If requested dispatch quantity > available stock, reject with error message
3. **Check Inventory Exists:** If no inventory record exists, reject (must receive items first)
4. **Error Message Example:**
   ```
   "Cannot dispatch 101 units. Only 100 units available in stock.
   (Received: 100, Already Dispatched: 0, Rejected: 0, Returned to Vendor: 0)"
   ```

---

## Business Rules Enforced

1. ✅ **Stock values cannot be negative** - All value calculations are capped at 0
2. ✅ **Stock quantities cannot be negative** - Already implemented, now values match
3. ✅ **Returns to vendor cannot exceed available stock** - For bought-out parts only
4. ✅ **Dispatches cannot exceed available stock** - For all parts (dispatch and reject)
5. ✅ **Cannot dispatch without inventory** - Must receive items first
6. ✅ **Clear error messages** - Users know exactly why an operation was rejected

---

## Testing Recommendations

1. **Test Negative Value Prevention:**
   - Create receipts and dispatches that would previously cause negative values
   - Verify all stock values show ₹0.00 minimum

2. **Test Return Validation:**
   - Try to return more items than available
   - Verify error message is clear and accurate
   - Test with both bought-out and in-house parts

3. **Test Dispatch Validation:**
   - Try to dispatch more items than available (e.g., receive 100, dispatch 101)
   - Verify error message shows available stock and breakdown
   - Try to dispatch without any receipts (should fail)
   - Try to reject more items than available

4. **Test Edge Cases:**
   - Dispatch exactly the available quantity (should succeed)
   - Dispatch 1 more than available (should fail)
   - Update existing dispatches (should recalculate correctly)
   - Return exactly the available quantity (should succeed)
   - Return 1 more than available (should fail)
   - Update existing returns (should recalculate correctly)

---

## Notes

- **Receipt return validation** only applies to **bought-out parts** (purchased from vendors)
- **Dispatch validation** applies to **all parts** (both bought-out and in-house)
- In-house parts don't have return-to-vendor restrictions, but still have dispatch limits
- The system now prevents data inconsistencies at the API level before they reach the database
- All existing negative values will be corrected on the next inventory recalculation

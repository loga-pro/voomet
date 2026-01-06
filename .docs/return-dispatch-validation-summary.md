# Return Dispatch Validation - Implementation Summary

## Overview
Implemented smart validation for **return dispatches** to ensure users can only return items that were previously dispatched to a specific customer. The system now tracks dispatch history and validates returns against actual dispatch records.

## Problem Solved
Previously, users could create a "return" dispatch for any quantity, even if nothing was ever dispatched to that customer. Now the system:
- ✅ Tracks what was dispatched to each customer (by customer name, part name, and work category)
- ✅ Calculates returnable quantity = Total Dispatched - Already Returned
- ✅ Shows "Returnable: X units" instead of "Available: X units" for returns
- ✅ Prevents returning more than what was dispatched

## How It Works

### For Regular Dispatches
- Shows **"Available: X units"** based on stock at factory
- Validates against: Total Received - Dispatched - Rejected - Returned to Vendor

### For Return Dispatches
- Shows **"Returnable: X units"** based on dispatch history
- Validates against: Total Dispatched to Customer - Already Returned from Customer
- Filters by: Customer Name + Part Name + Work Category

## Example Scenario

### Scenario 1: Valid Return
1. Previously dispatched **10 units** of "Mouse" to "Client Aaa"
2. Already returned **3 units** from "Client Aaa"
3. User selects "Return" category and "Client Aaa"
4. Selects "Mouse" part
5. System shows: **"Returnable: 7 units"** (10 - 3 = 7)
6. User can return up to 7 units ✅

### Scenario 2: Invalid Return
1. Never dispatched "Keyboard" to "Client Bbb"
2. User selects "Return" category and "Client Bbb"
3. Selects "Keyboard" part
4. System shows: **"Returnable: 0 units"**
5. User tries to return 5 units
6. Warning appears: **"⚠️ Only 0 units can be returned from this customer!"**
7. Form submission blocked ❌

## Technical Implementation

### New State Variables
```javascript
const [allDispatches, setAllDispatches] = useState([]);
```

### Helper Function: getReturnableQuantity
```javascript
const getReturnableQuantity = (customerName, partName, workCategory) => {
  // Find all dispatches to this customer for this part
  const customerDispatches = allDispatches.filter(
    d => d.customerName === customerName &&
         d.partName === partName &&
         d.workCategory === workCategory &&
         d.dispatchCategory === 'dispatch'
  );

  // Find all returns from this customer for this part
  const customerReturns = allDispatches.filter(
    d => d.customerName === customerName &&
         d.partName === partName &&
         d.workCategory === workCategory &&
         d.dispatchCategory === 'return'
  );

  // Calculate: Total dispatched - Total already returned
  const totalDispatched = customerDispatches.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const totalReturned = customerReturns.reduce((sum, d) => sum + (d.quantity || 0), 0);

  return Math.max(0, totalDispatched - totalReturned);
};
```

### Dynamic Stock Calculation
```javascript
// In handlePartChange
let availableStock;
if (formData.dispatchCategory === 'return') {
  availableStock = getReturnableQuantity(formData.customerName, partName, workCategory);
} else {
  availableStock = getAvailableStock(partName, workCategory);
}
```

### Auto-Recalculation
When user changes customer or dispatch category, the system automatically recalculates returnable quantities for all line items.

## Files Modified

1. **frontend/src/components/Forms/DispatchForm.jsx**
   - Added `allDispatches` state (line 49)
   - Added `dispatchesAPI` import (line 4)
   - Updated fetch to get dispatches (lines 84-99)
   - Added `getReturnableQuantity` helper (lines 121-148)
   - Updated `handlePartChange` to use returnable quantity for returns (lines 187-201)
   - Added useEffect to recalculate on customer/category change (lines 101-136)
   - Updated quantity validation messages (lines 267-278)
   - Updated display text to show "Returnable" vs "Available" (lines 601-609)

## User Experience

### Regular Dispatch Flow
1. Select "Dispatch" category
2. Select customer
3. Select part → See "Available: 5 units"
4. Enter quantity ≤ 5 → ✅ Success

### Return Dispatch Flow
1. Select "Return" category
2. Select customer (e.g., "Client Aaa")
3. Select part → See "Returnable: 3 units" (based on dispatch history)
4. Enter quantity ≤ 3 → ✅ Success
5. Enter quantity > 3 → ❌ Red border + Warning: "Only 3 units can be returned from this customer!"

## Benefits

1. **Data Integrity**: Can't return items that were never dispatched
2. **Customer-Specific**: Tracks returns per customer accurately
3. **Real-Time Validation**: Immediate feedback as user types
4. **Clear Messaging**: Different labels for "Available" vs "Returnable"
5. **Automatic Updates**: Recalculates when customer or category changes

## Edge Cases Handled

- ✅ Customer with no dispatch history → Shows 0 returnable
- ✅ Partial returns → Correctly calculates remaining returnable quantity
- ✅ Multiple dispatches to same customer → Sums all dispatches
- ✅ Changing customer → Recalculates returnable quantity
- ✅ Switching between dispatch and return → Updates validation logic

## Testing Checklist

- [ ] Dispatch 10 units to Customer A
- [ ] Try to return 5 units from Customer A → Should work
- [ ] Try to return 7 units from Customer A → Should show warning (only 5 left)
- [ ] Try to return from Customer B (no dispatch history) → Should show 0 returnable
- [ ] Change from "Dispatch" to "Return" → Should update display text
- [ ] Change customer while in return mode → Should recalculate returnable quantity

## Next Steps

Consider implementing similar logic for:
- Receipt returns (can only return to vendor what was received from that vendor)
- Reject tracking (ensure rejects don't exceed dispatched quantities)

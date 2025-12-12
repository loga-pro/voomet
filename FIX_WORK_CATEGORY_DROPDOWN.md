# Fix Applied: Work Category Dropdown Empty

## Problem Identified

The "Work Category" dropdown in both `ReceiptForm` and `DispatchForm` was empty, preventing users from selecting a work category.

### Root Cause

The work categories were being extracted from **existing receipts/dispatches**:

```javascript
// OLD CODE (INCORRECT)
const workCategories = [...new Set(receiptsData.map(r => r.workCategory))].filter(Boolean);
```

This caused the dropdown to be empty when:
- No receipts/dispatches existed yet
- This was the first receipt/dispatch being created

### Data Model Issue

Work categories are not a standalone field - they come from the **Parts Master** data:
- Parts have a `scopeOfWork` field (e.g., 'electrical', 'data', 'cctv', etc.)
- This `scopeOfWork` should be used as the work category

## Solutions Applied

### 1. Fixed Receipts Page (`Receipts.jsx`)

**Changed** (Line 95-96):
```javascript
// Get work categories from parts' scopeOfWork field
const workCategories = [...new Set(partsData.map(p => p.scopeOfWork))].filter(Boolean);
```

### 2. Fixed Dispatches Page (`Dispatches.jsx`)

**Changed** (Line 95-96):
```javascript
// Get work categories from parts' scopeOfWork field
const workCategories = [...new Set(partsData.map(p => p.scopeOfWork))].filter(Boolean);
```

### 3. Auto-populate Work Category in ReceiptForm

**Added** (Line 54):
```javascript
workCategory: selectedPart.scopeOfWork || '',
```

When a user selects a part, the work category is now automatically filled from that part's `scopeOfWork`.

### 4. Auto-populate Work Category in DispatchForm

**Added** (Line 53):
```javascript
workCategory: selectedPart.scopeOfWork || '',
```

Same auto-population behavior for dispatch forms.

## Expected Behavior

### Before Fix:
1. Open Receipt/Dispatch form
2. Work Category dropdown is **empty** ❌
3. Cannot select a work category

### After Fix:
1. Open Receipt/Dispatch form
2. Work Category dropdown shows options from Parts Master:
   - electrical
   - data
   - cctv
   - partion
   - fire_and_safety
   - access
3. Select a Part Name → Work Category **auto-fills** ✅
4. Can manually change work category if needed

## Workflow

1. **Part Master** defines parts with `scopeOfWork`
2. **Receipt/Dispatch Forms** use these `scopeOfWork` values as work categories
3. When you select a part, the work category auto-fills
4. Data is saved with the work category
5. **Inventory Management** groups stock by `workCategory` + `partName`

## Files Modified

1. `frontend/src/pages/Receipts.jsx` - Fixed work category extraction
2. `frontend/src/pages/Dispatches.jsx` - Fixed work category extraction
3. `frontend/src/components/Forms/ReceiptForm.jsx` - Added auto-population
4. `frontend/src/components/Forms/DispatchForm.jsx` - Added auto-population

## Verification Steps

1. **Check Parts Master** has parts with scopeOfWork defined
2. **Open Receipts page** → Click "Add Receipt"
3. **Verify** Work Category dropdown shows options
4. **Select a Part Name** → Work Category should auto-fill
5. **Repeat** for Dispatches page

## Related Fixes

This fix complements the previous fix for inventory data flow, ensuring that:
- Work categories are properly populated in forms
- Data flows correctly to the Inventory Summary Table
- Stock calculations group by the correct work category

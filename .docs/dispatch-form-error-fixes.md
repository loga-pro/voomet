# Dispatch Form Error Fix

## Date: 2025-12-17

## Issues Identified

### 1. React Warning in Invoice Component
**Error Message:**
```
Warning: Received `true` for a non-boolean attribute `jsx`.
Warning: Received `true` for a non-boolean attribute `global`.
```

**Root Cause:**
The `<style jsx global>` syntax is a Next.js/styled-jsx specific feature that doesn't work in standard React. React was treating `jsx` and `global` as HTML attributes.

**Fix Applied:**
Changed `<style jsx global>` to `<style>` in `/frontend/src/components/ProformaInvoice/Invoice.jsx` (line 135).

### 2. Dispatch Creation Error (500 Internal Server Error)
**Error Message:**
```
POST http://localhost:5000/api/inventory/dispatches 500 (Internal Server Error)
```

**Root Cause:**
Same issue as the receipt form - the `DispatchForm.jsx` component was submitting dispatch data with a `lineItems` array structure:
```javascript
{
  date: "...",
  dispatchNo: "...",
  lineItems: [
    { partName: "...", workCategory: "...", quantity: ... },
    { partName: "...", workCategory: "...", quantity: ... }
  ]
}
```

However, the backend `Dispatch` model expects individual fields per dispatch:
```javascript
{
  date: "...",
  invoiceNo: "...",
  partName: "...",
  workCategory: "...",
  quantity: ...
}
```

This is a fundamental data model mismatch. The Dispatch schema is designed for ONE part per dispatch document.

**Fix Applied:**
Modified the `handleSubmit` function in `/frontend/src/components/Forms/DispatchForm.jsx` to:
- Create **one dispatch document per line item** when creating new dispatches
- For editing, update the existing dispatch with the first line item's data
- Transform the lineItems array into individual dispatch objects with the correct field structure
- Map `dispatchNo` → `invoiceNo` and `dispatchDate` → `invoiceDate` to match backend schema

## Data Flow

### Dispatch Creation Flow (After Fix)
1. User fills out dispatch form with multiple line items
2. Frontend creates separate dispatch documents for each line item
3. Each dispatch is sent to `POST /api/inventory/dispatches`
4. Backend creates a Dispatch document and links it to the appropriate Inventory record
5. Inventory summary is recalculated

## Field Mapping

The dispatch form uses different field names than the backend model:
- `dispatchNo` (frontend) → `invoiceNo` (backend)
- `dispatchDate` (frontend) → `invoiceDate` (backend)
- `priceWithoutGST` (frontend) → `invoiceValueWithoutGST` (backend)
- `gstAmount` (frontend) → `gstValue` (backend)

## Testing Recommendations

### Test Dispatch Creation
1. Create a new dispatch with a single line item
2. Create a new dispatch with multiple line items
3. Verify that multiple dispatch documents are created (one per line item)
4. Verify that all dispatches are linked to the correct Inventory records
5. Verify that Inventory summary calculations are correct

### Test Dispatch Updates
1. Edit an existing dispatch
2. Verify that only the first line item's data is used for the update
3. Verify that inventory records are updated correctly

## Known Limitations

1. **Dispatch Editing**: When editing a dispatch that was created with multiple line items, only the first line item's data will be used for the update. This is because the backend model supports one part per dispatch.

2. **Invoice Number Duplication**: Multiple dispatches created from a single form submission will all have the same invoice number. This is expected behavior since they're all from the same physical dispatch.

## Files Modified

1. `/frontend/src/components/ProformaInvoice/Invoice.jsx` - Fixed React warning for style tag
2. `/frontend/src/components/Forms/DispatchForm.jsx` - Fixed dispatch submission to create one dispatch per line item

## Related Fixes

This fix follows the same pattern as the receipt form fix implemented earlier today. Both forms were updated to match the backend's single-item-per-document data model.

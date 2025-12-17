# Receipt and Part Update Error Fixes

## Date: 2025-12-17

## Issues Identified

### 1. Part Update Error (500 Internal Server Error)
**Error Message:**
```
Cast to ObjectId failed for value "Electrical tape…string) at path "receipts" because of "BSONError"
```

**Root Cause:**
The cascading update logic in `/backend/routes/parts.js` (lines 92-106) was incorrectly attempting to update `partName` fields within `Inventory.receipts`, `Inventory.dispatches`, and `Inventory.returns` arrays. However, these arrays contain **ObjectId references** to separate Receipt and Dispatch collections, not embedded documents with a `partName` field.

**Fix Applied:**
Modified the PUT `/:id` route in `/backend/routes/parts.js` to:
- Update the `Receipt` collection directly (where `partName` actually exists)
- Update the `Dispatch` collection directly (where `partName` actually exists)
- Update the `Inventory` collection's root-level `partName` field
- Continue updating BOQ and ProjectBudget collections as before

**Code Changes:**
- File: `/backend/routes/parts.js`
- Lines: 85-135 (cascading update logic)
- Also fixed the DELETE route (lines 163-180) to check for child records in the correct collections

### 2. Receipt Creation Error (400 Bad Request)
**Root Cause:**
The `ReceiptForm.jsx` component was submitting receipt data with a `lineItems` array structure:
```javascript
{
  date: "...",
  invoiceNo: "...",
  lineItems: [
    { partName: "...", workCategory: "...", quantity: ... },
    { partName: "...", workCategory: "...", quantity: ... }
  ]
}
```

However, the backend `Receipt` model expects individual fields per receipt:
```javascript
{
  date: "...",
  invoiceNo: "...",
  partName: "...",
  workCategory: "...",
  quantity: ...
}
```

This is a fundamental data model mismatch. The Receipt schema is designed for ONE part per receipt document.

**Fix Applied:**
Modified the `handleSubmit` function in `/frontend/src/components/Forms/ReceiptForm.jsx` to:
- Create **one receipt document per line item** when creating new receipts
- For editing, update the existing receipt with the first line item's data
- Transform the lineItems array into individual receipt objects with the correct field structure

**Code Changes:**
- File: `/frontend/src/components/Forms/ReceiptForm.jsx`
- Lines: 224-260 (handleSubmit function)

## Data Flow

### Receipt Creation Flow (After Fix)
1. User fills out receipt form with multiple line items
2. Frontend creates separate receipt documents for each line item
3. Each receipt is sent to `POST /api/inventory/receipts`
4. Backend creates a Receipt document and links it to the appropriate Inventory record
5. Inventory summary is recalculated

### Part Update Flow (After Fix)
1. User updates a part's name
2. Backend finds all Receipt documents with the old partName
3. Backend finds all Dispatch documents with the old partName
4. Backend finds all Inventory documents with the old partName
5. Backend updates BOQ and ProjectBudget collections
6. All updates are executed in parallel using Promise.all()

## Testing Recommendations

### Test Receipt Creation
1. Create a new receipt with a single line item
2. Create a new receipt with multiple line items
3. Verify that multiple receipt documents are created (one per line item)
4. Verify that all receipts are linked to the correct Inventory records
5. Verify that Inventory summary calculations are correct

### Test Part Updates
1. Create a part with a specific name
2. Create receipts and dispatches using that part
3. Update the part's name
4. Verify that all receipts are updated with the new part name
5. Verify that all dispatches are updated with the new part name
6. Verify that inventory records are updated
7. Verify that no BSON errors occur

### Test Part Deletion
1. Try to delete a part that has associated receipts - should fail with detailed error
2. Try to delete a part that has associated dispatches - should fail with detailed error
3. Try to delete a part with no associations - should succeed

## Known Limitations

1. **Receipt Editing**: When editing a receipt that was created with multiple line items, only the first line item's data will be used for the update. This is because the backend model supports one part per receipt.

2. **Invoice Number Duplication**: Multiple receipts created from a single form submission will all have the same invoice number. This is expected behavior since they're all from the same physical invoice.

## Future Enhancements

If multi-line receipts are needed in the future, consider:
1. Adding a `lineItems` array field to the Receipt schema
2. Updating the Inventory calculation logic to handle multi-line receipts
3. Updating the receipt display and editing UI to handle multi-line receipts properly

## Files Modified

1. `/backend/routes/parts.js` - Fixed cascading updates and deletion checks
2. `/frontend/src/components/Forms/ReceiptForm.jsx` - Fixed receipt submission to create one receipt per line item

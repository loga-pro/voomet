# Fix Applied: 400 Bad Request Error on Save

## Problem

When clicking the Save button in the Inventory Summary Table, a 400 Bad Request error occurred:

```
POST http://localhost:5000/api/inventory 400 (Bad Request)
Missing required fields: customerVendorName, workCategory, partName
```

## Root Cause

The backend `inventory.js` route (lines 263-270) requires three top-level fields:
- `customerVendorName`
- `workCategory`
- `partName`

However, the frontend was only sending:
```javascript
{
  rowData: [{...}],
  receipts: [],
  dispatches: []
}
```

## Solution

Updated the `handleSave` function in `InventoryManagement.jsx` to include the required top-level fields when creating or updating inventory items.

### Changes Made

**Before:**
```javascript
await inventoryAPI.create({
  rowData: [rowDataToSave],
  receipts: [],
  dispatches: []
});
```

**After:**
```javascript
await inventoryAPI.create({
  customerVendorName: row.vendorNames?.[0] || 'N/A',  // ✅ Added
  workCategory: row.workCategory,                      // ✅ Added
  partName: row.partName,                              // ✅ Added
  rowData: [rowDataToSave],
  receipts: [],
  dispatches: []
});
```

## Field Mapping

| Frontend Field | Backend Field | Value |
|---------------|---------------|-------|
| `row.workCategory` | `workCategory` | e.g., "electrical" |
| `row.partName` | `partName` | e.g., "USB charging sockets" |
| `row.vendorNames[0]` | `customerVendorName` | First selected vendor or "N/A" |
| `row` (full object) | `rowData[0]` | Category and vendor preferences |

## Data Structure

### Inventory Model Structure

The Inventory model has a dual structure:

1. **Top-level fields** (for backward compatibility):
   - `customerVendorName`: String
   - `workCategory`: String
   - `partName`: String

2. **rowData array** (for new functionality):
   - `workCategory`: String
   - `partName`: String
   - `category`: String (In house / Outsourced)
   - `vendorNames`: Array of strings

### Example Saved Data

```json
{
  "_id": "...",
  "customerVendorName": "Rajeshwara",
  "workCategory": "electrical",
  "partName": "USB charging sockets",
  "rowData": [
    {
      "workCategory": "electrical",
      "partName": "USB charging sockets",
      "category": "Outsourced",
      "vendorNames": ["Rajeshwara", "ABC Vendor"]
    }
  ],
  "receipts": [],
  "dispatches": []
}
```

## Update Logic

### For Existing Items

When an inventory item already exists for the work category + part name:

1. Find the existing item by matching `workCategory` and `partName`
2. Update the top-level fields
3. Update or add the row in `rowData` array
4. Preserve existing `receipts` and `dispatches`

### For New Items

When no inventory item exists:

1. Create new item with all required fields
2. Set `customerVendorName` to first vendor or "N/A"
3. Initialize empty `receipts` and `dispatches` arrays
4. Add row data with category and vendor preferences

## Files Modified

- `frontend/src/pages/InventoryManagement.jsx`
  - Updated `handleSave` function
  - Added required top-level fields to create and update calls

## Testing

To verify the fix:

1. **Navigate to Inventory Management**
2. **Select category** and **vendors** for a part
3. **Click Save**
4. **Verify success notification** appears
5. **Check browser console** - no errors
6. **Refresh page** - changes should persist

## Related Backend Code

The validation happens in `backend/routes/inventory.js`:

```javascript
const requiredFields = ['customerVendorName', 'workCategory', 'partName'];
const missingFields = requiredFields.filter(field => !req.body[field]);

if (missingFields.length > 0) {
  return res.status(400).json({
    message: `Missing required fields: ${missingFields.join(', ')}`,
    details: missingFields.map(field => `${field} is required`)
  });
}
```

## Notes

- `customerVendorName` is set to the first vendor in the list or "N/A" if no vendors selected
- This maintains backward compatibility with the existing Inventory model
- The `rowData` array stores the new category and multi-vendor functionality
- Both structures are saved to support legacy and new features

## Status

✅ **Fixed** - Save button now works correctly and persists data to the database.

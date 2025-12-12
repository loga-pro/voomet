# Feature Added: Editable Category and Vendor with Save Button

## Overview

Added the ability to edit Category and Vendor Name in the Inventory Summary Table with a Save button to persist changes.

## Features Implemented

### 1. **Category Dropdown**
- **Options**: "In house" and "Outsourced"
- **Editable**: Can change category for each row
- **Default**: "In house"

### 2. **Vendor Name Multi-Select**
- **Multi-select dropdown**: Choose multiple vendors
- **Visual display**: Selected vendors shown as badges
- **Remove vendors**: Click × on badge to remove
- **Add vendors**: Click dropdown to select more

### 3. **Save Button**
- **Location**: Actions column (last column)
- **Functionality**: Saves category and vendor preferences for each part
- **Notification**: Shows success/error message after save

## How It Works

### User Workflow

1. **View Inventory Master** page
2. **Select Category** from dropdown (In house / Outsourced)
3. **Select Vendors** from multi-select dropdown
4. **Click Save** button in Actions column
5. **See notification** confirming save

### Data Flow

```
User edits Category/Vendors
    ↓
Changes stored in local state
    ↓
Click Save button
    ↓
Data saved to Inventory collection
    ↓
Success notification shown
```

### Backend Storage

The data is saved in the `inventory` collection:

```javascript
{
  rowData: [
    {
      workCategory: "electrical",
      partName: "USB charging sockets",
      category: "In house",
      vendorNames: ["Rajeshwara", "Vendor2"]
    }
  ],
  receipts: [],
  dispatches: []
}
```

## Files Modified

### 1. `InventorySummaryTable.jsx`
- Added `onSave` prop
- Added Actions column header
- Added Save button in each row
- Updated category options to "Outsourced"
- Actions column only shows when `readOnly={false}`

### 2. `InventoryManagement.jsx`
- Changed `readOnly` from `true` to `false`
- Added `handleRowCategoryChange` function
- Added `handleRowVendorChange` function
- Added `handleSave` function
- Added notification state and display
- Implemented save logic to create/update inventory items

## Save Logic

### Scenario 1: Existing Inventory Item
If an inventory item exists for this work category + part name combination:
- **Update** the existing row data
- Keep existing receipts and dispatches

### Scenario 2: New Inventory Item
If no inventory item exists:
- **Create** new inventory item
- Initialize with empty receipts and dispatches arrays
- Add the row data with category and vendor preferences

## UI Components

### Category Dropdown
```jsx
<select value={row.category} onChange={handleChange}>
  <option value="In house">In house</option>
  <option value="Outsourced">Outsourced</option>
</select>
```

### Vendor Multi-Select
- Displays selected vendors as blue badges
- Click to expand dropdown with checkboxes
- Check/uncheck to add/remove vendors
- Shows "Select vendors..." when none selected

### Save Button
```jsx
<button onClick={() => onSave(row)}>
  Save
</button>
```
- Blue background
- Hover effect
- Focus ring for accessibility

## Notifications

### Success
- **Color**: Green
- **Message**: "Saved successfully!"
- **Duration**: 3 seconds

### Error
- **Color**: Red
- **Message**: "Failed to save. Please try again."
- **Duration**: 3 seconds

## Example Usage

### Before Save:
| Work Category | Part Name | Category | Vendor Name | Actions |
|--------------|-----------|----------|-------------|---------|
| electrical | USB charging sockets | In house | (empty) | [Save] |

### After Editing:
| Work Category | Part Name | Category | Vendor Name | Actions |
|--------------|-----------|----------|-------------|---------|
| electrical | USB charging sockets | Outsourced | Rajeshwara, ABC Vendor | [Save] |

### After Clicking Save:
✅ "Saved successfully!" notification appears
- Data persisted to database
- Can refresh page and see saved values

## Benefits

1. **Flexibility**: Can categorize parts as in-house or outsourced
2. **Vendor Tracking**: Associate multiple vendors with each part
3. **Persistence**: Preferences saved and restored on page reload
4. **User Feedback**: Clear notifications on save success/failure
5. **Easy Editing**: Inline editing without separate forms

## Technical Details

### State Management
- Local state tracks changes before save
- Only persists to database on Save click
- Prevents accidental data loss

### API Calls
- `inventoryAPI.create()` - For new items
- `inventoryAPI.update()` - For existing items

### Error Handling
- Try-catch blocks around save operations
- User-friendly error messages
- Console logging for debugging

## Future Enhancements

Potential improvements:
- Bulk save for multiple rows
- Undo/redo functionality
- Auto-save on change
- Validation before save
- Confirmation dialog for changes

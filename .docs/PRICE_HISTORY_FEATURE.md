# Part Price Management Enhancement

## Overview
Enhanced the Part Master form to support price history tracking with two modes: **New Price** and **Existing Price**. This ensures that price changes are properly tracked without affecting existing records in the database.

## Changes Made

### 1. Backend Changes

#### `backend/models/Part.js`
- Added `priceHistory` array field to track all price changes
- Each history entry contains:
  - `price`: The price value
  - `effectiveDate`: When the price became effective
  - `updatedBy`: Who made the change

#### `backend/routes/parts.js`
- **POST route (Create)**: Initializes `priceHistory` with the initial price when creating a new part
- **PUT route (Update)**: Enhanced to handle price updates with history tracking:
  - If `useNewPrice` is `true`: Adds the new price to history (only if price actually changed)
  - If `useNewPrice` is `false`: Uses an existing price from history without creating a new entry
  - The `useNewPrice` flag is removed before saving to database

### 2. Frontend Changes

#### `frontend/src/components/Forms/PartForm.jsx`
- Added state variables:
  - `priceMode`: Tracks whether user selected 'new' or 'existing' price mode
  - `priceHistory`: Stores the price history for the current part

- **Price Section UI**:
  - When **creating a new part**: Shows standard price input field
  - When **editing an existing part with price history**:
    - Displays two toggle buttons: "New Price" and "Existing Price"
    - **New Price mode**: Shows number input for entering a new price
    - **Existing Price mode**: Shows dropdown with all historical prices sorted by date (most recent first)
    - Each historical price displays: `₹[price] - [date]` with "(Current)" label for the active price

- **Form Submission**:
  - Includes `useNewPrice` flag when updating a part
  - This flag tells the backend whether to add the price to history or use an existing one

## How It Works

### Creating a New Part
1. User enters part details including price
2. On save, the price is stored in both `partPrice` and `priceHistory[0]`

### Updating an Existing Part

#### Scenario 1: New Price
1. User clicks "New Price" button
2. Enters a new price value
3. On save, the new price is:
   - Set as the current `partPrice`
   - Added to `priceHistory` array with current timestamp
4. Existing records remain unaffected

#### Scenario 2: Existing Price
1. User clicks "Existing Price" button
2. Selects a price from the dropdown (showing all historical prices)
3. On save, the selected price is:
   - Set as the current `partPrice`
   - NOT added to `priceHistory` (since it already exists)
4. This allows reverting to a previous price without creating duplicate history entries

## Benefits

1. **Complete Price Audit Trail**: Every price change is tracked with timestamp
2. **No Impact on Existing Records**: Historical transactions maintain their original prices
3. **Price Reversion**: Can easily revert to any previous price
4. **User-Friendly**: Clear UI with toggle buttons and formatted price history
5. **Data Integrity**: Prevents duplicate history entries when using existing prices

## Database Schema

```javascript
{
  partPrice: Number,           // Current active price
  priceHistory: [
    {
      price: Number,           // Historical price value
      effectiveDate: Date,     // When this price became effective
      updatedBy: String        // User who set this price
    }
  ]
}
```

## UI Screenshots Description

### New Part Creation
- Standard price input field (no buttons shown)

### Editing Part with Price History
- Two toggle buttons at top: "New Price" | "Existing Price"
- Active button: Blue background (primary-600)
- Inactive button: Gray background with hover effect

**New Price Mode**:
- Number input field for entering new price
- Validation: 8 digits, 2 decimal places, max 99999999.99

**Existing Price Mode**:
- Dropdown showing all historical prices
- Format: "₹1234.56 - Jan 5, 2026 (Current)"
- Sorted by date (newest first)

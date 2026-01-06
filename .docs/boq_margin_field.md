# BOQ Form - Margin Field Implementation

## Summary
Added a new "Margin (%)" field to the BOQ form items, positioned after "Base Price". The margin is applied as a **markup/increase** to the base price, increasing the total price accordingly.

## Calculation Logic

### How Margin Works
The margin percentage is applied as a **markup/increase** to the base price before calculating the total price:

**Formula:**
```
Increased Unit Price = Base Price + (Base Price × Margin%)
Total Price = Increased Unit Price × Number of Units
```

**Example:**
- Base Price: ₹1000
- Margin: 10%
- Number of Units: 10

**Calculation:**
- Increased Unit Price = ₹1000 + (₹1000 × 10%) = ₹1000 + ₹100 = ₹1100
- Total Price = ₹1100 × 10 = **₹11,000**

### Impact on BOQ Totals
1. Each item's total price is calculated with margin markup applied
2. All item totals are summed to get the "Final Total without GST"
3. Overall discount percentage is then applied to this sum
4. Transportation charges and GST are added as usual

## Changes Made

### 1. Backend Model (`backend/models/BOQ.js`)
- Added `margin` field to `boqItemSchema`:
  - Type: Number
  - Default: 0
  - Min: 0
  - Max: 100
  - Positioned after `unitPrice` field

### 2. Frontend Form (`frontend/src/components/Forms/BOQForm.jsx`)

#### Calculation Logic (`calculateBoqMetrics` function)
- Modified to apply margin as markup/increase:
  ```javascript
  const increasedUnitPrice = unitPrice + (unitPrice * (margin / 100));
  const totalPrice = numberOfUnits * increasedUnitPrice;
  ```
- Total price automatically updates when margin changes

#### State Management
- Added `margin: '0'` to all item initializations:
  - Initial form state
  - Edit mode initialization
  - Project selection handler
  - Project clear handler
  - Add item row handler

#### Validation
- Added validation in `handleItemChange` function:
  - Allows empty string or numbers 0-100
  - Supports up to 2 decimal places
  - Regex pattern: `/^\d{0,3}(\.\d{0,2})?$/`
  - Range validation: 0 ≤ value ≤ 100

#### UI Components
- Added FloatingInput field for margin:
  - Label: "Margin (%)"
  - Type: number
  - Step: 0.01
  - Min: 0
  - Max: 100
  - Placeholder: "0-100%"
  - Positioned after "Unit Price (₹)" field

#### Layout
- Updated grid layout from `md:grid-cols-6` to `md:grid-cols-7` to accommodate the new field

## Field Order in Items Section
1. Part Name
2. No of Units
3. Unit Type
4. Base Price (₹)
5. **Margin (%)** ← NEW (applied as markup/increase)
6. Total Price (₹) ← Calculated with margin markup
7. Remarks

## Data Flow
1. **Input**: User enters margin percentage (0-100)
2. **Validation**: Real-time validation ensures value is within range
3. **Calculation**: Total price is automatically recalculated:
   - Increased Unit Price = Base Price + (Base Price × Margin%)
   - Total Price = Increased Unit Price × Number of Units
4. **Storage**: Margin value is stored in item object as string
5. **Submission**: Included in items JSON when form is submitted
6. **Database**: Saved in MongoDB with BOQ document

## Testing Recommendations
1. Create a new BOQ and add margin values to items
   - Verify total price **increases** when margin is added
   - Example: Base Price ₹100, Margin 20%, Qty 5 → Total should be ₹600 (not ₹500)
2. Edit an existing BOQ and verify margin values are loaded correctly
3. Test validation:
   - Try entering values > 100 (should be rejected)
   - Try entering values < 0 (should be rejected)
   - Try entering more than 2 decimal places (should be rejected)
   - Verify empty field defaults to 0 (no markup)
4. Verify margin is saved and persisted in database
5. Test project selection - margin should be loaded from selected project
6. Verify overall BOQ calculations are correct with margin markups applied

## Notes
- The margin field is optional (can be left empty or 0)
- Margin of 0% means no markup (total = base price × quantity)
- Margin works as a **markup/increase**, increasing the total price
- The overall discount percentage is applied AFTER individual item margins
- Automatically saved with BOQ data
- No impact on existing BOQ records (default value of 0 will be used)

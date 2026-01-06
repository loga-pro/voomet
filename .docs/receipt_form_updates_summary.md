# Receipt Form Updates - Summary

## Changes Implemented

### 1. **Category-Based Vendor Field Display**
- **In house category**: Vendor field is now **hidden** completely
- **Bought-out category**: Vendor field is **shown** as a dropdown select

### 2. **Vendor Selection**
- Changed from checkbox/radio details element to a **simple dropdown select**
- Single vendor selection for Bought-out category
- Vendor field only appears when category is "Bought-out"

### 3. **Data Source Based on Category**

#### **In house**:
- Data comes from **Part Master**
- Users can manually select parts and enter quantities
- All fields are editable

#### **Bought-out**:
- Data comes from **Purchase Orders**
- When vendor is selected, purchase order data automatically populates line items
- Fields are **disabled/read-only** to show saved purchase order data
- Displays the original purchase order information

### 4. **Line Items Table Layout**
- Maintained **table layout** (not grid cards)
- Added new column: **"Actual Order"** after the "Unit" column
- Column order:
  1. Work Category
  2. Item Name
  3. Unit
  4. **Actual Order** (NEW - shows original PO quantity)
  5. Quantity
  6. Price without GST (₹)
  7. GST %
  8. GST Amount (₹)
  9. Total (₹)
  10. Action

### 5. **Auto-Population for Bought-out**
When a vendor is selected in Bought-out mode:
- Fetches all purchase orders for that vendor
- Automatically populates line items with:
  - Work Category
  - Item Name
  - Unit
  - **Actual Order** (original PO quantity)
  - Quantity (current receipt quantity)
  - Price without GST
  - GST %
  - GST Amount
  - Total

### 6. **Field Behavior**

#### **In house mode**:
- All fields are **editable**
- User can select work category and parts from Part Master
- User can enter quantities and prices

#### **Bought-out mode**:
- Work Category: **Disabled** (auto-filled from PO)
- Item Name: **Disabled** (auto-filled from PO)
- Unit: **Read-only** (auto-filled from PO)
- Actual Order: **Read-only** (shows original PO quantity)
- Quantity: **Disabled** (auto-filled from PO)
- Price without GST: **Disabled** (auto-filled from PO)
- GST %: **Disabled** (auto-filled from PO)
- GST Amount: **Read-only** (calculated)
- Total: **Read-only** (calculated)

### 7. **Category Change Behavior**
When category is changed:
- Vendor selection is **reset**
- Line items are **cleared** and reset to default
- Ensures clean state when switching between In house and Bought-out

## Technical Implementation

### New State Variables:
```javascript
const [purchases, setPurchases] = useState([]);
const [selectedVendor, setSelectedVendor] = useState(null);
```

### New API Integration:
- Imported `purchasesAPI` from services
- Fetches purchase orders when vendor is selected
- Filters purchases by selected vendor name

### Line Item Structure:
Each line item now includes:
```javascript
{
  workCategory: '',
  partName: '',
  unit: '',
  actualOrder: '', // NEW FIELD
  quantity: '',
  priceWithoutGST: '',
  gstPercentage: 18,
  gstAmount: '',
  total: ''
}
```

## User Experience Flow

### For In house Category:
1. Select "In house" category
2. Vendor field is hidden
3. Manually select work category and parts from Part Master
4. Enter quantities and prices
5. Submit receipt

### For Bought-out Category:
1. Select "Bought-out" category
2. Vendor dropdown appears
3. Select vendor from dropdown
4. Purchase order data automatically loads into line items
5. Review the pre-filled data (all fields disabled)
6. "Actual Order" column shows the original PO quantity
7. Submit receipt

## Benefits

1. **Cleaner UI**: Vendor field only shows when needed
2. **Data Integrity**: Bought-out receipts use exact PO data
3. **Audit Trail**: "Actual Order" column preserves original PO quantity
4. **User-Friendly**: Dropdown is simpler than expandable details
5. **Automatic**: No manual entry needed for bought-out items
6. **Flexible**: In house items can still be entered manually

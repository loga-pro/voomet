# Receipt Form - Voucher Number Feature

## Summary of Changes

### ✅ What Was Implemented

For **Bought-out** category receipts, I've added a **Voucher Number** dropdown that:

1. **Shows existing voucher numbers** from purchase orders
2. **Filters by selected vendor** - only shows vouchers for the chosen vendor
3. **Auto-populates line items** when a voucher is selected
4. **Saves voucher number** to the database

---

## How It Works

### User Flow for Bought-out Category:

1. **Select Category**: Choose "Bought-out"
2. **Select Vendor**: Vendor dropdown appears → Select a vendor
3. **Select Voucher No**: Voucher dropdown appears → Shows all existing voucher numbers for that vendor
4. **Auto-Population**: When voucher is selected:
   - Fetches all line items from that purchase order
   - Populates the table with:
     - Work Category
     - Item Name
     - Unit
     - Actual Order (original PO quantity)
     - Quantity
     - Price without GST
     - GST %
     - GST Amount
     - Total
5. **Review & Submit**: All fields are disabled (read-only) showing the saved PO data
6. **Save**: Voucher number is saved to the database with the receipt

---

## Technical Implementation

### Frontend Changes (ReceiptForm.jsx)

#### New State Variables:
```javascript
const [availableVouchers, setAvailableVouchers] = useState([]);
const [selectedVoucherNo, setSelectedVoucherNo] = useState(null);
```

#### New Form Field:
```javascript
voucherNo: initialData.voucherNo || ''
```

#### New useEffect - Fetch Vouchers:
- Triggers when vendor is selected
- Fetches all purchases for that vendor
- Extracts unique voucher numbers
- Populates `availableVouchers` state

#### New useEffect - Populate Line Items:
- Triggers when voucher number is selected
- Filters purchases by voucher number
- Maps purchase data to line items
- Includes "Actual Order" field

#### New Handler:
```javascript
const handleVoucherChange = (voucherNo) => {
  setSelectedVoucherNo(voucherNo);
  setFormData(prev => ({
    ...prev,
    voucherNo: voucherNo
  }));
};
```

#### Form Layout (3-column grid):
- Row 1: Date | Receipt Category | Category
- Row 2: Vendor Name | Voucher No | Invoice No
- Row 3: Invoice Date | Upload Document | (other fields)

### Backend Changes (Receipt.js Model)

#### New Field Added:
```javascript
voucherNo: {
  type: String,
  maxlength: 30
}
```

---

## Features

### ✅ Dropdown Selection
- Voucher numbers appear as a **dropdown** (not manual entry)
- Only shows **existing voucher numbers** from purchase orders
- Filtered by selected vendor

### ✅ Data Integrity
- Uses **existing purchase order data**
- No manual entry errors
- Maintains consistency with original PO

### ✅ Audit Trail
- Voucher number is **saved to database**
- Can track which PO a receipt is linked to
- "Actual Order" column shows original PO quantity

### ✅ User Experience
- **Progressive disclosure**: Voucher dropdown only appears after vendor is selected
- **Auto-population**: No need to manually enter line items
- **Read-only fields**: Prevents accidental changes to PO data
- **3-column layout**: More compact and efficient form

---

## Data Flow

```
1. User selects "Bought-out" category
   ↓
2. User selects Vendor
   ↓
3. System fetches all purchases for that vendor
   ↓
4. System extracts unique voucher numbers
   ↓
5. Voucher dropdown populates with options
   ↓
6. User selects Voucher No
   ↓
7. System filters purchases by voucher number
   ↓
8. Line items auto-populate with PO data
   ↓
9. User reviews and submits
   ↓
10. Voucher number saved to database with receipt
```

---

## Database Schema

### Receipt Model Fields:
- `date` - Receipt date
- `receiptCategory` - Buy/Return
- `category` - In house/Bought-out
- `vendorNames` - Array of vendor names
- **`voucherNo`** - ⭐ NEW: Purchase order voucher number
- `invoiceNo` - Receipt invoice number
- `invoiceDate` - Invoice date
- `workCategory` - Work category
- `partName` - Part name
- `unit` - Unit of measurement
- `quantity` - Quantity received
- `invoiceValueWithoutGST` - Price without GST
- `gstValue` - GST amount
- `totalValue` - Total value
- `upload` - Document upload
- `reasonForReturn` - Return reason (if applicable)

---

## Benefits

1. **No Duplicate Entry**: Reuses existing PO data
2. **Data Accuracy**: Eliminates manual entry errors
3. **Traceability**: Links receipts to original purchase orders
4. **Efficiency**: Faster receipt creation
5. **Consistency**: Ensures receipt data matches PO data
6. **Audit Trail**: Can track which PO each receipt came from

---

## Example Usage

### Scenario: Receiving items from ABC Vendor

1. Open Receipt Form
2. Select **"Bought-out"** category
3. Select **"ABC Vendor"** from vendor dropdown
4. Voucher dropdown shows: `PO-001`, `PO-002`, `PO-003`
5. Select **"PO-002"**
6. Line items automatically populate:
   - Item 1: Steel Pipe, 100 units, ₹500/unit
   - Item 2: Copper Wire, 50 units, ₹200/unit
7. Review the data (all fields disabled)
8. Submit receipt
9. Receipt saved with `voucherNo: "PO-002"`

---

## Form Layout (3-Column Grid)

```
┌─────────────────┬─────────────────┬─────────────────┐
│ Date            │ Receipt Category│ Category        │
├─────────────────┼─────────────────┼─────────────────┤
│ Vendor Name     │ Voucher No      │ Invoice No      │
├─────────────────┼─────────────────┼─────────────────┤
│ Invoice Date    │ Upload Document │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

---

## Validation

- Voucher dropdown only appears after vendor is selected
- Line items only populate after voucher is selected
- All fields are disabled for bought-out to prevent editing
- Voucher number is saved to database for traceability

# Quick Reference: Invoice Data Mapping

## PaymentForm Fields → Invoice PDF Fields

### Basic Information
```
PaymentForm                    →  Invoice PDF
─────────────────────────────────────────────────────────
formData.customer              →  Customer Name (Buyer/Consignee)
formData.projectName           →  Project Name / Description of Goods
formData.projectCost           →  Base calculation reference
```

### Invoice Array Fields (formData.invoices[0])
```
Invoice Form Field             →  PDF Location
─────────────────────────────────────────────────────────
invoiceNumber                  →  Voucher No. (if voucherNo is empty)
invoiceValue                   →  Amount (main item value)
invoiceDate                    →  Dated (formatted as DD-MMM-YY)
paymentType                    →  Mode/Terms of Payment
                                  - 'advance' → "100% Advance"
                                  - 'final' → "Final Payment"
voucherNo                      →  Voucher No. (primary)
buyersRef                      →  Buyer's Ref./Order No.
dispatchedThrough              →  Dispatched through
destination                    →  Destination
termsForDelivery               →  Terms of Delivery
hsnSac                         →  HSN/SAC Code
cgst                           →  CGST % (default: 9%)
sgst                           →  SGST % (default: 9%)
cgstAmount                     →  CGST Amount (calculated)
sgstAmount                     →  SGST Amount (calculated)
roundOff                       →  Round OFF value
totalWithTax                   →  Total Amount (₹)
```

### Calculated Fields
```
Calculation                                    →  PDF Field
─────────────────────────────────────────────────────────────────
invoiceValue + cgstAmount + sgstAmount        →  Total with Tax
+ roundOff

numberToWords(totalWithTax)                   →  Amount Chargeable (in words)
```

## Example Data Flow

### Input (PaymentForm)
```javascript
{
  customer: "ABC Technologies Pvt Ltd",
  projectName: "Office Interior Design",
  projectCost: 1500000,
  invoices: [{
    invoiceNumber: "INV-2025-001",
    invoiceValue: 1500000,
    invoiceDate: "2025-12-16",
    paymentType: "advance",
    voucherNo: "PI/25-26/050",
    buyersRef: "PO-2025-ABC-001",
    dispatchedThrough: "By Road",
    destination: "Mumbai Office",
    termsForDelivery: "Door Delivery",
    hsnSac: "998391",
    cgst: 9,
    sgst: 9,
    cgstAmount: 135000,
    sgstAmount: 135000,
    roundOff: 0,
    totalWithTax: 1770000
  }]
}
```

### Output (Invoice PDF)
```
┌─────────────────────────────────────────────────────┐
│              Proforma Invoice                       │
├─────────────────────────────────────────────────────┤
│ VOOMET                    │ Voucher No.: PI/25-26/050│
│ [Address]                 │ Dated: 16-Dec-25         │
│ GSTIN: 29ANZPK5532DZ2B   │ Buyer's Ref: PO-2025-... │
│                           │ Payment: 100% Advance    │
├───────────────────────────┼──────────────────────────┤
│ Consignee:                │ Dispatched: By Road      │
│ ABC Technologies Pvt Ltd  │ Destination: Mumbai Off. │
│ Mumbai Office             │ Terms: Door Delivery     │
├─────────────────────────────────────────────────────┤
│ Description: Office Interior Design                 │
│ HSN/SAC: 998391                                     │
│ Amount:                            ₹ 15,00,000.00   │
│ CGST @ 9%:                         ₹  1,35,000.00   │
│ SGST @ 9%:                         ₹  1,35,000.00   │
│ Round Off:                         ₹        0.00    │
├─────────────────────────────────────────────────────┤
│ Total:                             ₹ 17,70,000.00   │
│                                                      │
│ Amount in Words:                                    │
│ INR Seventeen Lakh Seventy Thousand Only            │
└─────────────────────────────────────────────────────┘
```

## Important Notes

1. **First Invoice Only**: Currently uses `invoices[0]` - the first invoice in the array
2. **Auto-Calculation**: CGST/SGST amounts are calculated when HSN/SAC is entered
3. **Date Format**: Automatically converts to DD-MMM-YY format
4. **Number Format**: Uses Indian locale (lakhs, crores)
5. **Fallbacks**: All fields have default values to prevent empty PDFs

## How to Use

1. **Fill Payment Form**:
   - Go to Payment Master
   - Click "Add Payment"
   - Fill in customer and project details
   - Add invoice with all required fields

2. **Generate Invoice**:
   - Click "View" on the payment record
   - Click "Generate Invoice" button
   - Invoice PDF opens in modal

3. **Download/Print**:
   - Click "Download PDF" to save
   - Click "Print" to print directly

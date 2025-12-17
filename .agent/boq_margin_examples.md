# BOQ Margin Calculation Examples

## How Margin Works as a Markup/Increase

The margin percentage **increases** the base price before calculating the total.

### Example 1: Basic Calculation
```
Item: USB Charging Socket
Base Price: ₹1000
Margin: 10%
Number of Units: 10

Step 1: Calculate Increased Unit Price
Increased Unit Price = ₹1000 + (₹1000 × 10%)
                     = ₹1000 + ₹100
                     = ₹1100

Step 2: Calculate Total Price
Total Price = ₹1100 × 10 units
            = ₹11,000
```

### Example 2: No Margin
```
Item: LED Light
Base Price: ₹500
Margin: 0%
Number of Units: 20

Step 1: Calculate Increased Unit Price
Increased Unit Price = ₹500 + (₹500 × 0%)
                     = ₹500 + ₹0
                     = ₹500

Step 2: Calculate Total Price
Total Price = ₹500 × 20 units
            = ₹10,000
```

### Example 3: Higher Margin
```
Item: Cable Wire
Base Price: ₹2000
Margin: 25%
Number of Units: 5

Step 1: Calculate Increased Unit Price
Increased Unit Price = ₹2000 + (₹2000 × 25%)
                     = ₹2000 + ₹500
                     = ₹2500

Step 2: Calculate Total Price
Total Price = ₹2500 × 5 units
            = ₹12,500
```

## Complete BOQ Calculation Flow

### Item-Level Calculation (with Margin)
1. **For each item:**
   - Increased Unit Price = Base Price + (Base Price × Margin%)
   - Item Total = Increased Unit Price × Quantity

### BOQ-Level Calculation
2. **Sum all item totals:**
   - Final Total without GST = Sum of all item totals

3. **Apply overall discount:**
   - Discount Amount = Final Total × Discount%
   - Total after Discount = Final Total - Discount Amount

4. **Add transportation:**
   - Taxable Value = Total after Discount + Transportation Charges

5. **Apply GST:**
   - GST Amount = Taxable Value × GST%
   - Total with GST = Taxable Value + GST Amount

## Visual Comparison

### WITHOUT Margin:
```
Base Price: ₹1000
Quantity: 10
Margin: 0%
─────────────────
Total: ₹10,000
```

### WITH 10% Margin:
```
Base Price: ₹1000
Margin: 10% → Markup of ₹100 per unit
Increased Price: ₹1100
Quantity: 10
─────────────────
Total: ₹11,000 (Added ₹1,000)
```

### WITH 20% Margin:
```
Base Price: ₹1000
Margin: 20% → Markup of ₹200 per unit
Increased Price: ₹1200
Quantity: 10
─────────────────
Total: ₹12,000 (Added ₹2,000)
```

## Key Points
- ✅ Margin is applied as a **markup/increase** (increases price)
- ✅ Higher margin = Higher total price
- ✅ Margin of 0% = No markup (original price)
- ✅ Each item can have a different margin
- ✅ Overall BOQ discount is applied AFTER item margins
- ✅ Margin increases revenue/profit per item

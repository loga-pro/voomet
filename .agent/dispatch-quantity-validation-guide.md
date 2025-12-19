# Dispatch Quantity Validation - Testing Guide

## Overview
The dispatch validation has been enhanced to show clear, user-friendly notifications when attempting to dispatch quantities that exceed available stock in receipts.

## Changes Made

### 1. Backend Validation (dispatches.js)
- **Enhanced error messages** with clear formatting
- Shows a warning icon (⚠️) to grab attention
- Displays detailed stock breakdown:
  - Total Received
  - Already Dispatched
  - Rejected
  - Returned to Vendor
  - Available for Dispatch

### 2. Frontend Real-Time Validation (DispatchForm.jsx)
- **Fetches inventory data** when form loads
- **Shows available stock** below quantity input for each part
- **Real-time validation** as user types quantity
- **Visual feedback**:
  - Red border on quantity input when exceeding available stock
  - Warning message displayed below input field
  - Shows "Available: X units" for reference
- **Prevents form submission** if any line item exceeds available stock
- **Immediate user feedback** without waiting for backend response

### 3. Frontend Notification Component
- **Multi-line message support** using `whitespace-pre-line` CSS
- **Extended duration for error messages** (8 seconds instead of 3 seconds)
- Gives users more time to read detailed validation messages

## Test Scenarios

### Scenario 1: Dispatch More Than Available (Frontend + Backend Validation)
**Steps:**
1. Go to Dispatches page
2. Click "Add Dispatch"
3. Fill in dispatch details (date, dispatch number, etc.)
4. Select a part that has 5 units in receipt
5. **Observe**: Below the quantity field, you'll see "Available: 5 units"
6. Enter 7 in the quantity field
7. **Observe**: As soon as you type 7:
   - Quantity input field turns red with red border
   - Warning message appears below: "⚠️ Only 5 units available in receipt!"
8. Try to click "Add Dispatch"

**Expected Result (Frontend Validation):**
- Form submission is blocked
- Error notification appears: "⚠️ Only 5 units available in receipt!"
- User cannot proceed until they reduce quantity to 5 or less

**Expected Result (If Backend is Reached):**
- If frontend validation is bypassed, backend returns error:
  ```
  ⚠️ Cannot dispatch 7 units. Only 5 units available in receipt!

  Stock Details:
  • Total Received: 5 units
  • Already Dispatched: 0 units
  • Rejected: 0 units
  • Returned to Vendor: 0 units
  • Available for Dispatch: 5 units
  ```
- Notification stays visible for 8 seconds
- Message is clearly formatted with line breaks

### Scenario 2: Dispatch Exactly Available Quantity
**Steps:**
1. Select a part with 5 units available
2. Dispatch exactly 5 units

**Expected Result:**
- Dispatch is created successfully
- Success notification appears

### Scenario 3: Dispatch After Some Already Dispatched
**Steps:**
1. Select a part with 10 units received
2. Already dispatched 3 units
3. Try to dispatch 8 units (more than the 7 available)

**Expected Result:**
- Error notification shows:
  ```
  ⚠️ Cannot dispatch 8 units. Only 7 units available in receipt!

  Stock Details:
  • Total Received: 10 units
  • Already Dispatched: 3 units
  • Rejected: 0 units
  • Returned to Vendor: 0 units
  • Available for Dispatch: 7 units
  ```

### Scenario 4: No Receipt Exists
**Steps:**
1. Try to dispatch a part that has no receipts

**Expected Result:**
- Error notification: "No inventory found for [Part Name] ([Work Category]). Please add receipts first before dispatching."

## Validation Logic
The system calculates available stock as:
```
Available Stock = Total Received - Total Dispatched - Total Rejected - Returned to Vendor
```

## Notes
- Validation applies to both creating new dispatches and editing existing ones
- Return dispatches are excluded from validation
- The notification component now properly handles multi-line messages
- Error messages stay visible longer (8s) to give users time to read details

# Vendor Form Updates - Final Version

## Summary
Updated the Vendor Form to set proper required fields and added IFSC Code field.

## Changes Made

### 1. Backend Model Updates (`backend/models/Vendor.js`)

#### Required Fields:
- ✅ **Vendor/Contractor Name** - Required, 2-50 characters, letters and spaces only
- ✅ **Mobile Number** - Required, exactly 10 digits, unique
- ✅ **Bank Account Number** - Required, 9-18 digits
- ✅ **IFSC Code** - Required, 11 characters (format: XXXX0XXXXXX)
- ✅ **City** - Required, letters, spaces, hyphens, apostrophes
- ✅ **State** - Required, letters, spaces, hyphens, apostrophes
- ✅ **ZIP Code** - Required, alphanumeric with hyphens
- ✅ **Country** - Required, letters, spaces, hyphens, apostrophes

#### Optional Fields:
- ❌ **Email** - Optional with `sparse: true` index to allow multiple null values
- ❌ **GST Number** - Optional with `sparse: true` index
- ❌ **Street Address** - Optional
- ❌ **Contact Person** - Optional

### 2. Frontend Form Updates (`frontend/src/components/Forms/VendorForm.jsx`)

#### Required Fields (marked with *):
- Vendor/Contractor Name *
- Mobile Number *
- Bank Account Number *
- IFSC Code *
- City *
- State/Province *
- ZIP/Postal Code *
- Country *

#### Optional Fields:
- Email (validates format only if provided)
- GST Number (validates format only if provided)
- Street Address (validates minimum length only if provided)
- Contact Person

#### IFSC Code Field Details:
- Position: After Bank Account Number field
- Max length: 11 characters
- Auto-converts to uppercase
- Placeholder: "e.g., SBIN0001234"
- Validation: Required, must match pattern `/^[A-Z]{4}0[A-Z0-9]{6}$/`
- Format: First 4 letters (bank code), 5th character is '0', last 6 are alphanumeric

### 3. CSV Export Updates (`frontend/src/pages/VendorMaster.jsx`)

#### CSV Column Order:
1. Category
2. Vendor/Contractor Name
3. Contact Person
4. Mobile Number
5. Email
6. Bank Details
7. **IFSC Code** (NEW)
8. GST Number
9. Address
10. City
11. State
12. Zip Code
13. Country

### 4. View Modal Updates (`frontend/src/pages/VendorMaster.jsx`)

#### Business Info Section Display:
- GST Number (if exists)
- Bank Account Number (if exists)
- **IFSC Code** (if exists) - NEW
- All displayed in monospace font for better readability

## Complete Field Validation Summary

| Field | Required | Format | Max Length | Unique |
|-------|----------|--------|------------|--------|
| Category | ✅ Yes | vendor/contractor | - | No |
| Vendor Name | ✅ Yes | Letters and spaces only | 25 chars | No |
| Mobile Number | ✅ Yes | Exactly 10 digits | 10 | Yes |
| Bank Account | ✅ Yes | 9-18 digits | 18 | No |
| IFSC Code | ✅ Yes | Bank IFSC format | 11 | No |
| City | ✅ Yes | Letters, spaces, hyphens, apostrophes | 50 | No |
| State | ✅ Yes | Letters, spaces, hyphens, apostrophes | 50 | No |
| ZIP Code | ✅ Yes | Alphanumeric with hyphens | 20 | No |
| Country | ✅ Yes | Letters, spaces, hyphens, apostrophes | 50 | No |
| Email | ❌ No | Valid email format | - | Yes (sparse) |
| GST Number | ❌ No | 15 char GST format | 15 | Yes (sparse) |
| Street Address | ❌ No | Min 5 chars if provided | 200 | No |
| Contact Person | ❌ No | Letters and spaces only | 50 | No |

## Key Changes from Previous Version

### What Changed:
1. **Email** is now **OPTIONAL** (was required before)
2. **Bank Account Number** is now **REQUIRED** (was optional before)
3. **IFSC Code** is now **REQUIRED** (was optional before, newly added)
4. **City, State, ZIP, Country** remain **REQUIRED**
5. **GST Number** remains **OPTIONAL**
6. **Street Address** remains **OPTIONAL**

### Database Indexes:
- Email: `unique: true, sparse: true` (allows multiple null/empty values)
- GST Number: `unique: true, sparse: true` (allows multiple null/empty values)
- Mobile Number: `unique: true` (must be unique, cannot be null)

## Testing Recommendations

1. **Test Required Fields:**
   - Try to submit form without Vendor Name - should show error
   - Try to submit form without Mobile Number - should show error
   - Try to submit form without Bank Account - should show error
   - Try to submit form without IFSC Code - should show error
   - Try to submit form without City/State/ZIP/Country - should show error

2. **Test Optional Fields:**
   - Create vendor without Email - should succeed
   - Create vendor without GST Number - should succeed
   - Create vendor without Street Address - should succeed
   - Create multiple vendors without Email - should succeed (sparse index)
   - Create multiple vendors without GST - should succeed (sparse index)

3. **Test IFSC Code:**
   - Enter valid IFSC code (e.g., SBIN0001234) - should succeed
   - Enter invalid IFSC code (e.g., SBI001234) - should show error
   - Leave IFSC code empty - should show error
   - Verify auto-uppercase conversion works

4. **Test Bank Account:**
   - Enter 9 digits - should succeed
   - Enter 18 digits - should succeed
   - Enter 8 digits - should show error
   - Enter 19 digits - should show error
   - Leave empty - should show error

5. **Test CSV Export:**
   - Export vendors with all fields filled
   - Export vendors with optional fields empty
   - Verify IFSC Code column appears between Bank Details and GST Number
   - Verify empty optional fields show as empty in CSV

6. **Test View Modal:**
   - View vendor with all fields filled
   - View vendor with optional fields empty
   - Verify IFSC Code displays in Business Info section
   - Verify optional fields don't show when empty

## Notes

- The form now requires core business and contact information
- Email is optional to accommodate vendors who may not have email
- GST Number is optional as not all vendors may be GST registered
- IFSC Code is required for proper bank transaction processing
- Both Email and GST Number use sparse indexes to allow multiple vendors without these fields
- Bank Account Number accepts variable length (9-18 digits) to accommodate different bank formats

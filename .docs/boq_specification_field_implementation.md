# BOQ Specification Field Implementation

## Overview
Added a new **SPECIFICATION** input field to the BOQ (Bill of Quantities) form that appears before the "Unit Type" field and is displayed in the generated PDF.

## Changes Made

### 1. Backend Model Update
**File:** `backend/models/BOQ.js`

- Added `specification` field to the `boqItemSchema`
- Field properties:
  - Type: String
  - Trim: true
  - Default: '' (empty string)
  - Optional field (not required)

### 2. Frontend Form Updates
**File:** `frontend/src/components/Forms/BOQForm.jsx`

#### State Management
- Added `specification: ''` to all item object initializations:
  - Initial form state
  - Edit mode loading
  - Project selection
  - Project clear
  - Add new item row

#### UI Changes
- Added new `FloatingInput` component for specification field
- Positioned between "No of Units" and "Unit Type" fields
- Updated grid layout from `grid-cols-7` to `grid-cols-8` to accommodate the new field
- Field properties:
  - Label: "Specification"
  - Type: text
  - Placeholder: "Enter specification"
  - Optional field (not required)

### 3. PDF Generator Updates

#### File 1: `frontend/src/components/BOQ/AdvancedBOQPDFGenerator.js`
- Updated the SPECIFICATION column in the PDF table
- Changed from displaying `item.unitType` to `item.specification`
- Shows '-' if specification is empty

#### File 2: `frontend/src/components/BOQ/BOQPDFPreview.jsx`
- Updated the SPECIFICATION column in the PDF preview table
- Changed from displaying `item.unitType` to `item.specification`
- Shows '-' if specification is empty

## Field Order in Form
1. Part Name
2. No of Units
3. **Specification** (NEW)
4. Unit Type
5. Base Price (₹)
6. Margin (%)
7. Total Price (₹)
8. Remarks

## PDF Display
The specification field is now displayed in the "SPECIFICATION" column of the BOQ PDF, which appears between the "DESCRIPTION" and "QUANTITY" columns.

## Testing Recommendations

1. **Create New BOQ:**
   - Create a new BOQ and add specification values
   - Verify the specification is saved correctly
   - Generate PDF and verify specification appears in the PDF

2. **Edit Existing BOQ:**
   - Edit an existing BOQ (old records will have empty specification)
   - Add specification values
   - Save and verify changes persist

3. **PDF Generation:**
   - Generate PDF for BOQ with specifications
   - Verify specification column displays correctly
   - Verify empty specifications show '-'

4. **Project Selection:**
   - Select a project to copy BOQ data
   - Verify specification field is copied correctly

## Notes
- The specification field is optional and can be left empty
- Empty specifications will display as '-' in the PDF
- The field is editable for all BOQ items
- Existing BOQ records will have empty specification values by default

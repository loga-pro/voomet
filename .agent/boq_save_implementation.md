# BOQ PDF Save Functionality Implementation

## Summary
Added save buttons for Terms & Conditions, Date, and Estimate Number fields in the Customer BOQ Management PDF action view.

## Changes Made

### 1. Added Save State Management
- `isSavingEstimate`, `isSavingDate`, `isSavingTerms` - Loading states for each field
- `estimateSaved`, `dateSaved`, `termsSaved` - Success feedback states

### 2. Replaced Auto-Save with Manual Save
Previously, the fields were auto-saving on every change. Now users must click the save button to persist changes.

#### Estimate Number
- `handleEstimateNumberChange()` - Now only updates local state
- `saveEstimateNumber()` - New function to save to database with loading/success feedback

#### Date
- `handleDateChange()` - Now only updates local state
- `saveDate()` - New function to save to database with loading/success feedback

#### Terms & Conditions
- `addTerm()`, `removeTerm()`, `updateTerm()` - Now only update local state
- `saveTermsAndConditions()` - New function to save to database with loading/success feedback

### 3. Updated UI Components
Each field section now includes:
- Input field for editing
- Save button with three states:
  - **Normal**: Blue button with "Save [Field Name]" text
  - **Saving**: Blue-gray button with "Saving..." text (disabled)
  - **Saved**: Green button with checkmark icon and "Saved!" text (disabled, auto-hides after 3 seconds)

## User Experience
1. User opens PDF preview by clicking the PDF action button in Customer BOQ Management
2. User can edit Estimate Number, Date, or Terms & Conditions
3. User clicks the respective "Save" button to persist changes
4. Button shows loading state while saving
5. Button shows success state with green checkmark for 3 seconds
6. Changes are saved to the database and will persist when reopening the PDF preview

## File Modified
- `frontend/src/components/BOQ/AdvancedBOQPDFGenerator.js`

## Technical Details
- Uses existing `boqAPI.update()` method to save changes
- Maintains backward compatibility with existing BOQ data structure
- Provides clear visual feedback for save operations
- Prevents multiple simultaneous saves with disabled states

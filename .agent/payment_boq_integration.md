# Payment Master - Customer BOQ Integration

## Summary
Modified the Payment Form to automatically fetch and display data from Customer BOQ when a project is selected.

## Changes Made

### File: `frontend/src/components/Forms/PaymentForm.jsx`

#### 1. **Added BOQ API Import**
- Imported `boqAPI` from the services API to enable fetching BOQ data

#### 2. **Updated `fetchCustomers` Function**
- Modified to fetch all BOQ records first
- Extracts unique customer names from BOQ records
- **Only shows customers who have BOQ records** in the dropdown
- Includes fallback to all customers if BOQ fetch fails
- This ensures users can only select customers with existing BOQ data

#### 3. **Updated `fetchProjects` Function**
- Modified to fetch all projects for the selected customer
- Fetches BOQ records for that customer
- **Filters projects to only show those with BOQ records**
- Ensures users can only select projects that have BOQ data
- Prevents selection of projects without BOQ records

#### 4. **Created `fetchBOQData` Function**
- New async function that fetches BOQ data for a selected customer and project
- Searches for the matching BOQ record based on customer name and project name
- Automatically populates the following fields from BOQ data:
  - **Project Cost**: Uses `totalWithGST` from BOQ
  - **Include GST**: Sets based on whether GST percentage exists in BOQ
  - **GST Percentage**: Uses the GST percentage from BOQ
- Falls back to project data if no BOQ is found
- Includes error handling to ensure form remains functional even if BOQ fetch fails

#### 5. **Updated Project Selection Handler**
- Modified the `handleChange` function for project selection
- Now calls `fetchBOQData` when a project is selected
- Ensures BOQ data is fetched and populated automatically

## How It Works

1. **Form loads** → Fetches all BOQ records and extracts unique customer names
2. **Client Name dropdown** → Shows only customers who have BOQ records
3. **User selects a customer** → Projects for that customer are fetched
4. **Projects are filtered** → Only projects with BOQ records are shown in dropdown
5. **User selects a project** → BOQ data is fetched for that customer/project combination
6. **Form auto-populates** with:
   - Project Cost from BOQ's `totalWithGST`
   - GST settings from BOQ
7. **If no BOQ exists** → Falls back to project's `totalProjectValue`

## Benefits

- ✅ **Only shows customers with BOQ records** in the dropdown
- ✅ **Only shows projects with BOQ records** in the dropdown
- ✅ **Prevents selection of invalid customers** without BOQ data
- ✅ **Prevents selection of invalid projects** without BOQ data
- ✅ **Automatic data population** from Customer BOQ
- ✅ **Ensures payment amounts match BOQ totals**
- ✅ **Reduces manual data entry errors**
- ✅ **Maintains data consistency** across modules
- ✅ **Graceful fallback** if BOQ data is unavailable

## Testing Recommendations

1. Test with a customer/project that has a BOQ record
2. Test with a customer/project without a BOQ record
3. Verify that the correct `totalWithGST` value is populated
4. Check that GST settings are correctly applied
5. Ensure the form still works if BOQ API fails

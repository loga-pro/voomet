# Quality Form Image Upload Implementation

## Summary
Implemented complete image upload functionality for Quality Issue forms. Images are now uploaded to the server when selected and displayed via eye icons that open a preview modal.

## Changes Made

### Backend Changes

#### 1. Created `uploadQualityImage.js` middleware
- **File**: `backend/middleware/uploadQualityImage.js`
- Multer configuration for handling quality issue image uploads
- Stores images in `uploads/quality/` directory
- Accepts: JPEG, PNG, GIF, WebP
- Max file size: 5MB

#### 2. Updated `quality.js` routes
- **File**: `backend/routes/quality.js`
- Added `POST /api/quality/upload-image` endpoint
- Uploads image and returns URL path: `/uploads/quality/filename.jpg`
- Removed incorrect `hasImage` filter (was checking wrong field)

### Frontend Changes

#### 1. Updated `api.js`
- **File**: `frontend/src/services/api.js`
- Added `uploadImage()` method to `qualityAPI`
- Handles multipart/form-data upload

#### 2. Updated `QualityForm.jsx`
- **File**: `frontend/src/components/Forms/QualityForm.jsx`

**Key Changes:**
- **Import**: Added `qualityAPI` import
- **State**: Added `imagePreview` state for modal
- **Upload on Select**: Modified `handleNewIssueChange()` to upload images immediately when files are selected
- **Store URLs**: Images are now stored as URL strings instead of File objects
- **Eye Icons**: Replaced "✓ Uploaded" text with clickable eye icons
- **Preview Modal**: Added modal to display full-size images when eye icon is clicked
- **URL Construction**: Added logic to build full image URLs for preview

## How It Works

### Upload Flow:
1. User selects an image file (damage or fixed image)
2. Image is immediately uploaded to server via `POST /api/quality/upload-image`
3. Server saves file to `uploads/quality/` and returns URL path
4. URL is stored in form state (e.g., `/uploads/quality/1234567890-123456789.jpg`)
5. When form is submitted, the URL is saved to MongoDB

### Display Flow:
1. Quality issues are loaded with image URLs from database
2. If image exists, eye icon is displayed
3. Clicking eye icon opens modal with full-size image
4. Image is loaded from `http://localhost:5000/uploads/quality/filename.jpg`

## Database Schema
Images are stored as strings in the `qualityIssues` subdocuments:
- `damageImage`: String (URL path)
- `fixedImage`: String (URL path)

## File Structure
```
uploads/
  └── quality/
      ├── 1234567890-123456789.jpg
      ├── 1234567891-987654321.png
      └── ...
```

## API Endpoints

### Upload Image
```
POST /api/quality/upload-image
Headers: Authorization: Bearer <token>
Body: multipart/form-data with 'image' field
Response: { imageUrl: "/uploads/quality/filename.jpg" }
```

### Get Quality Issues
```
GET /api/quality
Response: {
  qualityIssues: [{
    qualityIssues: [{
      damageImage: "/uploads/quality/filename.jpg",
      fixedImage: "/uploads/quality/filename2.jpg",
      ...
    }]
  }]
}
```

## Notes
- Images are uploaded immediately when selected (not on form submit)
- This provides instant feedback and prevents data loss
- The uploads/quality directory is automatically created if it doesn't exist
- Images are served via Express static middleware already configured in Server.js

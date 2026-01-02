const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/receipts/";
    
    if (req.originalUrl.includes("purchase-requests")) {
      uploadPath = "uploads/middleware-upload/";
    } else if (req.originalUrl.includes("quality")) {
      uploadPath = "uploads/quality/";
    } else if (req.originalUrl.includes("logs") || req.body.uploadType === "logs") {
      uploadPath = "uploads/logs/";
    } else if (req.originalUrl.includes("dispatches")) {
      uploadPath = "uploads/dispatches/";
    }
    
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, (file.fieldname || 'file') + "-" + unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow common receipt file formats
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/pdf"
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF) and PDF files are allowed"), false);
  }
};

module.exports = multer({ storage, fileFilter });

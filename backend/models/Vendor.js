const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  vendorName: {
    type: String,
    required: true,
    minlength: [2, 'Vendor name must be at least 2 characters'],
    maxlength: [50, 'Vendor name must not exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[A-Za-z\s]+$/.test(v);
      },
      message: 'Vendor name can only contain letters and spaces'
    }
  },
  address: {
    type: String,
    required: false,
    maxlength: [200, 'Address must not exceed 200 characters']
  },
  city: {
    type: String,
    required: true,
    maxlength: [50, 'City must not exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[A-Za-z\s\-']+$/.test(v);
      },
      message: 'City can only contain letters, spaces, hyphens, and apostrophes'
    }
  },
  state: {
    type: String,
    required: true,
    maxlength: [50, 'State must not exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[A-Za-z\s\-']+$/.test(v);
      },
      message: 'State can only contain letters, spaces, hyphens, and apostrophes'
    }
  },
  zipCode: {
    type: String,
    required: true,
    maxlength: [20, 'ZIP code must not exceed 20 characters'],
    validate: {
      validator: function (v) {
        return /^[A-Z0-9\s\-]+$/.test(v);
      },
      message: 'ZIP code can only contain letters, numbers, spaces, and hyphens'
    }
  },
  country: {
    type: String,
    required: true,
    maxlength: [50, 'Country must not exceed 50 characters'],
    validate: {
      validator: function (v) {
        return /^[A-Za-z\s\-']+$/.test(v);
      },
      message: 'Country can only contain letters, spaces, hyphens, and apostrophes'
    }
  },
  bankAccountNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{9,18}$/.test(v);
      },
      message: 'Bank account number must be between 9 and 18 digits'
    }
  },
  ifscCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
      },
      message: 'Invalid IFSC code format'
    }
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  gstNumber: {
    type: String,
    required: false,
    uppercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        if (!v) return true;
        const cleanGST = v.replace(/\s+/g, '');
        if (cleanGST.length !== 15) return false;

        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
        if (!gstRegex.test(cleanGST)) return false;

        const stateCode = parseInt(cleanGST.substring(0, 2));
        const validStateCodes = [
          ...Array.from({ length: 37 }, (_, i) => i + 1),
          97
        ];

        return validStateCodes.includes(stateCode);
      },
      message: 'Invalid GST number format'
    }
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Mobile number must be exactly 10 digits'
    }
  },
  contactPerson: {
    type: String,
    default: '',
    maxlength: [50, 'Contact person name must not exceed 50 characters'],
    validate: {
      validator: function (v) {
        return v === '' || /^[A-Za-z\s]+$/.test(v);
      },
      message: 'Contact person name can only contain letters and spaces'
    }
  }
}, {
  timestamps: true
});

// Add index for better query performance and to handle unique constraints with empty values
vendorSchema.index(
  { email: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { email: { $type: "string", $gt: "" } } 
  }
);
vendorSchema.index({ mobileNumber: 1 }, { unique: true });
vendorSchema.index(
  { gstNumber: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { gstNumber: { $type: "string", $gt: "" } } 
  }
);

module.exports = mongoose.model('Vendor', vendorSchema);
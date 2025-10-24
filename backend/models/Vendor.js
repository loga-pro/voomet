const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: true,
    minlength: [2, 'Vendor name must be at least 2 characters'],
    maxlength: [50, 'Vendor name must not exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[A-Za-z\s]+$/.test(v);
      },
      message: 'Vendor name can only contain letters and spaces'
    }
  },
  address: {
    type: String,
    required: true
  },
  bankAccountNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{16}$/.test(v);
      },
      message: 'Bank account number must be exactly 16 digits'
    }
  },
  email: {
    type: String,
    required: true
  },
  gstNumber: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
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
      validator: function(v) {
        return v === '' || /^[A-Za-z\s]+$/.test(v);
      },
      message: 'Contact person name can only contain letters and spaces'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
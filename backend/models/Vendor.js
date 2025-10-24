const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  bankAccountNumber: {
    type: String,
    required: true
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
    required: true
  },
  contactPerson: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vendor', vendorSchema);
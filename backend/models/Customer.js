const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  gstinUin: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  invoiceEmail: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  stateCode: {
    type: String,
    required: false,
    validate: {
      validator: function (v) {
        // Allow empty or 2-digit state code
        return !v || /^\d{2}$/.test(v);
      },
      message: 'State code must be exactly 2 digits'
    }
  },
  zipCode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  billingAddress: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
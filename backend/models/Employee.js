const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  dob: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v <= new Date();
      },
      message: 'Date of birth cannot be a future date'
    }
  },
  qualification: {
    type: String,
    maxlength: 30
  },
  designation: {
    type: String,
    maxlength: 30
  },
  department: {
    type: String,
    maxlength: 30
  },
  address: String,
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  aadhar: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{12}$/.test(v);
      },
      message: props => `${props.value} is not a valid Aadhar number!`
    }
  },
  pan: {
    type: String,
    validate: {
      validator: function(v) {
        return /[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(v);
      },
      message: props => `${props.value} is not a valid PAN number!`
    }
  },
  uan: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^\d{12}$/.test(v);
      },
      message: props => `${props.value} is not a valid UAN number! UAN must be 12 digits.`
    }
  },
  bankName: String,
  bankAccountNumber: String,
  branch: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);
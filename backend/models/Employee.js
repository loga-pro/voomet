const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  dob: Date,
  qualification: String,
  designation: String,
  department: String,
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
  uan: String,
  bankName: String,
  bankAccountNumber: String,
  branch: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);
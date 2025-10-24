const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true
  },
  enquiryDate: {
    type: Date,
    required: true
  },
  scopeOfWork: [{
    type: String,
    enum: ['electrical', 'data', 'cctv', 'partion', 'fire_and_safety', 'access']
  }],
  stage: {
    type: String,
    enum: ['rfq', 'boq', 'awarded', 'under_execution', 'completed', 'post_implementation'],
    default: 'rfq'
  },
  totalProjectValue: {
    type: Number,
    required: true,
    min: 0
  },
  projectName: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
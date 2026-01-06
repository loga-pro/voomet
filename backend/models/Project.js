// models/Project.js
const mongoose = require('mongoose');

const projectHistorySchema = new mongoose.Schema({
  field: {
    type: String,
    required: true
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  updatedBy: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const projectSchema = new mongoose.Schema({
  customerName: {
    type: String,
  },
  customerId:{
    required: true,
    type:mongoose.Schema.Types.ObjectId,
    ref : "Customer"
  },
  enquiryDate: {
    type: Date,
    required: true
  },
  scopeOfWork: [{
    type: String,
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
  },
  projectCategory: {
    type: String,
    enum: ['residential', 'commercial'],
    required: true
  },
  projectType: {
    type: String,
    enum: ['new', 'existing'],
    default: 'new'
  },
  changeHistory: [projectHistorySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);
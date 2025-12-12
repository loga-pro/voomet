const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  phase: {
    type: String,
    required: true
  },
  task: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 0
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  responsiblePerson: {
    type: String,
    required: true
  },
   dependencies: [{
    type: String
  }],
  status: {
    type: String,
    default: 'Not Started',
    // Removed enum to allow all status variations
    enum: [
      'Not Started', 
      'On track', 
      'Delayed', 
      'Likely Delay', 
      'Completed',
      'Completed Earlier',
      'Completed (On Time)',
      'Completed with Delayed',
      'Completed with Likely Delayed'
    ]
  },
  completion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  actualStartDate: {
    type: Date,
    default: null
  },
  actualEndDate: {
    type: Date,
    default: null
  },
  outlookCompletion: {
    type: Date,
    default: null
  },
  remark: {
    type: String,
    default: ''
  }
});

const milestoneSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  emailId: {
    type: String,
    required: true
  },
  flexibilityPercentage: {
    type: Number,
    default: 0
  },
  projectStatus: {
    type: String,
    default: 'Not Started'
  },
  tasks: [taskSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Milestone', milestoneSchema);
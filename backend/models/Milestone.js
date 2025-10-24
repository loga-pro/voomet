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
    required: true
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
  // Add tracking fields
  status: {
    type: String,
    default: 'Not Started',
    enum: ['Not Started', 'On track', 'Delayed', 'Likely Delay', 'Completed']
  },
  completion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  actualStartDate: {
    type: Date
  },
  actualEndDate: {
    type: Date
  },
  outlookCompletion: {
    type: Date
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
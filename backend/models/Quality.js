const mongoose = require('mongoose');

/* ============================
   Sub Schema: Quality Issue
   ============================ */
const qualityIssueSchema = new mongoose.Schema({
  dateOfIssue: {
    type: Date,
    required: true
  },

  scopeOfWork: {
    type: String,
    enum: [
      'Electrical',
      'Data',
      'CCTV',
      'Partition',
      'Fire and Safety',
      'Access',
      'Transportation'
    ],
    required: true
  },

  reason: {
    type: String,
    enum: ['Damaged', 'Missing', 'Wrong Installation', 'Other'],
    required: true
  },

  description: {
    type: String,
    required: true,
    trim: true
  },

  dateOfDamage: {
    type: Date
  },

  damageImage: {
    type: String   // file path or URL
  },

  dateOfFixed: {
    type: Date
  },

  fixedImage: {
    type: String   // file path or URL
  },

  remarks: {
    type: String,
    trim: true
  },

  personType: {
    type: String,
    enum: ['inhouse', 'outsourced']
  },

  responsiblePerson: {
    type: String,
    trim: true
  }
}, { _id: true });

/* ============================
   Main Quality Schema
   ============================ */
const qualitySchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
    trim: true
  },

  projectName: {
    type: String,
    trim: true
  },

  scopeOfWork: [{
    type: String,
    enum: [
      'Electrical',
      'Data',
      'CCTV',
      'Partition',
      'Fire and Safety',
      'Access',
      'Transportation'
    ]
  }],

  scopeOfWorkText: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    enum: ['rectify', 'replace', 'possible', 'not possible', 'reject'],
    required: true
  },

  status: {
    type: String,
    enum: ['open', 'in-progress', 'closed'],
    default: 'open'
  },

  personType: {
    type: String,
    enum: ['inhouse', 'outsourced']
  },

  responsibility: {
    type: String,
    trim: true
  },

  remarks: {
    type: String,
    trim: true
  },

  /* Embedded Issues */
  qualityIssues: [qualityIssueSchema],

  openIssues: {
    type: String,
    required: true,
    trim: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Quality', qualitySchema);

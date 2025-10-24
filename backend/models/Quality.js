const mongoose = require('mongoose');

const qualitySchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true
  },
  scopeOfWork: {
    type: String,
    enum: ['Electrical', 'Data', 'CCTV', 'Partition', 'Fire and Safety', 'Access', 'Transportation'],
    required: true
  },
  scopeOfWorkText: {
    type: String,
    trim: true
  },
  openIssues: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['rectify', 'replace'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  responsibility: {
    type: String,
    required: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quality', qualitySchema);
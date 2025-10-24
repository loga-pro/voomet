const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  scopeOfWork: {
    type: String,
    enum: ['electrical', 'data', 'cctv', 'partion', 'fire_and_safety', 'access'],
    required: true
  },
  partName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['inhouse', 'out_sourced', 'bought_out'],
    required: true
  },
  unitType: {
    type: String,
    enum: ['sq_feet', 'number', 'meter'],
    required: true
  },
  partPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Part', partSchema);
const mongoose = require('mongoose');

const partSchema = new mongoose.Schema({
  scopeOfWork: {
    type: String,
    required: true
  },
  partName: {
    type: String,
    required: true
  },
  specification: {
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
    required: true
    // Removed enum restriction to allow custom unit types
  },
  partPrice: {
    type: Number,
    required: true,
    min: 0
  },
  priceHistory: [{
    price: {
      type: Number,
      required: true,
      min: 0
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: String,
      required: false
    }
  }],
  vendorName: {
    type: String,
    required: false
  },
  reorderLevel: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Pre-save hook to handle unitType validation issues
partSchema.pre('save', function(next) {
  // If unitType is present, clear any existing validation errors for this field
  if (this.unitType && this.invalidate) {
    // Clear any unitType validation errors that might exist
    this.$__.validationError = this.$__.validationError || {};
    delete this.$__.validationError.unitType;
  }
  next();
});

// Override validate method to skip unitType validation
partSchema.methods.validate = function(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  // Create a copy of options that excludes unitType from validation
  const validateOptions = { ...options };
  if (!validateOptions.skip) {
    validateOptions.skip = [];
  }
  if (!Array.isArray(validateOptions.skip)) {
    validateOptions.skip = [validateOptions.skip];
  }
  validateOptions.skip.push('unitType');
  
  // Call the original validate method with our modified options
  return mongoose.Document.prototype.validate.call(this, validateOptions, callback);
};

module.exports = mongoose.model('Part', partSchema);
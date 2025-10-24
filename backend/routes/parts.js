const express = require('express');
const Part = require('../models/Part');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all parts with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { scopeOfWork, category, partName } = req.query;
    let filter = {};

    if (scopeOfWork) filter.scopeOfWork = scopeOfWork;
    if (category) filter.category = category;
    if (partName) filter.partName = new RegExp(partName, 'i');

    const parts = await Part.find(filter);
    res.json(parts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get part by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }
    res.json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new part
router.post('/', auth, async (req, res) => {
  try {
    const part = new Part(req.body);
    await part.save();
    res.status(201).json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update part
router.put('/:id', auth, async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }
    res.json(part);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete part
router.delete('/:id', auth, async (req, res) => {
  try {
    const part = await Part.findByIdAndDelete(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Part not found' });
    }
    res.json({ message: 'Part deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

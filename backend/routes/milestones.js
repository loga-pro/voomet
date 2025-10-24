const express = require('express');
const Milestone = require('../models/Milestone');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all milestones with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customer, projectName, emailId, phase, projectStatus, projectId, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (customer) filter.customer = new RegExp(customer, 'i');
    if (projectName) filter.projectName = new RegExp(projectName, 'i');
    if (emailId) filter.emailId = new RegExp(emailId, 'i');
    if (projectStatus) filter.projectStatus = projectStatus;
    if (projectId) {
      // Get project by ID to get the project name
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      if (project) {
        filter.projectName = project.projectName;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const milestones = await Milestone.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Milestone.countDocuments(filter);

    res.json({
      milestones,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get milestone by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    res.json(milestone);
  } catch (error) {
    console.error('Error fetching milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new milestone
router.post('/', auth, async (req, res) => {
  try {
    const milestone = new Milestone(req.body);
    await milestone.save();
    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update milestone
router.put('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    res.json({ 
      message: 'Milestone updated successfully', 
      milestone 
    });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update milestone tracking data
router.patch('/:id/tracking', auth, async (req, res) => {
  try {
    const { tasks } = req.body;
    
    const milestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      { $set: { tasks } },
      { new: true, runValidators: true }
    );
    
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    res.json({ 
      message: 'Tracking data updated successfully', 
      milestone 
    });
  } catch (error) {
    console.error('Error updating tracking data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete milestone
router.delete('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
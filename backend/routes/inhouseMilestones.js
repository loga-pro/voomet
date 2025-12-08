const express = require('express');
const InhouseMilestone = require('../models/InhouseMilestone');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all inhouse milestones with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customer, projectName, emailId, phase, projectStatus, projectId, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (customer) filter.customer = new RegExp(customer, 'i');
    if (projectName) filter.projectName = new RegExp(projectName, 'i');
    if (emailId) filter.emailId = new RegExp(emailId, 'i');
    if (projectStatus) filter.projectStatus = projectStatus;
    if (projectId) {
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      if (project) {
        filter.projectName = project.projectName;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const milestones = await InhouseMilestone.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InhouseMilestone.countDocuments(filter);

    res.json({
      milestones,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching inhouse milestones:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inhouse milestone tracking data
router.patch('/:id/tracking', auth, async (req, res) => {
  try {
    const { tasks } = req.body;
    
    console.log(`Updating tracking for inhouse milestone ${req.params.id}`);
    
    if (!Array.isArray(tasks)) {
      console.error('Tasks is not an array:', typeof tasks);
      return res.status(400).json({ message: 'Tasks must be an array' });
    }
    
    const milestone = await InhouseMilestone.findById(req.params.id);
    if (!milestone) {
      console.error('Inhouse milestone not found:', req.params.id);
      return res.status(404).json({ message: 'Inhouse milestone not found' });
    }
    
    const sanitizedTasks = tasks.map((task, i) => {
      console.log(`Processing task ${i}:`, task.task);
      
      const sanitizedTask = {
        phase: task.phase || 'Uncategorized',
        task: task.task || 'Untitled Task',
        duration: task.duration !== undefined && task.duration !== null ? Number(task.duration) : 0,
        responsiblePerson: task.responsiblePerson || 'Unassigned',
        status: task.status || 'Not Started',
        completion: task.completion !== undefined && task.completion !== null ? Number(task.completion) : 0,
        remark: task.remark || '',
        startDate: task.startDate && task.startDate !== '' ? new Date(task.startDate) : null,
        endDate: task.endDate && task.endDate !== '' ? new Date(task.endDate) : null,
        actualStartDate: task.actualStartDate && task.actualStartDate !== '' ? new Date(task.actualStartDate) : null,
        actualEndDate: task.actualEndDate && task.actualEndDate !== '' ? new Date(task.actualEndDate) : null,
        outlookCompletion: task.outlookCompletion && task.outlookCompletion !== '' ? new Date(task.outlookCompletion) : null,
        originalDuration: task.originalDuration !== undefined && task.originalDuration !== null ? Number(task.originalDuration) : (task.duration || 0)
      };

      if (task._id) {
        sanitizedTask._id = task._id;
      }

      return sanitizedTask;
    });
    
    console.log(`Sanitized ${sanitizedTasks.length} tasks`);
    
    milestone.tasks = sanitizedTasks;
    
    await milestone.save();
    
    console.log('Inhouse milestone tracking data updated successfully');
    res.json({ 
      message: 'Tracking data updated successfully', 
      milestone 
    });
  } catch (error) {
    console.error('Error updating inhouse milestone tracking data:', error);
    console.error('Stack trace:', error.stack);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      console.error('Validation errors:', errors);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: errors 
      });
    }
    
    if (error.name === 'CastError') {
      console.error('Cast error:', error.message);
      return res.status(400).json({ 
        message: `Invalid ${error.path} format: ${error.value}` 
      });
    }
    
    if (error.code === 11000) {
      console.error('Duplicate key error:', error.message);
      return res.status(400).json({ 
        message: 'Duplicate data error' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get inhouse milestone by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const milestone = await InhouseMilestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: 'Inhouse milestone not found' });
    }
    res.json(milestone);
  } catch (error) {
    console.error('Error fetching inhouse milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new inhouse milestone
router.post('/', auth, async (req, res) => {
  try {
    const { customer, projectName } = req.body;
    
    // Check for duplicate inhouse milestone with same customer and project name
    const existingMilestone = await InhouseMilestone.findOne({
      customer: customer,
      projectName: projectName
    });
    
    if (existingMilestone) {
      return res.status(400).json({ 
        message: 'An inhouse milestone with the same customer and project name already exists.' 
      });
    }
    
    const milestone = new InhouseMilestone(req.body);
    await milestone.save();
    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating inhouse milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update inhouse milestone
router.put('/:id', auth, async (req, res) => {
  try {
    const { customer, projectName } = req.body;
    
    // If customer or projectName is being updated, check for duplicates
    if (customer || projectName) {
      const existingMilestone = await InhouseMilestone.findOne({
        customer: customer,
        projectName: projectName,
        _id: { $ne: req.params.id } // Exclude the current milestone
      });
      
      if (existingMilestone) {
        return res.status(400).json({ 
          message: 'An inhouse milestone with the same customer and project name already exists.' 
        });
      }
    }
    
    const milestone = await InhouseMilestone.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!milestone) {
      return res.status(404).json({ message: 'Inhouse milestone not found' });
    }
    
    res.json({ 
      message: 'Inhouse milestone updated successfully', 
      milestone 
    });
  } catch (error) {
    console.error('Error updating inhouse milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete inhouse milestone
router.delete('/:id', auth, async (req, res) => {
  try {
    const milestone = await InhouseMilestone.findByIdAndDelete(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: 'Inhouse milestone not found' });
    }
    res.json({ message: 'Inhouse milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting inhouse milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


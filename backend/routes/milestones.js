const express = require('express');
const Milestone = require('../models/Milestone');
const InhouseMilestone = require('../models/InhouseMilestone');
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

// Update milestone tracking data
router.patch('/:id/tracking', auth, async (req, res) => {
  try {
    const { tasks } = req.body;
    
    console.log(`Updating tracking for milestone ${req.params.id}`);
    
    // Validate that tasks is an array
    if (!Array.isArray(tasks)) {
      console.error('Tasks is not an array:', typeof tasks);
      return res.status(400).json({ message: 'Tasks must be an array' });
    }
    
    // Find the milestone first to ensure it exists
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      console.error('Milestone not found:', req.params.id);
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    // Validate and sanitize each task
    const sanitizedTasks = tasks.map((task, i) => {
      console.log(`Processing task ${i}:`, task.task);
      
      // Ensure required fields exist with defaults
      const sanitizedTask = {
        phase: task.phase || 'Uncategorized',
        task: task.task || 'Untitled Task',
        duration: task.duration !== undefined && task.duration !== null ? Number(task.duration) : 0,
        responsiblePerson: task.responsiblePerson || 'Unassigned',
        status: task.status || 'Not Started',
        completion: task.completion !== undefined && task.completion !== null ? Number(task.completion) : 0,
        remark: task.remark || '',
        // Handle dates properly - convert empty strings to null
        startDate: task.startDate && task.startDate !== '' ? new Date(task.startDate) : null,
        endDate: task.endDate && task.endDate !== '' ? new Date(task.endDate) : null,
        actualStartDate: task.actualStartDate && task.actualStartDate !== '' ? new Date(task.actualStartDate) : null,
        actualEndDate: task.actualEndDate && task.actualEndDate !== '' ? new Date(task.actualEndDate) : null,
        outlookCompletion: task.outlookCompletion && task.outlookCompletion !== '' ? new Date(task.outlookCompletion) : null
      };

      // Keep the _id if it exists (for updates)
      if (task._id) {
        sanitizedTask._id = task._id;
      }

      return sanitizedTask;
    });
    
    console.log(`Sanitized ${sanitizedTasks.length} tasks`);
    
    // Update the milestone with the new tasks array
    milestone.tasks = sanitizedTasks;
    
    // Save with validation
    await milestone.save();
    
    console.log('Tracking data updated successfully');
    res.json({ 
      message: 'Tracking data updated successfully', 
      milestone 
    });
  } catch (error) {
    console.error('Error updating tracking data:', error);
    console.error('Stack trace:', error.stack);
    
    // Handle validation errors specifically
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
    
    // Handle CastError (invalid ObjectId or date)
    if (error.name === 'CastError') {
      console.error('Cast error:', error.message);
      return res.status(400).json({ 
        message: `Invalid ${error.path} format: ${error.value}` 
      });
    }
    
    // Handle MongoDB specific errors
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
    const { customer, projectName } = req.body;
    
    // Check for duplicate milestone with same customer and project name
    const existingMilestone = await Milestone.findOne({
      customer: customer,
      projectName: projectName
    });
    
    if (existingMilestone) {
      return res.status(400).json({ 
        message: 'A milestone with the same customer and project name already exists.' 
      });
    }
    
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
    const { customer, projectName } = req.body;
    
    // If customer or projectName is being updated, check for duplicates
    if (customer || projectName) {
      const existingMilestone = await Milestone.findOne({
        customer: customer,
        projectName: projectName,
        _id: { $ne: req.params.id } // Exclude the current milestone
      });
      
      if (existingMilestone) {
        return res.status(400).json({ 
          message: 'A milestone with the same customer and project name already exists.' 
        });
      }
    }
    
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

// Delete milestone
router.delete('/:id', auth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Store customer and projectName before deleting
    const { customer, projectName } = milestone;

    // Delete the milestone
    await Milestone.findByIdAndDelete(req.params.id);

    // Also delete the corresponding inhouse milestone with the same customer and projectName
    const deletedInhouseMilestone = await InhouseMilestone.findOneAndDelete({
      customer: customer,
      projectName: projectName
    });

    if (deletedInhouseMilestone) {
      console.log(`Also deleted corresponding inhouse milestone for ${customer} - ${projectName}`);
    }

    res.json({ 
      message: 'Milestone deleted successfully',
      deletedInhouseMilestone: deletedInhouseMilestone ? true : false
    });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
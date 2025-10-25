const express = require('express');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all employees with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { name, department, designation } = req.query;
    let filter = {};

    if (name) filter.name = new RegExp(name, 'i');
    if (department) filter.department = new RegExp(department, 'i');
    if (designation) filter.designation = new RegExp(designation, 'i');

    console.log('Employee GET request - Filter:', filter);
    const employees = await Employee.find(filter);
    console.log(`Found ${employees.length} employees`);
    res.json(employees);
  } catch (error) {
    console.error('Employee GET error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new employee
router.post('/', auth, async (req, res) => {
  try {
    console.log('Employee creation attempt - Request body:', JSON.stringify(req.body, null, 2));
    const employee = new Employee(req.body);
    await employee.save();
    console.log('Employee created successfully');
    res.status(201).json(employee);
  } catch (error) {
    console.error('Employee creation error details:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Employee with this email already exists' });
    } else if (error.name === 'ValidationError') {
      // Handle validation errors
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      console.log('Validation errors:', validationErrors);
      res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    } else {
      console.error('Employee creation error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Update employee
router.put('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Handle validation errors
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors 
      });
    } else if (error.code === 11000) {
      res.status(400).json({ message: 'Employee with this email already exists' });
    } else {
      console.error('Employee update error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Delete employee
router.delete('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
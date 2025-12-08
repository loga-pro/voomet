const express = require('express');
const Employee = require('../models/Employee');
const User = require('../models/User');
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
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if name or email is being updated
    const nameChanged = req.body.name && req.body.name !== employee.name;
    const emailChanged = req.body.email && req.body.email !== employee.email;

    // Update employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // If name or email changed, cascade updates to related models
    if (nameChanged || emailChanged) {
      console.log(`[Employee Update] Cascading updates for employee: ${employee.name} (${employee.email})`);
      
      // Update User model if it exists
      const userUpdate = {};
      if (nameChanged) userUpdate.name = req.body.name;
      if (emailChanged) userUpdate.email = req.body.email;
      
      const userResult = await User.updateMany(
        { email: employee.email },
        userUpdate
      );
      console.log(`[Employee Update] Updated ${userResult.modifiedCount} User records`);

      // Update Milestone model - responsiblePerson field
      const Milestone = require('../models/Milestone');
      if (nameChanged) {
        const milestoneResult = await Milestone.updateMany(
          { 'tasks.responsiblePerson': employee.name },
          { $set: { 'tasks.$.responsiblePerson': req.body.name } }
        );
        console.log(`[Employee Update] Updated ${milestoneResult.modifiedCount} Milestone task records`);
      }

      // Update Project model - updatedBy field
      const Project = require('../models/Project');
      if (nameChanged) {
        const projectResult = await Project.updateMany(
          { updatedBy: employee.name },
          { updatedBy: req.body.name }
        );
        console.log(`[Employee Update] Updated ${projectResult.modifiedCount} Project records`);
      }

      // Update ProjectBudget model - createdBy field (ObjectId reference, no update needed for name changes)
      // The ProjectBudget model stores createdBy as ObjectId, so name changes don't affect it
      console.log(`[Employee Update] ProjectBudget records use ObjectId references, no cascade update needed`);

      // Update ProjectExpenditure model - createdBy and updatedBy fields (ObjectId references, no update needed)
      // The ProjectExpenditure model stores createdBy/updatedBy as ObjectId references to User, so name changes don't affect it
      console.log(`[Employee Update] ProjectExpenditure records use ObjectId references, no cascade update needed`);

      // Update LogisticExpenditure model - createdBy and updatedBy fields (ObjectId references, no update needed)
      // The LogisticExpenditure model stores createdBy/updatedBy as ObjectId references to User, so name changes don't affect it
      console.log(`[Employee Update] LogisticExpenditure records use ObjectId references, no cascade update needed`);

      // Update Payment model - createdBy field
      const Payment = require('../models/Payment');
      if (nameChanged) {
        const paymentResult = await Payment.updateMany(
          { createdBy: employee.name },
          { createdBy: req.body.name }
        );
        console.log(`[Employee Update] Updated ${paymentResult.modifiedCount} Payment records`);
      }

      // Update VendorPayment model - createdBy field
      const VendorPayment = require('../models/VendorPayment');
      if (nameChanged) {
        const vendorPaymentResult = await VendorPayment.updateMany(
          { createdBy: employee.name },
          { createdBy: req.body.name }
        );
        console.log(`[Employee Update] Updated ${vendorPaymentResult.modifiedCount} VendorPayment records`);
      }
    }

    res.json(updatedEmployee);
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
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log(`[DELETE Employee] Checking dependencies for: ${employee.name} (${employee.email})`);

    // Check for dependencies in User model
    const userCount = await User.countDocuments({ email: employee.email });
    console.log(`[DELETE Employee] Found ${userCount} User records`);

    // Check for dependencies in Milestone model - responsiblePerson field
    const Milestone = require('../models/Milestone');
    const milestoneCount = await Milestone.countDocuments({ 'tasks.responsiblePerson': employee.name });
    console.log(`[DELETE Employee] Found ${milestoneCount} Milestone task records`);

    // Check for dependencies in Project model - updatedBy field
    const Project = require('../models/Project');
    const projectCount = await Project.countDocuments({ updatedBy: employee.name });
    console.log(`[DELETE Employee] Found ${projectCount} Project records`);

    // Check for dependencies in ProjectBudget model - createdBy field (ObjectId reference)
    // Since ProjectBudget uses ObjectId references, we need to check if the employee has a User account
    const userAccount = await User.findOne({ email: employee.email });
    let budgetCount = 0;
    let expenditureCount = 0;
    let logisticCount = 0;
    
    if (userAccount) {
      const ProjectBudget = require('../models/ProjectBudget');
      budgetCount = await ProjectBudget.countDocuments({ createdBy: userAccount._id });
      console.log(`[DELETE Employee] Found ${budgetCount} ProjectBudget records (via User account)`);

      // Check for dependencies in ProjectExpenditure model - createdBy and updatedBy fields (ObjectId references)
      const ProjectExpenditure = require('../models/ProjectExpenditure');
      expenditureCount = await ProjectExpenditure.countDocuments({ 
        $or: [{ createdBy: userAccount._id }, { updatedBy: userAccount._id }] 
      });
      console.log(`[DELETE Employee] Found ${expenditureCount} ProjectExpenditure records (via User account)`);

      // Check for dependencies in LogisticExpenditure model - createdBy and updatedBy fields (ObjectId references)
      const LogisticExpenditure = require('../models/LogisticExpenditure');
      logisticCount = await LogisticExpenditure.countDocuments({ 
        $or: [{ createdBy: userAccount._id }, { updatedBy: userAccount._id }] 
      });
      console.log(`[DELETE Employee] Found ${logisticCount} LogisticExpenditure records (via User account)`);
    } else {
      console.log(`[DELETE Employee] No User account found for employee, skipping ProjectBudget/Expenditure checks`);
    }

    // Check for dependencies in Payment model - createdBy field
    const Payment = require('../models/Payment');
    const paymentCount = await Payment.countDocuments({ createdBy: employee.name });
    console.log(`[DELETE Employee] Found ${paymentCount} Payment records`);

    // Check for dependencies in VendorPayment model - createdBy field
    const VendorPayment = require('../models/VendorPayment');
    const vendorPaymentCount = await VendorPayment.countDocuments({ createdBy: employee.name });
    console.log(`[DELETE Employee] Found ${vendorPaymentCount} VendorPayment records`);

    // Check if any dependencies exist
    if (userCount > 0 || milestoneCount > 0 || projectCount > 0 || 
        budgetCount > 0 || expenditureCount > 0 || logisticCount > 0 || 
        paymentCount > 0 || vendorPaymentCount > 0) {
      let dependencies = [];
      if (userCount > 0) dependencies.push(`${userCount} User account(s)`);
      if (milestoneCount > 0) dependencies.push(`${milestoneCount} Milestone task(s)`);
      if (projectCount > 0) dependencies.push(`${projectCount} Project record(s)`);
      if (budgetCount > 0) dependencies.push(`${budgetCount} ProjectBudget record(s)`);
      if (expenditureCount > 0) dependencies.push(`${expenditureCount} ProjectExpenditure record(s)`);
      if (logisticCount > 0) dependencies.push(`${logisticCount} LogisticExpenditure record(s)`);
      if (paymentCount > 0) dependencies.push(`${paymentCount} Payment record(s)`);
      if (vendorPaymentCount > 0) dependencies.push(`${vendorPaymentCount} VendorPayment record(s)`);

      return res.status(400).json({ 
        message: 'Cannot delete employee with existing dependencies',
        dependencies: dependencies,
        totalDependencies: userCount + milestoneCount + projectCount + budgetCount + 
                          expenditureCount + logisticCount + paymentCount + vendorPaymentCount
      });
    }

    // If no dependencies, proceed with deletion
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Employee deletion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
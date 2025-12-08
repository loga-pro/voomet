const express = require('express');
const Customer = require('../models/Customer');
const Project = require('../models/Project');
const BOQ = require('../models/BOQ');
const Milestone = require('../models/Milestone');
const Quality = require('../models/Quality');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all customers with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customerName, customerEmail } = req.query;
    let filter = {};

    if (customerName) filter.customerName = new RegExp(customerName, 'i');
    if (customerEmail) filter.customerEmail = new RegExp(customerEmail, 'i');

    const customers = await Customer.find(filter);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new customer
router.post('/', auth, async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update customer
router.put('/:id', auth, async (req, res) => {
  try {
    const oldCustomer = await Customer.findById(req.params.id);
    if (!oldCustomer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // If customer name has changed, update related collections
    if (oldCustomer.customerName !== customer.customerName) {
      const oldName = oldCustomer.customerName;
      const newName = customer.customerName;

      // Update Projects
      await Project.updateMany(
        { $or: [{ customerId: customer._id }, { customerName: oldName }] },
        { $set: { customerName: newName } }
      );

      // Update BOQs
      await BOQ.updateMany(
        { $or: [{ customer: oldName }, { customerId: customer._id }] }, // Assuming BOQ might have customerId in future, but sticking to schema
        { $set: { customer: newName } }
      );

      // Update Milestones
      await Milestone.updateMany(
        { $or: [{ customer: oldName }, { customerId: customer._id }] },
        { $set: { customer: newName } }
      );

      // Update Quality
      await Quality.updateMany(
        { $or: [{ customer: oldName }, { customerId: customer._id }] },
        { $set: { customer: newName } }
      );

      // Update Payments
      await Payment.updateMany(
        { $or: [{ customer: oldName }, { customerId: customer._id }] },
        { $set: { customer: newName } }
      );
    }

    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Check for dependencies using both ID and Name to be safe
    
    // Helper to escape special characters for regex
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const trimmedName = customer.customerName.trim();
    const escapedName = escapeRegExp(trimmedName);
    const namePattern = new RegExp(`^${escapedName}$`, 'i');
    
    console.log(`[DELETE Customer] Checking dependencies for: "${customer.customerName}" (ID: ${customer._id})`);
    console.log(`[DELETE Customer] Regex Pattern: ${namePattern}`);

    // Project has customerId (ObjectId) and customerName (String)
    const projectCount = await Project.countDocuments({ 
      $or: [
        { customerId: customer._id }, 
        { customerName: customer.customerName },
        { customerName: { $regex: namePattern } }
      ] 
    });
    
    // BOQ has customer (String) - No customerId in schema
    const boqCount = await BOQ.countDocuments({ 
      $or: [
        { customer: customer.customerName },
        { customer: { $regex: namePattern } }
      ]
    });

    // Milestone has customer (String) - No customerId in schema
    const milestoneCount = await Milestone.countDocuments({ 
      $or: [
        { customer: customer.customerName },
        { customer: { $regex: namePattern } }
      ]
    });

    // Quality has customer (String) - No customerId in schema
    const qualityCount = await Quality.countDocuments({ 
      $or: [
        { customer: customer.customerName },
        { customer: { $regex: namePattern } }
      ]
    });

    // Payment has customer (String) - No customerId in schema
    const paymentCount = await Payment.countDocuments({ 
      $or: [
        { customer: customer.customerName },
        { customer: { $regex: namePattern } }
      ]
    });

    console.log(`[DELETE Customer] Dependencies found - Projects: ${projectCount}, BOQs: ${boqCount}, Milestones: ${milestoneCount}, Quality: ${qualityCount}, Payments: ${paymentCount}`);

    if (projectCount > 0 || boqCount > 0 || milestoneCount > 0 || qualityCount > 0 || paymentCount > 0) {
      let dependencies = [];
      if (projectCount > 0) dependencies.push('Projects');
      if (boqCount > 0) dependencies.push('BOQs');
      if (milestoneCount > 0) dependencies.push('Milestones');
      if (qualityCount > 0) dependencies.push('Quality Records');
      if (paymentCount > 0) dependencies.push('Payments');

      const message = `Cannot delete customer. Please delete related ${dependencies.join(', ')} first.`;
      console.log(`[DELETE Customer] Blocked: ${message}`);
      
      return res.status(400).json({ message });
    }

    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
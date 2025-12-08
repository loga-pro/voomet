// routes/projects.js
const express = require('express');
const Project = require('../models/Project');
const ProjectBudget = require('../models/ProjectBudget');
const ProjectExpenditure = require('../models/ProjectExpenditure');
const LogisticExpenditure = require('../models/LogisticExpenditure');
const BOQ = require('../models/BOQ');
const Milestone = require('../models/Milestone');
const Payment = require('../models/Payment');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

const router = express.Router();

// Stage sequence validation
const validateStageSequence = (currentStage, newStage, projectType, existingStage = null) => {
  const stageOrder = {
    'rfq': 1,
    'boq': 2,
    'awarded': 3,
    'under_execution': 4,
    'completed': 5,
    'post_implementation': 6
  };

  // For existing projects, allow any stage selection
  if (projectType === 'existing') {
    return { isValid: true };
  }

  // For new projects, validate stage progression
  if (existingStage && stageOrder[newStage] < stageOrder[existingStage]) {
    return {
      isValid: false,
      message: `Cannot move back to ${newStage} from ${existingStage} for new projects`
    };
  }

  return { isValid: true };
};

// Get all projects with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { customerName, stage, projectName, projectType } = req.query;
    let filter = {};

    if (customerName) filter.customerName = new RegExp(customerName, 'i');
    if (stage) filter.stage = stage;
    if (projectName) filter.projectName = new RegExp(projectName, 'i');
    if (projectType) filter.projectType = projectType;

    const projects = await Project.find(filter);
    res.json(projects);
  } catch (error) {
    console.error('Error in project update:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { user } = req;
    const projectData = {
      ...req.body,
      changeHistory: [{
        field: 'created',
        oldValue: null,
        newValue: 'Project created',
        updatedBy: user.name || user.email,
        updatedAt: new Date()
      }]
    };

    const project = new Project(projectData);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Project with this name already exists' });
    } else {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const { user } = req;
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Stage validation for new projects
    if (req.body.stage && project.projectType === 'new') {
      const restrictedStages = ['under_execution', 'completed', 'post_implementation'];
      if (restrictedStages.includes(req.body.stage)) {
        return res.status(400).json({ 
          message: `Cannot set stage to ${req.body.stage} for new projects. Allowed stages: RFQ, BOQ, Awarded` 
        });
      }
    }

    // Track changes
    const changes = [];
    Object.keys(req.body).forEach(key => {
      if (JSON.stringify(project[key]) !== JSON.stringify(req.body[key])) {
        changes.push({
          field: key,
          oldValue: project[key],
          newValue: req.body[key],
          updatedBy: user.name || user.email,
          updatedAt: new Date()
        });
      }
    });

    // Update project with changes
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        $push: { changeHistory: { $each: changes } }
      },
      { new: true, runValidators: true }
    );

    // If project name was changed, update corresponding customer name and all related data
    if (req.body.projectName && req.body.projectName !== project.projectName) {
      const Customer = require('../models/Customer');
      const ProjectBudget = require('../models/ProjectBudget');
      const ProjectExpenditure = require('../models/ProjectExpenditure');
      const LogisticExpenditure = require('../models/LogisticExpenditure');
      const Payment = require('../models/Payment');
      const Milestone = require('../models/Milestone');
      const BOQ = require('../models/BOQ');
      const Quality = require('../models/Quality');
      const Inventory = require('../models/Inventory');
      
      const oldProjectName = project.projectName;
      const newProjectName = req.body.projectName;
      
      // Update Customer model (if project name is used as customer name)
      const updatedCustomer = await Customer.findOneAndUpdate(
        { customerName: oldProjectName },
        { customerName: newProjectName },
        { new: true }
      );

      if (updatedCustomer) {
        console.log(`Customer name updated from "${oldProjectName}" to "${newProjectName}"`);
      }

      // Update ProjectBudget model - update project names
      const updatedBudgetsProjectName = await ProjectBudget.updateMany(
        { projectName: oldProjectName },
        { projectName: newProjectName }
      );

      if (updatedBudgetsProjectName.modifiedCount > 0) {
        console.log(`Updated ${updatedBudgetsProjectName.modifiedCount} project budget records (project name)`);
      }

      // Update ProjectBudget model - update customer names (if project name is used as customer)
      const updatedBudgetsCustomerName = await ProjectBudget.updateMany(
        { customerName: oldProjectName },
        { customerName: newProjectName }
      );

      if (updatedBudgetsCustomerName.modifiedCount > 0) {
        console.log(`Updated ${updatedBudgetsCustomerName.modifiedCount} project budget records (customer name)`);
      }

      // Update ProjectExpenditure model - update project names
      const updatedExpenditures = await ProjectExpenditure.updateMany(
        { projectName: oldProjectName },
        { projectName: newProjectName }
      );

      if (updatedExpenditures.modifiedCount > 0) {
        console.log(`Updated ${updatedExpenditures.modifiedCount} project expenditure records`);
      }

      // Update LogisticExpenditure model - update project names
      const updatedLogisticExpenditures = await LogisticExpenditure.updateMany(
        { projectName: oldProjectName },
        { projectName: newProjectName }
      );

      if (updatedLogisticExpenditures.modifiedCount > 0) {
        console.log(`Updated ${updatedLogisticExpenditures.modifiedCount} logistic expenditure records`);
      }

      // Update Payment model - update customer names (if project name is used as customer)
      const updatedPayments = await Payment.updateMany(
        { customer: oldProjectName },
        { customer: newProjectName }
      );

      if (updatedPayments.modifiedCount > 0) {
        console.log(`Updated ${updatedPayments.modifiedCount} payment records`);
      }

      // Update Milestone model - update project names and customer names
      const updatedMilestonesProject = await Milestone.updateMany(
        { projectName: oldProjectName },
        { projectName: newProjectName }
      );

      if (updatedMilestonesProject.modifiedCount > 0) {
        console.log(`Updated ${updatedMilestonesProject.modifiedCount} milestone records (project name)`);
      }

      const updatedMilestonesCustomer = await Milestone.updateMany(
        { customer: oldProjectName },
        { customer: newProjectName }
      );

      if (updatedMilestonesCustomer.modifiedCount > 0) {
        console.log(`Updated ${updatedMilestonesCustomer.modifiedCount} milestone records (customer name)`);
      }

      // Update BOQ model - update customer names (if project name is used as customer)
      const updatedBOQs = await BOQ.updateMany(
        { customer: oldProjectName },
        { customer: newProjectName }
      );

      if (updatedBOQs.modifiedCount > 0) {
        console.log(`Updated ${updatedBOQs.modifiedCount} BOQ records`);
      }

      // Update Quality model - update customer names (if project name is used as customer)
      const updatedQualityRecords = await Quality.updateMany(
        { customer: oldProjectName },
        { customer: newProjectName }
      );

      if (updatedQualityRecords.modifiedCount > 0) {
        console.log(`Updated ${updatedQualityRecords.modifiedCount} quality records`);
      }

      // Update Inventory model - update project names
      const updatedInventory = await Inventory.updateMany(
        { projectName: oldProjectName },
        { projectName: newProjectName }
      );

      if (updatedInventory.modifiedCount > 0) {
        console.log(`Updated ${updatedInventory.modifiedCount} inventory records`);
      }

      // Also update the current project's customerName field if it matches the old project name
      if (project.customerName === oldProjectName) {
        await Project.findByIdAndUpdate(
          req.params.id,
          { customerName: newProjectName },
          { new: true }
        );
        console.log(`Updated project's customerName field from "${oldProjectName}" to "${newProjectName}"`);
      }
    }

    // If customer name was changed, update all related data
    if (req.body.customerName && req.body.customerName !== project.customerName) {
      try {
        const Customer = require('../models/Customer');
        const ProjectBudget = require('../models/ProjectBudget');
        const Payment = require('../models/Payment');
        const Milestone = require('../models/Milestone');
        const BOQ = require('../models/BOQ');
        const Quality = require('../models/Quality');
        
        const oldCustomerName = project.customerName;
        const newCustomerName = req.body.customerName;

        console.log(`Processing customer name change from "${oldCustomerName}" to "${newCustomerName}"`);

        // Update Customer model - create new customer if doesn't exist
        let existingCustomer = await Customer.findOne({ customerName: newCustomerName });
        if (!existingCustomer && newCustomerName) {
          // Create new customer entry if it doesn't exist
          const newCustomer = new Customer({
            customerName: newCustomerName,
            customerEmail: '', // Default empty, can be updated later
            contact: '' // Default empty, can be updated later
          });
          await newCustomer.save();
          console.log(`Created new customer: "${newCustomerName}"`);
        }

      // Update ProjectBudget model - update all budgets with this customer name
      const updatedBudgets = await ProjectBudget.updateMany(
        { customerName: oldCustomerName },
        { customerName: newCustomerName }
      );

      if (updatedBudgets.modifiedCount > 0) {
        console.log(`Updated ${updatedBudgets.modifiedCount} project budget records`);
      }

      // Update Payment model - update all payments with this customer name
      const updatedPayments = await Payment.updateMany(
        { customer: oldCustomerName },
        { customer: newCustomerName }
      );

      if (updatedPayments.modifiedCount > 0) {
        console.log(`Updated ${updatedPayments.modifiedCount} payment records`);
      }

      // Update Milestone model - update all milestones with this customer name
      const updatedMilestones = await Milestone.updateMany(
        { customer: oldCustomerName },
        { customer: newCustomerName }
      );

      if (updatedMilestones.modifiedCount > 0) {
        console.log(`Updated ${updatedMilestones.modifiedCount} milestone records`);
      }

      // Update BOQ model - update all BOQs with this customer name
      const updatedBOQs = await BOQ.updateMany(
        { customer: oldCustomerName },
        { customer: newCustomerName }
      );

      if (updatedBOQs.modifiedCount > 0) {
        console.log(`Updated ${updatedBOQs.modifiedCount} BOQ records`);
      }

      // Update Quality model - update all quality records with this customer name
      const updatedQualityRecords = await Quality.updateMany(
        { customer: oldCustomerName },
        { customer: newCustomerName }
      );

      if (updatedQualityRecords.modifiedCount > 0) {
        console.log(`Updated ${updatedQualityRecords.modifiedCount} quality records`);
      }
      } catch (syncError) {
        console.error('Error in customer name synchronization:', syncError);
        console.error('Sync error stack:', syncError.stack);
        // Continue with the response even if sync fails - don't block the main update
      }
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project history
router.get('/:id/history', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('changeHistory');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project.changeHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check for dependencies using both ID and Name to be safe
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const trimmedName = project.projectName.trim();
    const escapedName = escapeRegExp(trimmedName);
    const namePattern = new RegExp(`^${escapedName}$`, 'i');
    
    console.log(`[DELETE Project] Checking dependencies for: "${project.projectName}" (ID: ${project._id})`);
    console.log(`[DELETE Project] Regex Pattern: ${namePattern}`);

    // Check ProjectBudget
    const projectBudgetCount = await ProjectBudget.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check ProjectExpenditure
    const projectExpenditureCount = await ProjectExpenditure.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check LogisticExpenditure
    const logisticExpenditureCount = await LogisticExpenditure.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check BOQ
    const boqCount = await BOQ.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check Milestones
    const milestoneCount = await Milestone.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check Payments
    const paymentCount = await Payment.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    // Check Inventory
    const inventoryCount = await Inventory.countDocuments({ 
      $or: [
        { projectId: project._id }, 
        { projectName: project.projectName },
        { projectName: { $regex: namePattern } }
      ] 
    });

    console.log(`[DELETE Project] Dependencies found - ProjectBudgets: ${projectBudgetCount}, ProjectExpenditures: ${projectExpenditureCount}, LogisticExpenditures: ${logisticExpenditureCount}, BOQs: ${boqCount}, Milestones: ${milestoneCount}, Payments: ${paymentCount}, Inventory: ${inventoryCount}`);

    if (projectBudgetCount > 0 || projectExpenditureCount > 0 || logisticExpenditureCount > 0 || 
        boqCount > 0 || milestoneCount > 0 || paymentCount > 0 || inventoryCount > 0) {
      let dependencies = [];
      if (projectBudgetCount > 0) dependencies.push('Project Budgets');
      if (projectExpenditureCount > 0) dependencies.push('Project Expenditures');
      if (logisticExpenditureCount > 0) dependencies.push('Logistic Expenditures');
      if (boqCount > 0) dependencies.push('BOQs');
      if (milestoneCount > 0) dependencies.push('Milestones');
      if (paymentCount > 0) dependencies.push('Payments');
      if (inventoryCount > 0) dependencies.push('Inventory');

      const message = `Cannot delete project. Please delete related ${dependencies.join(', ')} first.`;
      console.log(`[DELETE Project] Blocked: ${message}`);
      
      return res.status(400).json({ message });
    }

    // If no dependencies, proceed with deletion
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
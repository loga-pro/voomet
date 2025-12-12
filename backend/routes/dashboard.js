const express = require('express');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Inventory = require('../models/Inventory');
const Quality = require('../models/Quality');
const VendorPayment = require('../models/VendorPayment');
const auth = require('../middleware/auth');

const router = express.Router();

// Get projects by stage for popup details
router.get('/projects-by-stage/:stage', auth, async (req, res) => {
  try {
    let { stage } = req.params;
    
    // Map frontend stage IDs to backend stage values
    const stageMapping = {
      'rfq': 'rfq',
      'boq': 'boq',
      'awarded': 'awarded',
      'under-execution': 'under_execution',
      'completed': 'completed',
      'post-implementation': 'post_implementation'
    };
    
    // Convert frontend ID to backend stage value
    const backendStage = stageMapping[stage] || stage;
    
    const projects = await Project.find({ stage: backendStage })
      .select('projectName customerName totalProjectValue stage createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10);
    
    // Transform projects to match expected format in frontend
    const transformedProjects = projects.map(project => ({
      ...project.toObject(),
      customer: {
        name: project.customerName,
        email: 'N/A'
      }
    }));
    
    res.json(transformedProjects);
  } catch (error) {
    console.error('Error fetching projects by stage:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Get all dashboard KPIs
router.get('/kpis', auth, async (req, res) => {
  try {
    // Project KPIs
    const projectStages = await Project.aggregate([
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 }
        }
      }
    ]);

    // Financial KPIs - Only include payments with saved data (at least one invoice)
    const payments = await Payment.find({
      $expr: { $gt: [{ $size: { $ifNull: ["$invoices", []] } }, 0] }
    });
    
    // Get unique projects from saved payments only (not from Project Master)
    const uniqueProjects = [...new Set(payments.map(p => p.project))];
    const totalProjects = uniqueProjects.length;
    
    // Calculate total project value from saved payment records only
    const totalProjectValue = payments.reduce((sum, payment) => sum + (payment.projectCost || 0), 0);
    
    // Calculate payment received and pending
    const totalPaymentsReceived = payments.reduce((sum, payment) => {
      return sum + (payment.totalPayments || 0);
    }, 0);
    
    const totalInvoiceRaised = payments.reduce((sum, payment) => {
      return sum + (payment.totalInvoiceRaised || 0);
    }, 0);
    
    const totalPaymentsPending = totalInvoiceRaised - totalPaymentsReceived;

    // Vendor Payment KPIs
    const vendorPayments = await VendorPayment.find();
    
    // Calculate vendor payment KPIs
    const totalVendorPayments = vendorPayments.reduce((sum, payment) => {
      return sum + (payment.totalPayments || 0);
    }, 0);
    
    const totalVendorInvoiceRaised = vendorPayments.reduce((sum, payment) => {
      return sum + (payment.totalInvoiceRaised || 0);
    }, 0);
    
    const totalVendorPaymentsPending = vendorPayments.reduce((sum, payment) => {
      return sum + (payment.balanceAmount || 0);
    }, 0);
    
    // Payment Completed - based on status 'paid'
    const paymentCompleted = vendorPayments.filter(payment => payment.status === 'paid').length;
    const paymentPending = vendorPayments.filter(payment => payment.status === 'pending').length;
    const paymentOverdue = vendorPayments.filter(payment => payment.status === 'overdue').length;

    // Inventory KPIs - Enhanced calculations matching InventoryManagement.jsx
    const inventoryItems = await Inventory.find();
    
    // Total items count
    const totalItems = inventoryItems.length;
    
    // Calculate total stock value and total inventory value
    const totalStockValue = inventoryItems.reduce((sum, item) => {
      return sum + (item.totalStockValue || 0);
    }, 0);
    
    const totalInventoryValue = inventoryItems.reduce((sum, item) => {
      return sum + (item.totalInventoryValue || 0);
    }, 0);
    
    // Count items by stock status based on reorder levels
    const outOfStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      return stockLevel <= 0;
    }).length;
    
    const lowStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      const reOrderLevel = item.reOrderLevel || 0;
      // Low stock: stock is above 0, reorder level is set (> 0), and stock is at or below reorder level
      return reOrderLevel > 0 && stockLevel > 0 && stockLevel <= reOrderLevel;
    }).length;
    
    const excessStockItems = inventoryItems.filter((item) => {
      const stockLevel = item.stockAtFactory || 0;
      const reOrderLevel = item.reOrderLevel || 0;
      // Excess stock: stock is more than 3x the reorder level
      return reOrderLevel > 0 && stockLevel > (reOrderLevel * 3);
    }).length;

    // Quality KPIs - Enhanced calculations
    const qualityIssues = await Quality.find();
    
    // Count by category
    const rectifyCount = qualityIssues.filter(issue => issue.category === 'rectify').length;
    const replaceCount = qualityIssues.filter(issue => issue.category === 'replace').length;
    
    // Count issues by status
    const openIssuesCount = qualityIssues.filter(issue => issue.status === 'open').length;
    const closedIssuesCount = qualityIssues.filter(issue => issue.status === 'closed').length;
    const criticalIssuesCount = qualityIssues.filter(issue => issue.priority === 'critical').length;
    const totalIssuesCount = qualityIssues.length;

    res.json({
      projectKPIs: {
        rfq: projectStages.find(stage => stage._id === 'rfq')?.count || 0,
        boq: projectStages.find(stage => stage._id === 'boq')?.count || 0,
        awarded: projectStages.find(stage => stage._id === 'awarded')?.count || 0,
        underExecution: projectStages.find(stage => stage._id === 'under_execution')?.count || 0,
        completed: projectStages.find(stage => stage._id === 'completed')?.count || 0,
        postImplementation: projectStages.find(stage => stage._id === 'post_implementation')?.count || 0
      },
      financialKPIs: {
        totalProjects: totalProjects,
        totalProjectValue,
        totalPaymentsReceived,
        totalPaymentsPending,
        paymentCompleted: payments.filter(p => p.status === 'paid').length,
        paymentPending: payments.filter(p => p.status === 'pending').length,
        paymentOverdue: payments.filter(p => p.status === 'overdue').length
      },
      vendorPaymentKPIs: {
        totalVendors: vendorPayments.length,
        totalVendorPayments,
        totalVendorInvoiceRaised,
        totalVendorPaymentsPending,
        paymentCompleted,
        paymentPending,
        paymentOverdue
      },
      inventoryKPIs: {
        totalItems,
        totalStockValue,
        totalInventoryValue,
        lowStockItems,
        outOfStockItems,
        excessStockItems
      },
      qualityKPIs: {
        rectify: rectifyCount,
        replace: replaceCount,
        openIssues: openIssuesCount,
        closedIssues: closedIssuesCount,
        criticalIssues: criticalIssuesCount,
        totalIssues: totalIssuesCount
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard KPIs:', error);
    res.status(500).json({ message: 'Server error fetching KPIs' });
  }
});

module.exports = router;
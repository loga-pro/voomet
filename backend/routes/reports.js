const express = require('express');
const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Inventory = require('../models/Inventory');
const Quality = require('../models/Quality');
const Payment = require('../models/Payment');
const VendorPayment = require('../models/VendorPayment');
const auth = require('../middleware/auth');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const multer = require('multer');
const upload = multer();

const router = express.Router();
const smtpConfig = {
  host: process.env.EMAIL_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
};

const parseEmails = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return value.split(",").map(e => e.trim()).filter(Boolean);
    };

// Create transporter from SMTP configuration
const transporter = nodemailer.createTransport(smtpConfig);

// Enhanced function to generate professional PDF for reports with logo and styling
const generateEnhancedReportPDF = async (data, reportType, title, logoPath = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const secondaryColor = [52, 73, 94]; // Dark gray
  const accentColor = [46, 204, 113]; // Green

  // Add professional header with logo placeholder
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Add company info in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('VOOMET INTERIORS', 20, 15);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Crafting Beautiful Spaces', 20, 25);

  // Add contact info
  doc.text('Phone: +91-9876543210', pageWidth - 80, 15);
  doc.text('Email: info@voometinteriors.com', pageWidth - 80, 25);

  // Reset text color for content
  doc.setTextColor(0, 0, 0);

  // Add report title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(title, 20, 60);

  // Add report metadata
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const reportDate = new Date().toLocaleDateString('en-IN');
  const reportTime = new Date().toLocaleTimeString('en-IN');
  doc.text(`Generated on: ${reportDate} at ${reportTime}`, 20, 70);
  doc.text(`Total Records: ${data.length}`, 20, 80);

  // Calculate financial summary if applicable
  let totalValue = 0;
  data.forEach(item => {
    if (item.totalProjectValue) totalValue += item.totalProjectValue;
    if (item.totalAmount) totalValue += item.totalAmount;
    if (item.paymentAmount) totalValue += item.paymentAmount;
    if (item.totalInvoiceRaised) totalValue += item.totalInvoiceRaised;
    if (item.budget) totalValue += item.budget;
    if (item.cost) totalValue += item.cost;
  });

  // Additional calculation for financial reports
  if (['payment', 'vendor', 'project', 'milestone'].includes(reportType)) {
    totalValue = data.reduce((sum, item) => {
      const value = item.amount || item.total_amount || item.payment_amount || item.budget || item.cost || 0;
      return sum + parseFloat(value || 0);
    }, 0);
  }

  if (totalValue > 0) {
    doc.text(`Total Financial Value: ₹${totalValue.toLocaleString('en-IN')}`, 20, 90);
  }

  // Prepare table data based on report type
  let headers = [];
  let body = [];

  switch (reportType) {
    case 'project':
      headers = ['Customer Name', 'Project Name', 'Stage', 'Enquiry Date', 'Total Value (₹)'];
      body = data.map(item => [
        item.customerName || 'N/A',
        item.projectName || 'N/A',
        (item.stage?.replace('_', ' ').toUpperCase()) || 'N/A',
        item.enquiryDate ? new Date(item.enquiryDate).toLocaleDateString() : 'N/A',
        `₹${item.totalProjectValue?.toLocaleString() || '0'}`
      ]);
      break;

    case 'milestone':
      // First, add the milestone summary table
      headers = ['Customer', 'Project Name', 'Start Date', 'End Date', 'Total Activities'];
      body = data.map(item => [
        item.customer || 'N/A',
        item.projectName || 'N/A',
        item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A',
        item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A',
        item.tasks ? item.tasks.length : 0
      ]);

      // Create the summary table
      doc.autoTable({
        head: [headers],
        body: body,
        startY: totalValue > 0 ? 100 : 90,
        styles: {
          fontSize: 8,
          textColor: [44, 62, 80],
          lineColor: [189, 195, 199],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fillColor: [255, 255, 255]
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { halign: 'left' }
        },
        margin: { top: 20 }
      });

      // Add detailed task breakdown for each milestone
      data.forEach((milestone, milestoneIndex) => {
        if (milestone.tasks && milestone.tasks.length > 0) {
          // Add spacing and section header
          const sectionStartY = doc.lastAutoTable.finalY + 20;

          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(`Project Tasks for ${milestone.projectName || 'Project'}`, 20, sectionStartY);

          // Task table headers
          const taskHeaders = ['Phase', 'Task', 'Duration (Days)', 'Responsible Person', 'Start Date', 'End Date'];

          // Task table body
          const taskBody = milestone.tasks.map(task => [
            task.phase || 'N/A',
            task.task || 'N/A',
            task.duration || 0,
            task.responsiblePerson || 'N/A',
            task.startDate ? new Date(task.startDate).toLocaleDateString() : 'N/A',
            task.endDate ? new Date(task.endDate).toLocaleDateString() : 'N/A'
          ]);

          // Create task table
          doc.autoTable({
            head: [taskHeaders],
            body: taskBody,
            startY: sectionStartY + 10,
            styles: {
              fontSize: 7,
              textColor: [44, 62, 80],
              lineColor: [189, 195, 199],
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [52, 73, 94],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fillColor: [255, 255, 255]
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            columnStyles: {
              0: { halign: 'left', cellWidth: 25 },
              1: { halign: 'left', cellWidth: 40 },
              2: { halign: 'center', cellWidth: 15 },
              3: { halign: 'left', cellWidth: 25 },
              4: { halign: 'center', cellWidth: 20 },
              5: { halign: 'center', cellWidth: 20 },
              6: { halign: 'center', cellWidth: 20 }
            },
            margin: { top: 20 }
          });
        }
      });

      // Skip the default table creation since we already created custom tables
      return doc.output('arraybuffer');

    case 'inventory':
      headers = ['Scope of Work', 'Part Name', 'Part Price (₹)', 'Total Receipts', 'Date of Receipt', 'Cumulative Qty'];
      body = data.map(item => [
        item.scopeOfWork?.replace('_', ' ').toUpperCase() || 'N/A',
        item.partName || 'N/A',
        `₹${item.partPrice?.toLocaleString() || '0'}`,
        item.receipts?.reduce((sum, receipt) => sum + (receipt.quantity || 0), 0) || 0,
        item.dateOfReceipt ? new Date(item.dateOfReceipt).toLocaleDateString() : 'N/A',
        item.cumulativeQuantityAtVoomet || 0
      ]);
      break;

    case 'quality':
      headers = ['Customer', 'Scope of Work', 'Category', 'Status', 'Responsibility', 'Created Date'];
      body = data.map(item => [
        item.customer || 'N/A',
        item.scopeOfWork || 'N/A',
        item.category || 'N/A',
        item.status || 'N/A',
        item.responsibility || 'N/A',
        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'
      ]);
      break;

    case 'payment':
      headers = ['Customer', 'Project Name', 'Project Cost (₹)', 'Total Invoice Raised (₹)', 'Total Payments (₹)', 'Balance (₹)', 'Status', 'Total Invoices', 'Total Payments Made'];
      body = data.map(item => [
        item.customer || 'N/A',
        item.projectName || 'N/A',
        `₹${item.projectCost?.toLocaleString() || '0'}`,
        `₹${item.totalInvoiceRaised?.toLocaleString() || '0'}`,
        `₹${item.totalPayments?.toLocaleString() || '0'}`,
        `₹${item.balanceAmount?.toLocaleString() || '0'}`,
        item.status || 'N/A',
        item.invoices ? item.invoices.length : 0,
        item.invoices ? item.invoices.reduce((total, invoice) => total + (invoice.payments ? invoice.payments.length : 0), 0) : 0
      ]);
      break;

    case 'vendor':
      headers = ['Vendor', 'GST Number', 'Account Number', 'Total Invoice Raised (₹)', 'Total Payments (₹)', 'Balance (₹)', 'Status', 'Total Invoices', 'Total Payments Made'];
      body = data.map(item => [
        item.vendor || 'N/A',
        item.vendorGstNumber || 'N/A',
        item.vendorAccountNumber || 'N/A',
        `₹${item.totalInvoiceRaised?.toLocaleString() || '0'}`,
        `₹${item.totalPayments?.toLocaleString() || '0'}`,
        `₹${item.balanceAmount?.toLocaleString() || '0'}`,
        item.status || 'N/A',
        item.invoices ? item.invoices.length : 0,
        item.invoices ? item.invoices.reduce((total, invoice) => total + (invoice.payments ? invoice.payments.length : 0), 0) : 0
      ]);
      break;

    default:
      headers = ['Data'];
      body = data.map(item => [JSON.stringify(item)]);
  }

  // Use autoTable method with enhanced styling
  doc.autoTable({
    head: [headers],
    body: body,
    startY: totalValue > 0 ? 100 : 90,
    styles: {
      fontSize: 8,
      textColor: [44, 62, 80],
      lineColor: [189, 195, 199],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fillColor: [255, 255, 255]
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      0: { halign: 'left' }
    },
    margin: { top: 20 }
  });

  // Add footer
  const finalY = doc.lastAutoTable.finalY || 250;
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Generated by Voomet Interiors System', 20, pageHeight - 8);
  doc.text(`Page 1 of 1`, pageWidth - 40, pageHeight - 8);

  return doc.output('arraybuffer');
};

router.post('/send-email', auth, upload.array('attachments'), async (req, res) => {
  try {
    
    const { from, subject, body } = req.body;
    const to = parseEmails(req.body.to);
    const cc = parseEmails(req.body.cc);
    const bcc = parseEmails(req.body.bcc);

    const validateList = (list) => list.every(e => emailRegex.test(e));

    if (!validateList(to)) {
      return res.status(400).json({ message: "Invalid email in TO field" });
    }
    if (!validateList(cc)) {
      return res.status(400).json({ message: "Invalid email in CC field" });
    }
    if (!validateList(bcc)) {
      return res.status(400).json({ message: "Invalid email in BCC field" });
    }

    // Required fields
    if (!subject || !body) {
      return res.status(400).json({
        message: 'To, Subject, and Body are required'
      });
    }

    // Build attachments only if present
    let attachments = [];

    if (Array.isArray(req.files) && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: 'application/pdf'
      }));
    }

    // Build HTML email body
    const htmlBody = `
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <div>${body}</div>
        </body>
      </html>
    `;

    // Mail options
    const mailOptions = {
      from: from || process.env.EMAIL_USER,
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject,
      html: htmlBody,
      attachments
    };

    const result = await transporter.sendMail(mailOptions);

    res.json({
      message: 'Email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      message: 'Failed to send email',
      error: error.message
    });
  }
});



// Send report via email with "hi" in body
// router.post('/send-email', auth, async (req, res) => {
//   try {
//     const { email, subject,cc,bcc,reportType, reportTitle, reportData, pdfData, pdfFilename, boqId } = req.body;

//     console.log('Email request received:', { email, reportType, reportTitle, reportData, boqId });

//     if (!email || !reportType) {
//       return res.status(400).json({ 
//         message: 'Email and report type are required' 
//       });
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ 
//         message: 'Invalid email format' 
//       });
//     }

//     // Fetch data based on report type
//     let data = [];
//     let title = '';

//     console.log('Fetching data for report type:', reportType);

//     // Use provided data if available, otherwise fetch from database
//     if (reportData && reportData.length > 0) {
//       data = reportData;
//       title = reportTitle || `${reportType.replace('-', ' ').toUpperCase()} Reports`;
//       console.log(`Using provided data with ${data.length} records for ${reportType} report`);
//     } else {
//       try {
//         switch (reportType) {
//           case 'project':
//             data = await Project.find().lean();
//             title = 'Project Reports';
//             break;
//           case 'boq':
//             // Handle BOQ reports - fetch BOQ data if boqId is provided
//             if (boqId) {
//               const BOQ = require('../models/BOQ');
//               const Customer = require('../models/Customer');
//               const boqData = await BOQ.findById(boqId).lean();
//               if (boqData) {
//                 data = [boqData];
//                 title = `BOQ Report - ${boqData.customer}`;

//                 // Try to find customer email by customer name
//                 if (boqData.customer) {
//                   const customer = await Customer.findOne({ customerName: boqData.customer }).lean();
//                   if (customer && customer.customerEmail) {
//                     // Override the email with the customer's actual email
//                     req.body.email = customer.customerEmail;
//                     console.log(`Found customer email: ${customer.customerEmail}`);
//                   }
//                 }
//               } else {
//                 return res.status(404).json({ 
//                   message: 'BOQ not found' 
//                 });
//               }
//             } else {
//               return res.status(400).json({ 
//                 message: 'BOQ ID is required for BOQ reports' 
//               });
//             }
//             break;
//           case 'project-comprehensive':
//             const projects = await Project.find().lean();
//             const milestones = await Milestone.find().lean();
//             const payments = await Payment.find().lean();

//             data = projects.map(project => {
//               const projectMilestones = milestones.filter(m => m.projectName === project.projectName);
//               const projectPayments = payments.filter(p => p.projectName === project.projectName);

//               const totalMilestones = projectMilestones.length;
//               const completedMilestones = projectMilestones.filter(m => 
//                 m.tasks && m.tasks.every(task => task.status === 'Completed')
//               ).length;
//               const milestoneCompletionRate = totalMilestones > 0 ? 
//                 Math.round((completedMilestones / totalMilestones) * 100) : 0;

//               const totalInvoiceValue = projectPayments.reduce((sum, payment) => 
//                 sum + (payment.totalInvoiceRaised || 0), 0);
//               const totalPaymentReceived = projectPayments.reduce((sum, payment) => 
//                 sum + (payment.totalPayments || 0), 0);
//               const balanceAmount = totalInvoiceValue - totalPaymentReceived;
//               const paymentStatus = balanceAmount === 0 ? 'Paid' : 
//                                   balanceAmount > 0 ? 'Pending' : 'Overdue';

//               return {
//                 ...project,
//                 milestoneData: {
//                   totalMilestones,
//                   completedMilestones,
//                   milestoneCompletionRate
//                 },
//                 paymentData: {
//                   totalInvoiceValue,
//                   totalPaymentReceived,
//                   balanceAmount,
//                   paymentStatus
//                 }
//               };
//             });
//             title = 'Comprehensive Project Reports';
//             break;
//           case 'milestone':
//             data = await Milestone.find().lean();
//             title = 'Milestone Reports';
//             break;
//           case 'inventory':
//             data = await Inventory.find().lean();
//             title = 'Inventory Reports';
//             break;
//           case 'quality':
//             data = await Quality.find().lean();
//             title = 'Quality Reports';
//             break;
//           case 'payment':
//             data = await Payment.find().lean();
//             title = 'Customer Payment Reports';
//             break;
//           case 'vendor':
//             data = await VendorPayment.find().lean();
//             title = 'Vendor Payment Reports';
//             break;
//           default:
//             return res.status(400).json({ 
//               message: 'Invalid report type' 
//             });
//         }
//         console.log(`Fetched ${data.length} records for ${reportType} report`);
//       } catch (dbError) {
//         console.error('Database error:', dbError);
//         return res.status(500).json({ 
//           message: 'Error fetching data from database',
//           error: dbError.message 
//         });
//       }
//     }

//     console.log(`Fetched ${data.length} records for ${reportType} report`);

//     if (!data || data.length === 0) {
//       return res.status(404).json({ 
//         message: 'No data found for this report type' 
//       });
//     }

//     // Generate PDF or use provided PDF data
//     let pdfBuffer;
//     if (pdfData) {
//       // Use provided PDF data from frontend
//       try {
//         pdfBuffer = Buffer.from(pdfData, 'base64');
//         console.log('Using provided PDF data from frontend');
//       } catch (pdfError) {
//         console.error('Error decoding provided PDF data:', pdfError);
//         return res.status(500).json({ 
//           message: 'Error decoding provided PDF data',
//           error: pdfError.message 
//         });
//       }
//     } else {
//       // Generate PDF on backend
//       try {
//         pdfBuffer = await generateEnhancedReportPDF(data, reportType, title);
//         console.log('PDF generated successfully');
//       } catch (pdfError) {
//         console.error('PDF generation error:', pdfError);
//         return res.status(500).json({ 
//           message: 'Error generating PDF',
//           error: pdfError.message 
//         });
//       }
//     }

//     // Verify transporter is connected
//     try {
//       await transporter.verify();
//       console.log('SMTP connection verified');
//     } catch (smtpError) {
//       console.error('SMTP connection error:', smtpError);
//       return res.status(500).json({ 
//         message: 'Email service unavailable',
//         error: smtpError.message 
//       });
//     }

//     // Send email with "hi" in body
//     const mailOptions = {
//       from: process.env.EMAIL_USER || 'support@caldimengg.in',
//       to: email,
//       cc, 
//       bcc, 
//       subject: `${subject} - Voomet Report`,
//       html: 'hi',
// attachments: [
//   {
//     filename: pdfFilename || `${reportType}-report-${Date.now()}.pdf`,
//     content: Buffer.from(pdfBuffer),
//     contentType: 'application/pdf'
//   }
// ]
//     };

//     console.log('Sending email to:', email);

//     const emailResult = await transporter.sendMail(mailOptions);
//     console.log('Email sent successfully:', emailResult.messageId);

//     res.json({ 
//       message: 'Report sent successfully via email',
//       messageId: emailResult.messageId 
//     });

//   } catch (error) {
//     console.error('Error sending email:', error);

//     // More specific error messages
//     if (error.code === 'EAUTH') {
//       return res.status(500).json({ 
//         message: 'Email authentication failed',
//         error: 'Invalid email credentials' 
//       });
//     } else if (error.code === 'ECONNECTION') {
//       return res.status(500).json({ 
//         message: 'Email connection failed',
//         error: 'Cannot connect to email server' 
//       });
//     } else {
//       return res.status(500).json({ 
//         message: 'Failed to send email',
//         error: error.message 
//       });
//     }
//   }
// });

// Enhanced project report with milestone and payment data
router.get('/project-comprehensive', auth, async (req, res) => {
  try {
    const projects = await Project.find().lean();
    const milestones = await Milestone.find().lean();
    const payments = await Payment.find().lean();

    // Combine data for comprehensive project report
    const comprehensiveData = projects.map(project => {
      // Find related milestones
      const projectMilestones = milestones.filter(m => m.projectName === project.projectName);

      // Find related payments
      const projectPayments = payments.filter(p => p.projectName === project.projectName);

      // Calculate task metrics
      let totalTasks = 0;
      let completedTasks = 0;

      projectMilestones.forEach(milestone => {
        if (milestone.tasks && milestone.tasks.length > 0) {
          totalTasks += milestone.tasks.length;
          completedTasks += milestone.tasks.filter(task => task.status === 'Completed').length;
        }
      });

      const taskCompletionRate = totalTasks > 0 ?
        Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate payment metrics
      const totalInvoiceValue = projectPayments.reduce((sum, payment) =>
        sum + (payment.totalInvoiceRaised || 0), 0);
      const totalPaymentReceived = projectPayments.reduce((sum, payment) =>
        sum + (payment.totalPayments || 0), 0);
      const balanceAmount = totalInvoiceValue - totalPaymentReceived;
      const paymentStatus = balanceAmount === 0 ? 'Paid' :
        balanceAmount > 0 ? 'Pending' : 'Overdue';

      // Calculate average milestone completion from tasks
      const avgTaskCompletion = projectMilestones.length > 0 ?
        Math.round(
          projectMilestones.reduce((sum, milestone) => {
            if (milestone.tasks && milestone.tasks.length > 0) {
              const taskCompletion = milestone.tasks.reduce((taskSum, task) =>
                taskSum + (task.completion || 0), 0) / milestone.tasks.length;
              return sum + taskCompletion;
            }
            return sum;
          }, 0) / projectMilestones.length
        ) : 0;

      return {
        ...project,
        milestoneData: {
          totalTasks,
          completedTasks,
          taskCompletionRate,
          totalMilestones: projectMilestones.length,
          completedMilestones: projectMilestones.filter(m =>
            m.tasks && m.tasks.every(task => task.status === 'Completed')
          ).length,
          milestoneCompletionRate: projectMilestones.length > 0 ?
            Math.round((projectMilestones.filter(m =>
              m.tasks && m.tasks.every(task => task.status === 'Completed')
            ).length / projectMilestones.length) * 100) : 0,
          avgTaskCompletion,
          milestones: projectMilestones
        },
        paymentData: {
          totalInvoiceValue,
          totalPaymentReceived,
          balanceAmount,
          paymentStatus,
          paymentCount: projectPayments.length,
          payments: projectPayments
        }
      };
    });

    res.json(comprehensiveData);
  } catch (error) {
    console.error('Comprehensive project report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export CSV endpoint
router.get('/export-csv/:reportType', auth, async (req, res) => {
  try {
    const { reportType } = req.params;

    // Fetch data based on report type
    let data = [];
    let filename = '';

    switch (reportType) {
      case 'project':
        data = await Project.find();
        filename = 'project-report.csv';
        break;
      case 'milestone':
        data = await Milestone.find();
        filename = 'milestone-report.csv';
        break;
      case 'inventory':
        data = await Inventory.find();
        filename = 'inventory-report.csv';
        break;
      case 'quality':
        data = await Quality.find();
        filename = 'quality-report.csv';
        break;
      case 'payment':
        data = await Payment.find();
        filename = 'payment-report.csv';
        break;
      case 'vendor':
        data = await VendorPayment.find();
        filename = 'vendor-payment-report.csv';
        break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ message: 'No data found for this report type' });
    }

    // Generate CSV content
    const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0])
      .filter(key => key !== '__v' && key !== '_id');

    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        const obj = row.toObject ? row.toObject() : row;
        return headers.map(header => {
          const value = obj[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',');
      })
    ].join('\n');

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ message: 'Failed to export CSV', error: error.message });
  }
});

// Generate PDF report without sending email
router.post('/generate-pdf', auth, async (req, res) => {
  try {
    const { reportType, reportTitle, reportData } = req.body;

    if (!reportType) {
      return res.status(400).json({
        message: 'Report type is required'
      });
    }

    console.log('PDF generation request received:', { reportType, reportTitle, dataLength: reportData?.length });

    // Use provided data if available, otherwise fetch from database
    let data = [];
    let title = '';

    if (reportData && reportData.length > 0) {
      data = reportData;
      title = reportTitle || `${reportType.replace('-', ' ').toUpperCase()} Report`;
      console.log(`Using provided data with ${data.length} records for ${reportType} report`);
    } else {
      try {
        switch (reportType) {
          case 'project':
            data = await Project.find().lean();
            title = 'Project Report';
            break;
          case 'milestone':
            data = await Milestone.find().lean();
            title = 'Milestone Report';
            break;
          case 'inventory':
            data = await Inventory.find().lean();
            title = 'Inventory Report';
            break;
          case 'quality':
            data = await Quality.find().lean();
            title = 'Quality Report';
            break;
          case 'payment':
            data = await Payment.find().lean();
            title = 'Customer Payment Report';
            break;
          case 'vendor':
            data = await VendorPayment.find().lean();
            title = 'Vendor Payment Report';
            break;
          default:
            return res.status(400).json({
              message: 'Invalid report type'
            });
        }
        console.log(`Fetched ${data.length} records for ${reportType} report`);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({
          message: 'Error fetching data from database',
          error: dbError.message
        });
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        message: 'No data found for this report type'
      });
    }

    // Generate PDF
    let pdfBuffer;
    try {
      pdfBuffer = await generateEnhancedReportPDF(data, reportType, title);
      console.log('PDF generated successfully');
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return res.status(500).json({
        message: 'Error generating PDF',
        error: pdfError.message
      });
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.byteLength);

    // Send PDF buffer
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

module.exports = router;
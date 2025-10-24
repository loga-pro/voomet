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

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Function to generate PDF for reports
const generateReportPDF = (data, reportType, title) => {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);

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
      headers = ['Customer', 'Project Name', 'Start Date', 'End Date', 'Status', 'Total Activities', 'Completed Activities', 'Completion %'];
      body = data.map(item => [
        item.customer || 'N/A',
        item.projectName || 'N/A',
        item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A',
        item.endDate ? new Date(item.endDate).toLocaleDateString() : 'N/A',
        item.projectStatus || 'Not Started',
        item.tasks ? item.tasks.length : 0,
        item.tasks ? item.tasks.filter(task => task.status === 'Completed').length : 0,
        item.tasks && item.tasks.length > 0 ?
          `${Math.round((item.tasks.filter(task => task.status === 'Completed').length / item.tasks.length) * 100)}%` : '0%'
      ]);
      break;

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

  // Use autoTable method on the doc instance (not as standalone function)
  doc.autoTable({
    head: [headers],
    body: body,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  return doc.output('arraybuffer');
};

// Send report via email
router.post('/send-email', auth, async (req, res) => {
  try {
    const { email, reportType } = req.body;

    console.log('Email request received:', { email, reportType });

    if (!email || !reportType) {
      return res.status(400).json({ 
        message: 'Email and report type are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Fetch data based on report type
    let data = [];
    let title = '';

    console.log('Fetching data for report type:', reportType);

    try {
      switch (reportType) {
        case 'project':
          data = await Project.find().lean();
          title = 'Project Reports';
          break;
        case 'milestone':
          data = await Milestone.find().lean();
          title = 'Milestone Reports';
          break;
        case 'inventory':
          data = await Inventory.find().lean();
          title = 'Inventory Reports';
          break;
        case 'quality':
          data = await Quality.find().lean();
          title = 'Quality Reports';
          break;
        case 'payment':
          data = await Payment.find().lean();
          title = 'Customer Payment Reports';
          break;
        case 'vendor':
          data = await VendorPayment.find().lean();
          title = 'Vendor Payment Reports';
          break;
        default:
          return res.status(400).json({ 
            message: 'Invalid report type' 
          });
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ 
        message: 'Error fetching data from database',
        error: dbError.message 
      });
    }

    console.log(`Fetched ${data.length} records for ${reportType} report`);

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        message: 'No data found for this report type' 
      });
    }

    // Generate PDF
    let pdfBuffer;
    try {
      pdfBuffer = generateReportPDF(data, reportType, title);
      console.log('PDF generated successfully');
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return res.status(500).json({ 
        message: 'Error generating PDF',
        error: pdfError.message 
      });
    }

    // Verify transporter is connected
    try {
      await transporter.verify();
      console.log('SMTP connection verified');
    } catch (smtpError) {
      console.error('SMTP connection error:', smtpError);
      return res.status(500).json({ 
        message: 'Email service unavailable',
        error: smtpError.message 
      });
    }

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'support@caldimengg.in', // Use environment variable
      to: email,
      subject: `${title} - Voomet Report`,
      text: `Please find attached the ${title.toLowerCase()} report.`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>${title}</h2>
          <p>Please find attached the ${title.toLowerCase()} report.</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Total records: ${data.length}</p>
          <br/>
          <p>Best regards,<br/>Voomet System</p>
        </div>
      `,
      attachments: [
        {
          filename: `${reportType}-report-${Date.now()}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf'
        }
      ]
    };

    console.log('Sending email to:', email);
    
    const emailResult = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', emailResult.messageId);

    res.json({ 
      message: 'Report sent successfully via email',
      messageId: emailResult.messageId 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    // More specific error messages
    if (error.code === 'EAUTH') {
      return res.status(500).json({ 
        message: 'Email authentication failed',
        error: 'Invalid email credentials' 
      });
    } else if (error.code === 'ECONNECTION') {
      return res.status(500).json({ 
        message: 'Email connection failed',
        error: 'Cannot connect to email server' 
      });
    } else {
      return res.status(500).json({ 
        message: 'Failed to send email',
        error: error.message 
      });
    }
  }
});

// Export CSV endpoint (optional, since frontend handles it)
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

module.exports = router;
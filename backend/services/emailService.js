const nodemailer = require('nodemailer');
require('dotenv').config(); // Add this line to load .env file

// Debug: Check if environment variables are loaded
console.log('🔧 Email Configuration Debug:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'NOT SET');

// Validate required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ CRITICAL: Email credentials are missing in environment variables');
  console.error('Please check your .env file and ensure EMAIL_USER and EMAIL_PASS are set');
}

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

// Zoho-specific configuration
if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('zoho')) {
  smtpConfig.secure = false;
  smtpConfig.requireTLS = true;
}

console.log('📧 Creating transporter with config:', {
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.secure,
  user: smtpConfig.auth.user ? 'SET' : 'MISSING',
  pass: smtpConfig.auth.pass ? 'SET' : 'MISSING'
});

const transporter = nodemailer.createTransport(smtpConfig);

// Verify connection on startup with better error handling
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ SMTP connection failed:', error.message);
    console.log('💡 Troubleshooting tips:');
    console.log('1. Check if .env file exists in backend root directory');
    console.log('2. Verify EMAIL_USER and EMAIL_PASS are set in .env');
    console.log('3. For Zoho, use App Password instead of regular password');
    console.log('4. Check if SMTP access is enabled in Zoho account settings');
  } else {
    console.log('✅ SMTP server is ready to take our messages');
  }
});

async function sendMail(mailOptions) {
  try {
    // Validate credentials before sending
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured. Check your .env file');
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, info, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Error sending email:', err.message);
    console.error('Error details:', {
      code: err.code,
      command: err.command,
      response: err.response
    });
    
    return { 
      success: false, 
      error: err.message, 
      stack: err.stack,
      response: err.response,
      code: err.code
    };
  }
}

async function sendDailyInventoryReport(toEmail, reportData, pdfBuffer) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Daily Inventory Report - ${reportData.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 10px;">Daily Inventory Report</h2>
          <p style="color: #666; margin: 5px 0;">Date: <strong>${reportData.date}</strong></p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="color: #2d5a2d; margin-bottom: 5px; font-size: 14px;">📥 Receipts</h3>
            <p style="font-size: 18px; font-weight: bold; color: #2d5a2d; margin: 0;">${reportData.totalReceipts}</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="color: #856404; margin-bottom: 5px; font-size: 14px;">📤 Dispatches</h3>
            <p style="font-size: 18px; font-weight: bold; color: #856404; margin: 0;">${reportData.totalDispatches}</p>
          </div>
          
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="color: #721c24; margin-bottom: 5px; font-size: 14px;">🔄 Returns</h3>
            <p style="font-size: 18px; font-weight: bold; color: #721c24; margin: 0;">${reportData.totalReturns}</p>
          </div>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0c5460; margin-bottom: 10px;">Net Change: ${reportData.netChange}</h3>
          <p style="margin: 5px 0; color: #0c5460;">Total Items with Activity: ${reportData.items ? reportData.items.length : 0}</p>
        </div>
        
        <p>Please find attached the detailed daily inventory report in PDF format.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated daily inventory report from Voomet Inventory Management System.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            Report generated on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Daily-Inventory-Report-${reportData.date.replace(/\//g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return await sendMail(mailOptions);
}

async function sendInventoryReport(toEmail, subject, htmlContent, pdfBuffer) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html: htmlContent,
    attachments: pdfBuffer ? [{
      filename: `Inventory-Report.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : []
  };

  return await sendMail(mailOptions);
}

async function sendTestEmail(toEmail) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Test Email from Voomet Inventory System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 10px;">✅ Test Email Successful</h2>
          <p style="color: #666;">This is a test email from your Voomet Inventory Management System.</p>
          <p style="color: #666;">If you're receiving this, your email configuration is working correctly.</p>
        </div>
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #0066cc; font-size: 12px; margin: 0;">
            Sent on: ${new Date().toLocaleString()}<br>
            From: ${process.env.EMAIL_USER}
          </p>
        </div>
      </div>
    `,
    text: `Test email from Voomet Inventory System. Sent on: ${new Date().toLocaleString()}`
  };

  return await sendMail(mailOptions);
}

async function sendMilestoneReport(toEmail, milestoneData, pdfBuffer) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Project Tasks Report - ${milestoneData.projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 10px;">📋 Project Tasks Report</h2>
          <p style="color: #666; margin: 5px 0;"><strong>Customer:</strong> ${milestoneData.customer}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Project:</strong> ${milestoneData.projectName}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Timeline:</strong> ${milestoneData.startDate} to ${milestoneData.endDate}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Total Tasks:</strong> ${milestoneData.tasks.length}</p>
          ${milestoneData.flexibilityPercentage > 0 ? 
            `<p style="color: #666; margin: 5px 0;"><strong>Flexibility Buffer:</strong> ${milestoneData.flexibilityPercentage}%</p>` : ''}
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2d5a2d; margin-bottom: 10px;">📊 Report Summary</h3>
          <p style="color: #2d5a2d; margin: 5px 0;">This comprehensive project tasks report includes:</p>
          <ul style="color: #2d5a2d; margin: 10px 0; padding-left: 20px;">
            <li>Detailed task breakdown by project phases</li>
            <li>Task durations and responsible persons</li>
            <li>Start and end dates for each task</li>
            <li>Project timeline overview</li>
            <li>Flexibility buffer information</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #856404; margin-bottom: 10px;">📧 Email Details</h3>
          <p style="color: #856404; margin: 5px 0;">This report has been generated and sent to you based on the project milestone data.</p>
          <p style="color: #856404; margin: 5px 0;">Please review the attached PDF document for the complete project tasks timeline.</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0c5460; margin-bottom: 10px;">🎯 Next Steps</h3>
          <p style="color: #0c5460; margin: 5px 0;">Please review the project timeline and task assignments.</p>
          <p style="color: #0c5460; margin: 5px 0;">Contact your project manager if you have any questions or need adjustments.</p>
        </div>
        
        <p>Please find attached the detailed project tasks report in PDF format.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated project tasks report from Voomet Project Management System.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            Report generated on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `Project-Tasks-Report-${milestoneData.projectName.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return await sendMail(mailOptions);
}

async function sendBOQReport(toEmail, boqData, pdfBuffer) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `BOQ Report - ${boqData.customer} - ${boqData.scopeOfWork?.join(', ')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 10px;">📋 Bill of Quantities (BOQ) Report</h2>
          <p style="color: #666; margin: 5px 0;"><strong>Customer:</strong> ${boqData.customer}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Scope of Work:</strong> ${boqData.scopeOfWork?.join(', ') || 'N/A'}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Estimate Number:</strong> ${boqData.estimateNumber || 'N/A'}</p>
          <p style="color: #666; margin: 5px 0;"><strong>Total Amount:</strong> ₹${boqData.totalWithGST?.toLocaleString('en-IN') || '0'}</p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #2d5a2d; margin-bottom: 10px;">📊 BOQ Summary</h3>
          <p style="color: #2d5a2d; margin: 5px 0;">This comprehensive BOQ report includes:</p>
          <ul style="color: #2d5a2d; margin: 10px 0; padding-left: 20px;">
            <li>Detailed item breakdown with quantities and unit prices</li>
            <li>Transportation charges and GST calculations</li>
            <li>Final total amount with all applicable charges</li>
            <li>Professional formatting with company branding</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #856404; margin-bottom: 10px;">📧 Email Details</h3>
          <p style="color: #856404; margin: 5px 0;">This BOQ report has been generated and sent to you based on the project requirements.</p>
          <p style="color: #856404; margin: 5px 0;">Please review the attached PDF document for the complete bill of quantities.</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0c5460; margin-bottom: 10px;">🎯 Next Steps</h3>
          <p style="color: #0c5460; margin: 5px 0;">Please review the BOQ and confirm the quantities and pricing.</p>
          <p style="color: #0c5460; margin: 5px 0;">Contact your project manager if you have any questions or need adjustments.</p>
        </div>
        
        <p>Please find attached the detailed BOQ report in PDF format.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated BOQ report from Voomet Interiors Management System.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            Report generated on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `BOQ-Report-${boqData.customer.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return await sendMail(mailOptions);
}

async function sendReorderAlert(toEmail, items) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.scopeOfWork || item.workCategory || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.partName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #dc3545; font-weight: bold;">${item.stockAtFactory || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #666;">${item.reOrderLevel}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Voomet" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🚨 Stock Reorder Alert - ${items.length} Items Low on Stock`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 5px solid #ffc107;">
          <h2 style="color: #856404; margin: 0 0 10px 0;">Action Required: Low Stock Alert</h2>
          <p style="color: #856404; margin: 0;">The following items have reached or dropped below their re-order level.</p>
        </div>
        
        <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; color: #333; border-bottom: 2px solid #ddd;">Scope</th>
              <th style="padding: 12px; text-align: left; color: #333; border-bottom: 2px solid #ddd;">Part Name</th>
              <th style="padding: 12px; text-align: center; color: #333; border-bottom: 2px solid #ddd;">Stock</th>
              <th style="padding: 12px; text-align: center; color: #333; border-bottom: 2px solid #ddd;">Re-Order</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Automated alert from Voomet Inventory Management System.
          </p>
        </div>
      </div>
    `
  };

  return await sendMail(mailOptions);
}

module.exports = {
  sendDailyInventoryReport,
  sendInventoryReport,
  sendTestEmail,
  sendMilestoneReport,
  sendBOQReport,
  sendReorderAlert,
  transporter
};
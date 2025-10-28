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
transporter.verify(function(error, success) {
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

module.exports = {
  sendDailyInventoryReport,
  sendInventoryReport,
  sendTestEmail,
  transporter
};
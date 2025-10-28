const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendInventoryReport(email, subject, content, pdfBuffer = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: content,
        attachments: []
      };

      if (pdfBuffer) {
        mailOptions.attachments.push({
          filename: `inventory-daily-report-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendDailyInventoryReport(email, reportData, pdfBuffer) {
    const { date, totalReceipts, totalDispatches, totalReturns, items } = reportData;
    
    const subject = `Daily Inventory Report - ${date}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 10px;">Daily Inventory Report</h2>
          <p style="color: #666; margin: 5px 0;">Date: <strong>${date}</strong></p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #2d5a2d; margin-bottom: 10px;">📥 Total Receipts</h3>
          <p style="font-size: 24px; font-weight: bold; color: #2d5a2d; margin: 0;">${totalReceipts}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #856404; margin-bottom: 10px;">📤 Total Dispatches</h3>
          <p style="font-size: 24px; font-weight: bold; color: #856404; margin: 0;">${totalDispatches}</p>
        </div>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #721c24; margin-bottom: 10px;">🔄 Total Returns</h3>
          <p style="font-size: 24px; font-weight: bold; color: #721c24; margin: 0;">${totalReturns}</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0c5460; margin-bottom: 10px;">📊 Summary</h3>
          <p style="margin: 5px 0;">Total Items Processed: <strong>${items.length}</strong></p>
          <p style="margin: 5px 0;">Net Change: <strong>${totalReceipts - totalDispatches + totalReturns}</strong></p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated daily inventory report from Voomet Inventory Management System.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            Report generated on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    return await this.sendInventoryReport(email, subject, htmlContent, pdfBuffer);
  }

  async sendTestEmail(email) {
    const subject = 'Test Email - Inventory System';
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email</h2>
        <p>This is a test email from the Voomet Inventory Management System.</p>
        <p>If you received this email, the email configuration is working correctly.</p>
      </div>
    `;
    
    return await this.sendInventoryReport(email, subject, content);
  }
}

module.exports = new EmailService();
const cron = require('node-cron');
const emailService = require('./emailService');
const pdfReportGenerator = require('./pdfReportGenerator');
const dailyReportAggregator = require('./dailyReportAggregator');

class DailyEmailScheduler {
  
  constructor() {
    this.scheduledJobs = new Map();
    this.defaultSchedule = '01 11 * * *'; // 8:00 AM every day
    this.isInitialized = false;
  }
  
  initialize() {
    if (this.isInitialized) {
      console.log('Daily email scheduler already initialized');
      return;
    }
    
    console.log('Initializing daily email scheduler...');
    
    // Schedule daily inventory report email
    this.scheduleDailyReport(this.defaultSchedule);
    
    this.isInitialized = true;
    console.log('Daily email scheduler initialized successfully');
  }
  
  scheduleDailyReport(schedule = this.defaultSchedule) {
    console.log(`Scheduling daily inventory report for: ${schedule}`);
    
    // Stop existing job if any
    this.stopJob('daily-inventory-report');
    
    const job = cron.schedule(schedule, async () => {
      console.log('Running scheduled daily inventory report...');
      await this.sendDailyInventoryReport();
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata' // Set to Indian timezone
    });
    
    this.scheduledJobs.set('daily-inventory-report', job);
    console.log('Daily inventory report scheduled successfully');
  }
  
  /**
   * =================================================================
   * 🔄 START: UPDATED METHOD
   * This method is updated to use the new HTML generator
   * and the generic `emailService.sendInventoryReport` sender.
   * =================================================================
   */
  async sendDailyInventoryReport(targetDate = null, customEmails = null) {
    try {
      console.log('Generating daily inventory report...');
      
      // Generate daily report
      const reportData = await dailyReportAggregator.generateDailyReport(targetDate);
      
      // Generate PDF
      const pdfBuffer = await pdfReportGenerator.generateDailyInventoryReport(reportData);
      
      // Get recipient emails (from environment or custom)
      const recipientEmails = customEmails || this.getRecipientEmails();
      
      if (!recipientEmails || recipientEmails.length === 0) {
        console.log('No recipient emails configured for daily inventory report');
        return { success: false, error: 'No recipient emails configured' };
      }

      // Generate the HTML content and Subject
      const subject = `Daily Inventory Report - ${reportData.date}`;
      const htmlContent = this.generateDailyEmailContent(reportData);
      
      // Send email to each recipient
      const results = [];
      for (const email of recipientEmails) {
        try {
          // Use the generic 'sendInventoryReport' (same as weekly)
          const sendResult = await emailService.sendInventoryReport(
            email.trim(),
            subject,
            htmlContent,
            pdfBuffer
          );
          results.push({ email: email.trim(), result: sendResult });
        } catch (err) {
          console.error(`Failed to send to ${email.trim()}:`, err);
          results.push({ email: email.trim(), result: { success: false, error: err.message || 'Unknown error' } });
        }
      }
      
      console.log(`Daily inventory report send attempts: ${results.length}`);
      return {
        success: results.every(r => r.result && r.result.success),
        reportDate: reportData.date,
        recipients: results,
        summary: {
          totalReceipts: reportData.totalReceipts,
          totalDispatches: reportData.totalDispatches,
          totalReturns: reportData.totalReturns,
          netChange: reportData.netChange
        }
      };
      
    } catch (error) {
      console.error('Error sending daily inventory report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * =================================================================
   * 🔄 END: UPDATED METHOD
   * =================================================================
   */
  
  async sendWeeklyInventoryReport(endDate = null, customEmails = null) {
    try {
      console.log('Generating weekly inventory report...');
      
      // Generate weekly report
      const weeklyReport = await dailyReportAggregator.generateWeeklyReport(endDate);
      
      // Generate PDF
      const pdfBuffer = await pdfReportGenerator.generateWeeklyInventoryReport(weeklyReport.dailyReports);
      
      // Get recipient emails
      const recipientEmails = customEmails || this.getRecipientEmails();
      
      if (!recipientEmails || recipientEmails.length === 0) {
        console.log('No recipient emails configured for weekly inventory report');
        return { success: false, error: 'No recipient emails configured' };
      }
      
      // Send email to each recipient
      const results = [];
      for (const email of recipientEmails) {
        const result = await emailService.sendInventoryReport(
          email.trim(),
          `Weekly Inventory Report - ${weeklyReport.weekStart} to ${weeklyReport.weekEnd}`,
          this.generateWeeklyEmailContent(weeklyReport),
          pdfBuffer
        );
        results.push({ email: email.trim(), result });
      }
      
      console.log(`Weekly inventory report sent successfully to ${results.length} recipients`);
      return {
        success: true,
        week: `${weeklyReport.weekStart} to ${weeklyReport.weekEnd}`,
        recipients: results,
        summary: {
          totalReceipts: weeklyReport.totalReceipts,
          totalDispatches: weeklyReport.totalDispatches,
          totalReturns: weeklyReport.totalReturns
        }
      };
      
    } catch (error) {
      console.error('Error sending weekly inventory report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * =================================================================
   * 🎨 START: NEW DAILY EMAIL TEMPLATE
   * This is the new, modern template for the daily report.
   * =================================================================
   */
  generateDailyEmailContent(reportData) {
    const brandColor = '#2185d0'; // A modern, friendly blue
    const fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
    const netChangeColor = reportData.netChange > 0 ? '#28a745' : (reportData.netChange < 0 ? '#dc3545' : '#6c757d');
    const netChangeSign = reportData.netChange > 0 ? '+' : '';

    return `
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: ${fontFamily};">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dee2e6;">
          
                    <tr>
            <td style="background-color: ${brandColor}; padding: 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-family: ${fontFamily};">Daily Inventory Report</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px; color: #e0f2ff; font-family: ${fontFamily};">
                Date: <strong>${reportData.date}</strong>
              </p>
            </td>
          </tr>
          
                    <tr>
            <td style="padding: 30px;">
              
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="text-align: center;">
                <tr>
                                    <td style="padding: 15px 10px; border-bottom: 2px solid #28a745;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📥 Receipts</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #28a745;">${reportData.totalReceipts}</p>
                  </td>
                  
                  <td width="20" style="width: 20px;"></td>                   
                                    <td style="padding: 15px 10px; border-bottom: 2px solid #ffc107;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">📤 Dispatches</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #ffc107;">${reportData.totalDispatches}</p>
                  </td>

                  <td width="20" style="width: 20px;"></td>                   
                                    <td style="padding: 15px 10px; border-bottom: 2px solid #dc3545;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">🔄 Returns</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #dc3545;">${reportData.totalReturns}</p>
                  </td>
                </tr>
              </table>
              
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #e6f7ff; border-radius: 8px; border: 1px solid #b3e0ff;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #0056b3; font-size: 16px; font-weight: 600;">Net Inventory Change</h3>
                    <p style="font-size: 32px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: ${netChangeColor};">
                      ${netChangeSign}${reportData.netChange}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-family: ${fontFamily}; font-size: 16px; line-height: 1.6; color: #333333;">
                Please find the detailed daily inventory report attached in PDF format.
              </p>
            </td>
          </tr>
        _   
                    <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 12px; color: #6c757d;">
                This is an automated report from the <strong>Voomet Inventory Management System</strong>.
              </p>
              <p style="margin: 5px 0 0 0; font-family: ${fontFamily}; font-size: 12px; color: #6c757d;">
                Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      _       </p>
            </td>
          </tr>
          
        </table>
              </td>
    </tr>
  </table>
</body>
    `;
  }
  /**
   * =================================================================
   * 🎨 END: NEW DAILY EMAIL TEMPLATE
   * =================================================================
   */
  
  /**
   * =================================================================
   * 🎨 WEEKLY EMAIL TEMPLATE (Unchanged)
   * =================================================================
   */
  generateWeeklyEmailContent(weeklyReport) {
    const brandColor = '#2185d0';
    const fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
    
    return `
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: ${fontFamily};">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f7f6;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #dee2e6;">
          <tr>
            <td style="background-color: ${brandColor}; padding: 30px; text-align: left;">
              <h1 style="margin: 0; font-size: 28px; color: #ffffff; font-family: ${fontFamily};">Weekly Inventory Report</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px; color: #e0f2ff; font-family: ${fontFamily};">
                ${weeklyReport.weekStart} to ${weeklyReport.weekEnd}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; font-family: ${fontFamily}; font-size: 16px; line-height: 1.6; color: #333333;">
              <p style="margin: 0 0 25px 0;">Here is the summary of inventory movements for the past week.</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="text-align: center;">
                <tr>
                  <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 16px; font-weight: 600;">📥 Total Receipts</h3>
                    <p style="font-size: 28px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #28a745;">${weeklyReport.totalReceipts}</p>
                  </td>
                  <td width="20" style="width: 20px;"></td>
          _       <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 16px; font-weight: 600;">📤 Total Dispatches</h3>
                    <p style="font-size: 28px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #ffc107;">${weeklyReport.totalDispatches}</p>
                  </td>
                </tr>
                <tr><td height="20" style="height: 20px;"></td></tr>
                <tr>
                  <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 16px; font-weight: 600;">🔄 Total Returns</h3>
                    <p style="font-size: 28px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: #dc3545;">${weeklyReport.totalReturns}</p>
                  </td>
                  <td width="20" style="width: 20px;"></td>
                  <td style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 10px 0; font-family: ${fontFamily}; color: #343a40; font-size: 16px; font-weight: 600;">📊 Avg. Daily Receipts</h3>
                    <p style="font-size: 28px; font-weight: bold; margin: 0; font-family: ${fontFamily}; color: ${brandColor};">${Math.round(weeklyReport.totalReceipts / 7)}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0;">A detailed PDF report is attached for your review.</p>
            </td>
          </tr>
      _     <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 12px; color: #6c757d;">
          _         This is an automated report from the <strong>Voomet Inventory Management System</strong>.
              </p>
              <p style="margin: 5px 0 0 0; font-family: ${fontFamily}; font-size: 12px; color: #6c757d;">
                Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </p>
            </td>
        s </tr>
        </table>
      </td>
  s </tr>
  </table>
</body>
    `;
  }
  
  getRecipientEmails() {
    // Get emails from environment variable or use default
    const emailList = process.env.INVENTORY_REPORT_EMAILS || '';
    
    if (!emailList) {
      return [];
    }
    
    return emailList.split(',').map(email => email.trim()).filter(email => email);
  }
  
  stopJob(jobName) {
    const job = this.scheduledJobs.get(jobName);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(jobName);
      console.log(`Stopped job: ${jobName}`);
s   }
  }
  
  stopAllJobs() {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    this.scheduledJobs.clear();
  }
  
  getScheduledJobs() {
    const jobs = [];
    this.scheduledJobs.forEach((job, name) => {
      jobs.push({
        name,
        running: job.running
      });
    });
    return jobs;
  }
}

// Create singleton instance
const scheduler = new DailyEmailScheduler();

module.exports = scheduler;
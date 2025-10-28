const cron = require('node-cron');
const emailService = require('./emailService');
const pdfReportGenerator = require('./pdfReportGenerator');
const dailyReportAggregator = require('./dailyReportAggregator');

class DailyEmailScheduler {
  
  constructor() {
    this.scheduledJobs = new Map();
    this.defaultSchedule = '37 17 * * *'; // 8:00 AM every day
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
      
      // Send email to each recipient
      const results = [];
      for (const email of recipientEmails) {
        try {
          const sendResult = await emailService.sendDailyInventoryReport(
            email.trim(),
            reportData,
            pdfBuffer
          );
          results.push({ email: email.trim(), result: sendResult });
        } catch (err) {
          // emailService should return structured result, but guard against thrown errors
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
  
  generateWeeklyEmailContent(weeklyReport) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-bottom: 10px;">Weekly Inventory Report</h2>
          <p style="color: #666; margin: 5px 0;">Week: <strong>${weeklyReport.weekStart} to ${weeklyReport.weekEnd}</strong></p>
        </div>
        
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #2d5a2d; margin-bottom: 10px;">📥 Total Receipts (Week)</h3>
          <p style="font-size: 24px; font-weight: bold; color: #2d5a2d; margin: 0;">${weeklyReport.totalReceipts}</p>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #856404; margin-bottom: 10px;">📤 Total Dispatches (Week)</h3>
          <p style="font-size: 24px; font-weight: bold; color: #856404; margin: 0;">${weeklyReport.totalDispatches}</p>
        </div>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <h3 style="color: #721c24; margin-bottom: 10px;">🔄 Total Returns (Week)</h3>
          <p style="font-size: 24px; font-weight: bold; color: #721c24; margin: 0;">${weeklyReport.totalReturns}</p>
        </div>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #0c5460; margin-bottom: 10px;">📊 Summary</h3>
          <p style="margin: 5px 0;">Total Days: <strong>7</strong></p>
          <p style="margin: 5px 0;">Average Daily Receipts: <strong>${Math.round(weeklyReport.totalReceipts / 7)}</strong></p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated weekly inventory report from Voomet Inventory Management System.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            Report generated on: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
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
    }
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
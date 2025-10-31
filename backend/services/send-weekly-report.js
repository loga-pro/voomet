const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dailyEmailScheduler = require('./dailyEmailScheduler');

async function sendAnotherWeeklyReport() {
  try {
    console.log('📧 Sending another weekly report for Oct 27 - Nov 2, 2025...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voomet', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ MongoDB connected');
    
    // Set the end date to Nov 2, 2025
    const endDate = '2025-11-02';
    const targetEmail = 'logaprasaath45@gmail.com';
    
    console.log('📅 Report period: Oct 27 - Nov 2, 2025');
    console.log('📧 Target email:', targetEmail);
    
    // Send the weekly report
    const result = await dailyEmailScheduler.sendWeeklyInventoryReport(endDate, [targetEmail]);
    
    console.log('📊 Report Status:');
    console.log('✅ Success:', result.success);
    console.log('📅 Week Period:', result.week);
    console.log('📧 Recipients:', result.recipients?.length || 0);
    
    if (result.recipients && result.recipients.length > 0) {
      result.recipients.forEach(recipient => {
        console.log('  - ' + recipient.email + ': ' + (recipient.result?.success ? '✅ Sent' : '❌ Failed'));
        if (recipient.result?.messageId) {
          console.log('    Message ID: ' + recipient.result.messageId);
        }
      });
    }
    
    console.log('📈 Summary:', result.summary);
    
    if (!result.success) {
      console.error('❌ Error:', result.error);
    } else {
      console.log('🎉 Another weekly report sent successfully!');
    }
    
    // Disconnect
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendAnotherWeeklyReport();
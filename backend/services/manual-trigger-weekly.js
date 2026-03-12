const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const scheduler = require('./dailyEmailScheduler');

async function triggerManualWeeklyReport() {
  try {
    console.log('🚀 Manually triggering Weekly Inventory Report...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voomet', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
    
    // Trigger the report (will use current date and default recipients)
    console.log('Generating and sending report...');
    const result = await scheduler.sendWeeklyInventoryReport();
    
    console.log('\n📊 Report Status:');
    console.log('✅ Success:', result.success);
    if (result.success) {
      console.log('📅 Week Period:', result.week);
      console.log('📧 Recipients:', result.recipients?.length || 0);
      result.recipients.forEach(r => {
        console.log(`  - ${r.email}: ${r.result.success ? '✅ Sent' : '❌ Failed'}`);
      });
      console.log('📈 Summary:', result.summary);
    } else {
      console.error('❌ Error:', result.error);
    }
    
    console.log('\n🎉 Process completed.');
    
  } catch (error) {
    console.error('❌ Trigger failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 Disconnected from MongoDB');
    process.exit(0);
  }
}

triggerManualWeeklyReport();

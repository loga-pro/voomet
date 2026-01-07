const mongoose = require('mongoose');
const Dispatch = require('./models/Dispatch');
require('dotenv').config();

/**
 * Migration script to fix totalValue calculations for existing dispatches
 * 
 * The old formula was: totalValue = (invoiceValueWithoutGST + gstValue) * quantity
 * The correct formula is: totalValue = (invoiceValueWithoutGST * quantity) + gstValue
 * 
 * This script recalculates totalValue for all existing dispatches
 */

async function fixDispatchTotalValues() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voomet', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Get all dispatches
    const dispatches = await Dispatch.find({});
    console.log(`Found ${dispatches.length} dispatches to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const dispatch of dispatches) {
      const { invoiceValueWithoutGST, gstValue, quantity, totalValue } = dispatch;

      // Calculate the correct total value
      const correctTotalValue = (parseFloat(invoiceValueWithoutGST || 0) * parseFloat(quantity || 0)) + parseFloat(gstValue || 0);

      // Check if the current value is different
      if (Math.abs(totalValue - correctTotalValue) > 0.01) {
        console.log(`\nDispatch ID: ${dispatch._id}`);
        console.log(`  Old totalValue: ₹${totalValue.toFixed(2)}`);
        console.log(`  New totalValue: ₹${correctTotalValue.toFixed(2)}`);
        console.log(`  Difference: ₹${(correctTotalValue - totalValue).toFixed(2)}`);

        // Update the dispatch
        dispatch.totalValue = correctTotalValue;
        await dispatch.save();
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total dispatches: ${dispatches.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the migration
fixDispatchTotalValues();

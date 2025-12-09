const mongoose = require('mongoose');
const LogisticExpenditure = require('./models/LogisticExpenditure');

async function fixLogisticExpenditureIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/voomet', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check current indexes
    const indexes = await LogisticExpenditure.collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the problematic expenditureNumber index if it exists
    try {
      await LogisticExpenditure.collection.dropIndex('expenditureNumber_1');
      console.log('Dropped expenditureNumber_1 index');
    } catch (error) {
      if (error.code === 27) { // Index not found
        console.log('expenditureNumber_1 index not found, skipping drop');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Update existing documents to add expenditureNumber field if missing
    const result = await LogisticExpenditure.updateMany(
      { expenditureNumber: { $exists: false } },
      { $set: { expenditureNumber: null } }
    );
    console.log(`Updated ${result.modifiedCount} documents to add expenditureNumber field`);

    // Recreate the index as sparse to handle null values properly
    await LogisticExpenditure.collection.createIndex(
      { expenditureNumber: 1 }, 
      { sparse: true }
    );
    console.log('Recreated expenditureNumber index as sparse');

    console.log('LogisticExpenditure index fix completed successfully');
  } catch (error) {
    console.error('Error fixing LogisticExpenditure index:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixLogisticExpenditureIndex();
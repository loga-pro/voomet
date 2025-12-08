const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`MongoDB Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voomet');
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@voomet.com' });
    if (existingAdmin) {
      console.log('Admin user already exists. Updating permissions...');
      
      // Update existing admin with full permissions
      existingAdmin.permissions = [
        'dashboard', 'employee_master', 'employee_access', 'part_master',
        'customer_master', 'project_master', 'vendor_master', 'boq_management',
        'milestone_management', 'inventory_management', 'quality_management'
      ];
      existingAdmin.role = 'admin';
      
      await existingAdmin.save();
      console.log('Admin permissions updated successfully!');
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'Voomet Admin',
        email: 'admin@voomet.com',
        password: 'admin123', // Will be hashed by the pre-save hook
        role: 'admin',
        permissions: [
          'dashboard', 'employee_master', 'employee_access', 'part_master',
          'customer_master', 'project_master', 'vendor_master', 'boq_management',
          'milestone_management', 'inventory_management', 'quality_management'
        ]
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
    }

    console.log('Seed data completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();
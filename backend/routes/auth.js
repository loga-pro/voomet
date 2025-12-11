const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const { transporter } = require('../services/emailService');

const router = express.Router();


// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', email);
  
  try {
    // Validate input
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('Login successful for:', email);
    
    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Forgot password request for email:', email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = otpGenerator.generate(6, { 
      upperCaseAlphabets: false, 
      specialChars: false, 
      lowerCaseAlphabets: false 
    });

    console.log('Generated OTP:', otp);

    user.resetOtp = otp;
    user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    console.log('User saved with OTP');

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`
    };

    console.log('Sending email with options:', mailOptions);
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset Password with OTP
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ 
      email, 
      resetOtp: otp, 
      resetOtpExpiry: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify Token
router.get('/verify', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      permissions: req.user.permissions,
      lastLogin: req.user.lastLogin
    }
  });
});

// Get all users (for Employee Access management)
router.get('/users', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({}, { password: 0, resetOtp: 0, resetOtpExpiry: 0 })
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (for Employee Access management)
router.post('/users', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, password, role, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Define valid permissions based on the User model schema
    const validPermissions = [
      'dashboard', 'employee_master', 'employee_access', 'part_master', 
      'customer_master', 'project_master', 'vendor_master', 'customer_boq', 'inhouse_boq',
      'milestone_management', 'inhouse_milestone', 'inventory_management', 'quality_management', 
      'payment_master', 'project_budget', 'logistic_expenditure', 'project_expenditure', 'purchase_request', 
      'production_management', 'reports', 'inhouse_partmaster', 'boq_management'
    ];
    
    // Filter permissions to only include valid ones
    let filteredPermissions = [];
    if (permissions && Array.isArray(permissions)) {
      filteredPermissions = permissions.filter(permission => validPermissions.includes(permission));
      if (filteredPermissions.length !== permissions.length) {
        console.log('Filtered out invalid permissions during creation. Original:', permissions, 'Filtered:', filteredPermissions);
      }
    }

    const user = new User({
      name,
      email,
      password,
      role,
      permissions: filteredPermissions
    });

    try {
      await user.save();
    } catch (saveError) {
      // Handle validation errors more specifically
      if (saveError.name === 'ValidationError') {
        console.error('Validation error details during user creation:', saveError.errors);
        const validationMessages = Object.values(saveError.errors).map(err => err.message).join(', ');
        return res.status(400).json({ 
          message: 'Validation failed', 
          error: validationMessages,
          details: saveError.errors 
        });
      }
      throw saveError; // Re-throw if it's not a validation error
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetOtp;
    delete userResponse.resetOtpExpiry;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (for Employee Access management)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, email, role, permissions } = req.body;
    console.log('Updating user with permissions:', permissions); // Debugging line
    
    // Find user first to properly handle password and permissions
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    
    // Properly handle permissions array
    if (permissions) {
      // Define valid permissions based on the User model schema
      const validPermissions = [
        'dashboard', 'employee_master', 'employee_access', 'part_master', 
        'customer_master', 'project_master', 'vendor_master', 'customer_boq', 'inhouse_boq',
        'milestone_management', 'inhouse_milestone', 'inventory_management', 'quality_management', 
        'payment_master', 'project_budget', 'logistic_expenditure', 'project_expenditure', 'purchase_request',
        'production_management', 'reports', 'inhouse_partmaster', 'boq_management'
      ];
      
      // Filter out invalid permissions and ensure it's an array
      if (Array.isArray(permissions)) {
        const filteredPermissions = permissions.filter(permission => validPermissions.includes(permission));
        if (filteredPermissions.length !== permissions.length) {
          console.log('Filtered out invalid permissions. Original:', permissions, 'Filtered:', filteredPermissions);
        }
        user.permissions = filteredPermissions;
      }
    }
    
    // If password is provided, it will be hashed by the pre-save hook
    if (req.body.password) {
      user.password = req.body.password;
    }
    
    // Save the user to trigger the password hashing middleware
    try {
      await user.save();
    } catch (saveError) {
      // Handle validation errors more specifically
      if (saveError.name === 'ValidationError') {
        console.error('Validation error details:', saveError.errors);
        const validationMessages = Object.values(saveError.errors).map(err => err.message).join(', ');
        return res.status(400).json({ 
          message: 'Validation failed', 
          error: validationMessages,
          details: saveError.errors 
        });
      }
      throw saveError; // Re-throw if it's not a validation error
    }

    // Return user without sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetOtp;
    delete userResponse.resetOtpExpiry;

    return res.json(userResponse);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (for Employee Access management)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
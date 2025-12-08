const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    console.log('Token received:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    console.log('Token decoded for user ID:', decoded.id);
    
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    console.log('User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
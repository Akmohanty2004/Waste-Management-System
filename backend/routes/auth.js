const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Register request:', req.body);
    const { name, email, password, role, phoneNumber, address } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
        reason: 'Email is already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      phoneNumber,
      address,
      walletBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      completedJobs: 0
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        phoneNumber: user.phoneNumber,
        address: user.address,
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const { email, password, role } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        reason: 'Missing credentials'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        reason: 'No account found with this email'
      });
    }

    // Check password
    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        reason: 'Incorrect password'
      });
    }

    // Check role if specified
    if (role && user.role !== role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user type',
        reason: `You are registered as a ${user.role}. Please login as ${user.role}.`
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: user.walletBalance || 0,
        totalEarned: user.totalEarned || 0,
        totalSpent: user.totalSpent || 0,
        phoneNumber: user.phoneNumber,
        address: user.address,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/auth/add-money
// @desc    Add money to wallet
// @access  Private
router.post('/add-money', protect, async (req, res) => {
  try {
    console.log('=== ADD MONEY REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User from token:', req.user);
    
    const { amount } = req.body;
    
    // Validate amount
    if (!amount) {
      console.log('No amount provided');
      return res.status(400).json({
        success: false,
        message: 'Please provide an amount'
      });
    }
    
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }
    
    if (numAmount > 100000) {
      console.log('Amount too high:', numAmount);
      return res.status(400).json({
        success: false,
        message: 'Maximum amount is ₹100,000'
      });
    }
    
    // Find user and update wallet
    console.log('Looking for user with ID:', req.user.id);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log('User not found with ID:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('Current user data:', {
      id: user._id,
      email: user.email,
      currentBalance: user.walletBalance
    });
    
    // Add money to wallet
    const oldBalance = user.walletBalance;
    user.walletBalance = (user.walletBalance || 0) + numAmount;
    await user.save();
    
    console.log(`Updated balance: ${oldBalance} -> ${user.walletBalance}`);
    
    res.json({
      success: true,
      message: `₹${numAmount} added to your wallet successfully!`,
      walletBalance: user.walletBalance,
      data: {
        walletBalance: user.walletBalance,
        totalEarned: user.totalEarned || 0,
        totalSpent: user.totalSpent || 0
      }
    });
  } catch (error) {
    console.error('Add money error DETAILS:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/auth/wallet
// @desc    Get wallet balance
// @access  Private
router.get('/wallet', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletBalance totalEarned totalSpent');
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add admin user on startup (run once)
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: 'ashiskumarmohanty738@gmail.com' });
    if (!adminExists) {
      await User.create({
        name: 'Ashis Kumar Mohanty',
        email: 'ashiskumarmohanty738@gmail.com',
        password: 'Ashis@2004',
        role: 'admin',
        walletBalance: 0,
        totalEarned: 0,
        totalSpent: 0
      });
      console.log('Admin user created successfully');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

// Call this when server starts
createAdminUser();

module.exports = router;
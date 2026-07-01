const express = require('express');
const router = express.Router();
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/commission-stats
// @desc    Get commission statistics for admin
// @access  Private (Admin only)
router.get('/commission-stats', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('=== ADMIN COMMISSION STATS ===');
    console.log('Admin user:', req.user.email);
    
    // Get all completed jobs with commission
    const completedJobs = await WasteReport.find({
      status: 'completed'
    }).populate('user', 'name email').populate('acceptedBy', 'name email');
    
    console.log(`Found ${completedJobs.length} completed jobs`);
    
    let totalCommission = 0;
    let totalPayments = 0;
    
    completedJobs.forEach(job => {
      // Calculate commission if not already stored (10% of payment amount)
      const commission = job.commission || (job.paymentAmount * 0.1);
      totalCommission += commission;
      totalPayments += job.paymentAmount;
    });
    
    const totalJobs = completedJobs.length;
    
    // Get monthly breakdown
    const monthlyStats = await WasteReport.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          totalCommission: { $sum: { $ifNull: ['$commission', { $multiply: ['$paymentAmount', 0.1] }] } },
          totalJobs: { $sum: 1 },
          totalAmount: { $sum: '$paymentAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
    
    // Get recent transactions
    const recentTransactions = await WasteReport.find({
      status: 'completed'
    })
    .populate('user', 'name email')
    .populate('acceptedBy', 'name email')
    .sort({ completedAt: -1 })
    .limit(20);
    
    res.json({
      success: true,
      data: {
        totalCommission,
        totalJobs,
        totalPayments,
        averageCommission: totalJobs > 0 ? totalCommission / totalJobs : 0,
        monthlyStats,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get commission stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/all-users
// @desc    Get all users for admin
// @access  Private (Admin only)
router.get('/all-users', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('=== ADMIN ALL USERS ===');
    console.log('Admin user:', req.user.email);
    
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);
    
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/all-reports
// @desc    Get all reports for admin
// @access  Private (Admin only)
router.get('/all-reports', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('=== ADMIN ALL REPORTS ===');
    console.log('Admin user:', req.user.email);
    
    const reports = await WasteReport.find()
      .populate('user', 'name email')
      .populate('acceptedBy', 'name email')
      .sort({ createdAt: -1 });
      
    console.log(`Found ${reports.length} reports`);
    
    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
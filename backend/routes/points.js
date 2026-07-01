const express = require('express');
const router = express.Router();
const User = require('../models/User');
const WasteReport = require('../models/WasteReport');
const { protect } = require('../middleware/auth');

// @route   GET /api/points/leaderboard
// @desc    Get points leaderboard
// @access  Private
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const users = await User.find()
      .select('name points role totalReports totalCleaned')
      .sort('-points')
      .limit(20);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/points/history
// @desc    Get user's points history from reports
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    let reports = [];
    
    if (req.user.role === 'user') {
      // Get reports where user is the reporter
      reports = await WasteReport.find({ 
        user: req.user.id,
        status: 'cleaned'
      })
        .select('pointsAwarded status createdAt')
        .sort('-createdAt');
    } else {
      // Get reports where user is the cleaner
      reports = await WasteReport.find({ 
        cleaner: req.user.id,
        status: 'cleaned'
      })
        .select('pointsAwarded status createdAt')
        .sort('-createdAt');
    }

    const totalPoints = reports.reduce((sum, report) => sum + report.pointsAwarded, 0);

    res.json({
      success: true,
      data: {
        totalPoints,
        history: reports
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
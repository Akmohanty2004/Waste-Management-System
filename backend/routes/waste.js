const express = require('express');
const router = express.Router();
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Calculate points and commission distribution
function calculatePointsAndCommission(paymentAmount) {
  const userPointsRate = 1; // 1% for user
  const cleanerPointsRate = 1; // 1% for cleaner
  const adminCommissionRate = 8; // 8% for admin
  
  const userPoints = Math.floor((paymentAmount * userPointsRate) / 100);
  const cleanerPoints = Math.floor((paymentAmount * cleanerPointsRate) / 100);
  const adminCommission = (paymentAmount * adminCommissionRate) / 100;
  const cleanerAmount = paymentAmount - (userPoints + cleanerPoints + adminCommission);
  
  return {
    userPoints,
    cleanerPoints,
    adminCommission,
    cleanerAmount,
    userPointsRate,
    cleanerPointsRate,
    adminCommissionRate
  };
}

// Calculate cleaner's net amount after commission (for display)
function calculateCleanerAmount(paymentAmount) {
  const { cleanerAmount } = calculatePointsAndCommission(paymentAmount);
  return cleanerAmount;
}

// @route   POST /api/waste/report
// @desc    Create waste report with payment offer
// @access  Private (Users only)
router.post('/report', protect, authorize('user'), async (req, res) => {
  try {
    const { imageUrl, location, description, wasteType, severity, paymentAmount } = req.body;

    if (!imageUrl || !location || !description || !paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields including payment amount'
      });
    }

    if (paymentAmount < 10 || paymentAmount > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be between ₹10 and ₹10,000'
      });
    }

    const user = await User.findById(req.user.id);
    if (user.walletBalance < paymentAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your wallet balance is ₹${user.walletBalance}. Please add funds to your wallet.`
      });
    }

    const { userPoints, cleanerPoints, adminCommission, cleanerAmount, userPointsRate, cleanerPointsRate, adminCommissionRate } = calculatePointsAndCommission(paymentAmount);

    const report = await WasteReport.create({
      user: req.user.id,
      imageUrl,
      location,
      description,
      wasteType: wasteType || 'mixed',
      severity: severity || 'medium',
      paymentAmount: paymentAmount,
      cleanerAmount: cleanerAmount,
      userPoints: userPoints,
      cleanerPoints: cleanerPoints,
      commission: adminCommission,
      userPointsRate: userPointsRate,
      cleanerPointsRate: cleanerPointsRate,
      adminCommissionRate: adminCommissionRate,
      paymentStatus: 'pending',
      status: 'pending',
      verificationStatus: 'pending'
    });

    user.walletBalance -= paymentAmount;
    user.totalSpent += paymentAmount;
    user.totalReports += 1;
    await user.save();

    res.status(201).json({
      success: true,
      data: report,
      message: `Waste reported successfully! ${formatCurrency(paymentAmount)} has been held from your wallet.`,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Report creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/reports
// @desc    Get reports based on role and status
// @access  Private
router.get('/reports', protect, async (req, res) => {
  try {
    let reports;

    if (req.user.role === 'user') {
      reports = await WasteReport.find({ user: req.user.id })
        .populate('acceptedBy', 'name email phoneNumber rating profileImage')
        .populate('cleaner', 'name email')
        .populate('verifiedBy', 'name')
        .sort({ createdAt: -1 });
    } else {
      reports = await WasteReport.find({ 
        status: 'pending',
        verificationStatus: { $ne: 'rejected' }
      })
      .populate('user', 'name email phoneNumber')
      .sort({ createdAt: -1 });
      
      reports = reports.map(report => {
        const reportObj = report.toObject();
        const cleanerAmount = calculateCleanerAmount(report.paymentAmount);
        reportObj.cleanerAmount = cleanerAmount;
        return reportObj;
      });
    }

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/reports/pending-verification
// @desc    Get reports pending verification for reporter
// @access  Private (Users only)
router.get('/reports/pending-verification', protect, authorize('user'), async (req, res) => {
  try {
    const reports = await WasteReport.find({
      user: req.user.id,
      status: 'waiting_verification',
      verificationStatus: 'pending'
    })
      .populate('acceptedBy', 'name email phoneNumber rating profileImage')
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching pending verification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/waste/report/:id/cancel
// @desc    Cancel report before acceptance (Reporter only)
// @access  Private (Users only)
router.put('/report/:id/cancel', protect, authorize('user'), async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own reports'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel report with status: ${report.status}. Only pending reports can be cancelled.`
      });
    }

    const user = await User.findById(req.user.id);
    user.walletBalance += report.paymentAmount;
    user.totalSpent -= report.paymentAmount;
    await user.save();

    await report.deleteOne();

    res.json({
      success: true,
      message: `Report cancelled. ${formatCurrency(report.paymentAmount)} refunded to your wallet.`,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Cancel report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/report/:id/accept
// @desc    Cleaner accepts a waste cleaning job
// @access  Private (Cleaners only)
router.post('/report/:id/accept', protect, authorize('cleaner'), async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This job is already ${report.status}. Only pending jobs can be accepted.`
      });
    }

    if (report.verificationStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'This job has been rejected and is no longer available.'
      });
    }

    const activeJobs = await WasteReport.countDocuments({
      acceptedBy: req.user.id,
      status: { $in: ['accepted', 'in-progress', 'waiting_verification'] }
    });

    if (activeJobs >= 5) {
      return res.status(400).json({
        success: false,
        message: 'You have too many active jobs. Please complete some first.'
      });
    }

    const cleanerAmount = calculateCleanerAmount(report.paymentAmount);

    report.status = 'accepted';
    report.acceptedBy = req.user.id;
    report.acceptedAt = Date.now();
    report.paymentStatus = 'accepted';
    report.verificationStatus = 'pending';
    report.rejectionReason = null;
    report.cleanerAmount = cleanerAmount;
    await report.save();

    res.json({
      success: true,
      data: report,
      message: `Job accepted successfully! You will earn ${formatCurrency(cleanerAmount)} after verification.`
    });
  } catch (error) {
    console.error('Accept job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/report/:id/upload-after
// @desc    Cleaner uploads after-cleaning photo for verification
// @access  Private (Cleaners only)
router.post('/report/:id/upload-after', protect, authorize('cleaner'), async (req, res) => {
  try {
    const { afterImage } = req.body;
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.acceptedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to complete this job'
      });
    }

    if (report.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot upload after-photo for job with status: ${report.status}`
      });
    }

    if (!afterImage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an after-cleaning photo'
      });
    }

    report.afterImage = afterImage;
    report.status = 'waiting_verification';
    report.paymentStatus = 'completed';
    report.completedAt = Date.now();
    await report.save();

    res.json({
      success: true,
      data: report,
      message: `After-cleaning photo uploaded! Waiting for reporter verification.`
    });
  } catch (error) {
    console.error('Upload after-photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/report/:id/verify
// @desc    Reporter verifies the cleaning - WITH POINTS SYSTEM
// @access  Private (Users only)
router.post('/report/:id/verify', protect, authorize('user'), async (req, res) => {
  try {
    const { approved, comment } = req.body;
    const reportId = req.params.id;
    
    console.log('=== VERIFICATION REQUEST ===');
    console.log('Report ID:', reportId);
    console.log('Approved:', approved);
    console.log('Comment:', comment);
    
    if (approved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please specify if the cleaning is approved or rejected'
      });
    }

    const report = await WasteReport.findById(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to verify this job'
      });
    }

    if (report.status !== 'waiting_verification') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify job with status: ${report.status}. Job must be waiting for verification.`
      });
    }

    if (approved === true) {
      // APPROVE - Release payment with points system
      console.log('Approving job...');
      
      const cleanerId = report.acceptedBy;
      const paymentAmount = report.paymentAmount;
      const { userPoints, cleanerPoints, adminCommission, cleanerAmount, userPointsRate, cleanerPointsRate, adminCommissionRate } = calculatePointsAndCommission(paymentAmount);
      
      console.log(`Payment Distribution:
        - Payment Amount: ₹${paymentAmount}
        - User Points (1%): ${userPoints} points
        - Cleaner Points (1%): ${cleanerPoints} points
        - Admin Commission (8%): ₹${adminCommission}
        - Cleaner Gets: ₹${cleanerAmount}
      `);
      
      // Check if reporter has enough balance
      const reporter = await User.findById(req.user.id);
      if (reporter.walletBalance < paymentAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Your wallet balance is ₹${reporter.walletBalance}. Please add funds.`
        });
      }
      
      // Deduct from reporter (money already deducted when report was created)
      // Only update stats
      reporter.totalVerified += 1;
      reporter.points += userPoints;
      reporter.totalPointsEarned += userPoints;
      await reporter.save();
      console.log(`✅ Reporter ${reporter.email} earned ${userPoints} points. Total points: ${reporter.points}`);
      
      // Update report with points
      report.userPoints = userPoints;
      report.cleanerPoints = cleanerPoints;
      report.commission = adminCommission;
      report.userPointsRate = userPointsRate;
      report.cleanerPointsRate = cleanerPointsRate;
      report.adminCommissionRate = adminCommissionRate;
      report.cleanerAmount = cleanerAmount;
      report.status = 'completed';
      report.verificationStatus = 'approved';
      report.verifiedBy = req.user.id;
      report.verifiedAt = new Date();
      report.completedAt = new Date();
      report.paymentStatus = 'verified';
      
      if (comment) {
        report.verificationComment = comment;
      }
      
      await report.save();

      // Add to cleaner's wallet and points
      if (cleanerId) {
        const cleaner = await User.findById(cleanerId);
        if (cleaner) {
          cleaner.walletBalance += cleanerAmount;
          cleaner.totalEarned += cleanerAmount;
          cleaner.totalCleaned += 1;
          cleaner.completedJobs += 1;
          cleaner.totalVerified += 1;
          cleaner.points += cleanerPoints;
          cleaner.totalPointsEarned += cleanerPoints;
          await cleaner.save();
          console.log(`✅ Payment released to cleaner: ₹${cleanerAmount}`);
          console.log(`✅ Cleaner ${cleaner.email} earned ${cleanerPoints} points. Total points: ${cleaner.points}`);
        }
      }

      return res.json({
        success: true,
        data: report,
        message: `Job approved! Cleaner received ₹${cleanerAmount} and ${cleanerPoints} points. You earned ${userPoints} points!`,
        walletBalance: reporter.walletBalance,
        points: reporter.points
      });
      
    } else {
      // REJECT - Keep cleaner ID so they can see the rejection
      console.log('=== PROCESSING REJECTION ===');
      
      const cleanerId = report.acceptedBy;
      const paymentAmount = report.paymentAmount;
      const reporterId = report.user;
      const rejectionReasonText = comment || 'Cleaning not satisfactory';
      
      console.log(`Rejection details:
        - Cleaner ID: ${cleanerId}
        - Payment Amount: ₹${paymentAmount}
        - Rejection Reason: ${rejectionReasonText}
      `);
      
      // Refund money to reporter
      const reporter = await User.findById(reporterId);
      if (reporter) {
        reporter.walletBalance += paymentAmount;
        reporter.totalSpent -= paymentAmount;
        reporter.totalRejected += 1;
        await reporter.save();
        console.log(`Refunded ₹${paymentAmount} to reporter ${reporter.email}`);
      }
      
      // Save the rejection WITH the cleaner ID
      report.status = 'pending';
      report.verificationStatus = 'rejected';
      report.verificationComment = rejectionReasonText;
      report.paymentStatus = 'pending';
      report.rejectionReason = rejectionReasonText;
      report.rejectedAt = new Date();
      report.acceptedBy = cleanerId;
      report.afterImage = null;
      report.completedAt = null;
      
      await report.save();
      console.log(`✅ Report saved with rejection`);

      // Update cleaner's rejection count
      if (cleanerId) {
        const cleaner = await User.findById(cleanerId);
        if (cleaner) {
          cleaner.totalRejected += 1;
          await cleaner.save();
          console.log(`✅ Updated cleaner ${cleaner.email} totalRejected to: ${cleaner.totalRejected}`);
        }
      }

      return res.json({
        success: true,
        data: report,
        message: `Job rejected. ${formatCurrency(paymentAmount)} refunded to your wallet.`,
        walletBalance: reporter.walletBalance
      });
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/report/:id/cancel-rejection
// @desc    Cancel a rejected job and release payment with points
// @access  Private (Users only - Reporters)
router.post('/report/:id/cancel-rejection', protect, authorize('user'), async (req, res) => {
  try {
    const reportId = req.params.id;
    
    console.log('=== CANCEL REJECTION REQUEST ===');
    console.log('Report ID:', reportId);
    console.log('User ID:', req.user.id);
    
    const report = await WasteReport.findById(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel rejection for your own reports'
      });
    }
    
    if (report.verificationStatus !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'This job is not in rejected status'
      });
    }
    
    const cleanerId = report.acceptedBy;
    const paymentAmount = report.paymentAmount;
    const { userPoints, cleanerPoints, adminCommission, cleanerAmount } = calculatePointsAndCommission(paymentAmount);
    
    console.log(`Cancelling rejection for job:
      - Reporter ID: ${req.user.id}
      - Cleaner ID: ${cleanerId}
      - Payment Amount: ₹${paymentAmount}
      - User Points: ${userPoints}
      - Cleaner Points: ${cleanerPoints}
      - Admin Commission: ₹${adminCommission}
      - Cleaner Gets: ₹${cleanerAmount}
    `);
    
    // 1. DEDUCT MONEY FROM REPORTER'S WALLET
    const reporter = await User.findById(req.user.id);
    if (!reporter) {
      return res.status(404).json({
        success: false,
        message: 'Reporter not found'
      });
    }
    
    if (reporter.walletBalance < paymentAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your wallet balance is ₹${reporter.walletBalance}. Please add funds.`
      });
    }
    
    reporter.walletBalance -= paymentAmount;
    reporter.totalSpent += paymentAmount;
    reporter.points += userPoints;
    reporter.totalPointsEarned += userPoints;
    await reporter.save();
    console.log(`✅ Deducted ₹${paymentAmount} from reporter. Added ${userPoints} points.`);
    
    // 2. ADD MONEY AND POINTS TO CLEANER
    if (cleanerId) {
      const cleaner = await User.findById(cleanerId);
      if (cleaner) {
        cleaner.walletBalance += cleanerAmount;
        cleaner.totalEarned += cleanerAmount;
        cleaner.totalCleaned += 1;
        cleaner.completedJobs += 1;
        cleaner.totalVerified += 1;
        cleaner.points += cleanerPoints;
        cleaner.totalPointsEarned += cleanerPoints;
        await cleaner.save();
        console.log(`✅ Added ₹${cleanerAmount} and ${cleanerPoints} points to cleaner ${cleaner.email}`);
      }
    }
    
    // 3. UPDATE REPORT
    report.status = 'completed';
    report.verificationStatus = 'approved';
    report.paymentStatus = 'verified';
    report.completedAt = new Date();
    report.verifiedAt = new Date();
    report.verifiedBy = req.user.id;
    report.userPoints = userPoints;
    report.cleanerPoints = cleanerPoints;
    report.commission = adminCommission;
    report.cleanerAmount = cleanerAmount;
    await report.save();
    
    // 4. UPDATE REPORTER STATS
    reporter.totalVerified += 1;
    reporter.totalRejected = Math.max(0, reporter.totalRejected - 1);
    await reporter.save();
    
    // 5. PLATFORM COMMISSION
    console.log(`✅ Platform commission of ₹${adminCommission} added to platform revenue`);
    
    const updatedReporter = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: report,
      message: `Rejection cancelled! Cleaner received ₹${cleanerAmount} and ${cleanerPoints} points. You earned ${userPoints} points!`,
      walletBalance: updatedReporter.walletBalance,
      points: updatedReporter.points
    });
    
  } catch (error) {
    console.error('Cancel rejection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/redeem-points
// @desc    Redeem points to wallet balance (for both users and cleaners)
// @access  Private
router.post('/redeem-points', protect, async (req, res) => {
  try {
    const { points } = req.body;
    
    console.log('=== REDEEM POINTS REQUEST ===');
    console.log('User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    console.log('Points to redeem:', points);
    
    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of points to redeem'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.points < points) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You have ${user.points} points available.`
      });
    }
    
    // 1 point = ₹1 conversion rate
    const amountToAdd = points;
    
    // Deduct points and add to wallet
    user.points -= points;
    user.totalPointsRedeemed += points;
    user.walletBalance += amountToAdd;
    await user.save();
    
    console.log(`✅ Redeemed ${points} points for ₹${amountToAdd}. New balance: ₹${user.walletBalance}, Remaining points: ${user.points}`);
    
    res.json({
      success: true,
      message: `Successfully redeemed ${points} points for ₹${amountToAdd}!`,
      walletBalance: user.walletBalance,
      points: user.points
    });
    
  } catch (error) {
    console.error('Redeem points error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/waste/report/:id/delete-cleaner-job
// @desc    Cleaner cancels a job they accepted before completion
// @access  Private (Cleaners only)
router.delete('/report/:id/delete-cleaner-job', protect, authorize('cleaner'), async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (!report.acceptedBy || report.acceptedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own accepted jobs'
      });
    }

    if (report.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel job with status: ${report.status}`
      });
    }

    report.status = 'pending';
    report.acceptedBy = null;
    report.acceptedAt = null;
    report.paymentStatus = 'pending';
    report.afterImage = null;
    await report.save();

    res.json({
      success: true,
      message: 'Job cancelled successfully.'
    });
  } catch (error) {
    console.error('Cancel cleaner job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/jobs/my-active
// @desc    Get cleaner's active jobs
// @access  Private (Cleaners only)
router.get('/jobs/my-active', protect, authorize('cleaner'), async (req, res) => {
  try {
    const jobs = await WasteReport.find({
      acceptedBy: req.user.id,
      status: { $in: ['accepted', 'in-progress'] }
    })
      .populate('user', 'name email phoneNumber address')
      .sort({ acceptedAt: -1 });

    const jobsWithAmount = jobs.map(job => {
      const jobObj = job.toObject();
      const cleanerAmount = calculateCleanerAmount(job.paymentAmount);
      jobObj.cleanerAmount = cleanerAmount;
      return jobObj;
    });

    res.json({
      success: true,
      count: jobsWithAmount.length,
      data: jobsWithAmount
    });
  } catch (error) {
    console.error('Get active jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/jobs/waiting-verification
// @desc    Get cleaner's jobs waiting for verification
// @access  Private (Cleaners only)
router.get('/jobs/waiting-verification', protect, authorize('cleaner'), async (req, res) => {
  try {
    const jobs = await WasteReport.find({
      acceptedBy: req.user.id,
      status: 'waiting_verification'
    })
      .populate('user', 'name email phoneNumber')
      .sort({ completedAt: -1 });

    const jobsWithAmount = jobs.map(job => {
      const jobObj = job.toObject();
      const cleanerAmount = calculateCleanerAmount(job.paymentAmount);
      jobObj.cleanerAmount = cleanerAmount;
      return jobObj;
    });

    res.json({
      success: true,
      count: jobsWithAmount.length,
      data: jobsWithAmount
    });
  } catch (error) {
    console.error('Get waiting verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/jobs/completed
// @desc    Get completed jobs
// @access  Private
router.get('/jobs/completed', protect, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'user') {
      query = { user: req.user.id, status: 'completed' };
    } else {
      query = { acceptedBy: req.user.id, status: 'completed' };
    }
    
    const jobs = await WasteReport.find(query)
      .populate('user', 'name email')
      .populate('cleaner', 'name email')
      .sort({ completedAt: -1 })
      .limit(100);

    const jobsWithAmount = jobs.map(job => {
      const jobObj = job.toObject();
      if (req.user.role === 'cleaner') {
        const cleanerAmount = calculateCleanerAmount(job.paymentAmount);
        jobObj.earnedAmount = cleanerAmount;
      }
      return jobObj;
    });

    res.json({
      success: true,
      count: jobsWithAmount.length,
      data: jobsWithAmount
    });
  } catch (error) {
    console.error('Get completed jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/jobs/rejected
// @desc    Get rejected jobs for cleaner
// @access  Private
router.get('/jobs/rejected', protect, async (req, res) => {
  try {
    let jobs;
    
    if (req.user.role === 'user') {
      jobs = await WasteReport.find({
        user: req.user.id,
        verificationStatus: 'rejected'
      })
      .populate('acceptedBy', 'name email')
      .sort({ rejectedAt: -1 });
      
      console.log(`Found ${jobs.length} rejected reports for reporter ${req.user.email}`);
    } else {
      jobs = await WasteReport.find({
        acceptedBy: req.user.id,
        verificationStatus: 'rejected'
      })
      .populate('user', 'name email')
      .sort({ rejectedAt: -1 });
      
      console.log(`Found ${jobs.length} rejected jobs for cleaner ${req.user.email}`);
      
      jobs = jobs.map(job => {
        const jobObj = job.toObject();
        const cleanerAmount = calculateCleanerAmount(job.paymentAmount);
        jobObj.cleanerAmount = cleanerAmount;
        return jobObj;
      });
    }
    
    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    console.error('Get rejected jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/waste/report/:id/rate
// @desc    Reporter rates the cleaner after job completion
// @access  Private (Users only)
router.post('/report/:id/rate', protect, authorize('user'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reportId = req.params.id;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5'
      });
    }
    
    const report = await WasteReport.findById(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only rate jobs you reported'
      });
    }
    
    if (report.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed jobs can be rated'
      });
    }
    
    if (report.rating > 0) {
      return res.status(400).json({
        success: false,
        message: 'This job has already been rated'
      });
    }
    
    report.rating = rating;
    report.ratingComment = comment || '';
    report.ratedBy = req.user.id;
    report.ratedAt = new Date();
    await report.save();
    
    const cleaner = await User.findById(report.acceptedBy);
    if (cleaner) {
      const allRatedJobs = await WasteReport.find({
        acceptedBy: cleaner._id,
        status: 'completed',
        rating: { $gt: 0 }
      });
      
      const totalRating = allRatedJobs.reduce((sum, job) => sum + job.rating, 0);
      const averageRating = totalRating / allRatedJobs.length;
      
      cleaner.rating = averageRating;
      cleaner.totalRatings = allRatedJobs.length;
      await cleaner.save();
      console.log(`Cleaner ${cleaner.email} rating updated to ${averageRating}`);
    }
    
    res.json({
      success: true,
      message: `Thank you for rating! You gave ${rating} stars.`,
      data: report
    });
    
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/waste/stats
// @desc    Get waste statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const totalReports = await WasteReport.countDocuments();
    const completedJobs = await WasteReport.countDocuments({ status: 'completed' });
    const pendingJobs = await WasteReport.countDocuments({ status: 'pending' });
    const activeJobs = await WasteReport.countDocuments({ status: { $in: ['accepted', 'in-progress'] } });
    const waitingVerification = await WasteReport.countDocuments({ status: 'waiting_verification' });
    
    let rejectedJobsCount = 0;
    if (req.user.role === 'user') {
      rejectedJobsCount = await WasteReport.countDocuments({ 
        user: req.user.id,
        verificationStatus: 'rejected'
      });
    } else {
      rejectedJobsCount = await WasteReport.countDocuments({ 
        acceptedBy: req.user.id,
        verificationStatus: 'rejected'
      });
    }
    
    const totalCommission = await WasteReport.aggregate([
      { $match: { status: 'completed', commission: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$commission' } } }
    ]);

    const reportsByType = await WasteReport.aggregate([
      { $group: { _id: '$wasteType', count: { $sum: 1 } } }
    ]);

    let totalEarnedAfterCommission = req.user.totalEarned || 0;
    if (req.user.role === 'cleaner') {
      const completedJobsForCleaner = await WasteReport.find({
        acceptedBy: req.user.id,
        status: 'completed'
      });
      
      totalEarnedAfterCommission = completedJobsForCleaner.reduce((sum, job) => {
        const { cleanerAmount } = calculatePointsAndCommission(job.paymentAmount);
        return sum + cleanerAmount;
      }, 0);
    }

    const userStats = {
      walletBalance: req.user.walletBalance || 0,
      totalSpent: req.user.totalSpent || 0,
      totalEarned: totalEarnedAfterCommission,
      totalReports: req.user.totalReports || 0,
      totalCleaned: req.user.totalCleaned || 0,
      completedJobs: req.user.completedJobs || 0,
      totalVerified: req.user.totalVerified || 0,
      totalRejected: rejectedJobsCount,
      rating: req.user.rating || 0,
      totalRatings: req.user.totalRatings || 0,
      points: req.user.points || 0,
      totalPointsEarned: req.user.totalPointsEarned || 0,
      totalPointsRedeemed: req.user.totalPointsRedeemed || 0
    };

    res.json({
      success: true,
      data: {
        totalReports,
        completedJobs,
        pendingJobs,
        activeJobs,
        waitingVerification,
        rejectedJobs: rejectedJobsCount,
        totalCommission: totalCommission[0]?.total || 0,
        reportsByType,
        userStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
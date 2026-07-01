const mongoose = require('mongoose');

const WasteReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String
  },
  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  wasteType: {
    type: String,
    enum: ['plastic', 'organic', 'electronic', 'hazardous', 'mixed', 'other'],
    default: 'mixed'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  paymentAmount: {
    type: Number,
    required: true,
    min: [10, 'Minimum payment is ₹10'],
    max: [10000, 'Maximum payment is ₹10,000']
  },
  cleanerAmount: {
    type: Number,
    default: 0
  },
  userPoints: {
    type: Number,
    default: 0
  },
  cleanerPoints: {
    type: Number,
    default: 0
  },
  commission: {
    type: Number,
    default: 0
  },
  commissionRate: {
    type: Number,
    default: 10
  },
  userPointsRate: {
    type: Number,
    default: 1
  },
  cleanerPointsRate: {
    type: Number,
    default: 1
  },
  adminCommissionRate: {
    type: Number,
    default: 8
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'released', 'verified', 'rejected_cancelled'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'waiting_verification', 'completed', 'cancelled', 'rejection_cancelled'],
    default: 'pending'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acceptedAt: {
    type: Date
  },
  cleaner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  beforeImage: {
    type: String
  },
  afterImage: {
    type: String
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'rejection_cancelled'],
    default: 'pending'
  },
  verificationComment: {
    type: String,
    maxlength: [500, 'Verification comment cannot be more than 500 characters'],
    default: ''
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  rejectionCancelledAt: {
    type: Date
  },
  rejectionCancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  ratingComment: {
    type: String,
    maxlength: 500,
    default: ''
  },
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ratedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WasteReport', WasteReportSchema);
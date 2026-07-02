const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/waste', require('./routes/waste'));
app.use('/api/points', require('./routes/points'));
app.use('/api/admin', require('./routes/admin')); // Admin routes

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Waste Management API is running',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      waste: '/api/waste',
      points: '/api/points',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST   /api/auth/register`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - GET    /api/auth/me`);
  console.log(`   - POST   /api/auth/add-money`);
  console.log(`   - POST   /api/waste/report`);
  console.log(`   - GET    /api/waste/reports`);
  console.log(`   - POST   /api/waste/report/:id/accept`);
  console.log(`   - POST   /api/waste/report/:id/upload-after`);
  console.log(`   - POST   /api/waste/report/:id/verify`);
  console.log(`   - POST   /api/waste/report/:id/rate`);
  console.log(`   - GET    /api/admin/commission-stats`);
  console.log(`   - GET    /api/admin/all-users`);
  console.log(`   - GET    /api/admin/all-reports\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
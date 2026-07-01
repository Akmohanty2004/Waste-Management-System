const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'ashiskumarmohanty738@gmail.com' });
    
    if (adminExists) {
      console.log('⚠️ Admin user already exists!');
      console.log('📧 Email:', adminExists.email);
      console.log('👤 Name:', adminExists.name);
      console.log('👑 Role:', adminExists.role);
      process.exit(0);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Ashis@2004', salt);

    // Create admin user with correct name
    const admin = await User.create({
      name: 'Ashis Kumar Mohanty',  // Admin name
      email: 'ashiskumarmohanty738@gmail.com',
      password: hashedPassword,
      role: 'admin',
      walletBalance: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalReports: 0,
      totalCleaned: 0,
      completedJobs: 0,
      totalVerified: 0,
      totalRejected: 0,
      rating: 0,
      totalRatings: 0,
      joinDate: new Date(),
      isActive: true
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('=====================================');
    console.log('👤 Name: Ashis Kumar Mohanty');
    console.log('📧 Email: ashiskumarmohanty738@gmail.com');
    console.log('🔑 Password: Ashis@2004');
    console.log('👑 Role: Admin');
    console.log('🆔 User ID:', admin._id);
    console.log('=====================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdminUser();
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB Atlas connection...');
    console.log(`📡 Using URI: ${process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📡 Host: ${mongoose.connection.host}`);
    
    await mongoose.connection.close();
    console.log('✅ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify your IP is whitelisted in MongoDB Atlas');
    console.log('3. Check if username/password is correct');
    console.log('4. Try using the standard connection string (without +srv)');
    process.exit(1);
  }
};

testConnection();
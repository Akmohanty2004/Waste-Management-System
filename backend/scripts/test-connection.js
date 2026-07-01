// backend/scripts/test-connection.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const testConnection = async () => {
  console.log('\n🔍 Testing MongoDB Atlas Connection...\n');
  console.log('📝 Connection String (hidden password):', 
    process.env.MONGODB_URI?.replace(/cleanindia:[^@]*@/, 'cleanindia:****@'));
  
  try {
    // Try to connect
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB Atlas!\n');
    
    // Get connection info
    console.log('📊 Database Information:');
    console.log(`   - Host: ${mongoose.connection.host}`);
    console.log(`   - Database Name: ${mongoose.connection.name}`);
    console.log(`   - Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);
    if (collections.length === 0) {
      console.log('   - No collections yet. They will be created automatically when you use the app.');
    } else {
      collections.forEach(col => console.log(`   - ${col.name}`));
    }
    
    // Test write operation
    console.log('\n✍️ Testing write operation...');
    const testCollection = mongoose.connection.db.collection('connection_test');
    await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    console.log('✅ Successfully wrote to database!');
    
    // Test read operation
    const result = await testCollection.findOne({ test: true });
    console.log('✅ Successfully read from database!');
    
    // Clean up
    await testCollection.deleteMany({});
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Your MongoDB Atlas connection is working perfectly!\n');
    
  } catch (error) {
    console.error('\n❌ Connection Failed!\n');
    console.error('Error Message:', error.message);
    
    console.log('\n💡 Troubleshooting Steps:');
    console.log('1. Check your username and password in .env file');
    console.log('2. Make sure your IP address is whitelisted in MongoDB Atlas');
    console.log('   - Go to Network Access > Add IP Address > Add 0.0.0.0/0');
    console.log('3. Verify the cluster name in your connection string');
    console.log('4. Check if the database user has proper permissions');
    console.log('5. Make sure you have internet connection');
    
  } finally {
    await mongoose.disconnect();
    console.log('👋 Connection closed\n');
  }
};

// Run the test
testConnection();
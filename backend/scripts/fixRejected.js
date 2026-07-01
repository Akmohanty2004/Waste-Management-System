const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');

dotenv.config();

const fixRejectedJobs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all cleaners
    const cleaners = await User.find({ role: 'cleaner' });
    console.log('=== CLEANERS ===');
    cleaners.forEach(cleaner => {
      console.log(`ID: ${cleaner._id}, Name: ${cleaner.name}, Email: ${cleaner.email}`);
    });

    // Find all reports with rejection fields
    console.log('\n=== REPORTS WITH REJECTION FIELDS ===');
    const rejectedReports = await WasteReport.find({
      $or: [
        { verificationStatus: 'rejected' },
        { rejectionReason: { $ne: "", $exists: true } },
        { verificationComment: { $ne: "", $exists: true } }
      ]
    }).populate('acceptedBy', 'name email').populate('user', 'name email');

    console.log(`Found ${rejectedReports.length} reports with rejection information\n`);

    if (rejectedReports.length === 0) {
      console.log('No rejected jobs found in the database.');
      console.log('This explains why nothing is showing in the Rejected tab.');
    } else {
      rejectedReports.forEach((job, index) => {
        console.log(`${index + 1}. Job ID: ${job._id}`);
        console.log(`   Cleaner: ${job.acceptedBy?.name || 'N/A'}`);
        console.log(`   Reporter: ${job.user?.name || 'N/A'}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Verification Status: ${job.verificationStatus}`);
        console.log(`   Rejection Reason: ${job.verificationComment || job.rejectionReason || 'No reason'}`);
        console.log('---');
      });
    }

    // Update any reports that have rejection reasons but not marked as rejected
    const result = await WasteReport.updateMany(
      { 
        $or: [
          { rejectionReason: { $ne: "", $exists: true } },
          { verificationComment: { $ne: "", $exists: true } }
        ],
        verificationStatus: { $ne: 'rejected' }
      },
      { 
        $set: { 
          verificationStatus: 'rejected',
          rejectedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`\n✅ Updated ${result.modifiedCount} reports to have verificationStatus='rejected'`);
    } else {
      console.log('\n✅ No reports needed updating');
    }

    // Now check for a specific cleaner (replace with your email)
    const yourCleaner = await User.findOne({ email: 'your-cleaner-email@example.com' });
    if (yourCleaner) {
      const yourRejectedJobs = await WasteReport.find({
        acceptedBy: yourCleaner._id,
        verificationStatus: 'rejected'
      });
      console.log(`\n=== YOUR REJECTED JOBS (${yourCleaner.email}) ===`);
      console.log(`Found ${yourRejectedJobs.length} rejected jobs`);
      yourRejectedJobs.forEach(job => {
        console.log(`  - ${job._id}: ${job.verificationComment || job.rejectionReason}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixRejectedJobs();
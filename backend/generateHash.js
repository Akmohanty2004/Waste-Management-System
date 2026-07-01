const bcrypt = require('bcryptjs');

// Generate hash for password "Ashis@2004"
const password = 'Ashis@2004';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('\n=====================================');
  console.log('Password: Ashis@2004');
  console.log('Hashed Password:');
  console.log(hash);
  console.log('=====================================\n');
});
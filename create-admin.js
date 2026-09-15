// Run this once to create your first admin account:
//   node scripts/create-admin.js "Admin Name" "admin@example.com" "yourpassword"
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.log('Usage: node scripts/create-admin.js "Name" "email@example.com" "password"');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`Existing user ${email} promoted to admin.`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin account created for ${email}.`);
  }

  await mongoose.disconnect();
}

run();

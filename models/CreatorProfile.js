const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
  name: { type: String, required: true },   // e.g. Basic, Premium, VIP
  price: { type: Number, required: true },  // in INR
  description: { type: String }
}, { _id: true });

const creatorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  displayName: { type: String, required: true },
  handle: { type: String, required: true, unique: true, lowercase: true },
  bio: { type: String, maxlength: 500 },
  avatarUrl: { type: String },
  coverUrl: { type: String },

  subscriptionTiers: [tierSchema],

  // Payout details (kept minimal here; real system needs a payout provider e.g. Razorpay Route/Stripe Connect)
  payoutAccount: {
    accountHolderName: String,
    bankAccountNumber: String,
    ifscCode: String
  },

  isApproved: { type: Boolean, default: false }, // admin approves after ID verification
  totalSubscribers: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreatorProfile', creatorProfileSchema);

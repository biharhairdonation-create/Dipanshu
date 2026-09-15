const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  fan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorProfile', required: true },

  type: { type: String, enum: ['subscription', 'pay_per_view'], required: true },
  relatedVideo: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' }, // if pay_per_view
  relatedSubscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' }, // if subscription

  amount: { type: Number, required: true }, // total paid by fan, in INR
  platformFee: { type: Number, required: true }, // platform's cut
  creatorEarning: { type: Number, required: true }, // amount - platformFee

  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String },
  status: { type: String, enum: ['created', 'paid', 'failed', 'refunded'], default: 'created' },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  fan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorProfile', required: true },
  tierId: { type: mongoose.Schema.Types.ObjectId, required: true },

  status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, required: true },

  razorpaySubscriptionId: { type: String }, // for recurring billing
}, { timestamps: true });

subscriptionSchema.index({ fan: 1, creator: 1 }, { unique: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);

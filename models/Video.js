const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorProfile', required: true },
  title: { type: String, required: true },
  description: { type: String },

  thumbnailUrl: { type: String, required: true },
  videoUrl: { type: String, required: true }, // private S3 URL, served via signed URL

  // Access control: either subscribers-only, or pay-per-view, or both
  accessType: { type: String, enum: ['subscription_only', 'pay_per_view', 'free'], default: 'subscription_only' },
  requiredTier: { type: mongoose.Schema.Types.ObjectId }, // references a tier _id within creator's subscriptionTiers
  price: { type: Number, default: 0 }, // used when accessType is pay_per_view

  durationSeconds: { type: Number },
  views: { type: Number, default: 0 },

  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Video', videoSchema);

const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const CreatorProfile = require('../models/CreatorProfile');
const Video = require('../models/Video');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const COMMISSION = Number(process.env.PLATFORM_COMMISSION_PERCENT || 20) / 100;

// POST /api/payments/subscribe/:creatorHandle
// Creates a Razorpay order for subscribing to a creator's tier
router.post('/subscribe/:creatorHandle', protect, async (req, res) => {
  const { tierId } = req.body;
  const profile = await CreatorProfile.findOne({ handle: req.params.creatorHandle, isApproved: true });
  if (!profile) return res.status(404).json({ message: 'Creator not found.' });

  const tier = profile.subscriptionTiers.id(tierId);
  if (!tier) return res.status(404).json({ message: 'Subscription tier not found.' });

  const amountPaise = tier.price * 100;
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    notes: { type: 'subscription', creatorId: profile._id.toString(), tierId, fanId: req.user._id.toString() }
  });

  const platformFee = Math.round(tier.price * COMMISSION);
  await Transaction.create({
    fan: req.user._id,
    creator: profile._id,
    type: 'subscription',
    amount: tier.price,
    platformFee,
    creatorEarning: tier.price - platformFee,
    razorpayOrderId: order.id,
    status: 'created'
  });

  res.json({ orderId: order.id, amount: amountPaise, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/buy-video/:videoId
// Creates a Razorpay order for a single pay-per-view video
router.post('/buy-video/:videoId', protect, async (req, res) => {
  const video = await Video.findById(req.params.videoId);
  if (!video || video.accessType !== 'pay_per_view' || video.moderationStatus !== 'approved') {
    return res.status(404).json({ message: 'Video not available for purchase.' });
  }

  const amountPaise = video.price * 100;
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    notes: { type: 'pay_per_view', videoId: video._id.toString(), fanId: req.user._id.toString() }
  });

  const platformFee = Math.round(video.price * COMMISSION);
  await Transaction.create({
    fan: req.user._id,
    creator: video.creator,
    type: 'pay_per_view',
    relatedVideo: video._id,
    amount: video.price,
    platformFee,
    creatorEarning: video.price - platformFee,
    razorpayOrderId: order.id,
    status: 'created'
  });

  res.json({ orderId: order.id, amount: amountPaise, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
});

// POST /api/payments/verify
// Called by frontend after Razorpay checkout completes, to confirm payment signature
router.post('/verify', protect, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed.' });
  }

  const txn = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
  if (!txn) return res.status(404).json({ message: 'Transaction not found.' });

  txn.status = 'paid';
  txn.razorpayPaymentId = razorpay_payment_id;
  await txn.save();

  if (txn.type === 'subscription') {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const tierId = order.notes.tierId;

    await Subscription.findOneAndUpdate(
      { fan: txn.fan, creator: txn.creator },
      { tierId, status: 'active', startedAt: new Date(), currentPeriodEnd: periodEnd },
      { upsert: true, new: true }
    );

    await CreatorProfile.findByIdAndUpdate(txn.creator, {
      $inc: { totalEarnings: txn.creatorEarning, totalSubscribers: 1 }
    });
  } else {
    await CreatorProfile.findByIdAndUpdate(txn.creator, { $inc: { totalEarnings: txn.creatorEarning } });
  }

  res.json({ message: 'Payment verified successfully.' });
});

module.exports = router;

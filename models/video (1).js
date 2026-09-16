const express = require('express');
const Video = require('../models/Video');
const CreatorProfile = require('../models/CreatorProfile');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const { upload, uploadToS3, getSignedUrl } = require('../config/upload');

const router = express.Router();

// POST /api/videos  (creator uploads a new video — goes to moderation queue before it's live)
router.post(
  '/',
  protect,
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req, res) => {
    const profile = await CreatorProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(403).json({ message: 'Only creators can upload videos.' });
    if (!profile.isApproved) {
      return res.status(403).json({ message: 'Your creator profile is still pending approval.' });
    }

    const { title, description, accessType, requiredTier, price } = req.body;
    if (!req.files?.video || !req.files?.thumbnail) {
      return res.status(400).json({ message: 'Both video and thumbnail files are required.' });
    }

    const videoKey = await uploadToS3(req.files.video[0].buffer, req.files.video[0].mimetype, 'videos');
    const thumbKey = await uploadToS3(req.files.thumbnail[0].buffer, req.files.thumbnail[0].mimetype, 'thumbnails');

    const video = await Video.create({
      creator: profile._id,
      title,
      description,
      videoUrl: videoKey,
      thumbnailUrl: thumbKey,
      accessType: accessType || 'subscription_only',
      requiredTier,
      price: price || 0,
      moderationStatus: 'pending'
    });

    res.status(201).json({ message: 'Video uploaded and pending moderation review.', video });
  }
);

// GET /api/videos/creator/:handle  (list a creator's videos — locked/unlocked shown, no direct URLs leaked)
router.get('/creator/:handle', async (req, res) => {
  const profile = await CreatorProfile.findOne({ handle: req.params.handle, isApproved: true });
  if (!profile) return res.status(404).json({ message: 'Creator not found.' });

  const videos = await Video.find({ creator: profile._id, moderationStatus: 'approved' })
    .select('title description accessType price durationSeconds views createdAt thumbnailUrl requiredTier')
    .sort({ createdAt: -1 });

  res.json(videos);
});

// GET /api/videos/:id/stream  (returns a temporary signed URL, only if the user has access)
router.get('/:id/stream', protect, async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video || video.moderationStatus !== 'approved') {
    return res.status(404).json({ message: 'Video not found.' });
  }

  if (video.accessType === 'free') {
    return res.json({ url: getSignedUrl(video.videoUrl) });
  }

  if (video.accessType === 'subscription_only') {
    const sub = await Subscription.findOne({
      fan: req.user._id,
      creator: video.creator,
      status: 'active',
      currentPeriodEnd: { $gt: new Date() }
    });
    if (!sub) return res.status(403).json({ message: 'An active subscription is required to watch this video.' });
    return res.json({ url: getSignedUrl(video.videoUrl) });
  }

  if (video.accessType === 'pay_per_view') {
    const purchased = await Transaction.findOne({
      fan: req.user._id,
      relatedVideo: video._id,
      status: 'paid'
    });
    if (!purchased) return res.status(403).json({ message: 'Purchase this video to watch it.' });
    video.views += 1;
    await video.save();
    return res.json({ url: getSignedUrl(video.videoUrl) });
  }

  res.status(403).json({ message: 'Access denied.' });
});

module.exports = router;

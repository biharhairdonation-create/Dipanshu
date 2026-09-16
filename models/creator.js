const express = require('express');
const { body, validationResult } = require('express-validator');
const CreatorProfile = require('../models/CreatorProfile');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /api/creators/become  (fan -> creator, requires ID verification first)
router.post(
  '/become',
  protect,
  [
    body('displayName').trim().notEmpty(),
    body('handle').trim().isLowercase().matches(/^[a-z0-9._]+$/),
    body('bio').optional().isLength({ max: 500 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await CreatorProfile.findOne({ handle: req.body.handle });
    if (existing) return res.status(409).json({ message: 'This handle is already taken.' });

    const profile = await CreatorProfile.create({
      user: req.user._id,
      displayName: req.body.displayName,
      handle: req.body.handle,
      bio: req.body.bio,
      subscriptionTiers: req.body.subscriptionTiers || []
    });

    await User.findByIdAndUpdate(req.user._id, { role: 'creator' });

    res.status(201).json({
      message: 'Creator profile created. Pending admin approval before it goes public.',
      profile
    });
  }
);

// GET /api/creators/:handle  (public profile view)
router.get('/:handle', async (req, res) => {
  const profile = await CreatorProfile.findOne({ handle: req.params.handle, isApproved: true });
  if (!profile) return res.status(404).json({ message: 'Creator not found.' });
  res.json(profile);
});

// GET /api/creators  (browse approved creators)
router.get('/', async (req, res) => {
  const profiles = await CreatorProfile.find({ isApproved: true })
    .select('displayName handle avatarUrl bio subscriptionTiers totalSubscribers')
    .limit(50);
  res.json(profiles);
});

// GET /api/creators/me  (creator views own profile, including unapproved state)
router.get('/me', protect, async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'No creator profile yet.' });
  res.json(profile);
});

// PATCH /api/creators/me  (creator edits own profile/tiers)
router.patch('/me', protect, async (req, res) => {
  const profile = await CreatorProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'You do not have a creator profile.' });

  const editable = ['displayName', 'bio', 'avatarUrl', 'coverUrl', 'subscriptionTiers', 'payoutAccount'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) profile[field] = req.body[field];
  });

  await profile.save();
  res.json(profile);
});

module.exports = router;

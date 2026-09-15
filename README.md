# Miss Bald Beauty — Backend

Node.js + Express + MongoDB backend for a creator subscription & pay-per-view video platform.

## Frontend panels included

- `creator-dashboard.html` — models login yaha se, apna profile/subscription tiers set karte hain, aur video+photo upload karte hain.
- `admin-panel.html` — aap yaha se naye creators approve karte hain aur uploaded videos ko approve/reject karte hain.

Dono files ke top mein `API_BASE` variable hai — apne backend ka URL wahan daalein (local testing ke liye `http://localhost:5000/api` already set hai).

### Pehla admin account banana

Signup se hamesha normal 'fan' account banta hai. Apna pehla admin account banane ke liye:

```bash
cd backend
node scripts/create-admin.js "Aapka Naam" "admin@example.com" "strongpassword"
```

Phir `admin-panel.html` isi email/password se login karein.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in real values
npm run dev             # or: npm start
```

Requires:
- MongoDB (local or Atlas)
- A Razorpay account (test mode keys work for development) — https://razorpay.com
- An AWS S3 bucket for private video/photo storage

## Architecture

```
backend/
├── config/
│   ├── db.js           MongoDB connection
│   └── upload.js        S3 upload + signed URL generation (multer)
├── middleware/
│   └── auth.js          JWT auth, role checks, age/ID verification gate
├── models/
│   ├── User.js           Fans, creators, admins (one schema, role field)
│   ├── CreatorProfile.js Creator page: bio, tiers, payout info
│   ├── Video.js          Video metadata + access rules
│   ├── Subscription.js   Active fan → creator subscriptions
│   └── Transaction.js    Every payment, with platform fee split
├── routes/
│   ├── auth.js           Signup / login / submit ID for verification
│   ├── creator.js        Become a creator, edit profile & tiers
│   ├── video.js          Upload video, stream with access control
│   ├── payment.js        Razorpay order creation + payment verification
│   └── admin.js          Approve IDs, approve creators, moderate videos
└── server.js             App entry point
```

## Safeguards already wired in

1. **Creator approval gate** — a creator profile is not publicly visible until an admin sets `isApproved: true`.
2. **Content moderation queue** — every uploaded video starts as `moderationStatus: 'pending'` and is invisible to fans until an admin approves it.
3. **Private video storage** — videos are uploaded to S3 with `ACL: 'private'`. Playback only ever happens via a short-lived signed URL (`getSignedUrl`), and only after the backend confirms the requester has paid or subscribed.
4. **Payment integrity** — Razorpay orders are created server-side; payments are confirmed via HMAC signature verification (`payment.js`), never trusted from the client alone.

Note: age/ID verification has been removed from signup and from the creator/upload/payment flows, since this platform isn't for adult content. If that changes later, an age gate and ID verification step should be added back in.

## What you still need to do before going live

- Register a real Razorpay (or other) merchant account and confirm it supports your content category.
- Build/staff the actual **admin review process** for content moderation — the routes exist, but a human needs to do the reviewing.
- Add legal pages: Terms of Service, Privacy Policy, content takedown process, and creator payout agreements.
- Add HTTPS, environment secrets management, and backups before production deployment.

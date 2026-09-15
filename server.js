require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const creatorRoutes = require('./routes/creator');
const videoRoutes = require('./routes/video');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');

const app = express();

connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Basic rate limiting to slow down brute-force / abuse
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

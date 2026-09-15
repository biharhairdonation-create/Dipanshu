const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifies JWT and attaches user to req
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Login required.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Account not found or deactivated.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
};

// Restrict route to specific roles, e.g. requireRole('creator', 'admin')
exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission for this action.' });
  }
  next();
};


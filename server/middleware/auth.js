const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).populate('role').populate('templates');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Checks role.permissions[permissionKey] === true.
// Admins (isAdmin: true) always bypass this check.
exports.requirePermission = (permissionKey) => (req, res, next) => {
  if (req.user?.isAdmin) return next();

  const hasPermission = req.user?.role?.permissions?.[permissionKey];
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: `Your role does not have permission to perform this action (${permissionKey}).`,
    });
  }
  next();
};
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const Template = require('../models/Template');
const { protect, adminOnly } = require('../middleware/auth');

// GET dashboard stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalRoles, totalTemplates, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Role.countDocuments({ isActive: true }),
      Template.countDocuments({ isActive: true }),
      User.find().sort({ createdAt: -1 }).limit(5).populate('role', 'name color').select('name email isActive createdAt role'),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalRoles,
        totalTemplates,
        recentUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

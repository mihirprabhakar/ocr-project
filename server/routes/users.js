const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');


// Returns error string if the edit should be blocked, null if allowed
const checkProtection = (requester, targetUser, changes = {}) => {

  // Rule 1: Nobody can edit a SuperAdmin except themselves super admin is the comapny account
  if (targetUser.isSuperAdmin && requester._id.toString() !== targetUser._id.toString()) {
    return 'The original Super Admin account cannot be modified by other admins.';
  }

  // Rule 2: No one can remove isSuperAdmin from the Super Admin
  if (targetUser.isSuperAdmin && changes.isSuperAdmin === false) {
    return 'Super Admin status cannot be removed from the original admin account.';
  }

  // Rule 3: No one can deactivate the Super Admin account no matters who they are
  if (targetUser.isSuperAdmin && changes.isActive === false) {
    return 'The Super Admin account cannot be deactivated.';
  }

  // Rule 4: No one can remove isAdmin from the Super Admin
  if (targetUser.isSuperAdmin && changes.isAdmin === false) {
    return 'Admin privileges cannot be removed from the Super Admin account.';
  }

  // Rule 5: An admin cannot remove their own admin privileges
  if (
    requester._id.toString() === targetUser._id.toString() &&
    changes.isAdmin === false
  ) {
    return 'You cannot remove your own admin privileges.';
  }

  // Rule 6: An admin cannot deactivate their own account
  if (
    requester._id.toString() === targetUser._id.toString() &&
    changes.isActive === false
  ) {
    return 'You cannot deactivate your own account.';
  }

  return null; // all good
};

// GET all users
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .populate('role', 'name color')
      .populate('templates', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single user
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('role').populate('templates');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create user
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    // Never allow manually setting isSuperAdmin via API set it manually
    delete req.body.isSuperAdmin;
    const user = await User.create(req.body);
    const populated = await User.findById(user._id)
      .populate('role', 'name color')
      .populate('templates', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update user
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Check protection rules
    const blocked = checkProtection(req.user, targetUser, req.body);
    if (blocked) return res.status(403).json({ success: false, message: blocked });

    // Never allow changing isSuperAdmin via this route
    delete req.body.isSuperAdmin;
    // Never allow password change through this route
    delete req.body.password;

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('role', 'name color').populate('templates', 'name');

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT assign role to user
router.put('/:id/assign-role', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // SuperAdmin role assignment can only be done by themselves
    const blocked = checkProtection(req.user, targetUser, {});
    if (blocked) return res.status(403).json({ success: false, message: blocked });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.roleId },
      { new: true }
    ).populate('role', 'name color').populate('templates', 'name');

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT assign templates to user
router.put('/:id/assign-templates', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { templates: req.body.templateIds },
      { new: true }
    ).populate('role', 'name color').populate('templates', 'name');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    // Nobody can delete the Super Admin
    if (targetUser.isSuperAdmin) {
      return res.status(403).json({ success: false, message: 'The Super Admin account cannot be deleted.' });
    }

    // Admin cannot delete their own account
    if (req.user._id.toString() === targetUser._id.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
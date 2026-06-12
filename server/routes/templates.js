const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const { protect, adminOnly } = require('../middleware/auth');

// GET all the templates
router.get('/', protect, async (req, res) => {
  try {
    const templates = await Template.find()
      .populate('createdBy', 'name email')
      .populate('assignedRoles', 'name color')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: templates.length, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single template
router.get('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedRoles', 'name color');
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create template
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const template = await Template.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update template
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('createdBy', 'name email').populate('assignedRoles', 'name color');
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE template
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

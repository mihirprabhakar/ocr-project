const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ScanJob = require('../models/ScanJob');
const Template = require('../models/Template');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { runOCR, extractFields } = require('../services/ocrService');
const { pushToSAP } = require('../services/sapService');


// MODULE 1: DOCUMENT UPLOAD
// POST /api/scan/upload

router.post('/upload', protect, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { templateId } = req.body;
    if (!templateId) return res.status(400).json({ success: false, message: 'Template ID is required' });

    const template = await Template.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ext === '.pdf' ? 'pdf' : 'image';

    const scanJob = await ScanJob.create({
      user: req.user._id,
      template: templateId,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileType,
      fileSize: req.file.size,
      status: 'uploaded',
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: await scanJob.populate(['user', 'template']),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// MODULE 2 and 3: OCR PROCESSING with DATA MAPPING
// POST /api/scan/:id/process

router.post('/:id/process', protect, async (req, res) => {
  const scanJob = await ScanJob.findById(req.params.id).populate('template');
  if (!scanJob) return res.status(404).json({ success: false, message: 'Scan job not found' });

  try {
    // Update the  status to processing
    scanJob.status = 'processing';
    scanJob.processingStartedAt = new Date();
    await scanJob.save();

    // Run the OCR
    const { text, confidence } = await runOCR(scanJob.filePath);
    scanJob.rawText = text;
    scanJob.ocrConfidence = confidence;
    scanJob.status = 'extracted';
    await scanJob.save();

    // Map the fields using templates
    const fields = extractFields(text, scanJob.template.fields || []);
    scanJob.extractedFields = fields;
    scanJob.status = 'mapped';
    scanJob.processingCompletedAt = new Date();
    scanJob.processingDuration = scanJob.processingCompletedAt - scanJob.processingStartedAt;
    await scanJob.save();

    res.json({
      success: true,
      message: 'OCR processing complete',
      data: scanJob,
    });
  } catch (err) {
    scanJob.status = 'failed';
    scanJob.errorMessage = err.message;
    await scanJob.save();
    res.status(500).json({ success: false, message: err.message });
  }
});


// UPDATE FIELD VALUES (Manual correction)
// PUT /api/scan/:id/fields

router.put('/:id/fields', protect, async (req, res) => {
  try {
    const { fields } = req.body;
    const scanJob = await ScanJob.findById(req.params.id);
    if (!scanJob) return res.status(404).json({ success: false, message: 'Scan job not found' });

    scanJob.extractedFields = fields;
    scanJob.status = 'verified';
    await scanJob.save();

    res.json({ success: true, data: scanJob });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// MODULE 4: DATA STORAGE :— GET ALL JOBS
// GET /api/scan

router.get('/', protect, async (req, res) => {
  try {
    const { status, templateId, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Non-admins see only their own jobs
    if (!req.user.isAdmin) filter.user = req.user._id;
    if (status) filter.status = status;
    if (templateId) filter.template = templateId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const total = await ScanJob.countDocuments(filter);
    const jobs = await ScanJob.find(filter)
      .populate('user', 'name email')
      .populate('template', 'name documentType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / limit), data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single job
router.get('/:id', protect, async (req, res) => {
  try {
    const job = await ScanJob.findById(req.params.id)
      .populate('user', 'name email')
      .populate('template');
    if (!job) return res.status(404).json({ success: false, message: 'Scan job not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// MODULE 5: DATA PUSH TO SAP
// POST /api/scan/:id/push

router.post('/:id/push', protect, async (req, res) => {
  try {
    const scanJob = await ScanJob.findById(req.params.id).populate('template');
    if (!scanJob) return res.status(404).json({ success: false, message: 'Scan job not found' });

    if (!['mapped', 'verified'].includes(scanJob.status)) {
      return res.status(400).json({ success: false, message: 'Scan must be processed before pushing' });
    }

    const result = await pushToSAP(scanJob, scanJob.template);

    scanJob.sapStatus = 'pushed';
    scanJob.sapResponse = result;
    scanJob.pushedAt = new Date();
    scanJob.status = 'pushed';
    await scanJob.save();

    res.json({ success: true, message: 'Data pushed successfully', data: result });
  } catch (err) {
    const scanJob = await ScanJob.findById(req.params.id);
    if (scanJob) { scanJob.sapStatus = 'failed'; await scanJob.save(); }
    res.status(500).json({ success: false, message: err.message });
  }
});


// MODULE 6: REPORTS & STATS
// GET /api/scan/reports/stats

router.get('/reports/stats', protect, async (req, res) => {
  try {
    const filter = req.user.isAdmin ? {} : { user: req.user._id };

    const [total, byStatus, byTemplate, recentJobs] = await Promise.all([
      ScanJob.countDocuments(filter),
      ScanJob.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ScanJob.aggregate([
        { $match: filter },
        { $group: { _id: '$template', count: { $sum: 1 } } },
        { $lookup: { from: 'templates', localField: '_id', foreignField: '_id', as: 'template' } },
        { $unwind: '$template' },
        { $project: { name: '$template.name', count: 1 } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      ScanJob.find(filter)
        .populate('user', 'name')
        .populate('template', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('jobId status createdAt user template ocrConfidence'),
    ]);

    const statusMap = {};
    byStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        total,
        pushed: statusMap.pushed || 0,
        failed: statusMap.failed || 0,
        processing: (statusMap.processing || 0) + (statusMap.uploaded || 0),
        verified: statusMap.verified || 0,
        byTemplate,
        recentJobs,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// EXPORT scan data as JSON
router.get('/reports/export', protect, async (req, res) => {
  try {
    const filter = req.user.isAdmin ? {} : { user: req.user._id };
    const { status } = req.query;
    if (status) filter.status = status;

    const jobs = await ScanJob.find(filter)
      .populate('user', 'name email')
      .populate('template', 'name documentType')
      .sort({ createdAt: -1 });

    const exportData = jobs.map(j => {
      const row = {
        jobId: j.jobId,
        file: j.originalFileName,
        template: j.template?.name,
        user: j.user?.name,
        status: j.status,
        confidence: j.ocrConfidence,
        createdAt: j.createdAt,
      };
      j.extractedFields?.forEach(f => { row[f.fieldName] = f.correctedValue || f.extractedValue; });
      return row;
    });

    res.setHeader('Content-Disposition', 'attachment; filename=scan_export.json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE job
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await ScanJob.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    // Clean up file
    if (fs.existsSync(job.filePath)) fs.unlinkSync(job.filePath);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

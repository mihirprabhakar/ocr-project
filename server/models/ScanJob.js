const mongoose = require('mongoose');

const ExtractedFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  fieldType: { type: String, default: 'text' },
  extractedValue: { type: String, default: '' },
  correctedValue: { type: String, default: '' },
  confidence: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
});

const ScanJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', required: true },

    // File info
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'image'], required: true },
    fileSize: { type: Number },

    // OCR results
    rawText: { type: String, default: '' },
    extractedFields: [ExtractedFieldSchema],
    ocrConfidence: { type: Number, default: 0 },

    // Status flow
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'extracted', 'mapped', 'verified', 'pushed', 'failed'],
      default: 'uploaded',
    },
    errorMessage: { type: String },

    // SAP push
    sapStatus: { type: String, enum: ['pending', 'pushed', 'failed'], default: 'pending' },
    sapResponse: { type: mongoose.Schema.Types.Mixed },
    pushedAt: { type: Date },

    // Timing
    processingStartedAt: { type: Date },
    processingCompletedAt: { type: Date },
    processingDuration: { type: Number }, // ms
  },
  { timestamps: true }
);

// Autogenerates jobId before save
ScanJobSchema.pre('save', function (next) {
  if (!this.jobId) {
    this.jobId = 'JOB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('ScanJob', ScanJobSchema);

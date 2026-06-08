const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true, trim: true },
  fieldType: {
    type: String,
    enum: ['text', 'number', 'date', 'email', 'phone', 'amount', 'checkbox'],
    default: 'text',
  },
  isRequired: { type: Boolean, default: false },
  defaultValue: { type: String, default: '' },
  order: { type: Number, default: 0 },
});

const TemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Template name is required'], trim: true },
    description: { type: String, trim: true },
    documentType: {
      type: String,
      enum: ['invoice', 'purchase_order', 'delivery_note', 'contract', 'form', 'other'],
      default: 'other',
    },
    fields: [FieldSchema],
    outputFormat: { type: String, enum: ['json', 'csv', 'xml'], default: 'json' },
    sapMapping: { type: Map, of: String, default: {} },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', TemplateSchema);

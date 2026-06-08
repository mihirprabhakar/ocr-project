const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: { type: String, trim: true },
    permissions: {
      canScan: { type: Boolean, default: false },
      canUpload: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canManageTemplates: { type: Boolean, default: false },
      canPushToSAP: { type: Boolean, default: false },
      canViewAllData: { type: Boolean, default: false },
    },
    color: { type: String, default: '#3B82F6' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', RoleSchema);

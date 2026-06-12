const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
    templates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Template' }],
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    isSuperAdmin: { type: Boolean, default: false }, // First registered user — protected forever
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
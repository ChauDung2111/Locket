const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Locket-compatible uid
  uid: {
    type: String,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toHexString(),
  },
  email: {
    type: String,
    required: [true, 'Email là bắt buộc'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    default: null,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu là bắt buộc'],
    minlength: 6,
    select: false,
  },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },

  // Auth tokens
  refreshToken: { type: String, default: null, select: false },

  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  // Plan
  plan: {
    type: String,
    enum: ['free', 'pro', 'premium'],
    default: 'free',
  },

  // Streak
  streak: { type: Number, default: 0 },
  lastPostAt: { type: Date, default: null },

  // Push notifications
  pushTokens: [{ type: String }],

  // Settings
  settings: {
    notifications: { type: Boolean, default: true },
    privateProfile: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: fullName
userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Hash password trước khi save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Gán uid = _id nếu chưa có
userSchema.pre('save', function (next) {
  if (!this.uid) this.uid = this._id.toHexString();
  next();
});

// So sánh password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Lấy public profile (dùng cho API trả về)
userSchema.methods.toPublicJSON = function () {
  return {
    uid: this.uid,
    localId: this.uid,
    email: this.email,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
    profilePicture: this.profilePicture,
    bio: this.bio,
    plan: this.plan,
    streak: this.streak,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const momentSchema = new mongoose.Schema({
  // Người đăng
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  uid: { type: String, required: true, index: true },

  // Media
  mediaInfo: {
    url: { type: String, required: true },
    path: { type: String, default: '' },
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    uploadedAt: { type: String, default: null },
    // Cloudinary
    publicId: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    duration: { type: Number, default: null }, // seconds cho video
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },

  // Options / Overlay
  options: {
    caption: { type: String, default: '' },
    overlay_id: { type: String, default: null },
    type: { type: String, default: null },
    icon: { type: String, default: null },
    text_color: { type: String, default: null },
    color_top: { type: String, default: null },
    color_bottom: { type: String, default: null },
    music: { type: String, default: '' },
    audience: {
      type: String,
      enum: ['public', 'friends', 'selected', 'private'],
      default: 'friends',
    },
    recipients: [{ type: String }], // list uid
    isStreaktoday: { type: Boolean, default: false },
  },

  contentType: { type: String, enum: ['image', 'video'], default: 'image' },
  model: { type: String, default: 'Version-UploadmediaV3.1' },

  // Reactions
  reactions: [{
    userId: { type: String },
    emoji: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],

  // Comments
  comments: [{
    userId: { type: String },
    text: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],

  // Stats
  viewCount: { type: Number, default: 0 },

  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Index để query nhanh theo audience + recipients
momentSchema.index({ 'options.audience': 1, createdAt: -1 });
momentSchema.index({ 'options.recipients': 1, createdAt: -1 });

module.exports = mongoose.model('Moment', momentSchema);

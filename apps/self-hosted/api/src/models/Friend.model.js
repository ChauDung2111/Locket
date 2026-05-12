const mongoose = require('mongoose');

// Quan hệ bạn bè (đã được chấp nhận)
const friendSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  friendId: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  sharedHistoryOn: { type: Date, default: Date.now },
  hidden: { type: Boolean, default: false },
});

friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// Lời mời kết bạn (đang chờ)
const friendRequestSchema = new mongoose.Schema({
  from: { type: String, required: true, index: true }, // uid người gửi
  to: { type: String, required: true, index: true },   // uid người nhận
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending',
  },
  date: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);
const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = { Friend, FriendRequest };

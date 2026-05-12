const User = require('../models/User.model');
const AppError = require('../utils/AppError');

// ── GET /api/me ───────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: user.toPublicJSON(),
    });
  } catch (err) { next(err); }
};

// ── GET /api/po ───────────────────────────────────────────
// Trả về profile + overlay settings
exports.getProfileOverlay = async (req, res, next) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: {
        ...user.toPublicJSON(),
        settings: user.settings,
        streak: user.streak,
        lastPostAt: user.lastPostAt,
        plan: user.plan,
      },
    });
  } catch (err) { next(err); }
};

// ── PUT /api/users/profile ────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, username, bio } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (bio !== undefined) updates.bio = bio;
    if (username) {
      // Kiểm tra username chưa được dùng
      const taken = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user._id } });
      if (taken) return next(new AppError('Username đã được sử dụng.', 409));
      updates.username = username.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    return res.json({ success: true, data: user.toPublicJSON() });
  } catch (err) { next(err); }
};

// ── PUT /api/users/avatar ─────────────────────────────────
exports.updateAvatar = async (req, res, next) => {
  try {
    const { profilePicture } = req.body;
    if (!profilePicture) return next(new AppError('Cần cung cấp URL ảnh đại diện.', 400));

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture },
      { new: true }
    );
    return res.json({ success: true, data: user.toPublicJSON() });
  } catch (err) { next(err); }
};

// ── PUT /api/users/password ───────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new AppError('Cần nhập mật khẩu cũ và mới.', 400));
    }
    if (newPassword.length < 6) {
      return next(new AppError('Mật khẩu mới phải có ít nhất 6 ký tự.', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(new AppError('Mật khẩu hiện tại không đúng.', 401));

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (err) { next(err); }
};

// ── GET /api/users/:uid ───────────────────────────────────
exports.getUserById = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    if (!user) return next(new AppError('Người dùng không tồn tại.', 404));
    return res.json({ success: true, data: user.toPublicJSON() });
  } catch (err) { next(err); }
};

// ── POST /api/users/push-token ────────────────────────────
exports.registerPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return next(new AppError('Push token là bắt buộc.', 400));

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { pushTokens: token },
    });

    return res.json({ success: true, message: 'Push token đã được đăng ký.' });
  } catch (err) { next(err); }
};

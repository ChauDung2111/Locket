const Moment = require('../models/Moment.model');
const User = require('../models/User.model');
const { Friend } = require('../models/Friend.model');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// ── Upload lên Cloudinary từ buffer ──────────────────────
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'locket-dio', resource_type: 'auto', ...options },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// ── POST /locket/postMomentV2 ─────────────────────────────
exports.postMoment = async (req, res, next) => {
  try {
    const { mediaInfo, options, contentType, model } = req.body;
    const user = req.user;

    if (!mediaInfo?.url) return next(new AppError('Cần cung cấp URL media.', 400));

    const moment = await Moment.create({
      userId: user._id,
      uid: user.uid,
      mediaInfo,
      options: options || {},
      contentType: contentType || 'image',
      model: model || 'Version-UploadmediaV3.1',
    });

    // Cập nhật streak
    const now = new Date();
    const lastPost = user.lastPostAt;
    const isToday = lastPost && isSameDay(lastPost, now);
    const isYesterday = lastPost && isConsecutiveDay(lastPost, now);

    if (!isToday) {
      await User.findByIdAndUpdate(user._id, {
        lastPostAt: now,
        streak: isYesterday ? user.streak + 1 : 1,
      });
    }

    // Notify qua socket
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const recipients = options?.recipients || [];
      recipients.forEach((uid) => {
        io.to(uid).emit('new_moment', {
          momentId: moment._id,
          fromUid: user.uid,
          fromName: user.name,
        });
      });
    } catch (_) { /* socket optional */ }

    return res.status(201).json({
      success: true,
      message: 'Đăng moment thành công.',
      data: moment,
    });
  } catch (err) { next(err); }
};

// ── GET /api/moments ──────────────────────────────────────
exports.getMoments = async (req, res, next) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Lấy danh sách bạn bè
    const friendDocs = await Friend.find({ userId: user.uid });
    const friendUids = friendDocs.map((f) => f.friendId);

    // Query: public từ bạn, hoặc gửi cho mình
    const query = {
      isDeleted: false,
      $or: [
        { 'options.audience': 'public', uid: { $in: friendUids } },
        { 'options.audience': 'friends', uid: { $in: friendUids } },
        { 'options.audience': 'selected', 'options.recipients': user.uid },
        { uid: user.uid }, // moment của chính mình
      ],
    };

    const [moments, total] = await Promise.all([
      Moment.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Moment.countDocuments(query),
    ]);

    // Populate user info
    const enriched = await Promise.all(
      moments.map(async (m) => {
        const author = await User.findOne({ uid: m.uid }).select('uid firstName lastName profilePicture username');
        return { ...m.toObject(), author: author?.toPublicJSON() || null };
      })
    );

    return res.json({
      success: true,
      data: enriched,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ── POST /locket/reactMoment ──────────────────────────────
exports.reactMoment = async (req, res, next) => {
  try {
    const { momentId, emoji } = req.body;
    if (!momentId || !emoji) return next(new AppError('Thiếu momentId hoặc emoji.', 400));

    const moment = await Moment.findById(momentId);
    if (!moment) return next(new AppError('Moment không tồn tại.', 404));

    // Xóa reaction cũ nếu có
    moment.reactions = moment.reactions.filter((r) => r.userId !== req.user.uid);
    moment.reactions.push({ userId: req.user.uid, emoji });
    await moment.save();

    // Notify chủ moment
    try {
      const { getIO } = require('../config/socket');
      getIO().to(moment.uid).emit('reaction', { momentId, emoji, fromUid: req.user.uid });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã react moment.' });
  } catch (err) { next(err); }
};

// ── DELETE /locket/moment/:id ─────────────────────────────
exports.deleteMoment = async (req, res, next) => {
  try {
    const moment = await Moment.findById(req.params.id);
    if (!moment) return next(new AppError('Moment không tồn tại.', 404));
    if (moment.uid !== req.user.uid) return next(new AppError('Không có quyền xóa moment này.', 403));

    moment.isDeleted = true;
    await moment.save();

    // Xóa trên Cloudinary nếu có publicId
    if (moment.mediaInfo?.publicId) {
      await cloudinary.uploader.destroy(moment.mediaInfo.publicId, {
        resource_type: moment.contentType === 'video' ? 'video' : 'image',
      });
    }

    return res.json({ success: true, message: 'Đã xóa moment.' });
  } catch (err) { next(err); }
};

// ── Helpers ───────────────────────────────────────────────
function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isConsecutiveDay(last, now) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(last, yesterday);
}

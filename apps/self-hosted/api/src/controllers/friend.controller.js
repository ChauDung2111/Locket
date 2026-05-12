const { Friend, FriendRequest } = require('../models/Friend.model');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');

// ── POST /locket/getAllFriendsV2 ──────────────────────────
exports.getAllFriends = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const friends = await Friend.find({ userId: uid, hidden: false }).lean();

    return res.json({
      success: true,
      data: friends.map((f) => ({
        uid: f.friendId,
        createdAt: f.createdAt?.getTime?.() || f.createdAt,
        updatedAt: f.updatedAt?.getTime?.() || f.updatedAt,
        sharedHistoryOn: f.sharedHistoryOn?.getTime?.() || f.sharedHistoryOn,
        hidden: f.hidden,
      })),
    });
  } catch (err) { next(err); }
};

// ── POST /locket/getAllRequestsV2 ─────────────────────────
exports.getAllRequests = async (req, res, next) => {
  try {
    const { pageToken, limit = 100 } = req.body;
    const uid = req.user.uid;

    const query = { to: uid, status: 'pending' };
    const requests = await FriendRequest.find(query).limit(parseInt(limit)).lean();

    return res.json({
      success: true,
      data: requests.map((r) => ({ uid: r.from, date: r.date })),
      nextPageToken: null,
    });
  } catch (err) { next(err); }
};

// ── POST /locket/getIncomingFriendRequestsV2 ──────────────
exports.getIncomingRequests = async (req, res, next) => {
  try {
    const { pageToken, limit = 10 } = req.body;
    const uid = req.user.uid;

    const requests = await FriendRequest.find({ to: uid, status: 'pending' })
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      data: requests.map((r) => ({ uid: r.from, date: r.date })),
      nextPageToken: null,
    });
  } catch (err) { next(err); }
};

// ── POST /locket/getOutgoingFriendRequestsV2 ──────────────
exports.getOutgoingRequests = async (req, res, next) => {
  try {
    const { pageToken, limit = 100 } = req.body;
    const uid = req.user.uid;

    const requests = await FriendRequest.find({ from: uid, status: 'pending' })
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      data: requests.map((r) => ({ to: r.to, date: r.date })),
      nextPageToken: null,
    });
  } catch (err) { next(err); }
};

// ── POST /locket/sendFriendRequestV2 ─────────────────────
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const fromUid = req.user.uid;
    const { friendUid } = req.body?.data || req.body;

    if (!friendUid) return next(new AppError('Cần cung cấp friendUid.', 400));
    if (friendUid === fromUid) return next(new AppError('Không thể tự kết bạn với chính mình.', 400));

    // Kiểm tra target user tồn tại
    const target = await User.findOne({ uid: friendUid });
    if (!target) return next(new AppError('Người dùng không tồn tại.', 404));

    // Kiểm tra đã là bạn bè chưa
    const alreadyFriends = await Friend.findOne({ userId: fromUid, friendId: friendUid });
    if (alreadyFriends) return next(new AppError('Hai người đã là bạn bè.', 409));

    // Kiểm tra đã có request chưa
    const existing = await FriendRequest.findOne({ from: fromUid, to: friendUid, status: 'pending' });
    if (existing) return next(new AppError('Đã gửi lời mời kết bạn.', 409));

    // Kiểm tra nếu đối phương đã gửi request trước → tự accept
    const reverseRequest = await FriendRequest.findOne({ from: friendUid, to: fromUid, status: 'pending' });
    if (reverseRequest) {
      // Accept lẫn nhau
      reverseRequest.status = 'accepted';
      await reverseRequest.save();

      await Friend.create([
        { userId: fromUid, friendId: friendUid },
        { userId: friendUid, friendId: fromUid },
      ]);

      // Notify
      notifyFriendAccepted(fromUid, friendUid);

      return res.json({
        success: true,
        message: 'Đã chấp nhận lời mời kết bạn.',
        data: { accepted: true },
      });
    }

    await FriendRequest.create({ from: fromUid, to: friendUid });

    // Notify target
    try {
      const { getIO } = require('../config/socket');
      getIO().to(friendUid).emit('friend_request', { fromUid, fromName: req.user.name });
    } catch (_) {}

    return res.json({ success: true, message: 'Đã gửi lời mời kết bạn.' });
  } catch (err) { next(err); }
};

// ── POST /locket/acceptFriendRequest ─────────────────────
exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const toUid = req.user.uid;
    const { fromUid } = req.body;
    if (!fromUid) return next(new AppError('Cần cung cấp fromUid.', 400));

    const request = await FriendRequest.findOne({ from: fromUid, to: toUid, status: 'pending' });
    if (!request) return next(new AppError('Không tìm thấy lời mời kết bạn.', 404));

    request.status = 'accepted';
    await request.save();

    await Friend.create([
      { userId: toUid, friendId: fromUid },
      { userId: fromUid, friendId: toUid },
    ]);

    notifyFriendAccepted(toUid, fromUid);

    return res.json({ success: true, message: 'Đã chấp nhận lời mời kết bạn.' });
  } catch (err) { next(err); }
};

// ── POST /locket/rejectFriendRequest ─────────────────────
exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const toUid = req.user.uid;
    const { fromUid } = req.body;
    if (!fromUid) return next(new AppError('Cần cung cấp fromUid.', 400));

    await FriendRequest.findOneAndUpdate(
      { from: fromUid, to: toUid, status: 'pending' },
      { status: 'rejected' }
    );

    return res.json({ success: true, message: 'Đã từ chối lời mời kết bạn.' });
  } catch (err) { next(err); }
};

// ── POST /locket/unfriend ─────────────────────────────────
exports.unfriend = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { friendUid } = req.body;
    if (!friendUid) return next(new AppError('Cần cung cấp friendUid.', 400));

    await Friend.deleteMany({
      $or: [
        { userId: uid, friendId: friendUid },
        { userId: friendUid, friendId: uid },
      ],
    });

    return res.json({ success: true, message: 'Đã huỷ kết bạn.' });
  } catch (err) { next(err); }
};

// ── Helper notify ─────────────────────────────────────────
function notifyFriendAccepted(uid1, uid2) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    io.to(uid1).emit('friend_accepted', { friendUid: uid2 });
    io.to(uid2).emit('friend_accepted', { friendUid: uid1 });
  } catch (_) {}
}

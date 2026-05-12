const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setTokenCookie,
  setRefreshCookie,
  clearAuthCookies,
} = require('../utils/token');

// ── Đăng ký ──────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    if (!email || !password) return next(new AppError('Email và mật khẩu là bắt buộc.', 400));

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return next(new AppError('Email đã được sử dụng.', 409));

    const user = await User.create({ email, password, firstName, lastName, username });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công.',
      data: {
        ...user.toPublicJSON(),
        idToken: accessToken,
        refreshToken,
        localId: user.uid,
      },
    });
  } catch (err) { next(err); }
};

// ── Đăng nhập bằng email ─────────────────────────────────
exports.loginWithEmail = async (req, res, next) => {
  try {
    const { email, password, captchaToken } = req.body;
    if (!email || !password) return next(new AppError('Email và mật khẩu là bắt buộc.', 400));

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
    if (!user) return next(new AppError('Tài khoản với email này không tồn tại!', 404));
    if (!user.isActive) return next(new AppError('Tài khoản đã bị vô hiệu hoá.', 403));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new AppError('Mật khẩu không chính xác.', 401));

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        ...user.toPublicJSON(),
        idToken: accessToken,
        refreshToken,
        localId: user.uid,
      },
    });
  } catch (err) { next(err); }
};

// ── Đăng nhập bằng số điện thoại ─────────────────────────
exports.loginWithPhone = async (req, res, next) => {
  try {
    const { phone, password, captchaToken } = req.body;
    if (!phone || !password) return next(new AppError('Số điện thoại và mật khẩu là bắt buộc.', 400));

    const user = await User.findOne({ phone }).select('+password +refreshToken');
    if (!user) return next(new AppError('Tài khoản với số điện thoại này không tồn tại!', 404));
    if (!user.isActive) return next(new AppError('Tài khoản đã bị vô hiệu hoá.', 403));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(new AppError('Mật khẩu không chính xác.', 401));

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        ...user.toPublicJSON(),
        idToken: accessToken,
        refreshToken,
        localId: user.uid,
      },
    });
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return next(new AppError('Refresh token không tồn tại.', 401));

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return next(new AppError('Refresh token không hợp lệ hoặc đã hết hạn.', 401));
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return next(new AppError('Refresh token không hợp lệ.', 401));
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookie(res, newAccessToken);
    setRefreshCookie(res, newRefreshToken);

    return res.json({
      success: true,
      idToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) { next(err); }
};

// ── Logout ───────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }
    clearAuthCookies(res);
    return res.json({ success: true, message: 'Đã đăng xuất thành công.' });
  } catch (err) { next(err); }
};

// ── Lấy thông tin user hiện tại (Locket-compat) ──────────
exports.getInfoUser = async (req, res, next) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      data: user.toPublicJSON(),
    });
  } catch (err) { next(err); }
};

// ── Tìm user theo username/email ─────────────────────────
exports.getUserByData = async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const query = username
      ? { username: username.toLowerCase() }
      : email
      ? { email: email.toLowerCase() }
      : null;

    if (!query) return next(new AppError('Cần cung cấp username hoặc email.', 400));

    const user = await User.findOne(query);
    if (!user) return next(new AppError('Không tìm thấy người dùng.', 404));

    return res.json({
      success: true,
      data: user.toPublicJSON(),
    });
  } catch (err) { next(err); }
};

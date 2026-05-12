const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header Authorization hoặc cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new AppError('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kiểm tra user còn tồn tại
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return next(new AppError('Người dùng không còn tồn tại.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Tài khoản đã bị vô hiệu hoá.', 403));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return next(new AppError('Token không hợp lệ.', 401));
    }
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token đã hết hạn. Vui lòng đăng nhập lại.', 401));
    }
    next(err);
  }
};

// Middleware optional auth (không bắt buộc đăng nhập)
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user && user.isActive) req.user = user;
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { protect, optionalAuth };

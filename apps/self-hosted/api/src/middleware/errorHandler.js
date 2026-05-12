const AppError = require('../utils/AppError');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi máy chủ nội bộ';

  // Mongoose CastError (id không hợp lệ)
  if (err.name === 'CastError') {
    message = `Giá trị không hợp lệ cho trường ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // Mongoose Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field === 'email' ? 'Email' : field === 'username' ? 'Username' : 'Giá trị'} đã tồn tại.`;
    statusCode = 409;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors.join('. ');
    statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Token không hợp lệ.';
    statusCode = 401;
  }
  if (err.name === 'TokenExpiredError') {
    message = 'Token đã hết hạn.';
    statusCode = 401;
  }

  // Log error trong development
  if (process.env.NODE_ENV === 'development') {
    console.error('🔴 Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

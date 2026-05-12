const { Server } = require('socket.io');
const { logInfo } = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logInfo('SOCKET', `Client connected: ${socket.id}`);

    // Join room theo userId khi đăng nhập
    socket.on('join', (userId) => {
      socket.join(userId);
      logInfo('SOCKET', `User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
      logInfo('SOCKET', `Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io chưa được khởi tạo');
  return io;
};

module.exports = { initSocket, getIO };

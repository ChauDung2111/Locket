require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development',
});

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const AppError = require('./utils/AppError');
const { logInfo } = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');
const locketRoutes = require('./routes/locket.routes');
const userRoutes = require('./routes/user.routes');
const storageRoutes = require('./routes/storage.routes');
const momentRoutes = require('./routes/moment.routes');
const friendRoutes = require('./routes/friend.routes');

const app = express();
const server = http.createServer(app);

// Socket.io
initSocket(server);

// Connect MongoDB
connectDB();

// Security
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use('/api/', globalLimiter);
app.use('/locket/', globalLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', service: 'Locket Dio API', version: '2.0.0', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// API Routes
app.use('/locket', authRoutes);        // POST /locket/login, /locket/logout, /locket/refresh-token...
app.use('/locket', locketRoutes);      // POST /locket/postMomentV2, /locket/getAllFriendsV2...
app.use('/locket', friendRoutes);      // POST /locket/getAllRequestsV2, sendFriendRequestV2...
app.use('/api', userRoutes);           // GET  /api/me, /api/po
app.use('/api', storageRoutes);        // POST /api/presignedV3
app.use('/api/moments', momentRoutes); // GET  /api/moments

// 404 Handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} không tồn tại.`, 404));
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  logInfo('SERVER', `🚀 Locket Dio API running at http://localhost:${PORT}`);
  logInfo('SERVER', `🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server };

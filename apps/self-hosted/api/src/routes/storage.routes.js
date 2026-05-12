const express = require('express');
const router = express.Router();
const storageCtrl = require('../controllers/storage.controller');
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const { uploadLimiter } = require('../middleware/rateLimiter');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// POST /api/presignedV3 - Lấy thông tin để upload lên Cloudinary
router.post('/presignedV3', protect, uploadLimiter, storageCtrl.getPresigned);

// POST /api/upload - Upload trực tiếp qua backend (fallback)
router.post('/upload', protect, uploadLimiter, upload.single('file'), storageCtrl.uploadDirect);

module.exports = router;

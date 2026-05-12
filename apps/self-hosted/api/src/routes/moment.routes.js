const express = require('express');
const router = express.Router();
const momentCtrl = require('../controllers/moment.controller');
const { protect } = require('../middleware/auth.middleware');

// GET /api/moments - Lấy feed moments của bạn bè
router.get('/', protect, momentCtrl.getMoments);

module.exports = router;

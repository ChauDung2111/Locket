const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

// GET /api/me
router.get('/me', protect, userCtrl.getMe);

// GET /api/po (profile + overlay)
router.get('/po', protect, userCtrl.getProfileOverlay);

// PUT /api/profile
router.put('/profile', protect, userCtrl.updateProfile);

// PUT /api/avatar
router.put('/avatar', protect, userCtrl.updateAvatar);

// PUT /api/password
router.put('/password', protect, userCtrl.changePassword);

// GET /api/users/:uid
router.get('/users/:uid', protect, userCtrl.getUserById);

// POST /api/push/register
router.post('/push/register', protect, userCtrl.registerPushToken);

module.exports = router;

const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /locket/login
router.post('/login', authLimiter, authCtrl.loginWithEmail);

// POST /locket/loginWithPhoneV2
router.post('/loginWithPhoneV2', authLimiter, authCtrl.loginWithPhone);

// POST /locket/register
router.post('/register', authLimiter, authCtrl.register);

// POST /locket/refresh-token
router.post('/refresh-token', authCtrl.refreshToken);

// GET  /locket/logout
router.get('/logout', protect, authCtrl.logout);

// GET  /locket/getInfoUser
router.get('/getInfoUser', protect, authCtrl.getInfoUser);

// POST /locket/getUserByData
router.post('/getUserByData', protect, authCtrl.getUserByData);

module.exports = router;

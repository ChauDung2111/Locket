const express = require('express');
const router = express.Router();
const momentCtrl = require('../controllers/moment.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /locket/postMomentV2
router.post('/postMomentV2', protect, momentCtrl.postMoment);

// POST /locket/reactMoment
router.post('/reactMoment', protect, momentCtrl.reactMoment);

// DELETE /locket/moment/:id
router.delete('/moment/:id', protect, momentCtrl.deleteMoment);

module.exports = router;

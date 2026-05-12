const express = require('express');
const router = express.Router();
const friendCtrl = require('../controllers/friend.controller');
const { protect } = require('../middleware/auth.middleware');

// POST /locket/getAllFriendsV2
router.post('/getAllFriendsV2', protect, friendCtrl.getAllFriends);

// POST /locket/getAllRequestsV2
router.post('/getAllRequestsV2', protect, friendCtrl.getAllRequests);

// POST /locket/getIncomingFriendRequestsV2
router.post('/getIncomingFriendRequestsV2', protect, friendCtrl.getIncomingRequests);

// POST /locket/getOutgoingFriendRequestsV2
router.post('/getOutgoingFriendRequestsV2', protect, friendCtrl.getOutgoingRequests);

// POST /locket/sendFriendRequestV2
router.post('/sendFriendRequestV2', protect, friendCtrl.sendFriendRequest);

// POST /locket/acceptFriendRequest
router.post('/acceptFriendRequest', protect, friendCtrl.acceptFriendRequest);

// POST /locket/rejectFriendRequest
router.post('/rejectFriendRequest', protect, friendCtrl.rejectFriendRequest);

// POST /locket/unfriend
router.post('/unfriend', protect, friendCtrl.unfriend);

module.exports = router;

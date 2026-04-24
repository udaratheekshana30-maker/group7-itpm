const express = require('express');
const router = express.Router();
const roomBookingController = require('../controllers/roomBookingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/available', protect, roomBookingController.getAvailableRooms);
router.post('/book', protect, roomBookingController.bookRoom);

module.exports = router;

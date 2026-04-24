// Waitlist routes
router.post('/waitlist', protect, resourceController.joinWaitlist);
router.get('/my-waitlist', protect, resourceController.getMyWaitlist);
router.delete('/waitlist/:id', protect, resourceController.removeFromWaitlist);
const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { protect, admin } = require('../middleware/authMiddleware');

// Student routes
router.get('/availability', protect, resourceController.getAvailability);
router.post('/book', protect, resourceController.bookResource);
router.get('/my-bookings', protect, resourceController.getMyBookings);
router.delete('/cancel/:id', protect, resourceController.cancelBooking);

// Staff routes
router.get('/all', protect, admin, resourceController.getAllBookings);
router.patch('/status/:id', protect, admin, resourceController.updateStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const { 
    getAvailability, 
    bookSlot, 
    getMyBookings, 
    cancelBooking,
    updateBooking,
    markAsDone,
    confirmPayment,
    getAllBookings,
    updateStatus,
    updateConfig,
    getConfig
} = require('../controllers/laundryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/availability', protect, getAvailability);
router.get('/config', protect, getConfig);
router.post('/book', protect, bookSlot);
router.get('/my-bookings', protect, getMyBookings);
router.patch('/update/:id', protect, updateBooking);
router.patch('/done/:id', protect, markAsDone);
router.patch('/payment/:id', protect, confirmPayment);
router.delete('/cancel/:id', protect, cancelBooking);

// Admin routes
router.get('/all', protect, admin, getAllBookings);
router.patch('/status/:id', protect, admin, updateStatus);
router.patch('/config', protect, admin, updateConfig);

module.exports = router;

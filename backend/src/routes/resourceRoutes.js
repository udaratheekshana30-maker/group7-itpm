const express = require('express');
const router = express.Router();
const { 
    getAvailability, 
    bookResource, 
    getMyBookings, 
    getAllBookings, 
    updateStatus, 
    deleteBooking,
    cancelBooking,
    getResources,
    addResource,
    deleteResource
} = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public/Student routes
router.get('/list', protect, getResources);
router.get('/availability', protect, getAvailability);
router.post('/book', protect, bookResource);
router.get('/my-bookings', protect, getMyBookings);
router.delete('/cancel/:id', protect, cancelBooking);

// Admin routes (Warden and ResourceAdmin allowed)
const resourceAdmin = authorize('admin', 'warden', 'resourceadmin');

router.post('/admin/add', protect, resourceAdmin, addResource);
router.delete('/admin/resource/:id', protect, resourceAdmin, deleteResource);
router.get('/admin/all', protect, resourceAdmin, getAllBookings);
router.patch('/admin/status/:id', protect, resourceAdmin, updateStatus);
router.delete('/admin/delete/:id', protect, resourceAdmin, deleteBooking);

module.exports = router;
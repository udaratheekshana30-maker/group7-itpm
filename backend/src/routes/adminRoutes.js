const express = require('express');
const { listStaffUsers, createStaffUser, deleteStaffUser, updateStaffUserStatus } = require('../controllers/adminController.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Staff management (Admin only)
router.get('/users', protect, authorize('admin'), listStaffUsers);
router.post('/users', protect, authorize('admin'), createStaffUser);
router.delete('/users/:id', protect, authorize('admin'), deleteStaffUser);
router.patch('/users/:id/status', protect, authorize('admin'), updateStaffUserStatus);

module.exports = router;

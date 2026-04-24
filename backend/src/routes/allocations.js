const express = require('express');
const router = express.Router();
const allocationController = require('../controllers/allocationController');
const { protect } = require('../middleware/authMiddleware');

// GET all allocations with filters
router.get('/', allocationController.getAllocations);

// GET current student's allocation
router.get('/me', protect, allocationController.getMyAllocation);

// GET unique degrees
router.get('/degrees', allocationController.getUniqueDegrees);

// POST allocate a bed to a student
router.post('/', allocationController.createAllocation);

// GET smart room suggestions
router.get('/suggest', allocationController.getSuggestions);

// GET export allocations as CSV or PDF
router.get('/export', allocationController.exportAllocations);

// GET dashboard stats
router.get('/stats', allocationController.getStats);

// PUT update an allocation
router.put('/:id', allocationController.updateAllocation);

// DELETE an allocation
router.delete('/:id', allocationController.deleteAllocation);

module.exports = router;

const express = require('express');
const { purgeStudentRecord, getLeftStudents, exportLeftStudents } = require('../controllers/leaveStudentController.js');
const { protect, authorize } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Student Purge (Admin and Warden)
router.delete('/purge-student/:id', protect, authorize('admin', 'warden'), purgeStudentRecord);

// Left Students History (Admin and Warden)
router.get('/left-students', protect, authorize('admin', 'warden'), getLeftStudents);
router.get('/left-students/export', protect, authorize('admin', 'warden'), exportLeftStudents);

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { protect } = require('../middleware/authMiddleware.js');
const {
  createComplaint,
  getMyComplaints,
  getComplaints,
  getComplaintById,
  addMessage,
  updateStatus,
  sendToDean,
  deleteComplaint,
  getUnreadCounts,
  submitFeedback
} = require('../controllers/complaintController.js');

const router = express.Router();

router.get('/unread-counts', (req, res, next) => {
  // Try to use protect middleware if Authorization header is present
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
}, getUnreadCounts);

const { upload } = require('../config/cloudinary.js');

// ── Student routes (require student JWT) ────────────────────────────
router.post('/', protect, upload.single('image'), createComplaint);
router.get('/mine', protect, getMyComplaints);
router.post('/:id/message-student', protect, upload.single('file'), addMessage);   // student sends message
router.patch('/:id/feedback', protect, submitFeedback);                           // student submits feedback
router.delete('/:id', protect, deleteComplaint);                                  // student deletes their own complaint

// ── Warden/Public routes ────────────────────────────────────────────
router.get('/', getComplaints);                   // list all complaints (warden/public)
router.get('/:id', (req, res, next) => {
  if (req.headers.authorization) return protect(req, res, next);
  next();
}, getComplaintById);                             // view single complaint (shared)
router.post('/:id/message', upload.single('file'), wardenAddMessage);    // warden sends message
router.patch('/:id/status', updateStatus);        // update status
router.post('/to-dean', sendToDean);              // escalate to dean
router.delete('/:id/warden', (req, res, next) => {
  req.user = { _id: 'warden', role: 'warden' };
  deleteComplaint(req, res, next);
});                                               // warden deletes complaint

// ── Inline warden message handler (no auth, sets senderRole='warden') ─
function wardenAddMessage(req, res, next) {
  // Inject a synthetic warden user so the controller works
  req.user = { _id: 'warden', role: 'warden', name: 'Warden' };
  addMessage(req, res, next);
}

module.exports = router;
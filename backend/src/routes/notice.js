const express = require('express');
const { protect } = require('../middleware/authMiddleware.js');
const { upload } = require('../config/cloudinary.js');
const {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
} = require('../controllers/noticeController.js');

const router = express.Router();

// GET notices is public
router.get('/', getNotices);

// Protected routes (warden only) — accept up to 5 files
router.post('/', protect, upload.array('attachments', 5), createNotice);
router.put('/:id', protect, upload.array('attachments', 5), updateNotice);
router.delete('/:id', protect, deleteNotice);

module.exports = router;
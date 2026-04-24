const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  // Legacy single attachment (kept for backward compatibility)
  attachmentUrl: { type: String },
  attachmentPublicId: { type: String },
  attachmentType: { type: String, enum: ['image', 'document', 'none'], default: 'none' },
  // Multiple attachments (new)
  attachments: [{
    url: { type: String, required: true },
    publicId: { type: String },
    type: { type: String, enum: ['image', 'document'], default: 'image' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('Notice', noticeSchema);
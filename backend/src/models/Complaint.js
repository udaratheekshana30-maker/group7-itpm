const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: null
  },
  imagePublicId: {
    type: String,
    default: null
  },
  category: {
    type: String,
    default: 'Other'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved'],
    default: 'open'
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    fileUrl: {
      type: String,
      default: null
    },
    filePublicId: {
      type: String,
      default: null
    },
    fileType: {
      type: String,
      enum: ['image', 'document', null],
      default: null
    },
    senderRole: {
      type: String,
      enum: ['student', 'warden'],
      default: 'student'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  studentUnreadCount: {
    type: Number,
    default: 0
  },
  wardenUnreadCount: {
    type: Number,
    default: 0
  },
  studentFeedback: {
    type: String,
    enum: ['great', 'not-resolved'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;
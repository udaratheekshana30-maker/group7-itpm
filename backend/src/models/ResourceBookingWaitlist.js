const mongoose = require('mongoose');

const resourceBookingWaitlistSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: String,
    studentId: String,
    resourceName: {
        type: String,
        enum: ['Gym', 'Study Area', 'Music Room', 'TV Lounge'],
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    slot: {
        type: String, // e.g., "08:00 - 09:00"
        required: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate waitlist entries for the same student/resource/slot/date
resourceBookingWaitlistSchema.index({ student: 1, resourceName: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('ResourceBookingWaitlist', resourceBookingWaitlistSchema);

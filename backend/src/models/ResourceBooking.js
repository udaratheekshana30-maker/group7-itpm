const mongoose = require('mongoose');

const resourceBookingSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    qrCode: {
        type: String, // Innovative: QR code for automated entry
        default: null
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// We allow multiple bookings per slot up to capacity, so no unique index on slot alone.
// However, a student shouldn't book the same resource twice for the same slot.
resourceBookingSchema.index({ student: 1, resourceName: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('ResourceBooking', resourceBookingSchema);

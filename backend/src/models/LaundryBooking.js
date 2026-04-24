const mongoose = require('mongoose');

const laundryBookingSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: String,
    studentId: String,
    machineId: {
        type: Number,
        required: true
    },
    machineType: {
        type: String,
        enum: ['Washing Machine', 'Dryer'],
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    slot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['booked', 'in-progress', 'completed', 'cancelled'],
        default: 'booked'
    },
    price: {
        type: Number,
        default: 250
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    phoneNumber: String,
    department: String,
    studentYear: String,
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique booking per machine per slot per date
laundryBookingSchema.index({ machineId: 1, machineType: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('LaundryBooking', laundryBookingSchema);

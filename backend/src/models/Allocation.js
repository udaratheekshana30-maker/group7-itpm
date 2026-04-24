const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentPayment', default: null },
    studentRollNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentDegree: { type: String, required: true },
    studentYear: { type: Number },
    studentWing: { type: String, required: true },

    // Room details helpers
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    floorNumber: { type: Number, required: true },
    roomnumber: { type: Number, required: true },
    roomType: { type: String, required: true },
    bedId: { type: String, required: true },
    wing: { type: String, required: true },

    paymentStatus: { type: String },
    allocatedAt: { type: Date, default: Date.now },
    allocatedBy: { type: String, default: 'warden' }
}, {
    collection: 'allocations',
    timestamps: false,
    versionKey: false
});

module.exports = mongoose.model('Allocation', allocationSchema);

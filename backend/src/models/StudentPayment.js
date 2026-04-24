const mongoose = require('mongoose');

const studentPaymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentName: { type: String, required: true },
    email: { type: String, required: true },
    rollNumber: { type: String, required: true, unique: true },
    wing: { type: String, enum: ['male', 'female'], required: true },
    roomType: { type: String, enum: ['single', 'double', 'triple'], required: true },

    refundPayment: {
        amount: { type: Number },
        documentUrl: { type: String },
        documentPublicId: { type: String },
        submittedDate: { type: Date },
        paymentType: { type: String },
        refundable: { type: Boolean, default: true },
        paymentStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        }
    },

    submittedMonths: [{
        month: String, // Individual month name (legacy or primary)
        months: [String], // Array of month names
        monthCount: Number,
        year: Number,
        amount: Number,
        documentUrl: String,
        documentPublicId: String,
        submittedDate: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Rejected'],
            default: 'Pending'
        }
    }],

    submissionStatus: {
        type: String,
        enum: ['Pending', 'Refundable Completed', 'Monthly In Progress', 'Completed'],
        default: 'Pending'
    },
    submittedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    refund_status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true, collection: 'student_payments' });

module.exports = mongoose.model('StudentPayment', studentPaymentSchema);

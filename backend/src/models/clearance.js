const mongoose = require('mongoose');

const clearanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, required: true },
    studentPhone: { type: String },
    studentRollNumber: { type: String, required: true },
    wing: { type: String, required: true },
    floorNumber: { type: Number, required: true },
    roomType: { type: String, required: true },
    roomNumber: { type: Number, required: true },
    bedId: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Approved', 'Rejected'], default: 'Pending' },
    submittedAt: { type: Date, default: Date.now },

    // Warden specific fields
    monthlyAdjustments: [{
        month: { type: String },
        amount: { type: Number, default: 0 }
    }],
    additionalCharges: [{
        amount: { type: Number, default: 0 },
        note: { type: String }
    }],
    keyStatus: { type: String, enum: ['Returned', 'Not Returned'], default: 'Not Returned' },
    wardenNotes: { type: String },
    isWardenSubmitted: { type: Boolean, default: false },

    // Bank Details (Submitted by Student)
    bankDetails: {
        accountHolderName: { type: String },
        bankName: { type: String },
        branchName: { type: String },
        accountNumber: { type: String }
    }
}, {
    collection: 'clearance',
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('Clearance', clearanceSchema);

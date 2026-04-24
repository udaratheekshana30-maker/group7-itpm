const mongoose = require('mongoose');

const floorSchema = new mongoose.Schema({
    floorID: { type: String, required: true, unique: true },
    wing: { type: String, enum: ['male', 'female'], required: true, immutable: true },
    floorNumber: { type: Number, required: true, immutable: true },
    isactive: { type: Boolean, default: true },
    disableReason: { type: String, default: null }
}, {
    collection: 'floors',
    timestamps: false,
    versionKey: false
});

// Unique constraint: one floor number per wing
floorSchema.index({ wing: 1, floorNumber: 1 }, { unique: true });

module.exports = mongoose.model('Floor', floorSchema);

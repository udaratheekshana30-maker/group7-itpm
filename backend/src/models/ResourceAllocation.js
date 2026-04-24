const mongoose = require('mongoose');

const resourceAllocationSchema = new mongoose.Schema({
    resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['ACTIVE', 'RETURNED'],
        default: 'ACTIVE'
    },
    allocatedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date }
}, {
    collection: 'resource_allocations',
    timestamps: true
});

module.exports = mongoose.model('ResourceAllocation', resourceAllocationSchema);

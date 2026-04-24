const mongoose = require('mongoose');

const laundryConfigSchema = new mongoose.Schema({
    washerCount: {
        type: Number,
        default: 4
    },
    dryerCount: {
        type: Number,
        default: 2
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LaundryConfig', laundryConfigSchema);

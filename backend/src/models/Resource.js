const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
    roomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    roomRef: String,
    floorNumber: Number,
    category: {
        type: String,
        default: 'ROOM_GOOD'
    },
    items: [{
        bedId: String,
        itemType: String,
        uniqueCode: String,
        status: {
            type: String,
            default: 'AVAILABLE'
        }
    }],
    name: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Resource', ResourceSchema);

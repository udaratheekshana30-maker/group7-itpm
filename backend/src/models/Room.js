const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
    bedId: { type: String, enum: ['A', 'B'], required: true },
    isOccupied: { type: Boolean, default: false },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentPayment', default: null }
});

const roomSchema = new mongoose.Schema({
    Roomid: { type: String, required: true, unique: true },
    floorid: { type: String, required: true },
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
    floorNumber: { type: Number, required: true },
    wing: { type: String, enum: ['male', 'female'], required: true },
    roomnumber: { type: Number, required: true },
    type: { type: String, enum: ['single', 'double'], required: true },
    isactive: { type: Boolean, default: true },
    beds: [bedSchema]
}, {
    collection: 'rooms',
    timestamps: false,
    versionKey: false
});

module.exports = mongoose.model('Room', roomSchema);

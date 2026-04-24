const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String, 
        default: 'HiOutlineBolt'
    },
    capacity: {
        type: Number,
        default: 10
    },
    location: {
        type: String,
        required: true
    },
    operationalHours: {
        type: String,
        default: '06:00 - 22:00'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Facility', FacilitySchema);

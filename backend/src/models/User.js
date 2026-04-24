const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'warden', 'financial', 'security', 'admin'],
        default: 'student'
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true
    },
    profilePicture: {
        type: String,
        default: null
    },
    profilePicturePublicId: {
        type: String,
        default: null
    },
    accountStatus: {
        type: String,
        enum: ['pending', 'verified', 'reject'],
        default: 'pending'
    },
    phoneNumber: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Hash password before saving (Mongoose v9: async pre-save, no next() needed)
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Compare password helper
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;

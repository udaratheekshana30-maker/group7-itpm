const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function checkAuth() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'student@my.dorm.lk' });
    if (!user) {
        console.log("User not found");
    } else {
        console.log("User found:", user.email);
        const isMatch = await user.matchPassword('Student@123');
        console.log("Password 'Student@123' matches:", isMatch);
        const isMatch2 = await user.matchPassword('STUDENT@123');
        console.log("Password 'STUDENT@123' matches:", isMatch2);
    }
    
    mongoose.disconnect();
}

checkAuth();

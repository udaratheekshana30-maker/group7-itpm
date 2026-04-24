const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function checkPasswords() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const admin = await User.findOne({ email: 'admin@dorm.lk' });
    console.log("admin@dorm.lk - Admin@123:", admin ? await admin.matchPassword('Admin@123') : 'Not found');

    const laundry = await User.findOne({ email: 'laundryadmin@dormdesk.lk' });
    console.log("laundryadmin@dormdesk.lk - Admin@123:", laundry ? await laundry.matchPassword('Admin@123') : 'Not found');

    mongoose.disconnect();
}

checkPasswords();

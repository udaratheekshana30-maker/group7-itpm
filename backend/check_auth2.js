const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function checkAuth() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ email: /student@my\.dorm\.lk/i });
    console.log("Users found:", users.map(u => `'${u.email}'`));
    
    mongoose.disconnect();
}

checkAuth();

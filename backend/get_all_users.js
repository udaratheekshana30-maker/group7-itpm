const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

async function checkUsers() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'email role name accountStatus');
    console.log(JSON.stringify(users, null, 2));
    mongoose.disconnect();
}

checkUsers();

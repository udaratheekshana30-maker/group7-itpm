const mongoose = require('mongoose');
const dotenv = require('dotenv');
const StudentPayment = require('./src/models/StudentPayment');
const User = require('./src/models/User');

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'student@my.dorm.lk' });
    const payment = await StudentPayment.findOne({ student: user._id });
    console.log("Payment record:", payment ? payment : 'None');
    mongoose.disconnect();
}
check();

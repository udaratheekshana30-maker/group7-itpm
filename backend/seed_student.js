const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const studentEmail = 'student@my.dorm.lk';
        const existingStudent = await User.findOne({ email: studentEmail });
        
        if (!existingStudent) {
            await User.create({
                name: 'Demo Student',
                email: studentEmail,
                password: 'Student@123',
                role: 'student',
                studentId: 'IT21000000',
                phoneNumber: '0710000000',
                accountStatus: 'verified'
            });
            console.log(`Default student created: ${studentEmail}`);
        } else {
            console.log(`Default student already exists: ${studentEmail}`);
        }

        mongoose.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedUsers();

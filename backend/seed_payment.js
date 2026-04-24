const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const StudentPayment = require('./src/models/StudentPayment');
const Application = require('./src/models/Application');

dotenv.config();

async function seedPayment() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const student = await User.findOne({ email: 'student@my.dorm.lk' });
    if (!student) {
        console.log("Student not found");
        process.exit(1);
    }

    let payment = await StudentPayment.findOne({ student: student._id });
    if (!payment) {
        payment = new StudentPayment({
            student: student._id,
            studentName: student.name,
            email: student.email,
            rollNumber: student.studentId,
            wing: 'male',
            paymentDate: new Date(),
            amount: 20000,
            transactionId: 'TXN123456789',
            paymentStatus: 'success',
            refund_status: 'Approved'
        });
        await payment.save();
        console.log("Payment seeded");
    } else {
        payment.refund_status = 'Approved';
        await payment.save();
        console.log("Payment updated");
    }

    let app = await Application.findOne({ studentRollNumber: student.studentId });
    if (!app) {
        app = new Application({
            studentRollNumber: student.studentId,
            studentDegree: 'Software Engineering',
            studentYear: 2,
            applicationStatus: 'approved'
        });
        await app.save();
        console.log("Application seeded");
    }

    mongoose.disconnect();
}

seedPayment();

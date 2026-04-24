const StudentPayment = require('../models/StudentPayment');
const Application = require('../models/Application');

// GET initial data for student (pre-fill form)
exports.getStudentInitialData = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const application = await Application.findOne({ student: userId });

        if (!application) {
            return res.status(404).json({ success: false, msg: 'No approved application found for this student.' });
        }

        const initialData = {
            studentName: application.studentName,
            email: application.studentEmail,
            rollNumber: application.studentRollNumber,
            wing: application.studentWing,
            roomType: application.roomType,
            joinedAt: application.createdAt
        };

        res.json({ success: true, data: initialData });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// GET current student's payment status
exports.getStudentPaymentStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const paymentRecord = await StudentPayment.findOne({ student: userId });

        if (!paymentRecord) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: paymentRecord });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// POST submit refundable payment
exports.submitRefundablePayment = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { amount, paymentType, studentName, email, rollNumber, wing, roomType } = req.body;

        // Check if record already exists
        let paymentRecord = await StudentPayment.findOne({ student: userId });
        
        // MANDATORY: Check if student has a submitted application first
        const application = await Application.findOne({ student: userId });
        if (!application) {
            return res.status(403).json({ success: false, msg: 'Please submit your hostel application before making a payment.' });
        }
        
        // Check if current submission is rejected - allow re-submission in that case
        const isRejected = paymentRecord && (paymentRecord.refund_status === 'Rejected' || (paymentRecord.refundPayment && paymentRecord.refundPayment.paymentStatus === 'Rejected'));

        if (paymentRecord && paymentRecord.refundPayment && paymentRecord.refundPayment.documentUrl && !isRejected) {
            return res.status(400).json({ success: false, msg: 'Refundable payment has already been submitted.' });
        }

        const documentUrl = req.file ? req.file.path : (paymentRecord ? paymentRecord.refundPayment.documentUrl : null);
        if (!documentUrl) {
            return res.status(400).json({ success: false, msg: 'Payment proof document is required.' });
        }

        const refundData = {
            amount,
            documentUrl: req.file ? req.file.path : (paymentRecord ? paymentRecord.refundPayment.documentUrl : null),
            documentPublicId: req.file ? req.file.filename : (paymentRecord ? paymentRecord.refundPayment.documentPublicId : null),
            submittedDate: new Date(),
            paymentType,
            refundable: true,
            paymentStatus: 'Pending'
        };

        if (paymentRecord) {
            paymentRecord.refundPayment = refundData;
            paymentRecord.refund_status = 'Pending'; // Reset status to Pending for re-evaluation
            paymentRecord.submissionStatus = 'Refundable Completed';
        } else {
            paymentRecord = new StudentPayment({
                student: userId,
                studentName,
                email,
                rollNumber,
                wing,
                roomType,
                refundPayment: refundData,
                submissionStatus: 'Refundable Completed',
                refund_status: 'Pending'
            });
        }

        await paymentRecord.save();
        res.status(201).json({ success: true, data: paymentRecord });
    } catch (err) {
        res.status(500).json({ success: false, msg: err.message });
    }
};

// POST submit monthly payment
exports.submitMonthlyPayment = async (req, res) => {
    try {
        const { year, amount, months, monthCount } = req.body;

        let payment = await StudentPayment.findOne({ student: req.user.id || req.user._id });

        if (!payment) {
            return res.status(404).json({ success: false, msg: 'Payment record not found' });
        }

        if (!req.file || !req.file.path) {
            return res.status(400).json({ success: false, msg: 'Payment proof document is required.' });
        }

        const newSubmission = {
            months: JSON.parse(months),
            monthCount: parseInt(monthCount),
            year,
            amount,
            documentUrl: req.file.path,
            documentPublicId: req.file.filename,
            status: 'Pending',
            submittedDate: new Date()
        };

        if (newSubmission.months && newSubmission.months.length > 0) {
            newSubmission.month = newSubmission.months.join(', ');
        }

        payment.submittedMonths.push(newSubmission);
        payment.updatedAt = Date.now();
        await payment.save();

        res.status(200).json({ success: true, data: payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

// PUT update a rejected monthly payment
exports.updateMonthlyPayment = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { amount } = req.body;
        const userId = req.user.id || req.user._id;

        const payment = await StudentPayment.findOne({ student: userId });
        if (!payment) {
            return res.status(404).json({ success: false, msg: 'Payment record not found' });
        }

        const submission = payment.submittedMonths.id(submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, msg: 'Submission not found' });
        }

        if (submission.status !== 'Rejected') {
            return res.status(400).json({ success: false, msg: 'Only rejected submissions can be edited.' });
        }

        // Update fields
        submission.amount = amount;
        if (req.file) {
            submission.documentUrl = req.file.path;
            submission.documentPublicId = req.file.filename;
        }
        submission.status = 'Pending';
        submission.submittedDate = new Date();

        payment.updatedAt = Date.now();
        await payment.save();

        res.status(200).json({ success: true, data: payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

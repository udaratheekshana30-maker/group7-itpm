const StudentPayment = require('../models/StudentPayment');
const Application = require('../models/Application');
const Allocation = require('../models/Allocation');

// GET all payments (now from student_payments collection)
exports.getAllPayments = async (req, res) => {
    try {
        // Fetch all student payments
        const payments = await StudentPayment.find().sort({ rollNumber: 1 });

        // Fetch allocations to check allocation status
        const allocations = await Allocation.find({}, 'studentRollNumber');
        const allocatedRolls = new Set(allocations.map(a => a.studentRollNumber));

        // Fetch applications to get degree, year, and contact number
        const applications = await Application.find({}, 'studentRollNumber studentDegree studentYear contactNumber');
        const appMap = new Map(applications.map(app => [app.studentRollNumber, app]));

        const students = payments.map(p => {
            const app = appMap.get(p.rollNumber);

            // Map StudentPayment status to frontend expected status
            let paymentStatus = 'pending';
            const status = p.refund_status || (p.refundPayment && p.refundPayment.paymentStatus);

            if (status === 'Accepted' || status === 'Approved') {
                paymentStatus = 'success';
            } else if (status === 'Rejected') {
                paymentStatus = 'rejected';
            }

            return {
                _id: p._id,
                name: p.studentName,
                email: p.email,
                rollNumber: p.rollNumber,
                degree: app ? app.studentDegree : 'N/A',
                contactNumber: app ? app.contactNumber : 'N/A',
                wing: p.wing,
                paymentStatus: paymentStatus,
                applicationDate: p.createdAt || p._id.getTimestamp(),
                isAllocated: allocatedRolls.has(p.rollNumber)
            };
        });

        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET single payment record by roll number
exports.getPaymentByRoll = async (req, res) => {
    try {
        const payment = await StudentPayment.findOne({ rollNumber: req.params.rollNumber });
        if (!payment) return res.status(404).json({ error: 'Payment record not found' });
        res.json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// GET all monthly submissions for Warden
exports.getMonthlySubmissions = async (req, res) => {
    try {
        const query = { 'submittedMonths.0': { $exists: true } };
        
        // Basic search filtering (finding matching students first)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { studentName: searchRegex },
                { email: searchRegex },
                { rollNumber: searchRegex }
            ];
        }

        const payments = await StudentPayment.find(query).sort({ updatedAt: -1 });

        const Application = require('../models/Application');
        
        const populatedSubmissions = await Promise.all(payments.map(async (p) => {
            const application = await Application.findOne({ student: p.student }).select('createdAt').lean();
            return p.submittedMonths.map(sub => ({
                studentId: p._id,
                studentName: p.studentName,
                email: p.email,
                rollNumber: p.rollNumber,
                wing: p.wing,
                submissionId: sub._id,
                months: sub.months,
                monthCount: sub.monthCount,
                year: sub.year,
                amount: sub.amount,
                documentUrl: sub.documentUrl,
                status: sub.status,
                submittedDate: sub.submittedDate,
                joinedAt: application?.createdAt || null
            }));
        }));

        let submissions = populatedSubmissions.flat();

        // Secondary filtering for status if needed
        if (req.query.status && req.query.status !== 'all') {
            submissions = submissions.filter(s => s.status.toLowerCase() === req.query.status.toLowerCase());
        }

        // Sort by date descending
        submissions.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Export monthly submissions as CSV or PDF
exports.exportMonthlySubmissions = async (req, res) => {
    try {
        const query = { 'submittedMonths.0': { $exists: true } };
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { studentName: searchRegex },
                { email: searchRegex },
                { rollNumber: searchRegex }
            ];
        }
        const payments = await StudentPayment.find(query).sort({ updatedAt: -1 });
        
        const populatedSubmissions = payments.flatMap(p => p.submittedMonths.map(sub => ({
            studentName: p.studentName,
            rollNumber: p.rollNumber,
            email: p.email,
            wing: p.wing,
            months: sub.months?.join(', '),
            amount: sub.amount,
            status: sub.status,
            submittedDate: sub.submittedDate
        })));

        let filteredSubmissions = populatedSubmissions;
        if (req.query.status && req.query.status !== 'all') {
            filteredSubmissions = populatedSubmissions.filter(s => s.status.toLowerCase() === req.query.status.toLowerCase());
        }

        const format = req.query.format || 'csv';

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Student Name', value: 'studentName' },
                { label: 'Roll Number', value: 'rollNumber' },
                { label: 'Email', value: 'email' },
                { label: 'Months', value: 'months' },
                { label: 'Amount', value: 'amount' },
                { label: 'Status', value: 'status' },
                { label: 'Submitted At', value: row => new Date(row.submittedDate).toLocaleDateString() }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(filteredSubmissions);
            res.header('Content-Type', 'text/csv');
            res.attachment('monthly_payments.csv');
            return res.send(csv);
        }

        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
            res.header('Content-Type', 'application/pdf');
            res.attachment('monthly_payments.pdf');
            doc.pipe(res);

            doc.fontSize(18).text('Monthly Payment Submissions', { align: 'center' });
            doc.moveDown();

            const headers = ['Name', 'ID', 'Months', 'Amount', 'Status', 'Date'];
            const colWidths = [150, 80, 150, 80, 80, 80];
            let y = doc.y;
            let x = 40;

            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((h, i) => {
                doc.text(h, x, y, { width: colWidths[i] });
                x += colWidths[i] + 10;
            });

            doc.font('Helvetica').fontSize(9);
            y += 20;

            filteredSubmissions.forEach((s) => {
                if (y > 550) {
                    doc.addPage();
                    y = 40;
                }
                x = 40;
                const vals = [
                    s.studentName,
                    s.rollNumber,
                    s.months,
                    `LKR ${s.amount?.toLocaleString()}`,
                    s.status,
                    new Date(s.submittedDate).toLocaleDateString()
                ];
                vals.forEach((v, i) => {
                    doc.text(String(v || '-'), x, y, { width: colWidths[i] });
                    x += colWidths[i] + 10;
                });
                y += 18;
            });

            doc.end();
            return;
        }

        res.status(400).json({ error: 'Invalid format' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH update monthly submission status
exports.updateMonthlyStatus = async (req, res) => {
    try {
        const { studentId, submissionId } = req.params;
        const { status } = req.body;

        if (!['Accepted', 'Rejected', 'Pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const payment = await StudentPayment.findById(studentId);
        if (!payment) return res.status(404).json({ error: 'Student record not found' });

        const submission = payment.submittedMonths.id(submissionId);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        submission.status = status;
        payment.updatedAt = Date.now();
        await payment.save();

        res.json({ success: true, msg: `Submission marked as ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

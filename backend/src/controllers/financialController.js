const StudentPayment = require('../models/StudentPayment');
const Allocation = require('../models/Allocation');
const Room = require('../models/Room');
const Application = require('../models/Application');
const User = require('../models/User');
const Clearance = require('../models/clearance');

// @desc    Get all refundable payments for financial manager
// @route   GET /api/financial/refundable
exports.getRefundablePayments = async (req, res) => {
    try {
        // Find all student payment records where refundPayment exists
        const payments = await StudentPayment.find({
            'refundPayment.documentUrl': { $exists: true, $ne: null }
        }).sort({ updatedAt: -1 });

        res.status(200).json({ success: true, data: payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

// @desc    Update refundable payment status
// @route   PUT /api/financial/refundable/:id/status
exports.updateRefundStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Accepted', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, msg: 'Invalid status' });
        }

        const payment = await StudentPayment.findById(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, msg: 'Payment record not found' });
        }

        payment.refund_status = status;
        payment.refundPayment.paymentStatus = status === 'Accepted' ? 'Approved' : status; // Syncing both for legacy/compatibility
        payment.updatedAt = Date.now();

        await payment.save();

        // New logic to clear allocation on successful refund
        if (status === 'Accepted') {
            try {
                // 1. Clear Allocation and update Room bed status
                const allocation = await Allocation.findOne({ student: payment._id });
                if (allocation) {
                    const room = await Room.findById(allocation.room);
                    if (room) {
                        // Mark the specific bed as unoccupied
                        room.beds = room.beds.map(bed => {
                            if (bed.bedId === allocation.bedId) {
                                return { ...bed, isOccupied: false, student: null };
                            }
                            return bed;
                        });
                        await room.save();
                        console.log(`Released bed ${allocation.bedId} in room ${room.roomnumber} for student ${payment.studentName}`);
                    }
                    // Remove the allocation document
                    await Allocation.findByIdAndDelete(allocation._id);
                    console.log(`Deleted allocation for student ${payment.studentName}`);
                }

                // 2. Update Application status to Deactivated
                const application = await Application.findOne({ student: payment.student });
                if (application) {
                    application.applicationStatus = 'Deactivated';
                    application.assignedRoom = '';
                    await application.save();
                    console.log(`Deactivated application for student ${payment.studentName}`);
                }

                // 3. Suspend User account
                await User.findByIdAndUpdate(payment.student, { accountStatus: 'suspended' });
                console.log(`Suspended user account for student ${payment.studentName}`);
            } catch (clearErr) {
                console.error('Error during automatic room clearance:', clearErr);
                // We don't return error here because the payment was already saved successfully
            }
        }

        res.status(200).json({ success: true, data: payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};

// @desc    Get all payment records (Refundable + Monthly)
// @route   GET /api/financial/records
exports.getAllPaymentRecords = async (req, res) => {
    try {
        const payments = await StudentPayment.find().sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: payments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Server error' });
    }
};
// @desc    Export refundable payments as CSV or PDF
// @route   GET /api/financial/export/refundable
exports.exportRefundablePayments = async (req, res) => {
    try {
        const query = { 'refundPayment.documentUrl': { $exists: true, $ne: null } };
        if (req.query.search) {
            const sr = new RegExp(req.query.search, 'i');
            query.$or = [
                { studentName: sr },
                { email: sr },
                { rollNumber: sr }
            ];
        }

        const data = await StudentPayment.find(query).sort({ updatedAt: -1 }).lean();
        const format = req.query.format || 'csv';

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Student Name', value: 'studentName' },
                { label: 'Email', value: 'email' },
                { label: 'ID/Roll Number', value: 'rollNumber' },
                { label: 'Amount (LKR)', value: 'refundPayment.amount' },
                { label: 'Status', value: 'refund_status' },
                { label: 'Submitted Date', value: row => new Date(row.refundPayment.submittedDate).toLocaleDateString() }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment('refundable_payments.csv');
            return res.send(csv);
        }

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.header('Content-Type', 'application/pdf');
        res.attachment('refundable_payments.pdf');
        doc.pipe(res);
        doc.fontSize(18).text('Refundable Payment Submissions', { align: 'center' });
        doc.moveDown();
        const headers = ['Student', 'ID', 'Amount', 'Status', 'Date'];
        const colWidths = [150, 80, 100, 80, 80];
        let y = doc.y; let x = 40;
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
        doc.font('Helvetica').fontSize(9); y += 20;
        data.forEach(p => {
            if (y > 750) { doc.addPage(); y = 40; }
            x = 40;
            const vals = [p.studentName, p.rollNumber, `LKR ${p.refundPayment?.amount}`, p.refund_status, new Date(p.refundPayment?.submittedDate).toLocaleDateString()];
            vals.forEach((v, i) => { doc.text(String(v || '-'), x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
            y += 18;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Export refund transfers as CSV or PDF
// @route   GET /api/financial/export/transfers
exports.exportRefundTransfers = async (req, res) => {
    try {
        const query = { status: 'Approved' };
        if (req.query.search) {
            const sr = new RegExp(req.query.search, 'i');
            query.$or = [
                { studentName: sr },
                { studentRollNumber: sr },
                { studentEmail: sr }
            ];
        }

        const data = await Clearance.find(query).lean();
        const format = req.query.format || 'csv';

        const calculateRefund = (c) => {
            const initial = c.paymentHistory?.refundPayment?.amount || 0;
            const adjustments = (c.monthlyAdjustments || []).reduce((sum, a) => sum + (a.amount || 0), 0);
            const charges = (c.additionalCharges || []).reduce((sum, ch) => sum + (ch.amount || 0), 0);
            return initial - adjustments - charges;
        };

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Student Name', value: 'studentName' },
                { label: 'Roll Number', value: 'studentRollNumber' },
                { label: 'Bank Name', value: 'bankDetails.bankName' },
                { label: 'Account Number', value: 'bankDetails.accountNumber' },
                { label: 'Net Refund (LKR)', value: row => calculateRefund(row) }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment('refund_transfers.csv');
            return res.send(csv);
        }

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        res.header('Content-Type', 'application/pdf');
        res.attachment('refund_transfers.pdf');
        doc.pipe(res);
        doc.fontSize(18).text('Approved Refund Transfers', { align: 'center' });
        doc.moveDown();
        const headers = ['Student', 'Bank Details', 'Account Number', 'Net Refund'];
        const colWidths = [150, 200, 150, 100];
        let y = doc.y; let x = 40;
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
        doc.font('Helvetica').fontSize(9); y += 20;
        data.forEach(c => {
            if (y > 500) { doc.addPage(); y = 40; }
            x = 40;
            const bank = `${c.bankDetails?.bankName}\n${c.bankDetails?.branchName}`;
            const vals = [c.studentName, bank, c.bankDetails?.accountNumber, `LKR ${calculateRefund(c)}`];
            vals.forEach((v, i) => { doc.text(String(v || '-'), x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
            y += 30;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Export all payment records as CSV or PDF
// @route   GET /api/financial/export/records
exports.exportFinancialRecords = async (req, res) => {
    try {
        const query = {};
        if (req.query.search) {
            const sr = new RegExp(req.query.search, 'i');
            query.$or = [
                { studentName: sr },
                { email: sr },
                { rollNumber: sr }
            ];
        }

        const data = await StudentPayment.find(query).sort({ updatedAt: -1 }).lean();
        const format = req.query.format || 'csv';

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Student Name', value: 'studentName' },
                { label: 'Roll Number', value: 'rollNumber' },
                { label: 'Deposit (LKR)', value: 'refundPayment.amount' },
                { label: 'Status', value: 'refund_status' },
                { label: 'Last Updated', value: row => new Date(row.updatedAt).toLocaleDateString() }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment('financial_records.csv');
            return res.send(csv);
        }

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.header('Content-Type', 'application/pdf');
        res.attachment('financial_records.pdf');
        doc.pipe(res);
        doc.fontSize(18).text('Financial Audit: Refundable Records', { align: 'center' });
        doc.moveDown();
        const headers = ['Student', 'ID', 'Deposit', 'Status', 'Date'];
        const colWidths = [150, 80, 100, 80, 80];
        let y = doc.y; let x = 40;
        doc.fontSize(10).font('Helvetica-Bold');
        headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
        doc.font('Helvetica').fontSize(9); y += 20;
        data.forEach(p => {
            if (y > 750) { doc.addPage(); y = 40; }
            x = 40;
            const vals = [p.studentName, p.rollNumber, `LKR ${p.refundPayment?.amount}`, p.refund_status, new Date(p.updatedAt).toLocaleDateString()];
            vals.forEach((v, i) => { doc.text(String(v || '-'), x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
            y += 18;
        });
        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

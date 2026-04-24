const User = require('../models/User.js');
const Allocation = require('../models/Allocation');
const Application = require('../models/Application');
const StudentPayment = require('../models/StudentPayment');
const Complaint = require('../models/Complaint');
const Clearance = require('../models/clearance');
const roomController = require('./roomController');

// @desc    Purge all student-related documents except User account
// @route   DELETE /api/admin/purge-student/:id
// @access  Private/Admin/Warden
const purgeStudentRecord = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Find the user if available
        const user = await User.findById(id);
        
        // 2. Resolve identifiers (roll number and email)
        const studentInfo = await StudentPayment.findOne({ student: id }) || await Application.findOne({ student: id });
        const roll = studentInfo ? (studentInfo.rollNumber || studentInfo.studentRollNumber) : null;
        const email = user ? user.email : (studentInfo ? (studentInfo.email || studentInfo.studentEmail) : null);

        const allocations = await Allocation.find({
            $or: [
                { student: id },
                ...(roll ? [{ studentRollNumber: roll }] : []),
                ...(email ? [{ studentEmail: email }] : [])
            ]
        });

        await roomController.releaseStudentBeds(allocations);

        const deleteOps = [
            Application.deleteMany({ student: id }),
            StudentPayment.deleteMany({ student: id }),
            Clearance.deleteMany({ student: id }),
            Complaint.deleteMany({ submittedBy: id }),
            Allocation.deleteMany({ student: id })
        ];

        if (roll) {
            deleteOps.push(Allocation.deleteMany({ studentRollNumber: roll }));
            deleteOps.push(StudentPayment.deleteMany({ rollNumber: roll }));
            deleteOps.push(Application.deleteMany({ studentRollNumber: roll }));
            deleteOps.push(Clearance.deleteMany({ studentRollNumber: roll }));
        }

        if (email) {
            deleteOps.push(Allocation.deleteMany({ studentEmail: email }));
        }

        await Promise.all(deleteOps);

        res.json({ success: true, message: 'Student records purged and hostel beds released successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get all students who have left (Deactivated applications or Approved clearances)
// @route   GET /api/leave/left-students
const getLeftStudents = async (req, res) => {
    try {
        const filter = {};
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { studentName: searchRegex },
                { studentEmail: searchRegex },
                { studentRollNumber: searchRegex }
            ];
        }

        // 1. Find deactivated applications
        const apps = await Application.find({ 
            ...filter,
            applicationStatus: 'Deactivated' 
        }).lean();

        // 2. Find approved clearances
        // Clearances uses different field names for name/email/roll? 
        // Need to check clearance model, but usually it's studentName, studentRollNumber.
        const clrs = await Clearance.find({ status: 'Approved' }).lean();

        const merged = new Map();
        
        apps.forEach(a => {
            merged.set(a.studentRollNumber, {
                name: a.studentName,
                roll: a.studentRollNumber,
                email: a.studentEmail,
                wing: a.studentWing,
                status: 'Deactivated',
                type: 'Application',
                id: a._id,
                studentId: a.student,
                leftAt: a.updatedAt || a.createdAt
            });
        });

        clrs.forEach(c => {
            if (req.query.search) {
                const sr = new RegExp(req.query.search, 'i');
                const match = sr.test(c.studentName) || sr.test(c.studentEmail) || sr.test(c.studentRollNumber);
                if (!match) return;
            }

            const existing = merged.get(c.studentRollNumber);
            merged.set(c.studentRollNumber, {
                ...existing,
                name: c.studentName || existing?.name,
                roll: c.studentRollNumber,
                email: c.studentEmail || existing?.email,
                wing: c.wing || existing?.wing,
                status: 'Cleared & Left',
                type: existing ? 'Clearance & Application' : 'Clearance',
                clId: c._id,
                appId: existing?.id,
                studentId: c.student || existing?.studentId,
                leftAt: c.updatedAt || c.createdAt
            });
        });

        const result = Array.from(merged.values()).sort((a, b) => new Date(b.leftAt) - new Date(a.leftAt));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Export left students as CSV or PDF
const exportLeftStudents = async (req, res) => {
    try {
        // Logic same as getLeftStudents but generating file
        const filter = {};
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { studentName: searchRegex },
                { studentEmail: searchRegex },
                { studentRollNumber: searchRegex }
            ];
        }

        const apps = await Application.find({ ...filter, applicationStatus: 'Deactivated' }).lean();
        const clrs = await Clearance.find({ status: 'Approved' }).lean();

        const merged = new Map();
        apps.forEach(a => merged.set(a.studentRollNumber, { name: a.studentName, roll: a.studentRollNumber, email: a.studentEmail, wing: a.studentWing, status: 'Deactivated', leftAt: a.updatedAt }));
        clrs.forEach(c => {
            if (req.query.search) {
                const sr = new RegExp(req.query.search, 'i');
                if (!sr.test(c.studentName) && !sr.test(c.studentEmail) && !sr.test(c.studentRollNumber)) return;
            }
            const ex = merged.get(c.studentRollNumber);
            merged.set(c.studentRollNumber, { ...ex, name: c.studentName || ex?.name, roll: c.studentRollNumber, email: c.studentEmail || ex?.email, wing: c.wing || ex?.wing, status: 'Cleared & Left', leftAt: c.updatedAt });
        });

        const data = Array.from(merged.values()).sort((a, b) => new Date(b.leftAt) - new Date(a.leftAt));
        const format = req.query.format || 'csv';

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Name', value: 'name' },
                { label: 'Roll Number', value: 'roll' },
                { label: 'Email', value: 'email' },
                { label: 'Wing', value: 'wing' },
                { label: 'Final Status', value: 'status' },
                { label: 'Exit Date', value: row => new Date(row.leftAt).toLocaleDateString() }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            res.header('Content-Type', 'text/csv');
            res.attachment('left_students.csv');
            return res.send(csv);
        }

        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
            res.header('Content-Type', 'application/pdf');
            res.attachment('left_students.pdf');
            doc.pipe(res);
            doc.fontSize(18).text('Students Exit Records (History)', { align: 'center' });
            doc.moveDown();
            const headers = ['Name', 'ID', 'Email', 'Wing', 'Status', 'Exit Date'];
            const colWidths = [150, 80, 180, 60, 100, 80];
            let y = doc.y; let x = 40;
            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
            doc.font('Helvetica').fontSize(9); y += 20;
            data.forEach((s) => {
                if (y > 550) { doc.addPage(); y = 40; }
                x = 40;
                const vals = [s.name, s.roll, s.email, s.wing, s.status, new Date(s.leftAt).toLocaleDateString()];
                vals.forEach((v, i) => { doc.text(String(v || '-'), x, y, { width: colWidths[i] }); x += colWidths[i] + 10; });
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

module.exports = { purgeStudentRecord, getLeftStudents, exportLeftStudents };

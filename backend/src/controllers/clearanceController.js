const Clearance = require('../models/clearance');
const StudentPayment = require('../models/StudentPayment');
const Application = require('../models/Application');

// @desc    Submit a clearance form
// @route   POST /api/clearance
// @access  Private/Student
exports.submitClearance = async (req, res) => {
    try {
        const {
            studentName,
            studentEmail,
            studentPhone,
            studentRollNumber,
            wing,
            floorNumber,
            roomType,
            roomNumber,
            bedId,
            bankDetails
        } = req.body;

        // Check if already submitted
        const existing = await Clearance.findOne({ student: req.user.id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Clearance form already submitted' });
        }

        const clearance = await Clearance.create({
            student: req.user.id,
            studentName,
            studentEmail,
            studentPhone,
            studentRollNumber,
            wing,
            floorNumber,
            roomType,
            roomNumber,
            bedId,
            bankDetails
        });

        res.status(201).json({ success: true, data: clearance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get current student's clearance status
// @route   GET /api/clearance/me
// @access  Private/Student
exports.getMyClearance = async (req, res) => {
    try {
        const clearance = await Clearance.findOne({ student: req.user.id });
        if (!clearance) {
            return res.status(404).json({ success: false, message: 'No clearance form found' });
        }
        res.json({ success: true, data: clearance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
// @desc    Delete current student's clearance form
// @route   DELETE /api/clearance/me
// @access  Private/Student
exports.deleteClearance = async (req, res) => {
    try {
        const clearance = await Clearance.findOne({ student: req.user.id });
        if (!clearance) {
            return res.status(404).json({ success: false, message: 'No clearance form found to delete' });
        }
        // Block deletion once warden has submitted their review
        if (clearance.isWardenSubmitted) {
            return res.status(403).json({ success: false, message: 'Cannot delete clearance form after warden has submitted their review.' });
        }
        await clearance.deleteOne();
        res.json({ success: true, message: 'Clearance form deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update bank details on student's clearance form
// @route   PATCH /api/clearance/me/bank
// @access  Private/Student
exports.updateBankDetails = async (req, res) => {
    try {
        const clearance = await Clearance.findOne({ student: req.user.id });
        if (!clearance) {
            return res.status(404).json({ success: false, message: 'No clearance form found' });
        }
        const { accountHolderName, bankName, branchName, accountNumber } = req.body;
        clearance.bankDetails = { accountHolderName, bankName, branchName, accountNumber };
        await clearance.save();
        res.json({ success: true, data: clearance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Get all clearance forms (for Warden)
// @route   GET /api/clearance
// @access  Private/Warden
exports.getAllClearances = async (req, res) => {
    try {
        const clearances = await Clearance.find().sort({ submittedAt: -1 }).lean();
        
        // Populate each clearance with its student's payment record and join date
        const populatedClearances = await Promise.all(clearances.map(async (c) => {
            const [payment, application] = await Promise.all([
                StudentPayment.findOne({ student: c.student }).lean(),
                Application.findOne({ student: c.student }).select('createdAt').lean()
            ]);
            return {
                ...c,
                paymentHistory: payment || null,
                joinedAt: application?.createdAt || null
            };
        }));

        res.json(populatedClearances);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Update clearance form by Warden
// @route   PATCH /api/clearance/:id/warden
// @access  Private/Warden
exports.updateClearanceWarden = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            monthlyAdjustments, 
            additionalCharges, 
            keyStatus, 
            wardenNotes,
            isWardenSubmitted,
            status 
        } = req.body;

        const updateData = {
            monthlyAdjustments,
            additionalCharges,
            keyStatus,
            wardenNotes,
            isWardenSubmitted
        };

        // If Warden is submitting, and no status was explicitly sent, 
        // set it to 'In Progress' (to signal Financial Manager)
        if (isWardenSubmitted && !status) {
            updateData.status = 'In Progress';
        } else if (status) {
            updateData.status = status;
        }

        const clearance = await Clearance.findByIdAndUpdate(
            id,
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (!clearance) {
            return res.status(404).json({ success: false, message: 'Clearance form not found' });
        }

        res.json({ success: true, data: clearance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// @desc    Delete clearance form by ID (for Warden/Admin)
// @route   DELETE /api/clearance/:id
// @access  Private/Warden
exports.deleteClearanceById = async (req, res) => {
    try {
        const { id } = req.params;
        const clearance = await Clearance.findById(id);
        if (!clearance) {
            return res.status(404).json({ success: false, message: 'Clearance form not found' });
        }
        await clearance.deleteOne();
        res.json({ success: true, message: 'Clearance form purged successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const User = require('../models/User.js');

const allowedRoles = ['warden', 'security', 'financial'];
const staffEmailRegex = /^[A-Za-z0-9._%+-]+@sliit\.lk$/i;

const normalizeEmail = (email = '') => email.trim().toLowerCase();

const listStaffUsers = async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['admin', ...allowedRoles] } })
            .select('name email role phoneNumber accountStatus createdAt')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const createStaffUser = async (req, res) => {
    try {
        const { name, email, password, role, phoneNumber } = req.body;
        const trimmedName = (name || '').trim();
        const normalizedEmail = normalizeEmail(email);
        const normalizedRole = (role || '').trim().toLowerCase();
        const normalizedPhone = (phoneNumber || '').trim();

        if (!trimmedName || !normalizedEmail || !password || !normalizedRole) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, password, and role are required'
            });
        }

        if (!allowedRoles.includes(normalizedRole)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be warden, security, or financial'
            });
        }

        if (!staffEmailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Staff email must be an official @sliit.lk address'
            });
        }

        if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Phone Number must be exactly 10 digits'
            });
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({
            name: trimmedName,
            email: normalizedEmail,
            password,
            role: normalizedRole,
            phoneNumber: normalizedPhone || null,
            accountStatus: 'verified'
        });

        res.status(201).json({
            success: true,
            message: `${normalizedRole} account created successfully`,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                accountStatus: user.accountStatus,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const deleteStaffUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Only allow deleting staff/admin roles (already restricted by route anyway, but good for safety)
        if (!['admin', ...allowedRoles].includes(user.role)) {
            return res.status(400).json({ success: false, message: 'Only staff accounts can be deleted from here' });
        }

        await User.findByIdAndDelete(id);

        res.json({ success: true, message: 'Staff user deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateStaffUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const normalizedStatus = (status || '').toLowerCase();

        if (!['pending', 'verified', 'reject'].includes(normalizedStatus)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Prevent self-deactivation
        if (id === req.user.id && (normalizedStatus === 'reject' || normalizedStatus === 'pending')) {
            return res.status(400).json({ success: false, message: 'You cannot change your own admin account status' });
        }

        user.accountStatus = normalizedStatus;
        await user.save();

        res.json({ success: true, message: 'Staff user status updated successfully', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { listStaffUsers, createStaffUser, deleteStaffUser, updateStaffUserStatus };

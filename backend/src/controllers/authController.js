const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');

// In-memory OTP store: { email -> { otp, newPassword, expiresAt } }
const otpStore = new Map();
// In-memory phone update store: { userId -> { otp, newPhone, expiresAt } }
const phoneChangeStore = new Map();

// In-memory OTP store for signup: { email -> { otp, verified, expiresAt } }
const signupOtpStore = new Map();

// Helper: send SMS via text.lk
const sendSms = async (phone, message) => {
    const res = await fetch('https://app.text.lk/api/v3/sms/send', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 3988|mDJz5fHIMIM77y2VknbURAO8HCgUQADNTCi5PA6n38a2e351',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            recipient: phone,
            sender_id: 'HOSTEL KUNI',
            type: 'plain',
            message
        })
    });
    return res.json();
};

const sendEmail = require('../utils/emailHelper.js');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'hostel_secret_key_2026', { expiresIn: '7d' });
};

// @desc   Send OTP for signup email verification
// @route  POST /api/auth/send-signup-otp
const sendSignupOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        // Basic student email validation
        const studentEmailRegex = /^[a-zA-Z]{2}\d{8}@my\.sliit\.lk$/i;
        if (!studentEmailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email: Must be a valid SLIIT student email (e.g., ITXXXXXXXX@my.sliit.lk, BMXXXXXXXX@my.sliit.lk or SAXXXXXXXX@my.sliit.lk)' 
            });
        }

        // Check if email already exists
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        signupOtpStore.set(email.toLowerCase().trim(), { otp, verified: false, expiresAt });

        const emailResult = await sendEmail({
            email,
            subject: 'SLIIT Hostel - Email Verification Code',
            message: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5;">Email Verification</h2>
                    <p>Hello,</p>
                    <p>Your verification code for SLIIT Hostel Management System signup is:</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
                    <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        if (!emailResult.success) {
            return res.status(500).json({ 
                success: false, 
                message: `Failed to send verification email: ${emailResult.error || 'Unknown error'}` 
            });
        }

        res.json({ success: true, message: 'Verification code sent to your email' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Verify signup OTP
// @route  POST /api/auth/verify-signup-otp
const verifySignupOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

        const emailKey = email.toLowerCase().trim();
        const record = signupOtpStore.get(emailKey);

        if (!record) return res.status(400).json({ success: false, message: 'No OTP record found. Please resend OTP.' });
        if (Date.now() > record.expiresAt) {
            signupOtpStore.delete(emailKey);
            return res.status(400).json({ success: false, message: 'OTP has expired. Please resend.' });
        }
        if (record.otp !== otp.trim()) return res.status(400).json({ success: false, message: 'Invalid OTP' });

        // Mark as verified
        signupOtpStore.set(emailKey, { ...record, verified: true });

        res.json({ success: true, message: 'Email verified successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Register user
// @route  POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password, studentId, phoneNumber } = req.body;
        const userRole = 'student';

        // Validation for Student ID and Email format matching (Only students can register)
        // Check email format: (Any SLIIT ID prefix, e.g., IT, BM)XXXXXXXX@my.sliit.lk
        const studentEmailRegex = /^[a-zA-Z]{2}\d{8}@my\.sliit\.lk$/i;
        if (!studentEmailRegex.test(email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Registration failed: Student email must be a valid SLIIT student address (e.g., ITXXXXXXXX@my.sliit.lk, BMXXXXXXXX@my.sliit.lk or SAXXXXXXXX@my.sliit.lk)' 
            });
        }

        const emailPrefix = (email || '').split('@')[0].toUpperCase();
        if ((studentId || '').toUpperCase() !== emailPrefix) {
            return res.status(400).json({ 
                success: false, 
                message: `Registration failed: Student ID must match email prefix (${emailPrefix})` 
            });
        }

        // Validation for 10-digit phone number
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Registration failed: Phone Number must be exactly 10 digits' 
            });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

        // Verify that the email was verified via OTP
        const emailKey = email.toLowerCase().trim();
        const record = signupOtpStore.get(emailKey);
        if (!record || !record.verified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Registration failed: Email not verified. Please verify your email first.' 
            });
        }

        const user = await User.create({ 
            name, 
            email, 
            password, 
            role: userRole, 
            studentId: userRole === 'student' ? studentId : undefined,
            phoneNumber
        });

        // Clean up OTP store after successful registration
        signupOtpStore.delete(emailKey);

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                phoneNumber: user.phoneNumber,
                profilePicture: user.profilePicture,
                accountStatus: user.accountStatus,
                token: generateToken(user._id)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Login user
// @route  POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                phoneNumber: user.phoneNumber,
                profilePicture: user.profilePicture,
                accountStatus: user.accountStatus,
                token: generateToken(user._id)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Get current user profile
// @route  GET /api/auth/me
const getMe = (req, res) => {
    res.json({ success: true, data: req.user });
};

// @desc   Send OTP to registered phone for password reset
// @route  POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Email, new password and confirm password are required.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }
        if (!user.phoneNumber) {
            return res.status(400).json({ success: false, message: 'No phone number registered on this account.' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        otpStore.set(email.toLowerCase().trim(), { otp, newPassword, expiresAt });

        // Convert local phone (07xxxxxxxx) to international (947xxxxxxxx)
        const rawPhone = user.phoneNumber.trim();
        const intlPhone = rawPhone.startsWith('0') ? '94' + rawPhone.slice(1) : rawPhone;

        const smsResult = await sendSms(intlPhone, `Your Hostel password reset OTP is: ${otp}. Valid for 5 minutes. Do not share.`);

        if (smsResult.status === 'error') {
            return res.status(500).json({ success: false, message: 'Failed to send OTP SMS. Please try again.' });
        }

        // Mask phone for response: show last 4 digits only
        const maskedPhone = '*'.repeat(rawPhone.length - 4) + rawPhone.slice(-4);
        res.json({ success: true, message: `OTP sent to ${maskedPhone}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Verify OTP and reset password
// @route  POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const emailKey = email.toLowerCase().trim();
        const record = otpStore.get(emailKey);

        if (!record) {
            return res.status(400).json({ success: false, message: 'No OTP request found. Please start again.' });
        }
        if (Date.now() > record.expiresAt) {
            otpStore.delete(emailKey);
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }
        if (record.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }

        // Update password
        const user = await User.findOne({ email: emailKey });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        user.password = record.newPassword; // pre-save hook will hash it
        await user.save();
        otpStore.delete(emailKey);

        res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Request OTP for changing phone number (Authenticated)
// @route  POST /api/auth/request-phone-update
const requestPhoneUpdateOTP = async (req, res) => {
    try {
        const { newPhone } = req.body;
        if (!newPhone || !/^\d{10}$/.test(newPhone)) {
            return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        phoneChangeStore.set(req.user.id, { otp, newPhone, expiresAt });

        // Convert local phone (07xxxxxxxx) to international (947xxxxxxxx)
        const intlPhone = newPhone.startsWith('0') ? '94' + newPhone.slice(1) : newPhone;

        const smsResult = await sendSms(intlPhone, `Your Hostel phone update OTP is: ${otp}. Valid for 5 minutes.`);

        if (smsResult.status === 'error') {
            return res.status(500).json({ success: false, message: 'Failed to send OTP SMS.' });
        }

        res.json({ success: true, message: `OTP sent to ${newPhone}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc   Verify OTP and update phone number (Authenticated)
// @route  POST /api/auth/verify-phone-update
const verifyPhoneUpdateOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const record = phoneChangeStore.get(req.user.id);

        if (!record) {
            return res.status(400).json({ success: false, message: 'No pending phone update. Request OTP first.' });
        }
        if (Date.now() > record.expiresAt) {
            phoneChangeStore.delete(req.user.id);
            return res.status(400).json({ success: false, message: 'OTP has expired.' });
        }
        if (record.otp !== otp.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        // Update phone
        const user = await User.findById(req.user.id);
        user.phoneNumber = record.newPhone;
        await user.save();
        phoneChangeStore.delete(req.user.id);

        res.json({ success: true, message: 'Phone number updated successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = { 
    register, 
    login, 
    getMe, 
    forgotPassword, 
    resetPassword, 
    requestPhoneUpdateOTP, 
    verifyPhoneUpdateOTP,
    sendSignupOTP,
    verifySignupOTP
};

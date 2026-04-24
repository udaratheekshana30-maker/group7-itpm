const express = require('express');
const { 
    register, login, getMe, forgotPassword, resetPassword, 
    requestPhoneUpdateOTP, verifyPhoneUpdateOTP, sendSignupOTP, verifySignupOTP 
} = require('../controllers/authController.js');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-signup-otp', verifySignupOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/request-phone-update', protect, requestPhoneUpdateOTP);
router.post('/verify-phone-update', protect, verifyPhoneUpdateOTP);
router.get('/me', protect, getMe);
router.get('/check-role', protect, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            role: req.user.role,
            email: req.user.email
        }
    });
});

module.exports = router;

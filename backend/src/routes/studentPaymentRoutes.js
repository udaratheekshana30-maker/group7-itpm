const express = require('express');
const { 
    submitRefundablePayment, 
    submitMonthlyPayment, 
    getStudentPaymentStatus, 
    getStudentInitialData,
    updateMonthlyPayment 
} = require('../controllers/studentPaymentController');
const paymentController = require('../controllers/paymentController');
const { protect, wardenOnly } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

// Public/Open Reference Routes (No protection if needed, or protect for all)
router.get('/all', protect, paymentController.getAllPayments);
router.get('/roll/:rollNumber', protect, paymentController.getPaymentByRoll);

// Student Routes (Protected)
router.use(protect);
router.get('/initial-data', getStudentInitialData);
router.get('/status', getStudentPaymentStatus);
router.post('/refundable', upload.single('document'), submitRefundablePayment);
router.post('/monthly', upload.single('document'), submitMonthlyPayment);
router.put('/monthly/:submissionId', upload.single('document'), updateMonthlyPayment);

// Warden Routes (Protected + Warden Only)
router.get('/monthly-submissions', wardenOnly, paymentController.getMonthlySubmissions);
router.get('/monthly-submissions/export', wardenOnly, paymentController.exportMonthlySubmissions);
router.patch('/monthly-submissions/:studentId/:submissionId', wardenOnly, paymentController.updateMonthlyStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const { 
    getRefundablePayments, 
    updateRefundStatus, 
    getAllPaymentRecords,
    exportRefundablePayments,
    exportRefundTransfers,
    exportFinancialRecords
} = require('../controllers/financialController');
const { protect, financialManagerOnly: financialManager } = require('../middleware/authMiddleware');

router.use(protect);
router.use(financialManager);

router.get('/refundable', getRefundablePayments);
router.put('/refundable/:id/status', updateRefundStatus);
router.get('/records', getAllPaymentRecords);

// Export routes
router.get('/export/refundable', exportRefundablePayments);
router.get('/export/transfers', exportRefundTransfers);
router.get('/export/records', exportFinancialRecords);

module.exports = router;

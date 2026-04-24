const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  logScan,
  getStudentQrStatus,
  getSecurityPin,
  getOutsideStudents,
  getLateStudents,
  getAllLogs,
  getMyStatus
} = require("../controllers/qrController.js");

const router = express.Router();

// Public scan/status for gate QR flow
router.get("/status/:studentId", getStudentQrStatus);
router.post("/scan", logScan);
router.get("/security-pin", protect, authorize("security"), getSecurityPin);

// Warden/Security views
router.get("/outside", protect, authorize("warden", "security"), getOutsideStudents);
router.get("/late", protect, authorize("warden", "security"), getLateStudents);
router.get("/logs", protect, authorize("warden", "security"), getAllLogs);
router.get("/my-status", protect, authorize("student"), getMyStatus);

module.exports = router;

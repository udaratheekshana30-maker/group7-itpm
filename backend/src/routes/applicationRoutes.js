const express = require("express");
const router = express.Router();
const { protect, optionalProtect, authorize } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");
const {
  createApplication,
  getMyApplication,
  getAllApplications,

  getApplicationById,
  updatePaymentStatus,
  allocateRoom,
  updateApplication,
  deleteApplication,
  updateMyApplication,
  deleteMyApplication,
  updatePublicApplication,
  deletePublicApplication,
  exportApplications,
} = require("../controllers/applicationController");

// public/student form submit
router.post("/", optionalProtect, createApplication);
router.put("/public/:id", updatePublicApplication);
router.delete("/public/:id", deletePublicApplication);
router.get("/me", protect, authorize("student"), getMyApplication);
router.put("/me", protect, authorize("student"), updateMyApplication);
router.delete("/me", protect, authorize("student"), deleteMyApplication);
router.post("/upload-medical", protect, authorize("student"), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: req.file.path, publicId: req.file.filename });
});

// protected management endpoints
router.get("/", protect, authorize("financial", "warden", "admin", "security"), getAllApplications);
router.get("/:id", protect, authorize("admin", "financial", "warden", "security"), getApplicationById);

router.put("/:id/payment", protect, authorize("financial", "security"), updatePaymentStatus);
router.put("/:id/allocate", protect, authorize("warden"), allocateRoom);
router.put("/:id", protect, authorize("admin", "financial", "warden", "security"), updateApplication);
router.delete("/:id", protect, authorize("admin", "warden"), deleteApplication);

// Export Applications (CSV/PDF)
router.get("/export/data", protect, authorize("warden", "admin"), exportApplications);

module.exports = router;

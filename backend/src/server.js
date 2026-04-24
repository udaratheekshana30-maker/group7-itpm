const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db.js");

const floorRoutes = require("./routes/floors.js");
const roomRoutes = require("./routes/rooms.js");
const allocationRoutes = require("./routes/allocations.js");
const authRoutes = require("./routes/authRoutes.js");
const complaintRoutes = require("./routes/complaints.js");
const noticeRoutes = require("./routes/notice.js");
const applicationRoutes = require("./routes/applicationRoutes.js");
const studentPaymentRoutes = require("./routes/studentPaymentRoutes.js");
const financialRoutes = require('./routes/financialRoutes');
const userRoutes = require("./routes/userRoutes.js");
const clearanceRoutes = require("./routes/clearanceRoutes.js");
const qrRoutes = require("./routes/qrRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const leaveRoutes = require("./routes/leaveRoutes.js");
const resourceRoutes = require("./routes/resourceRoutes.js");
const { getStats } = require("./controllers/allocationController.js");
const { ensureDefaultAdmin } = require("./utils/ensureDefaultAdmin.js");


dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use("/api/floors", floorRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/student-payments", studentPaymentRoutes);
app.use('/api/financial', financialRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clearance", clearanceRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/resources", resourceRoutes);
app.get("/api/stats", getStats);
// Serve Frontend in Production
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");

if (require("fs").existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.use((req, res, next) => {
    // If request is for an API route, let it fall through to 404 handler
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Smart Hostel API is running (Frontend build not found)...");
  });
}

// 404 Handler - MUST be after all routes
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, msg: `Route ${req.originalUrl} not found` });
});

// Multer / file upload error handler
const multer = require('multer');
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, msg: `Upload Error: ${err.message}` });
  }
  if (err && err.message && err.message.includes('File type')) {
    return res.status(400).json({ success: false, msg: err.message });
  }
  res.status(err.status || 500).json({
    success: false,
    msg: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await ensureDefaultAdmin();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

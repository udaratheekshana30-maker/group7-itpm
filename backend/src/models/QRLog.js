const mongoose = require("mongoose");

const qrLogSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: ["entry", "exit"], required: true },
    destination: { type: String, trim: true }, // only for exit
    goingHome: { type: Boolean, default: false }, // if true, skip curfew checks
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional for public QR flow
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("QRLog", qrLogSchema);

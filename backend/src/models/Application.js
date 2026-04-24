const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  studentRollNumber: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  nic: { type: String },
  gender: { type: String, enum: ["male", "female", "other"] },
  dateOfBirth: { type: Date },
  contactNumber: { type: String },
  permanentAddress: { type: String },

  faculty: { type: String },
  studentDegree: { type: String },
  studentYear: { type: String },
  registrationNumber: { type: String },

  preferredHostel: { type: String },
  studentWing: { type: String, enum: ["male", "female"] },
  roomType: {
    type: String,
    enum: ["single", "double", "triple"],
    required: true
  },
  durationOfStay: { type: String },

  // medical/emergency
  hasMedicalCondition: { type: Boolean, default: false },
  medicalConditionDetails: { type: String },
  allergies: { type: String },
  regularMedications: { type: String },
  medicalReportUrl: { type: String },
  medicalReportPublicId: { type: String },
  emergencyContactName: {
    type: String,
    required: true
  },
  emergencyContactPhone: {
    type: String,
    required: true
  },
  guardianName: { type: String, required: true },
  guardianContactNumber: { type: String, required: true },

  medicalInfo: {
    type: String
  },
  // payment workflow fields
  paymentSlipUrl: { type: String },
  paymentSlipPublicId: { type: String },
  applicationStatus: {
    type: String,
    enum: ["Pending", "Activated", "Deactivated", "Payment Approved", "Room Allocated", "Rejected"],
    default: "Pending"
  },
  assignedRoom: { type: String },
}, { timestamps: true, collection: 'application' });

module.exports = mongoose.model("Application", applicationSchema);

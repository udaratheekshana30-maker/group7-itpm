const mongoose = require("mongoose");
const Application = require("../models/Application");
const User = require("../models/User");
const { cloudinary } = require("../config/cloudinary");

// controller to handle business logic for applications
function isValidSriLankanNic(nic) {
  return /^(\d{12}|\d{9}V)$/.test(nic);
}

function isValidRollPrefixForGender(roll, gender) {
  if (!roll || !gender) return false;
  const expectedPrefix = gender.toLowerCase() === "male" ? "M" : "F";
  return roll.toUpperCase().startsWith(expectedPrefix);
}

function isValidSliitEmail(email) {
  return /^[a-zA-Z]{2}\d{8}@my\.sliit\.lk$/i.test((email || "").trim());
}

function isValidTenDigitContact(number) {
  return /^\d{10}$/.test((number || "").trim());
}

function validateApplicationData(payload) {
  if (payload.nic && !isValidSriLankanNic(payload.nic)) {
    return "Invalid NIC format. Use 12 digits or 9 digits + V.";
  }
  if (payload.studentEmail && !isValidSliitEmail(payload.studentEmail)) {
    return "studentEmail must match a valid SLIIT format (e.g. itxxxxxxxx@my.sliit.lk or bmxxxxxxxx@my.sliit.lk).";
  }
  if (payload.studentEmail && payload.registrationNumber) {
    const emailPrefix = payload.studentEmail.split('@')[0].toUpperCase();
    if (payload.registrationNumber !== emailPrefix) {
      return `Registration Number must match email prefix (${emailPrefix}).`;
    }
  }
  if (payload.contactNumber && !isValidTenDigitContact(payload.contactNumber)) {
    return "contactNumber must be exactly 10 digits.";
  }
  if (payload.emergencyContactPhone && !isValidTenDigitContact(payload.emergencyContactPhone)) {
    return "emergencyContactPhone must be exactly 10 digits.";
  }
  return null;
}

async function generateRollNumber(gender) {
  const prefix = gender.toLowerCase() === "male" ? "M" : "F";
  // Find all applications with this prefix to find the max number stably
  const apps = await Application.find({
    studentRollNumber: new RegExp(`^${prefix}\\d+`, "i")
  }).select("studentRollNumber").lean();

  let maxNum = (gender.toLowerCase() === "male" ? 99 : 100); // Start male at 100, female at 101

  apps.forEach(app => {
    const numPart = app.studentRollNumber.substring(1);
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  });

  return `${prefix}${maxNum + 1}`;
}


async function getStudentEmailById(studentId) {
  if (!studentId) return "";
  const student = await User.findById(studentId).select("email").lean();
  return (student?.email || "").trim().toLowerCase();
}

// Robust lookup: tries multiple ways to find a student's application.
// Layer 1: student ObjectId (fastest, always correct after first login)
// Layer 2: user account email from User table
// Layer 3: SLIIT email submitted in the form body (extraEmail param)
async function findMyApplication(userId, extraEmail) {
  // Layer 1 — by student ObjectId
  if (userId) {
    try {
      const byId = await Application.findOne({ student: new mongoose.Types.ObjectId(userId) });
      if (byId) return byId;
    } catch (_) { }
  }

  // Layer 2 — by account email stored in User table
  const accountEmail = await getStudentEmailById(userId);
  if (accountEmail) {
    const byAccountEmail = await Application.findOne({ studentEmail: accountEmail });
    if (byAccountEmail) return byAccountEmail;
  }

  // Layer 3 — by SLIIT email from form body (studentEmail field)
  if (extraEmail && extraEmail !== accountEmail) {
    const byFormEmail = await Application.findOne({ studentEmail: extraEmail.trim().toLowerCase() });
    if (byFormEmail) return byFormEmail;
  }

  return null;
}

// normalize and fill defaults for incoming request bodies
function normalizeApplicationPayload(body) {
  const roomTypeInput = (body.roomType || body.roomPreference || "").toLowerCase();
  const roomType = ["single", "double", "triple"].includes(roomTypeInput) ? roomTypeInput : "single";

  const hasMedicalCondition =
    body.hasMedicalCondition === true || body.hasMedicalCondition === "true";

  const studentEmail = (body.studentEmail || body.email || "").trim().toLowerCase();
  const nic = (body.nic || "").trim().toUpperCase();
  const gender = (body.gender || "").toLowerCase();
  const studentRollNumber = (body.studentRollNumber || "").trim().toUpperCase();
  const studentWing = (body.studentWing || gender || "").toLowerCase();
  const emergencyName = (body.emergencyContactName || body.guardianName || "Not Provided").trim();
  const emergencyPhone = (body.emergencyContactPhone || body.guardianContactNumber || "0000000000").trim();
  const guardName = (body.guardianName || body.emergencyContactName || "Not Provided").trim();
  const guardPhone = (body.guardianContactNumber || body.emergencyContactPhone || "0000000000").trim();

  return {
    student: body.student || undefined,
    studentRollNumber,
    studentName: body.studentName || body.name,
    studentEmail,
    nic: nic || undefined,
    gender: gender || undefined,
    dateOfBirth: body.dateOfBirth || undefined,
    contactNumber: body.contactNumber || undefined,
    permanentAddress: body.permanentAddress || undefined,
    faculty: body.faculty || undefined,
    studentDegree: body.studentDegree || body.course || undefined,
    studentYear: body.studentYear || body.academicYear || undefined,
    registrationNumber: (body.registrationNumber || "").trim().toUpperCase(),
    preferredHostel: body.preferredHostel || undefined,
    studentWing: studentWing || undefined,
    roomType,
    durationOfStay: body.durationOfStay || undefined,
    hasMedicalCondition,
    medicalConditionDetails: hasMedicalCondition ? (body.medicalConditionDetails || "") : "",
    allergies: hasMedicalCondition ? (body.allergies || "") : "",
    regularMedications: hasMedicalCondition ? (body.regularMedications || "") : "",
    medicalReportUrl: body.medicalReportUrl || undefined,
    medicalReportPublicId: body.medicalReportPublicId || undefined,
    emergencyContactName: emergencyName,
    emergencyContactPhone: emergencyPhone,
    guardianName: guardName,
    guardianContactNumber: guardPhone,

    medicalInfo: "",
    paymentSlipUrl: body.paymentSlipUrl || undefined,
    paymentSlipPublicId: body.paymentSlipPublicId || undefined,
    assignedRoom: body.assignedRoom || undefined,
    applicationStatus: body.applicationStatus || "Pending",
  };
}

// create a new application
async function createApplication(req, res) {
  try {
    if (req.user && req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can submit applications." });
    }
    const payload = normalizeApplicationPayload(req.body);
    if (req.user && req.user.role === "student") {
      payload.student = req.user.id;
    }

    if (!payload.studentRollNumber || payload.studentRollNumber.startsWith("TEMP-")) {
      payload.studentRollNumber = await generateRollNumber(payload.gender || "other");
    }

    if (!payload.studentName || !payload.studentEmail) {
      return res.status(400).json({
        error: "studentName/email are required (or provide name/email).",
      });
    }

    const validationError = validateApplicationData(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (!payload.guardianName) {
      return res.status(400).json({
        error: "guardianName is required.",
      });
    }
    if (!isValidRollPrefixForGender(payload.studentRollNumber, payload.gender)) {
      const requiredPrefix = payload.gender === "male" ? "M" : "F";
      return res.status(400).json({
        error: `studentRollNumber must start with '${requiredPrefix}' for gender '${payload.gender}'.`,
      });
    }

    const duplicateQuery = [{ studentEmail: payload.studentEmail }];
    if (payload.student) duplicateQuery.push({ student: payload.student });
    if (payload.nic) duplicateQuery.push({ nic: payload.nic });

    console.log("Checking for duplicate application with query:", JSON.stringify(duplicateQuery));
    const existing = await Application.findOne({ $or: duplicateQuery });

    if (existing) {
      console.log("Duplicate found document:", JSON.stringify(existing));
      return res.status(409).json({
        error: `Application already exists for email: ${existing.studentEmail} or NIC: ${existing.nic || 'N/A'}. Please ensure database is fully cleared.`,
      });
    }

    const newApplication = new Application(payload);
    await newApplication.save();
    res.status(201).json(newApplication);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// retrieve current student's application
async function getMyApplication(req, res) {
  try {
    const app = await findMyApplication(req.user.id, null);
    if (!app) return res.status(404).json({ error: "No application found for this student" });
    // Link student ObjectId if missing (fixes future lookups)
    if (!app.student) {
      app.student = req.user.id;
      await app.save();
    }
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// retrieve all applications (admin/finance/warden)
async function getAllApplications(req, res) {
  try {
    const filter = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { studentName: searchRegex },
        { studentEmail: searchRegex },
        { studentRollNumber: searchRegex }
      ];
    }

    if (req.query.status && req.query.status !== 'all') {
      const activeStatuses = ['Activated', 'Room Allocated'];
      const pendingStatuses = ['Pending', 'Payment Approved'];
      if (req.query.status === 'active') filter.applicationStatus = { $in: activeStatuses };
      else if (req.query.status === 'pending') filter.applicationStatus = { $in: pendingStatuses };
      else filter.applicationStatus = req.query.status;
    }

    const applications = await Application.find(filter)
      .populate('student', 'phoneNumber profilePicture')
      .sort({ createdAt: -1 });
    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// export applications as CSV or PDF
async function exportApplications(req, res) {
  try {
    const filter = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { studentName: searchRegex },
        { studentEmail: searchRegex },
        { studentRollNumber: searchRegex }
      ];
    }
    if (req.query.status && req.query.status !== 'all') {
      const activeStatuses = ['Activated', 'Room Allocated'];
      const pendingStatuses = ['Pending', 'Payment Approved'];
      if (req.query.status === 'active') filter.applicationStatus = { $in: activeStatuses };
      else if (req.query.status === 'pending') filter.applicationStatus = { $in: pendingStatuses };
      else filter.applicationStatus = req.query.status;
    }

    const applications = await Application.find(filter).sort({ createdAt: -1 });
    const format = req.query.format || 'csv';

    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const fields = [
        { label: 'Student Name', value: 'studentName' },
        { label: 'Roll Number', value: 'studentRollNumber' },
        { label: 'Email', value: 'studentEmail' },
        { label: 'Wing', value: 'studentWing' },
        { label: 'Degree', value: 'studentDegree' },
        { label: 'Status', value: 'applicationStatus' },
        { label: 'Applied At', value: row => new Date(row.createdAt).toLocaleDateString() }
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(applications);
      res.header('Content-Type', 'text/csv');
      res.attachment('applications.csv');
      return res.send(csv);
    }

    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      res.header('Content-Type', 'application/pdf');
      res.attachment('applications.pdf');
      doc.pipe(res);

      doc.fontSize(18).text('Student Application Records', { align: 'center' });
      doc.moveDown();

      const headers = ['Name', 'ID', 'Email', 'Wing', 'Degree', 'Status', 'Date'];
      const colWidths = [120, 70, 150, 50, 100, 80, 70];
      let y = doc.y;
      let x = 40;

      doc.fontSize(10).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: colWidths[i] });
        x += colWidths[i] + 10;
      });

      doc.font('Helvetica').fontSize(9);
      y += 20;

      applications.forEach((a) => {
        if (y > 550) {
          doc.addPage();
          y = 40;
        }
        x = 40;
        const vals = [
          a.studentName,
          a.studentRollNumber,
          a.studentEmail,
          a.studentWing,
          a.studentDegree,
          a.applicationStatus,
          new Date(a.createdAt).toLocaleDateString()
        ];
        vals.forEach((v, i) => {
          doc.text(String(v || '-'), x, y, { width: colWidths[i] });
          x += colWidths[i] + 10;
        });
        y += 18;
      });

      doc.end();
      return;
    }

    res.status(400).json({ error: 'Invalid format' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// retrieve a single application by ID
async function getApplicationById(req, res) {
  try {
    const app = await Application.findById(req.params.id)
      .populate('student', 'phoneNumber profilePicture');
    if (!app) return res.status(404).json({ error: "Application not found" });
    res.status(200).json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


// finance manager approves or rejects payment slip
async function updatePaymentStatus(req, res) {
  try {
    const { status } = req.body; // expected 'Approved' or 'Rejected'
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Not found" });
    if (status === "Approved") {
      app.applicationStatus = "Payment Approved";
    } else {
      app.applicationStatus = "Rejected";
    }
    await app.save();
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// warden allocates room after payment approved
async function allocateRoom(req, res) {
  try {
    const { room } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Not found" });
    if (app.applicationStatus !== "Payment Approved") {
      return res.status(400).json({ error: "Payment not approved" });
    }
    app.assignedRoom = room;
    app.applicationStatus = "Room Allocated";
    await app.save();
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// general update of an application (admin/finance/warden)
async function updateApplication(req, res) {
  try {
    const updates = req.body;
    const before = await Application.findById(req.params.id);
    const app = await Application.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });

    if (!app) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (before && app.student) {
      const statusChanged = before.applicationStatus !== app.applicationStatus;
      if (statusChanged) {
        // Sync User accountStatus if student exists
        let accountStatus = null;
        if (app.applicationStatus === "Activated") accountStatus = "verified";
        else if (["Deactivated", "Rejected"].includes(app.applicationStatus)) accountStatus = "suspended";

        if (accountStatus) {
          await User.findByIdAndUpdate(app.student, { accountStatus });
        }
      }
    }

    res.json(app);
  } catch (error) {
    console.error("updateApplication Error:", error);
    res.status(500).json({ error: error.message });
  }
}


// student updates own application
async function updateMyApplication(req, res) {
  try {
    const updates = normalizeApplicationPayload(req.body);
    const validationError = validateApplicationData(updates);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Use robust 3-layer lookup — includes the SLIIT email from the form body
    const existing = await findMyApplication(req.user.id, updates.studentEmail);
    if (!existing) return res.status(404).json({ error: "No application found for this student" });

    // If student ObjectId was missing, link it now for faster future lookups
    if (!existing.student) {
      existing.student = req.user.id;
    }

    // Preserve the existing roll number if not provided in the update
    if (!updates.studentRollNumber) {
      updates.studentRollNumber = existing.studentRollNumber;
    }

    // Auto-fix roll number prefix to match gender if needed
    if (updates.studentRollNumber && updates.gender) {
      const expectedPrefix = updates.gender === 'male' ? 'M' : 'F';
      if (!updates.studentRollNumber.toUpperCase().startsWith(expectedPrefix)) {
        const numPart = updates.studentRollNumber.replace(/^[A-Za-z]+/, '');
        updates.studentRollNumber = `${expectedPrefix}${numPart}`;
      }
    }

    // Protect system-only fields from being overwritten
    delete updates.student;
    delete updates.assignedRoom;
    delete updates.applicationStatus;

    const app = await Application.findByIdAndUpdate(
      existing._id,
      { ...updates, student: req.user.id },
      { returnDocument: 'after', runValidators: false }
    );
    if (!app) return res.status(404).json({ error: "No application found for this student" });

    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// delete an application
async function deleteApplication(req, res) {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Not found" });

    // Delete Cloudinary files
    if (app.medicalReportPublicId) {
      try { await cloudinary.uploader.destroy(app.medicalReportPublicId, { resource_type: 'raw' }); } catch (_) { }
    }
    if (app.paymentSlipPublicId) {
      try { await cloudinary.uploader.destroy(app.paymentSlipPublicId, { resource_type: 'image' }); } catch (_) { }
    }

    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// student deletes own application
async function deleteMyApplication(req, res) {
  try {
    // Use robust 3-layer lookup
    const existing = await findMyApplication(req.user.id, null);
    if (!existing) return res.status(404).json({ error: "No application found for this student" });

    // Delete Cloudinary files
    if (existing.medicalReportPublicId) {
      try { await cloudinary.uploader.destroy(existing.medicalReportPublicId, { resource_type: 'raw' }); } catch (_) { }
    }
    if (existing.paymentSlipPublicId) {
      try { await cloudinary.uploader.destroy(existing.paymentSlipPublicId, { resource_type: 'image' }); } catch (_) { }
    }

    await Application.findByIdAndDelete(existing._id);

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// public update by application id (no auth)
async function updatePublicApplication(req, res) {
  try {
    const updates = normalizeApplicationPayload(req.body);
    const validationError = validateApplicationData(updates);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (!updates.guardianName) {
      return res.status(400).json({
        error: "guardianName is required.",
      });
    }
    if (!isValidRollPrefixForGender(updates.studentRollNumber, updates.gender)) {
      const requiredPrefix = updates.gender === "male" ? "M" : "F";
      return res.status(400).json({
        error: `studentRollNumber must start with '${requiredPrefix}' for gender '${updates.gender}'.`,
      });
    }
    delete updates.student;
    delete updates.assignedRoom;
    delete updates.applicationStatus;

    const app = await Application.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!app) return res.status(404).json({ error: "Not found" });
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// public delete by application id (no auth)
async function deletePublicApplication(req, res) {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Not found" });

    // Delete Cloudinary files
    if (app.medicalReportPublicId) {
      try { await cloudinary.uploader.destroy(app.medicalReportPublicId, { resource_type: 'raw' }); } catch (_) { }
    }
    if (app.paymentSlipPublicId) {
      try { await cloudinary.uploader.destroy(app.paymentSlipPublicId, { resource_type: 'image' }); } catch (_) { }
    }

    await Application.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createApplication,
  getMyApplication,
  getAllApplications,

  updatePaymentStatus,
  allocateRoom,
  updateApplication,
  deleteApplication,
  updateMyApplication,
  deleteMyApplication,
  updatePublicApplication,
  deletePublicApplication,
  exportApplications,
  getApplicationById,
};

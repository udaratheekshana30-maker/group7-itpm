const QRLog = require("../models/QRLog.js");
const User = require("../models/User.js");
const StudentPayment = require("../models/StudentPayment.js");
const Allocation = require("../models/Allocation.js");
const Application = require("../models/Application.js");
const { getPinMeta, validatePin } = require("../utils/securityPin.js");

// Curfew by wing: male 22:30, female 20:30.
const getCurfewMinutes = (wing) => {
  if (String(wing || "").toLowerCase() === "female") return 20 * 60 + 30;
  return 22 * 60 + 30;
};

const minutesNow = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

const getConfiguredCurfewMinutes = (wing) => {
  const curfewHour = Number.parseInt(process.env.CURFEW_HOUR || "", 10);
  const curfewMinute = Number.parseInt(process.env.CURFEW_MINUTE || "", 10);
  const hasEnvCurfew = Number.isInteger(curfewHour) && Number.isInteger(curfewMinute);

  return hasEnvCurfew ? curfewHour * 60 + curfewMinute : getCurfewMinutes(wing);
};

// GET /api/qr/status/:studentId (public)
const getStudentQrStatus = async (req, res) => {
  try {
    const studentId = String(req.params.studentId || "").trim();
    if (!studentId) {
      return res.status(400).json({ success: false, message: "studentId is required" });
    }

    const student = await User.findOne({ 
      studentId: { $regex: new RegExp(`^${studentId}$`, 'i') } 
    }).select("_id studentId role");
    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const payment = await StudentPayment.findOne({ student: student._id }).select("_id").lean();
    const allocation = payment
      ? await Allocation.findOne({ student: payment._id }).select("_id").lean()
      : null;
    if (!allocation) {
      return res.status(404).json({ success: false, message: "Enter Correct Student ID" });
    }

    const latestLog = await QRLog.findOne({ studentUserId: student._id })
      .sort({ timestamp: -1 })
      .select("action timestamp");

    let status = "INSIDE";
    if (latestLog?.action === "exit") status = "OUTSIDE";
    if (latestLog?.action === "entry") status = "INSIDE";

    res.json({
      studentId: student.studentId,
      studentUserId: student._id,
      status,
      lastAction: latestLog ? latestLog.action.toUpperCase() : null,
      lastTime: latestLog ? latestLog.timestamp : null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/qr/scan
const logScan = async (req, res) => {
  try {
    const { studentId, action, destination, goingHome = false, securityPin } = req.body;
    const normalizedStudentId = String(studentId || "").trim();
    const normalizedAction = String(action || "").toLowerCase();
    const normalizedDestination = typeof destination === "string" ? destination.trim() : "";
    const normalizedSecurityPin = String(securityPin || "").trim();

    if (!normalizedStudentId || !normalizedAction) {
      return res.status(400).json({ success: false, message: "studentId and action are required" });
    }

    if (!normalizedSecurityPin) {
      return res.status(400).json({ success: false, message: "securityPin is required" });
    }

    if (!validatePin(normalizedSecurityPin)) {
      return res.status(400).json({ success: false, message: "Invalid or expired security PIN" });
    }

    if (!["entry", "exit"].includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: "action must be ENTRY or EXIT" });
    }

    if (normalizedAction === "exit" && !normalizedDestination) {
      return res.status(400).json({ success: false, message: "destination is required for exit" });
    }

    // ensure student exists
    const student = await User.findOne({ 
      studentId: { $regex: new RegExp(`^${normalizedStudentId}$`, 'i') } 
    }).select("_id studentId role");
    if (!student || student.role !== "student") {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Create log
    const log = await QRLog.create({
      studentId: student.studentId,
      studentUserId: student._id,
      action: normalizedAction,
      destination: normalizedAction === "exit" ? normalizedDestination : undefined,
      goingHome,
      scannedBy: req.user?._id
    });

    const payment = await StudentPayment.findOne({ student: student._id }).select("_id").lean();
    const allocation = payment
      ? await Allocation.findOne({ student: payment._id }).select("studentWing wing").lean()
      : null;
    const studentWing = allocation?.studentWing || allocation?.wing;

    // basic late flag (optional for response)
    let late = false;
    if (normalizedAction === "entry") {
      const curfew = getCurfewMinutes(studentWing);
      late = !goingHome && minutesNow() > curfew;
    }

    res.status(201).json({ message: "Scan logged", log, late });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSecurityPin = async (_req, res) => {
  try {
    res.json(getPinMeta());
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Determine “currently outside” = last action is exit (and not followed by entry)
const getOutsideStudents = async (req, res) => {
  try {
    const latest = await QRLog.aggregate([
      { $match: { studentUserId: { $exists: true, $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$studentUserId",
          studentId: { $first: "$studentId" },
          lastAction: { $first: "$action" },
          lastExitAt: { $first: "$createdAt" },
          destination: { $first: "$destination" },
          goingHome: { $first: "$goingHome" }
        }
      },
      { $match: { lastAction: "exit" } }
    ]);

    const nowMins = minutesNow();
    const userIds = latest.map((row) => row._id).filter(Boolean);
    const payments = await StudentPayment.find({ student: { $in: userIds } })
      .select("_id student")
      .lean();
    const paymentIdByUserId = new Map(
      payments.map((payment) => [String(payment.student), String(payment._id)])
    );

    const paymentIds = payments.map((payment) => payment._id);
    const allocations = await Allocation.find({ student: { $in: paymentIds } })
      .select("student studentName studentEmail studentWing wing")
      .lean();
    const allocationByPaymentId = new Map(
      allocations.map((allocation) => [
        String(allocation.student),
        allocation
      ])
    );

    const outside = latest.map((row) => ({
      student: (() => {
        const paymentId = paymentIdByUserId.get(String(row._id));
        const allocation = paymentId ? allocationByPaymentId.get(paymentId) : null;
        // In this version, we'll try to find any linked info, but we also look up Application separately if needed
        // but for now, we'll use the basic allocation info
        if (!allocation) return null;
        return {
          name: allocation.studentName,
          email: allocation.studentEmail,
          phoneNumber: allocation.contactNumber || null,
          studentId: row.studentId,
          wing: allocation.studentWing || allocation.wing,
          room: allocation.assignedRoom || allocation.roomnumber || 'N/A'
        };
      })(),
      lastExitAt: row.lastExitAt,
      destination: row.destination,
      goingHome: row.goingHome,
      isLate: !row.goingHome && nowMins > getConfiguredCurfewMinutes((() => {
        const paymentId = paymentIdByUserId.get(String(row._id));
        const allocation = paymentId ? allocationByPaymentId.get(paymentId) : null;
        return allocation?.studentWing || allocation?.wing;
      })())
    }));

    res.json({ outsideCount: outside.length, outside });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Late list: outside students + current time past curfew (simple version)
const getLateStudents = async (req, res) => {
  try {
    const outsideAgg = await QRLog.aggregate([
      { $match: { studentUserId: { $exists: true, $ne: null } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$studentUserId", studentId: { $first: "$studentId" }, last: { $first: "$$ROOT" } } },
      { $match: { "last.action": "exit", "last.goingHome": false } }
    ]);

    const userIds = outsideAgg.map((row) => row._id).filter(Boolean);
    const payments = await StudentPayment.find({ student: { $in: userIds } })
      .select("_id student")
      .lean();
    const paymentIdByUserId = new Map(
      payments.map((payment) => [String(payment.student), String(payment._id)])
    );

    const paymentIds = payments.map((payment) => payment._id);
    const allocations = await Allocation.find({ student: { $in: paymentIds } })
      .select("student studentName studentEmail studentWing wing")
      .lean();
    const allocationByPaymentId = new Map(
      allocations.map((allocation) => [
        String(allocation.student),
        allocation
      ])
    );

    const nowMins = minutesNow();
    const late = outsideAgg
      .map((row) => {
        const paymentId = paymentIdByUserId.get(String(row._id));
        const allocation = paymentId ? allocationByPaymentId.get(paymentId) : null;
        if (!allocation) return { student: null, curfew: getCurfewMinutes() };

        const student = {
          name: allocation.studentName,
          email: allocation.studentEmail,
          phoneNumber: null,
          studentId: row.studentId,
          wing: allocation.studentWing || allocation.wing
        };
        return { student, curfew: getCurfewMinutes(student.wing) };
      })
      .filter(({ student }) => Boolean(student))
      .filter(({ curfew }) => nowMins > curfew)
      .map(({ student }) => ({
        name: student.name,
        email: student.email,
        phoneNumber: student.phoneNumber,
        studentId: student.studentId
      }));

    res.json({ lateCount: late.length, lateStudents: late });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllLogs = async (req, res) => {
  try {
    const logs = await QRLog.find({})
      .populate("studentUserId", "name email studentId")
      .sort({ timestamp: -1 })
      .limit(200);

    // Batch fetch associated application details for these students
    const userIds = logs.map(l => l.studentUserId?._id).filter(Boolean);
    const applications = await Application.find({ student: { $in: userIds } })
      .select('student studentDegree studentWing assignedRoom contactNumber applicationStatus')
      .lean();

    const appByUserId = new Map(applications.map(a => [String(a.student), a]));

    const enrichedLogs = logs.map(log => {
      const app = appByUserId.get(String(log.studentUserId?._id));
      return {
        ...log.toObject(),
        studentDetails: app ? {
          degree: app.studentDegree,
          wing: app.studentWing,
          room: app.assignedRoom,
          phone: app.contactNumber,
          status: app.applicationStatus
        } : null
      };
    });

    res.json(enrichedLogs);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "student") {
      return res.status(403).json({ success: false, message: "Only students can check personal status" });
    }

    const latestLog = await QRLog.findOne({ studentUserId: req.user._id })
      .sort({ timestamp: -1 })
      .select("action timestamp destination goingHome");

    let status = "INSIDE";
    if (latestLog?.action === "exit") status = "OUTSIDE";
    if (latestLog?.action === "entry") status = "INSIDE";

    res.json({
      success: true,
      status,
      lastAction: latestLog ? latestLog.action.toUpperCase() : null,
      lastTime: latestLog ? latestLog.timestamp : null,
      destination: latestLog ? latestLog.destination : null,
      goingHome: latestLog ? latestLog.goingHome : false
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMovementStatsLogic = async () => {
    // 1. Get ALL active student allocations to ensure consistency
    const activeAllocations = await Allocation.find({}).select('student studentWing wing').lean();
    const activeStudentPaymentIds = activeAllocations.map(a => a.student);
    
    // 2. Map StudentPayment IDs back to User IDs (required for QRLog lookups)
    const activePayments = await StudentPayment.find({ _id: { $in: activeStudentPaymentIds } }).select('_id student').lean();
    const paymentIdToWing = new Map(activeAllocations.map(a => [String(a.student), a.studentWing || a.wing]));
    const activeUserIds = activePayments.map(p => p.student);

    // 3. Get latest QRLogs ONLY for these active residents
    const latestLogsAgg = await QRLog.aggregate([
        { $match: { studentUserId: { $in: activeUserIds } } },
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$studentUserId", lastAction: { $first: "$action" }, goingHome: { $first: "$goingHome" } } }
    ]);

    const maleStats = { studentsInside: 0, studentsOutside: 0, activeOvernight: 0 };
    const femaleStats = { studentsInside: 0, studentsOutside: 0, activeOvernight: 0 };

    const outsideByUserId = new Map(latestLogsAgg.filter(l => l.lastAction === 'exit').map(l => [String(l._id), l]));

    activePayments.forEach(p => {
        const userIdStr = String(p.student);
        const wing = paymentIdToWing.get(String(p._id));
        const logEntry = outsideByUserId.get(userIdStr);

        if (wing === 'male') {
            if (logEntry) {
                maleStats.studentsOutside++;
                if (logEntry.goingHome) maleStats.activeOvernight++;
            } else maleStats.studentsInside++; 
        } else if (wing === 'female') {
            if (logEntry) {
                femaleStats.studentsOutside++;
                if (logEntry.goingHome) femaleStats.activeOvernight++;
            } else femaleStats.studentsInside++;
        }
    });

    // Final wing-specific counts
    const totalMaleAlloc = activeAllocations.filter(a => (a.studentWing || a.wing) === 'male').length;
    const totalFemaleAlloc = activeAllocations.filter(a => (a.studentWing || a.wing) === 'female').length;

    maleStats.studentsInside = Math.max(0, totalMaleAlloc - maleStats.studentsOutside);
    femaleStats.studentsInside = Math.max(0, totalFemaleAlloc - femaleStats.studentsOutside);

    return {
        studentsInside: maleStats.studentsInside + femaleStats.studentsInside,
        studentsOutside: maleStats.studentsOutside + femaleStats.studentsOutside,
        activeOvernight: maleStats.activeOvernight + femaleStats.activeOvernight,
        maleStats,
        femaleStats
    };
};

module.exports = {
  getStudentQrStatus,
  logScan,
  getSecurityPin,
  getOutsideStudents,
  getLateStudents,
  getAllLogs,
  getMyStatus,
  getMovementStatsLogic
};

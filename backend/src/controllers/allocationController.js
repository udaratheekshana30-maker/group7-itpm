const Allocation = require('../models/Allocation');
const StudentPayment = require('../models/StudentPayment'); // Replaced FinancialPayment with StudentPayment
const Room = require('../models/Room');
const Floor = require('../models/Floor');
const Application = require('../models/Application'); // Moved Application import to top level
const { getMovementStatsLogic } = require('./qrController');
const User = require('../models/User');

// GET all allocations with filters
exports.getAllocations = async (req, res) => {
    try {
        const filter = {};
        if (req.query.wing) filter.wing = req.query.wing;
        if (req.query.floorNumber) filter.floorNumber = parseInt(req.query.floorNumber);
        if (req.query.roomType) filter.roomType = req.query.roomType;
        if (req.query.degree) filter.studentDegree = req.query.degree;
        if (req.query.fromDate || req.query.toDate) {
            filter.allocatedAt = {};
            if (req.query.fromDate) filter.allocatedAt.$gte = new Date(req.query.fromDate);
            if (req.query.toDate) filter.allocatedAt.$lte = new Date(req.query.toDate);
        }

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { studentName: searchRegex },
                { studentEmail: searchRegex },
                { studentRollNumber: searchRegex }
            ];
        }

        const allocations = await Allocation.find(filter)
            .sort({ allocatedAt: -1 })
            .lean();

        res.json(allocations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST allocate a bed to a student
exports.createAllocation = async (req, res) => {
    try {
        const { studentId, roomId, bedId } = req.body;

        const StudentPayment = require('../models/StudentPayment');
        const Application = require('../models/Application');

        const studentPayment = await StudentPayment.findById(studentId);
        if (!studentPayment) return res.status(404).json({ error: 'Student payment record not found' });

        let paymentStatus = 'pending';
        const st = studentPayment.refund_status || (studentPayment.refundPayment && studentPayment.refundPayment.paymentStatus);
        if (st === 'Accepted' || st === 'Approved') paymentStatus = 'success';
        else if (st === 'Rejected') paymentStatus = 'rejected';

        if (paymentStatus !== 'success') {
            return res.status(400).json({ error: 'Payment not verified' });
        }

        // Check if already allocated
        const existingAllocation = await Allocation.findOne({ studentRollNumber: studentPayment.rollNumber });
        if (existingAllocation) {
            return res.status(400).json({ error: 'Student already allocated' });
        }

        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        if (!room.isactive) return res.status(400).json({ error: 'Room is not active' });

        const bed = room.beds.find(b => b.bedId === bedId);
        if (!bed) return res.status(404).json({ error: 'Bed not found' });
        if (bed.isOccupied) return res.status(400).json({ error: 'Bed is already occupied' });

        // Get floor info
        const floor = await Floor.findById(room.floor);

        // Mark bed as occupied
        bed.isOccupied = true;
        bed.student = studentPayment._id; // Referencing StudentPayment ObjectId
        await room.save();

        const app = await Application.findOne({ studentRollNumber: studentPayment.rollNumber });

        // Create allocation record
        const allocation = await Allocation.create({
            student: studentPayment._id,
            studentRollNumber: studentPayment.rollNumber,
            studentName: studentPayment.studentName,
            studentEmail: studentPayment.email,
            studentDegree: app ? app.studentDegree : 'N/A',
            studentYear: app ? app.studentYear : 0,
            studentWing: studentPayment.wing,
            paymentStatus: paymentStatus,
            room: room._id,
            floorNumber: floor.floorNumber,
            roomnumber: room.roomnumber,
            roomType: room.type,
            bedId,
            wing: studentPayment.wing,
            allocatedBy: 'System'
        });

        // Update the Application record with formatted room number (M1/F1 style)
        if (app) {
            const wingPrefix = studentPayment.wing === 'female' ? 'F' : 'M';
            app.assignedRoom = `${wingPrefix}${room.roomnumber}`;
            app.applicationStatus = 'Room Allocated';
            await app.save();
        }

        res.status(201).json(allocation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// GET smart room suggestions
exports.getSuggestions = async (req, res) => {
    try {
        const { wing, degree } = req.query;
        if (!wing) return res.status(400).json({ error: 'Wing is required' });

        // Find active floors for the wing
        const activeFloors = await Floor.find({ wing, isactive: true });
        const floorIds = activeFloors.map(f => f._id);

        // Find rooms with available beds on active floors
        const rooms = await Room.find({
            floor: { $in: floorIds },
            wing,
            isactive: true,
            'beds.isOccupied': false
        }).populate('floor', 'floorNumber');

        // Check existing allocations to find rooms with same-degree students
        const suggestions = [];
        for (const room of rooms) {
            const availableBeds = room.beds.filter(b => !b.isOccupied);
            if (availableBeds.length === 0) continue;

            let degreeMatch = false;
            let isEmptyRoom = false;
            if (degree) {
                // Check if any existing allocation in this room matches the degree
                const existingAllocations = await Allocation.find({
                    room: room._id,
                    studentDegree: degree
                });
                if (existingAllocations.length > 0) {
                    degreeMatch = true;
                }
                
                // Also suggest empty rooms but mark them differently
                isEmptyRoom = room.beds.every(b => !b.isOccupied);
            }

            suggestions.push({
                room,
                availableBeds: availableBeds.map(b => b.bedId),
                degreeMatch,
                isEmptyRoom,
                floorNumber: room.floor.floorNumber
            });
        }

        // Sort: degree matches first, then by floor number
        suggestions.sort((a, b) => {
            if (a.degreeMatch !== b.degreeMatch) return b.degreeMatch - a.degreeMatch;
            return a.floorNumber - b.floorNumber;
        });

        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET export allocations as CSV or PDF
exports.exportAllocations = async (req, res) => {
    try {
        const filter = {};
        if (req.query.wing) filter.wing = req.query.wing;
        if (req.query.floorNumber) filter.floorNumber = parseInt(req.query.floorNumber);
        if (req.query.roomType) filter.roomType = req.query.roomType;
        if (req.query.degree) filter.studentDegree = req.query.degree;

        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { studentName: searchRegex },
                { studentEmail: searchRegex },
                { studentRollNumber: searchRegex }
            ];
        }

        const allocations = await Allocation.find(filter)
            .sort({ allocatedAt: -1 });

        const format = req.query.format || 'csv';

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Student Name', value: 'studentName' },
                { label: 'Degree', value: 'studentDegree' },
                { label: 'Wing', value: 'wing' },
                { label: 'Floor', value: 'floorNumber' },
                { label: 'Room', value: 'roomnumber' },
                { label: 'Room Type', value: 'roomType' },
                { label: 'Bed', value: 'bedId' },
                { label: 'Allocated At', value: row => new Date(row.allocatedAt).toLocaleDateString() }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(allocations);
            res.header('Content-Type', 'text/csv');
            res.attachment('allocations.csv');
            return res.send(csv);
        }

        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
            res.header('Content-Type', 'application/pdf');
            res.attachment('allocations.pdf');
            doc.pipe(res);

            doc.fontSize(18).text('Hostel Allocation Records', { align: 'center' });
            doc.moveDown();

            // Table headers
            const headers = ['Name', 'Degree', 'Wing', 'Floor', 'Room', 'Type', 'Bed', 'Date'];
            const colWidths = [120, 80, 60, 50, 50, 60, 40, 80];
            let y = doc.y;
            let x = 40;

            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((h, i) => {
                doc.text(h, x, y, { width: colWidths[i] });
                x += colWidths[i] + 10;
            });

            doc.font('Helvetica').fontSize(9);
            y += 20;

            allocations.forEach((a) => {
                if (y > 550) {
                    doc.addPage();
                    y = 40;
                }
                x = 40;
                const vals = [
                    a.studentName,
                    a.studentDegree,
                    a.wing,
                    String(a.floorNumber),
                    String(a.roomnumber),
                    a.roomType,
                    a.bedId,
                    new Date(a.allocatedAt).toLocaleDateString()
                ];
                vals.forEach((v, i) => {
                    doc.text(v, x, y, { width: colWidths[i] });
                    x += colWidths[i] + 10;
                });
                y += 18;
            });

            doc.end();
            return;
        }

        res.status(400).json({ error: 'Invalid format. Use csv or pdf' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET dashboard stats
exports.getStats = async (req, res) => {
    try {
        const totalRooms = await Room.countDocuments();
        const activeRooms = await Room.countDocuments({ isactive: true });
        const totalFloors = await Floor.countDocuments();

        // Count beds
        const rooms = await Room.find();
        let totalBeds = 0;
        let occupiedBeds = 0;
        rooms.forEach(r => {
            r.beds.forEach(b => {
                totalBeds++;
                if (b.isOccupied) occupiedBeds++;
            });
        });

        const totalStudents = await User.countDocuments({ role: 'student' });
        const paymentWaiting = await Application.countDocuments({ applicationStatus: 'Pending' });
        const readyToActivate = await Application.countDocuments({ applicationStatus: 'Payment Approved' });
        const totalAllocations = await Allocation.countDocuments();
        
        // --- Movement Stats (Status based) ---
        // Refactored to qrController for better structure
        const movementData = await getMovementStatsLogic();
        const { studentsInside, studentsOutside, activeOvernight } = movementData;

        // Per-floor occupancy
        const floors = await Floor.find().sort({ wing: 1, floorNumber: 1 });
        const floorStats = [];
        for (const floor of floors) {
            const floorRooms = await Room.find({ floor: floor._id });
            let floorBeds = 0;
            let floorOccupied = 0;
            floorRooms.forEach(r => {
                r.beds.forEach(b => {
                    floorBeds++;
                    if (b.isOccupied) floorOccupied++;
                });
            });
            floorStats.push({
                wing: floor.wing,
                floorNumber: floor.floorNumber,
                isactive: floor.isactive,
                totalBeds: floorBeds,
                occupiedBeds: floorOccupied,
                occupancyRate: floorBeds > 0 ? Math.round((floorOccupied / floorBeds) * 100) : 0
            });
        }

        // Process everything by wing
        const maleStats = {
            totalFloors: 0, totalRooms: 0, activeRooms: 0, totalBeds: 0, occupiedBeds: 0, availableBeds: 0,
            totalStudents: 0, paymentWaiting: 0, readyToActivate: 0, totalAllocations: 0,
            ...movementData.maleStats
        };
        const femaleStats = {
            totalFloors: 0, totalRooms: 0, activeRooms: 0, totalBeds: 0, occupiedBeds: 0, availableBeds: 0,
            totalStudents: 0, paymentWaiting: 0, readyToActivate: 0, totalAllocations: 0,
            ...movementData.femaleStats
        };

        // Helper to aggregate
        const agg = (target, source) => {
            target.totalFloors++;
            target.totalBeds += source.totalBeds;
            target.occupiedBeds += source.occupiedBeds;
        };

        floorStats.forEach(f => {
            if (f.wing === 'male') agg(maleStats, f);
            else if (f.wing === 'female') agg(femaleStats, f);
        });

        // Calculate derived stats for wings
        [maleStats, femaleStats].forEach(s => {
            s.availableBeds = s.totalBeds - s.occupiedBeds;
            s.occupancyRate = s.totalBeds > 0 ? Math.round((s.occupiedBeds / s.totalBeds) * 100) : 0;
        });

        // We need activeRooms count per wing
        const maleRooms = await Room.find({ wing: 'male' });
        const femaleRooms = await Room.find({ wing: 'female' });
        maleStats.totalRooms = maleRooms.length;
        maleStats.activeRooms = maleRooms.filter(r => r.isactive).length;
        femaleStats.totalRooms = femaleRooms.length;
        femaleStats.activeRooms = femaleRooms.filter(r => r.isactive).length;

        // Student stats by wing (from Application model)
        const maleStudentsFiltered = await Application.find({ studentWing: 'male' });
        const femaleStudentsFiltered = await Application.find({ studentWing: 'female' });

        maleStats.totalStudents = maleStudentsFiltered.length;
        maleStats.paymentWaiting = maleStudentsFiltered.filter(s => s.applicationStatus === 'Pending').length;
        maleStats.readyToActivate = maleStudentsFiltered.filter(s => s.applicationStatus === 'Payment Approved').length;

        femaleStats.totalStudents = femaleStudentsFiltered.length;
        femaleStats.paymentWaiting = femaleStudentsFiltered.filter(s => s.applicationStatus === 'Pending').length;
        femaleStats.readyToActivate = femaleStudentsFiltered.filter(s => s.applicationStatus === 'Payment Approved').length;

        maleStats.totalAllocations = await Allocation.countDocuments({ studentWing: 'male' });
        femaleStats.totalAllocations = await Allocation.countDocuments({ studentWing: 'female' });

        res.json({
            totalRooms,
            activeRooms,
            totalFloors,
            totalBeds,
            occupiedBeds,
            availableBeds: totalBeds - occupiedBeds,
            occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
            totalStudents,
            paymentWaiting,
            readyToActivate,
            totalAllocations,
            studentsInside,
            studentsOutside,
            activeOvernight,
            floorStats,
            maleStats,
            femaleStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE allocation
exports.deleteAllocation = async (req, res) => {
    try {
        const allocation = await Allocation.findById(req.params.id);
        if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

        // Find the room to free the bed
        let room;
        if (allocation.room) {
            room = await Room.findById(allocation.room);
        } else {
            room = await Room.findOne({
                wing: allocation.wing,
                floorNumber: allocation.floorNumber,
                roomnumber: allocation.roomnumber
            });
        }

        if (room) {
            const bed = room.beds.find(b => b.bedId === allocation.bedId);
            if (bed) {
                bed.isOccupied = false;
                bed.student = null;
                await room.save();
            }
        }

        await Allocation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Allocation deleted and bed freed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT update allocation (change room/bed)
exports.updateAllocation = async (req, res) => {
    try {
        const { roomId, bedId } = req.body;
        const allocation = await Allocation.findById(req.params.id);
        if (!allocation) return res.status(404).json({ error: 'Allocation not found' });

        // If room or bed is changing
        if (roomId !== String(allocation.room) || bedId !== allocation.bedId) {
            // 1. Free the old bed
            let oldRoom;
            if (allocation.room) {
                oldRoom = await Room.findById(allocation.room);
            } else {
                oldRoom = await Room.findOne({
                    wing: allocation.wing,
                    floorNumber: allocation.floorNumber,
                    roomnumber: allocation.roomnumber
                });
            }

            if (oldRoom) {
                const oldBed = oldRoom.beds.find(b => b.bedId === allocation.bedId);
                if (oldBed) {
                    oldBed.isOccupied = false;
                    oldBed.student = null;
                    await oldRoom.save();
                }
            }

            // 2. Occupy the new bed
            const newRoom = await Room.findById(roomId);
            if (!newRoom) return res.status(404).json({ error: 'New room not found' });
            if (!newRoom.isactive) return res.status(400).json({ error: 'New room is not active' });

            const newBed = newRoom.beds.find(b => b.bedId === bedId);
            if (!newBed) return res.status(404).json({ error: 'New bed not found' });
            if (newBed.isOccupied) return res.status(400).json({ error: 'New bed is already occupied' });

            newBed.isOccupied = true;
            newBed.student = allocation.student;
            await newRoom.save();

            // 3. Update allocation record
            // Get floor info for the new room
            const floor = await Floor.findById(newRoom.floor);

            allocation.room = newRoom._id;
            allocation.floorNumber = newRoom.floorNumber;
            allocation.roomnumber = newRoom.roomnumber;
            allocation.roomType = newRoom.type;
            allocation.bedId = bedId;
        }

        await allocation.save();
        res.json(allocation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// GET unique degrees from allocations
exports.getUniqueDegrees = async (req, res) => {
    try {
        const degrees = await Allocation.distinct('studentDegree');
        res.json(degrees.filter(Boolean).sort());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET current student's allocation
exports.getMyAllocation = async (req, res) => {
    try {
        // Find allocation by student ID or email
        // Based on createAllocation, we use studentPayment._id (which is saved in allocation.student)
        // However, User model has studentId or we can use email match.
        // Let's try email match first as it's reliable across collections.
        const allocation = await Allocation.findOne({ studentEmail: req.user.email });
        
        if (!allocation) {
            return res.status(404).json({ success: false, message: 'No allocation found for this student' });
        }
        
        res.json({ success: true, data: allocation });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

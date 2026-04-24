const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const Floor = require('../models/Floor');
const StudentPayment = require('../models/StudentPayment');
const Application = require('../models/Application');

// GET /api/room-booking/available
exports.getAvailableRooms = async (req, res) => {
    try {
        const { wing } = req.query; // 'male' or 'female'
        
        const rooms = await Room.find({ 
            wing, 
            isactive: true,
            'beds.isOccupied': false 
        })
        .populate('floor', 'floorNumber')
        .sort({ floorNumber: 1, roomnumber: 1 })
        .lean();

        res.json({ success: true, data: rooms });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/room-booking/book
exports.bookRoom = async (req, res) => {
    try {
        const { roomId, bedId } = req.body;
        const studentId = req.user._id;

        // 1. Check if student has a verified payment record
        const studentPayment = await StudentPayment.findOne({ student: studentId });
        if (!studentPayment) {
            return res.status(400).json({ 
                success: false, 
                message: 'No payment record found. Please submit your payment first.' 
            });
        }

        // Check refund/payment status
        const st = studentPayment.refund_status || (studentPayment.refundPayment && studentPayment.refundPayment.paymentStatus);
        const isVerified = (st === 'Accepted' || st === 'Approved');

        if (!isVerified) {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment not verified by the financial department.' 
            });
        }

        // 2. Check if student is already allocated
        const existingAllocation = await Allocation.findOne({ studentRollNumber: studentPayment.rollNumber });
        if (existingAllocation) {
            return res.status(400).json({ 
                success: false, 
                message: `You are already allocated to Room ${existingAllocation.roomnumber}, Bed ${existingAllocation.bedId}` 
            });
        }

        // 3. Find Room and Bed
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
        if (!room.isactive) return res.status(400).json({ success: false, message: 'Room is currently disabled' });

        // Check wing mismatch
        if (room.wing !== studentPayment.wing) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot book room in ${room.wing} wing (Your wing: ${studentPayment.wing})` 
            });
        }

        const bed = room.beds.find(b => b.bedId === bedId);
        if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
        if (bed.isOccupied) return res.status(400).json({ success: false, message: 'Bed is already occupied' });

        // 4. Atomic Transaction Logic (Manual)
        const floor = await Floor.findById(room.floor);
        const app = await Application.findOne({ studentRollNumber: studentPayment.rollNumber });

        // Update Room Bed status
        bed.isOccupied = true;
        bed.student = studentPayment._id;
        await room.save();

        // Create Allocation
        const allocation = await Allocation.create({
            student: studentPayment._id,
            studentRollNumber: studentPayment.rollNumber,
            studentName: studentPayment.studentName,
            studentEmail: studentPayment.email,
            studentDegree: app ? app.studentDegree : 'N/A',
            studentYear: app ? app.studentYear : 1,
            studentWing: studentPayment.wing,
            paymentStatus: 'success',
            room: room._id,
            floorNumber: floor.floorNumber,
            roomnumber: room.roomnumber,
            roomType: room.type,
            bedId,
            wing: studentPayment.wing,
            allocatedBy: 'Student Self-Service'
        });

        res.json({ 
            success: true, 
            message: `Successfully booked Room ${room.roomnumber}, Bed ${bedId}`,
            data: allocation 
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

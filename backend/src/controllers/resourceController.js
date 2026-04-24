const Facility = require('../models/Facility');
const ResourceBooking = require('../models/ResourceBooking');
const Notification = require('../models/Notification');

const TIME_SLOTS = [
    '06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00',
    '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00',
    '18:00 - 20:00', '20:00 - 22:00'
];

// Seed initial facilities if empty
const seedFacilities = async () => {
    try {
        const count = await Facility.countDocuments();
        if (count === 0) {
            await Facility.insertMany([
                { name: 'Gym', description: 'State-of-the-art fitness center with premium equipment', icon: 'HiOutlineBolt', capacity: 10, location: 'Block A, Level 1' },
                { name: 'Study Area', description: 'Quiet space for focused learning and group discussions', icon: 'HiOutlineBookOpen', capacity: 20, location: 'Block B, Level 2' },
                { name: 'Music Room', description: 'Soundproof room with various musical instruments', icon: 'HiOutlineMusicalNote', capacity: 5, location: 'Block C, Level 1' },
                { name: 'TV Lounge', description: 'Comfortable area for recreation and entertainment', icon: 'HiOutlineTv', capacity: 15, location: 'Block A, Ground Floor' }
            ]);
            console.log('Facility seeding completed successfully');
        }
    } catch (err) {
        console.error('Facility seeding failed:', err);
    }
};
seedFacilities();

// GET /api/resources/list
exports.getResources = async (req, res) => {
    try {
        const facilities = await Facility.find({ isActive: true });
        res.json({ success: true, data: facilities });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/resources/admin/add (Admin Only)
exports.addResource = async (req, res) => {
    try {
        const facility = await Facility.create(req.body);
        res.status(201).json({ success: true, data: facility, message: 'Facility added successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// GET /api/resources/availability?date=YYYY-MM-DD
exports.getAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

        const facilities = await Facility.find({ isActive: true });
        const bookings = await ResourceBooking.find({ 
            date, 
            status: { $in: ['pending', 'approved', 'completed'] } 
        });

        const grid = {};
        facilities.forEach(r => {
            grid[r.name] = {};
            TIME_SLOTS.forEach(slot => {
                const slotBookings = bookings.filter(b => b.resourceName === r.name && b.slot === slot);
                const myBooking = slotBookings.find(b => b.student.toString() === req.user._id.toString());
                
                grid[r.name][slot] = {
                    capacity: r.capacity,
                    bookedCount: slotBookings.length,
                    available: r.capacity - slotBookings.length,
                    myBooking: myBooking || null
                };
            });
        });

        res.json({ success: true, data: { grid, slots: TIME_SLOTS, resources: facilities } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/resources/book
exports.bookResource = async (req, res) => {
    try {
        const { resourceName, date, slot, purpose, participants } = req.body;
        
        const facility = await Facility.findOne({ name: resourceName, isActive: true });
        if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

        const existingBookings = await ResourceBooking.countDocuments({ 
            resourceName, 
            date, 
            slot, 
            status: { $in: ['approved', 'pending'] } 
        });

        if (existingBookings >= facility.capacity) {
            return res.status(400).json({ success: false, message: 'This slot is already full' });
        }

        const accessId = `ACC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const booking = await ResourceBooking.create({
            student: req.user._id,
            studentName: req.user.name,
            studentId: req.user.studentId,
            resourceName,
            date,
            slot,
            purpose,
            participants: participants || 1,
            qrCode: accessId,
            status: 'pending'
        });

        res.status(201).json({ 
            success: true, 
            data: booking, 
            message: 'Booking request sent! Waiting for admin approval.' 
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                message: 'You already have a request for this facility at this time slot!' 
            });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/resources/my-bookings
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await ResourceBooking.find({ student: req.user._id }).sort({ date: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin Controllers
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await ResourceBooking.find().sort({ createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await ResourceBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.status = status;
        booking.approvedBy = req.user._id;
        await booking.save();

        // Create notification for student
        await Notification.create({
            user: booking.student,
            title: `Booking ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
            message: `Your request for ${booking.resourceName} on ${booking.date} (${booking.slot}) has been ${status}.`,
            type: 'booking_update'
        });

        res.json({ success: true, data: booking, message: `Booking ${status} successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteBooking = async (req, res) => {
    try {
        await ResourceBooking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Record deleted permanently' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelBooking = async (req, res) => {
    try {
        const booking = await ResourceBooking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        
        // Security: Ensure student can only delete their own booking
        if (booking.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await ResourceBooking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteResource = async (req, res) => {
    try {
        await Facility.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Facility deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
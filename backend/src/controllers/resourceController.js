const ResourceBooking = require('../models/ResourceBooking');

// Configuration for facilities
const FACILITIES = {
    'Gym': { capacity: 10, icon: 'HiOutlineBolt' },
    'Study Area': { capacity: 20, icon: 'HiOutlineBookOpen' },
    'Music Room': { capacity: 3, icon: 'HiOutlineMusicalNote' },
    'TV Lounge': { capacity: 15, icon: 'HiOutlineTv' }
};

const SLOTS = [
    "06:00 - 08:00",
    "08:00 - 10:00",
    "10:00 - 12:00",
    "12:00 - 14:00",
    "14:00 - 16:00",
    "16:00 - 18:00",
    "18:00 - 20:00",
    "20:00 - 22:00"
];

// @desc    Get resource availability
// @route   GET /api/resources/availability
exports.getAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

        const bookings = await ResourceBooking.find({ date, status: 'booked' });

        // Build a grid of availability
        const availabilityGrid = {};
        Object.keys(FACILITIES).forEach(facility => {
            availabilityGrid[facility] = {};
            SLOTS.forEach(slot => {
                const slotBookings = bookings.filter(b => b.resourceName === facility && b.slot === slot);
                availabilityGrid[facility][slot] = {
                    bookedCount: slotBookings.length,
                    capacity: FACILITIES[facility].capacity,
                    available: FACILITIES[facility].capacity - slotBookings.length,
                    myBooking: slotBookings.find(b => b.student.toString() === req.user._id.toString())
                };
            });
        });

        res.json({
            success: true,
            data: {
                date,
                facilities: Object.keys(FACILITIES),
                slots: SLOTS,
                grid: availabilityGrid
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Book a resource slot
// @route   POST /api/resources/book
exports.bookResource = async (req, res) => {
    try {
        const { resourceName, date, slot } = req.body;

        if (!FACILITIES[resourceName]) {
            return res.status(400).json({ success: false, message: 'Invalid resource' });
        }

        // Check capacity
        const bookings = await ResourceBooking.countDocuments({ resourceName, date, slot, status: 'booked' });
        if (bookings >= FACILITIES[resourceName].capacity) {
            return res.status(400).json({ success: false, message: 'Slot is full' });
        }

        // Check if student already booked this slot
        const existing = await ResourceBooking.findOne({ 
            student: req.user._id, 
            resourceName, 
            date, 
            slot,
            status: 'booked'
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'You already have a booking for this slot' });
        }

        const newBooking = new ResourceBooking({
            student: req.user._id,
            studentName: req.user.name,
            studentId: req.user.studentId || req.user.email.split('@')[0],
            resourceName,
            date,
            slot
        });

        await newBooking.save();
        res.status(201).json({ success: true, message: 'Booking successful', data: newBooking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get my bookings
// @route   GET /api/resources/my-bookings
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await ResourceBooking.find({ student: req.user._id }).sort({ date: -1, slot: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Cancel booking
// @route   DELETE /api/resources/cancel/:id
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await ResourceBooking.findOne({ _id: req.params.id, student: req.user._id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.status = 'cancelled';
        await booking.save();
        res.json({ success: true, message: 'Booking cancelled' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get all bookings (Staff)
// @route   GET /api/resources/all
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await ResourceBooking.find().sort({ date: -1, slot: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Update status (Staff)
// @route   PATCH /api/resources/status/:id
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await ResourceBooking.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({ success: true, message: 'Status updated', data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
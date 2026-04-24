const LaundryBooking = require('../models/LaundryBooking');
const LaundryConfig = require('../models/LaundryConfig');

let WASHERS = 4;
let DRYERS = 2;

// Load initial config
const loadConfig = async () => {
    try {
        let config = await LaundryConfig.findOne();
        if (!config) {
            config = await LaundryConfig.create({ washerCount: 4, dryerCount: 2 });
        }
        WASHERS = config.washerCount;
        DRYERS = config.dryerCount;
    } catch (err) {
        console.error('Error loading laundry config:', err);
    }
};
loadConfig();
const TIME_SLOTS = [
    '06:00 - 07:00', '07:00 - 08:00', '08:00 - 09:00',
    '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
    '12:00 - 13:00', '13:00 - 14:00', '14:00 - 15:00',
    '15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00',
    '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00'
];

// GET /api/laundry/availability?date=YYYY-MM-DD
const getAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

        // Auto-complete past bookings for today
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        if (date === todayStr) {
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();

            const activeBookings = await LaundryBooking.find({ 
                date, 
                status: { $in: ['booked', 'in-progress'] } 
            });

            for (const b of activeBookings) {
                const endTimeStr = b.slot.split(' - ')[1]; // e.g. "07:00"
                const [endH, endM] = endTimeStr.split(':').map(Number);
                
                if (currentHour > endH || (currentHour === endH && currentMin >= endM)) {
                    b.status = 'completed';
                    await b.save();
                }
            }
        }

        const bookings = await LaundryBooking.find({ date, status: { $ne: 'cancelled' } })
            .populate('student', 'name studentId');

        // Build a grid for Washers
        const washerGrid = {};
        for (let m = 1; m <= WASHERS; m++) {
            washerGrid[m] = {};
            TIME_SLOTS.forEach(slot => { washerGrid[m][slot] = null; });
        }

        // Build a grid for Dryers
        const dryerGrid = {};
        for (let m = 1; m <= DRYERS; m++) {
            dryerGrid[m] = {};
            TIME_SLOTS.forEach(slot => { dryerGrid[m][slot] = null; });
        }

        bookings.forEach(b => {
            if (b.machineType === 'Washing Machine' && washerGrid[b.machineId]) {
                washerGrid[b.machineId][b.slot] = b;
            } else if (b.machineType === 'Dryer' && dryerGrid[b.machineId]) {
                dryerGrid[b.machineId][b.slot] = b;
            }
        });

        res.json({ 
            success: true, 
            data: { 
                washerGrid, 
                dryerGrid, 
                slots: TIME_SLOTS, 
                washerCount: WASHERS, 
                dryerCount: DRYERS 
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/laundry/book
const bookSlot = async (req, res) => {
    try {
        const { machineId, machineType, date, slot, notes, phoneNumber, department, studentYear } = req.body;
        if (!machineId || !machineType || !date || !slot)
            return res.status(400).json({ success: false, message: 'machineId, machineType, date and slot are required' });

        const maxMachines = machineType === 'Washing Machine' ? WASHERS : DRYERS;
        if (machineId < 1 || machineId > maxMachines)
            return res.status(400).json({ success: false, message: `Invalid Machine ID for ${machineType}` });

        if (!TIME_SLOTS.includes(slot))
            return res.status(400).json({ success: false, message: 'Invalid time slot' });

        // Check if student already has an active booking (limit: 1 at a time)
        const activeBooking = await LaundryBooking.findOne({
            student: req.user._id, 
            status: { $in: ['booked', 'in-progress'] }
        });
        if (activeBooking)
            return res.status(400).json({ 
                success: false, 
                message: 'You already have an active booking. You can only book one machine at a time.' 
            });

        const booking = await LaundryBooking.create({
            student: req.user._id,
            studentName: req.user.name,
            studentId: req.user.studentId,
            machineId,
            machineType,
            date,
            slot,
            price: 250,
            phoneNumber,
            department,
            studentYear,
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: booking, message: 'Slot booked successfully! Price: LKR 250' });
    } catch (err) {
        if (err.code === 11000)
            return res.status(400).json({ success: false, message: 'That machine is already booked for this slot.' });
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/laundry/my-bookings
const getMyBookings = async (req, res) => {
    try {
        const bookings = await LaundryBooking.find({ student: req.user._id })
            .sort({ date: -1, slot: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/laundry/cancel/:id
const cancelBooking = async (req, res) => {
    try {
        const booking = await LaundryBooking.findOne({ _id: req.params.id, student: req.user._id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        
        if (booking.status === 'cancelled')
            return res.status(400).json({ success: false, message: 'Already cancelled' });

        booking.status = 'cancelled';
        await booking.save();
        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin/Warden Controllers
const getAllBookings = async (req, res) => {
    try {
        const bookings = await LaundryBooking.find().populate('student', 'name email studentId').sort({ date: -1, slot: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
        const update = {};
        if (status) update.status = status;
        if (paymentStatus) update.paymentStatus = paymentStatus;

        const booking = await LaundryBooking.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        res.json({ success: true, data: booking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateBooking = async (req, res) => {
    try {
        const { phoneNumber, department, studentYear, notes } = req.body;
        const booking = await LaundryBooking.findOne({ _id: req.params.id, student: req.user._id });
        
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status === 'cancelled' || booking.status === 'completed')
            return res.status(400).json({ success: false, message: 'Cannot update a cancelled or completed booking' });

        if (phoneNumber) booking.phoneNumber = phoneNumber;
        if (department) booking.department = department;
        if (studentYear) booking.studentYear = studentYear;
        if (notes !== undefined) booking.notes = notes;

        await booking.save();
        res.json({ success: true, data: booking, message: 'Booking updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const markAsDone = async (req, res) => {
    try {
        const booking = await LaundryBooking.findOne({ _id: req.params.id, student: req.user._id });
        
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status !== 'booked' && booking.status !== 'in-progress')
            return res.status(400).json({ success: false, message: 'Booking is already completed or cancelled' });

        booking.status = 'completed';
        await booking.save();
        res.json({ success: true, data: booking, message: 'Slot marked as completed. Thank you!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const updateConfig = async (req, res) => {
    try {
        const { washerCount, dryerCount } = req.body;
        let config = await LaundryConfig.findOne();
        if (!config) {
            config = new LaundryConfig();
        }

        if (washerCount !== undefined) config.washerCount = washerCount;
        if (dryerCount !== undefined) config.dryerCount = dryerCount;
        config.updatedBy = req.user._id;
        config.lastUpdated = new Date();

        await config.save();
        
        // Update local variables
        WASHERS = config.washerCount;
        DRYERS = config.dryerCount;

        res.json({ success: true, data: config, message: 'Laundry configuration updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getConfig = async (req, res) => {
    try {
        let config = await LaundryConfig.findOne();
        if (!config) {
            config = { washerCount: 4, dryerCount: 2 };
        }
        res.json({ success: true, data: config });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const booking = await LaundryBooking.findOne({ _id: req.params.id, student: req.user._id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        
        booking.paymentStatus = 'paid';
        await booking.save();
        res.json({ success: true, data: booking, message: 'Payment confirmed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getAvailability,
    bookSlot,
    getMyBookings,
    cancelBooking,
    updateBooking,
    markAsDone,
    confirmPayment,
    getAllBookings,
    updateStatus,
    updateConfig,
    getConfig
};

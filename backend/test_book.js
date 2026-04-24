const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Room = require('./src/models/Room');

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'student@my.dorm.lk' });
    const room = await Room.findOne({ wing: 'male', isactive: true, 'beds.isOccupied': false });
    
    if(!room) {
        console.log("No room found!");
        return mongoose.disconnect();
    }
    
    const bedId = room.beds.find(b => !b.isOccupied).bedId;
    console.log(`Testing booking for User ${user._id} in Room ${room._id} Bed ${bedId}`);

    const res = await fetch(`http://127.0.0.1:5001/api/room-booking/book`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token || 'placeholder'}` // we need a valid token to test the API directly
        },
        body: JSON.stringify({ roomId: room._id, bedId })
    });
    
    // Actually, to test the API directly with a token, we might need to sign a token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'hostel_secret_key_2026', { expiresIn: '30d' });

    const res2 = await fetch(`http://127.0.0.1:5001/api/room-booking/book`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomId: room._id, bedId })
    });
    
    const data = await res2.json();
    console.log("Result:", data);
    mongoose.disconnect();
}
check();

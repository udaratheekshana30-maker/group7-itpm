const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Room = require('./src/models/Room');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        const rooms = await Room.find({}).lean();
        console.log(`Total rooms found: ${rooms.length}`);
        
        const activeRooms = rooms.filter(r => r.isactive);
        console.log(`Active rooms: ${activeRooms.length}`);
        
        const maleRooms = activeRooms.filter(r => r.wing === 'male');
        console.log(`Active male rooms: ${maleRooms.length}`);
        
        const femaleRooms = activeRooms.filter(r => r.wing === 'female');
        console.log(`Active female rooms: ${femaleRooms.length}`);

        if (maleRooms.length > 0) {
            console.log("Sample male room:", maleRooms[0].Roomid, maleRooms[0].beds);
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

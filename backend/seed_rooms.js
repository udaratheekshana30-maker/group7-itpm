const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Floor = require('./src/models/Floor');
const Room = require('./src/models/Room');

dotenv.config();

const seedRooms = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Create Floors
        let maleFloor = await Floor.findOne({ wing: 'male', floorNumber: 1 });
        if (!maleFloor) {
            maleFloor = await Floor.create({
                floorID: 'F-M1',
                wing: 'male',
                floorNumber: 1
            });
            console.log("Male Floor created");
        }

        let femaleFloor = await Floor.findOne({ wing: 'female', floorNumber: 1 });
        if (!femaleFloor) {
            femaleFloor = await Floor.create({
                floorID: 'F-F1',
                wing: 'female',
                floorNumber: 1
            });
            console.log("Female Floor created");
        }

        // Create Rooms for Male Floor
        for (let i = 1; i <= 3; i++) {
            const roomNum = 100 + i;
            const existingRoom = await Room.findOne({ Roomid: `R-M${roomNum}` });
            if (!existingRoom) {
                await Room.create({
                    Roomid: `R-M${roomNum}`,
                    floorid: maleFloor.floorID,
                    floor: maleFloor._id,
                    floorNumber: 1,
                    wing: 'male',
                    roomnumber: roomNum,
                    type: 'double',
                    beds: [
                        { bedId: 'A', isOccupied: false },
                        { bedId: 'B', isOccupied: false }
                    ]
                });
                console.log(`Created Male Room ${roomNum}`);
            }
        }

        // Create Rooms for Female Floor
        for (let i = 4; i <= 6; i++) {
            const roomNum = 100 + i;
            const existingRoom = await Room.findOne({ Roomid: `R-F${roomNum}` });
            if (!existingRoom) {
                await Room.create({
                    Roomid: `R-F${roomNum}`,
                    floorid: femaleFloor.floorID,
                    floor: femaleFloor._id,
                    floorNumber: 1,
                    wing: 'female',
                    roomnumber: roomNum,
                    type: 'double',
                    beds: [
                        { bedId: 'A', isOccupied: false },
                        { bedId: 'B', isOccupied: false }
                    ]
                });
                console.log(`Created Female Room ${roomNum}`);
            }
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedRooms();

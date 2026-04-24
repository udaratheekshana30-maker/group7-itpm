const Floor = require('../models/Floor');
const Room = require('../models/Room');
const Resource = require('../models/Resource');

// GET all floors (filter by wing)
exports.getFloors = async (req, res) => {
    try {
        const filter = {};
        if (req.query.wing) filter.wing = req.query.wing;
        const floors = await Floor.find(filter).sort({ floorNumber: 1 });
        res.json(floors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST create a new floor with default rooms
exports.createFloor = async (req, res) => {
    try {
        const { wing, floorNumber } = req.body;

        // Generate floorID: FLR- + WingInitial + 2-digit padded number
        const wingInitial = wing.charAt(0).toUpperCase();
        const floorID = `FLR-${wingInitial}${String(floorNumber).padStart(2, '0')}`;

        const floor = await Floor.create({
            floorID,
            wing,
            floorNumber,
            isactive: true,
            disableReason: null
        });

        // Generate start number for Roomids
        const lastRoom = await Room.findOne().sort({ Roomid: -1 });
        let nextRoomNum = 1;
        if (lastRoom && lastRoom.Roomid) {
            const matches = lastRoom.Roomid.match(/\d+/);
            if (matches) nextRoomNum = parseInt(matches[0]) + 1;
        }

        // Create default rooms: 15 double + 4 single (Total 19)
        const roomsToCreate = [];

        // Rooms 1-15 (Double)
        for (let i = 1; i <= 15; i++) {
            roomsToCreate.push({
                Roomid: `L${floor.floorNumber}-${wingInitial}${i}`,
                floorid: floor.floorID,
                floor: floor._id,
                floorNumber: floor.floorNumber,
                wing,
                roomnumber: i,
                type: 'double',
                isactive: true,
                beds: [
                    { bedId: 'A', isOccupied: false },
                    { bedId: 'B', isOccupied: false }
                ]
            });
        }
        // Rooms 16-19 (Single)
        for (let i = 16; i <= 19; i++) {
            roomsToCreate.push({
                Roomid: `L${floor.floorNumber}-${wingInitial}${i}`,
                floorid: floor.floorID,
                floor: floor._id,
                floorNumber: floor.floorNumber,
                wing,
                roomnumber: i,
                type: 'single',
                isactive: true,
                beds: [
                    { bedId: 'A', isOccupied: false }
                ]
            });
        }

        const createdRooms = await Room.create(roomsToCreate);
        
        // Auto-create Resource records for each room (Clustered Array format)
        for (const room of createdRooms) {
            // DESTRUCTIVE CLEANUP: Purge ALL furniture for this room
            await Resource.deleteMany({ roomId: room._id });

            const furnitureItems = [];
            for (const bed of room.beds) {
                for (const type of ['CHAIR', 'CUPBOARD', 'TABLE']) {
                    furnitureItems.push({
                        bedId: bed.bedId,
                        itemType: type,
                        uniqueCode: null,
                        status: 'AVAILABLE'
                    });
                }
            }

            await Resource.create({
                roomId: room._id,
                roomRef: room.Roomid,
                floorNumber: room.floorNumber,
                category: 'ROOM_GOOD',
                items: furnitureItems,
                name: `Furniture — Room ${room.Roomid}`
            });
        }

        res.status(201).json({ floor, rooms: createdRooms });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Floor already exists for this wing' });
        }
        res.status(500).json({ error: err.message });
    }
};

// PATCH toggle floor active status
exports.toggleFloorStatus = async (req, res) => {
    try {
        const floor = await Floor.findById(req.params.id);
        if (!floor) return res.status(404).json({ error: 'Floor not found' });

        const isDeactivating = floor.isactive; // Currently true, about to become false

        if (isDeactivating) {
            // Check if any room on this floor has occupied beds
            const occupiedRoom = await Room.findOne({
                $or: [
                    { floor: floor._id },
                    { floorid: floor.floorID }
                ],
                'beds.isOccupied': true
            });

            if (occupiedRoom) {
                return res.status(400).json({
                    error: 'Warning: This floor cannot be deleted because students are already allocated to rooms on this floor.'
                });
            }
            floor.isactive = false;
            floor.disableReason = (req.body && req.body.disableReason) || 'Admin action';
        } else {
            floor.isactive = true;
            floor.disableReason = null;
        }

        await floor.save();
        // Also toggle all rooms on this floor
        await Room.updateMany({ floor: floor._id }, { isactive: floor.isactive });
        res.json(floor);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE floor and its rooms
exports.deleteFloor = async (req, res) => {
    try {
        const floor = await Floor.findById(req.params.id);
        if (!floor) return res.status(404).json({ error: 'Floor not found' });

        // Check if any room on this floor has occupied beds
        const occupiedRoom = await Room.findOne({
            $or: [
                { floor: floor._id },
                { floorid: floor.floorID }
            ],
            'beds.isOccupied': true
        });

        if (occupiedRoom) {
            return res.status(400).json({
                error: 'Warning: This floor cannot be deleted because students are already allocated to rooms on this floor.'
            });
        }

        // 1. Find all room IDs for this floor before deleting them
        const floorRooms = await Room.find({
            $or: [
                { floor: floor._id },
                { floorid: floor.floorID }
            ]
        }, '_id');
        const roomIds = floorRooms.map(r => r._id);

        // 2. Cleanup Resources collection (Delete all furniture for those rooms)
        const Resource = require('../models/Resource');
        await Resource.deleteMany({ roomId: { $in: roomIds } });

        // 3. Delete all rooms associated with this floor 
        await Room.deleteMany({ _id: { $in: roomIds } });

        // 4. Delete the floor itself
        await Floor.findByIdAndDelete(req.params.id);

        res.json({ message: 'Floor, Rooms, and associated Furniture deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST create multiple floors
exports.createFloorsBulk = async (req, res) => {
    try {
        const { wing, floorNumbers } = req.body;
        const CreatedFloors = [];

        for (const num of floorNumbers) {
            const wingInitial = wing.charAt(0).toUpperCase();
            const floorID = `FLR-${wingInitial}${String(num).padStart(2, '0')}`;

            // CHECK: If floor already exists, skip it instead of failing
            const existingFloor = await Floor.findOne({ floorID, wing });
            if (existingFloor) {
                console.log(`Floor ${floorID} already exists for wing ${wing}, skipping...`);
                continue; 
            }

            const floor = await Floor.create({
                floorID,
                wing,
                floorNumber: num,
                isactive: true,
                disableReason: null
            });

            // Create default rooms for each floor
            const lastRoom = await Room.findOne().sort({ Roomid: -1 });
            let nextRoomNum = 1;
            if (lastRoom && lastRoom.Roomid) {
                const matches = lastRoom.Roomid.match(/\d+/);
                if (matches) nextRoomNum = parseInt(matches[0]) + 1;
            }

            const roomsToCreate = [];
            for (let i = 1; i <= 15; i++) {
                roomsToCreate.push({
                    Roomid: `L${floor.floorNumber}-${wingInitial}${i}`,
                    floorid: floor.floorID,
                    floor: floor._id,
                    floorNumber: floor.floorNumber,
                    wing,
                    roomnumber: i,
                    type: 'double',
                    isactive: true,
                    beds: [
                        { bedId: 'A', isOccupied: false },
                        { bedId: 'B', isOccupied: false }
                    ]
                });
            }
            for (let i = 16; i <= 19; i++) {
                roomsToCreate.push({
                    Roomid: `L${floor.floorNumber}-${wingInitial}${i}`,
                    floorid: floor.floorID,
                    floor: floor._id,
                    floorNumber: floor.floorNumber,
                    wing,
                    roomnumber: i,
                    type: 'single',
                    isactive: true,
                    beds: [
                        { bedId: 'A', isOccupied: false }
                    ]
                });
            }
            const createdRooms = await Room.create(roomsToCreate);
            
            // Auto-create Resource records for each room (Clustered Array format)
            for (const room of createdRooms) {
                // DESTRUCTIVE CLEANUP: Purge ALL furniture for this room
                await Resource.deleteMany({ roomId: room._id });

                const furnitureItems = [];
                for (const bed of room.beds) {
                    for (const type of ['CHAIR', 'CUPBOARD', 'TABLE']) {
                        furnitureItems.push({
                            bedId: bed.bedId,
                            itemType: type,
                            uniqueCode: null,
                            status: 'AVAILABLE'
                        });
                    }
                }

                await Resource.create({
                    roomId: room._id,
                    roomRef: room.Roomid,
                    floorNumber: room.floorNumber,
                    category: 'ROOM_GOOD',
                    items: furnitureItems,
                    name: `Furniture — Room ${room.Roomid}`
                });
            }
            
            CreatedFloors.push(floor);
        }

        res.status(201).json({ floors: CreatedFloors });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'One or more floors already exist for this wing' });
        }
        res.status(500).json({ error: err.message });
    }
};

// Migration function to update existing room IDs
exports.migrateRoomIDs = async (req, res) => {
    try {
        console.log("Starting Room ID Migration...");
        const rooms = await Room.find({});
        console.log(`Found ${rooms.length} rooms to check.`);
        let updatedCount = 0;

        for (const room of rooms) {
            const wingInitial = room.wing.charAt(0).toUpperCase();
            const newRoomid = `L${room.floorNumber}-${wingInitial}${room.roomnumber}`;
            
            if (room.Roomid !== newRoomid) {
                console.log(`Updating Room ${room._id}: ${room.Roomid} -> ${newRoomid}`);
                room.Roomid = newRoomid;
                await room.save();
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} rooms.`);
        res.json({ message: `Migration complete. Updated ${updatedCount} rooms.`, totalChecked: rooms.length });
    } catch (err) {
        console.error("Migration Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// DEBUG: Check database counts
exports.debugCounts = async (req, res) => {
    try {
        const floorCount = await Floor.countDocuments();
        const roomCount = await Room.countDocuments();
        const sampleRoom = await Room.findOne().lean();
        const dbName = require('mongoose').connection.name;
        const dbHost = require('mongoose').connection.host;
        res.json({ floorCount, roomCount, dbName, dbHost, sampleRoom });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

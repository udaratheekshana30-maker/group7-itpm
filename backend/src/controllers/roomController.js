const Room = require('../models/Room');
const Resource = require('../models/Resource');
const Floor = require('../models/Floor');
const Allocation = require('../models/Allocation');

// GET rooms (filter by floor, wing)
exports.getRooms = async (req, res) => {
    try {
        const filter = {};
        if (req.query.floor) filter.floor = req.query.floor;
        if (req.query.wing) filter.wing = req.query.wing;
        if (req.query.activeOnly === 'true') filter.isactive = true;
        const rooms = await Room.find(filter).populate('beds.student', 'studentName degree year').sort({ roomnumber: 1 }).lean();

        const mappedRooms = rooms.map(room => ({
            ...room,
            beds: room.beds.map(bed => ({
                ...bed,
                student: bed.student ? {
                    _id: bed.student._id,
                    name: bed.student.studentName,
                    degree: bed.student.degree,
                    year: bed.student.year
                } : null
            }))
        }));

        res.json(mappedRooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT update room (number, type)
exports.updateRoom = async (req, res) => {
    try {
        const { roomnumber, type } = req.body;
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });

        if (roomnumber !== undefined) room.roomnumber = roomnumber;
        if (type && type !== room.type) {
            // Changing room type - adjust beds
            const hasOccupied = room.beds.some(b => b.isOccupied);
            if (hasOccupied) {
                return res.status(400).json({ error: 'Cannot change type of room with occupied beds' });
            }
            room.type = type;
            if (type === 'single') {
                room.beds = [{ bedId: 'A', isOccupied: false }];
            } else {
                room.beds = [
                    { bedId: 'A', isOccupied: false },
                    { bedId: 'B', isOccupied: false }
                ];
            }
        }

        await room.save();
        res.json(room);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH toggle room active status
exports.toggleRoomStatus = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ error: 'Room not found' });
        room.isactive = !room.isactive;
        await room.save();
        res.json(room);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH bulk toggle
exports.bulkToggleRooms = async (req, res) => {
    try {
        const { roomIds, isactive } = req.body;
        await Room.updateMany({ _id: { $in: roomIds } }, { isactive });
        res.json({ message: `${roomIds.length} rooms updated` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE room
exports.deleteRoom = async (req, res) => {
    try {
        await Room.findByIdAndDelete(req.params.id);
        res.json({ message: 'Room deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Helper: Release beds during student purge
exports.releaseStudentBeds = async (allocations) => {
    try {
        if (!allocations || !Array.isArray(allocations)) return;

        for (const alc of allocations) {
            const room = await Room.findOne({
                floorNumber: alc.floorNumber,
                roomnumber: alc.roomnumber
            });

            if (room) {
                const bed = room.beds.find(b => b.bedId === alc.bedId);
                if (bed) {
                    bed.isOccupied = false;
                    bed.student = null;
                }
                await room.save();
            }
        }
        return true;
    } catch (err) {
        console.error('Failed to release room beds:', err);
        throw err;
    }
};

// GET room with full goods (from resources collection) + allocation details
// GET /api/rooms/:id/goods
exports.getRoomGoods = async (req, res) => {
    try {
        const Allocation = require('../models/Allocation');
        const Resource = require('../models/Resource');

        const room = await Room.findById(req.params.id).lean();
        if (!room) return res.status(404).json({ error: 'Room not found' });

        // Find allocations for this room's beds
        const allocations = await Allocation.find({ room: room._id }).lean();
        const allocationMap = {};
        for (const alloc of allocations) {
            allocationMap[alloc.bedId] = {
                studentName: alloc.studentName,
                studentRollNumber: alloc.studentRollNumber,
                studentDegree: alloc.studentDegree,
                studentYear: alloc.studentYear
            };
        }

        // FETCHING: Try to find a single room-centric furniture document first
        let roomFurnitureEntry = await Resource.findOne({ 
            roomId: room._id, 
            category: 'ROOM_GOOD', 
            items: { $exists: true, $not: { $size: 0 } } 
        }).lean();
        
        let allGoods = [];
        if (roomFurnitureEntry) {
            // New structure: Map items array to individual pieces for frontend compatibility
            allGoods = roomFurnitureEntry.items.map(item => ({
                ...item,
                _id: item._id, // Use sub-doc ID
                roomId: room._id,
                roomRef: roomFurnitureEntry.roomRef,
                floorNumber: roomFurnitureEntry.floorNumber,
                type: item.itemType || 'UNKNOWN'
            }));
        } else {
            // Legacy fallback: Fetch individual documents if room isn't migrated yet
            const flatGoods = await Resource.find({ 
                roomId: room._id, 
                category: 'ROOM_GOOD', 
                items: { $exists: false } 
            }).lean();
            allGoods = flatGoods.map(g => ({ ...g, type: g.itemType || g.type || 'UNKNOWN' }));
        }
        
        // Group by bedId
        const goodsByBed = {};
        for (const g of allGoods) {
            const key = g.bedId || 'room';
            if (!goodsByBed[key]) goodsByBed[key] = [];
            goodsByBed[key].push(g);
        }

        // Attach allocation info + goods to each bed
        const bedsWithData = room.beds.map(bed => ({
            ...bed,
            allocation: allocationMap[bed.bedId] || null,
            goods: (goodsByBed[bed.bedId] || []).sort((a, b) => a.type.localeCompare(b.type)) // Stable sort
        }));

        res.json({ ...room, beds: bedsWithData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH update a bed-level good (supports both old individual docs and new arrays)
// PATCH /api/rooms/:id/goods/:goodId
exports.updateBedGood = async (req, res) => {
    try {
        const { uniqueCode, status } = req.body;
        const { goodId } = req.params;

        const updateFields = {};
        if (uniqueCode !== undefined) updateFields['items.$.uniqueCode'] = uniqueCode;
        if (status !== undefined) updateFields['items.$.status'] = status;

        // 1. Try updating as an item inside an array (New Structure)
        let updatedDoc = null;
        if (Object.keys(updateFields).length > 0) {
            updatedDoc = await Resource.findOneAndUpdate(
                { 'items._id': goodId },
                { $set: updateFields },
                { new: true }
            );
        }

        // 2. Fallback to individual doc update (Old Structure)
        if (!updatedDoc) {
            const legacyUpdate = {};
            if (uniqueCode !== undefined) legacyUpdate.uniqueCode = uniqueCode;
            if (status !== undefined) legacyUpdate.status = status;

            updatedDoc = await Resource.findByIdAndUpdate(
                goodId,
                legacyUpdate,
                { new: true }
            );
        }

        if (!updatedDoc) return res.status(404).json({ error: 'Furniture item not found' });
        
        // Return full updated state (identical to getRoomGoods logic)
        const room = await Room.findById(req.params.id).lean();
        const allocations = await Allocation.find({ room: room._id }).lean();
        const allocationMap = {};
        for (const alloc of allocations) allocationMap[alloc.bedId] = alloc;

        let roomFurnitureEntry = await Resource.findOne({ 
            roomId: room._id, 
            category: 'ROOM_GOOD', 
            items: { $exists: true, $not: { $size: 0 } } 
        }).lean();
        
        let allGoods = [];
        if (roomFurnitureEntry) {
            allGoods = roomFurnitureEntry.items.map(i => ({ ...i, type: i.itemType }));
        } else {
            allGoods = (await Resource.find({ roomId: room._id, category: 'ROOM_GOOD', items: { $exists: false } }).lean()).map(g => ({ ...g, type: g.itemType }));
        }

        const goodsByBed = {};
        for (const g of allGoods) {
            if (!goodsByBed[g.bedId]) goodsByBed[g.bedId] = [];
            goodsByBed[g.bedId].push(g);
        }

        res.json({
            ...room,
            beds: room.beds.map(b => ({
                ...b,
                allocation: allocationMap[b.bedId] || null,
                goods: (goodsByBed[b.bedId] || []).sort((x, y) => x.type.localeCompare(y.type))
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST migrate — "Group-and-Squash" Existing Data into Room-Centric Arrays
// supports { roomId } in body to migrate only ONE room for specialized fixes
exports.migrateGoods = async (req, res) => {
    try {
        const Resource = require('../models/Resource');
        const { roomId } = req.body;
        
        const filter = roomId ? { _id: roomId } : {};
        const rooms = await Room.find(filter).lean();
        let migratedRoomsCount = 0;
        let totalItemsMerged = 0;

        for (const room of rooms) {
            // A. Fetch all existing individual items for this room (legacy format)
            const flatGoods = await Resource.find({ 
                roomId: room._id, 
                category: 'ROOM_GOOD', 
                $or: [
                    { items: { $exists: false } },
                    { items: { $size: 0 } }
                ]
            }).lean();

            if (flatGoods.length > 0) {
                // B. Group them into the new array format
                const roomItems = flatGoods.map(g => ({
                    bedId: g.bedId,
                    itemType: g.itemType || g.type,
                    uniqueCode: g.uniqueCode,
                    status: g.status || 'AVAILABLE'
                }));

                // C. Create/Replace with a SINGLE room furniture document
                // First, delete any EXISTING array documents for this room to avoid conflicts
                await Resource.deleteMany({ roomId: room._id, items: { $exists: true } });
                
                await Resource.create({
                    roomId: room._id,
                    roomRef: room.Roomid,
                    floorNumber: room.floorNumber,
                    category: 'ROOM_GOOD',
                    items: roomItems,
                    name: `Furniture — Room ${room.Roomid}`
                });

                // D. DELETE ALL the old individual documents
                await Resource.deleteMany({ _id: { $in: flatGoods.map(g => g._id) } });
                
                migratedRoomsCount++;
                totalItemsMerged += flatGoods.length;
            }

            // E. SCRUB: Unset the deleted top-level fields from any existing array documents
            await Resource.updateMany(
                { roomId: room._id, items: { $exists: true } },
                { $unset: { bedId: "", itemType: "", uniqueCode: "" } }
            );
        }

        // F. Global Scrub for ANY legacy fields (Common resources, etc.)
        await Resource.updateMany({}, { $unset: { bedId: "", itemType: "", uniqueCode: "" } });

        res.json({ 
            message: `Migration successful.`, 
            roomsMigrated: migratedRoomsCount, 
            totalItemsMerged,
            newDocumentCount: migratedRoomsCount,
            totalDeletions: totalItemsMerged
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET search furniture by unique code
exports.searchFurniture = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) return res.status(400).json({ error: 'Search code is required' });

        // CASE-INSENSITIVE exact match regex
        const searchRegex = new RegExp(`^${code.trim()}$`, 'i');

        // 1. Search in Room Resources
        const resource = await Resource.findOne({ 
            $or: [
                { 'items.uniqueCode': searchRegex },
                { uniqueCode: searchRegex }
            ]
        }).lean();

        if (resource) {
            const room = await Room.findById(resource.roomId).lean();
            if (room) return res.json({ type: 'room', room, resource });
            // Fallback for docs with no roomId but matching code
            return res.json({ type: 'resource_only', resource });
        }

        // 2. Search in Common Area Items
        const CommonAreaItem = require('../models/CommonAreaItem');
        const commonItem = await CommonAreaItem.findOne({ uniqueCode: searchRegex }).lean();
        if (commonItem) {
            return res.json({ type: 'common', item: commonItem });
        }

        res.status(404).json({ error: 'Furniture code not found globally' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET export resources as CSV or PDF
exports.exportResources = async (req, res) => {
    try {
        const { format } = req.query;
        
        // Fetch all room resources
        const resources = await Resource.find({ category: 'ROOM_GOOD' }).sort({ roomRef: 1 }).lean();
        
        // Flatten the data for export
        const exportData = [];
        resources.forEach(resDoc => {
            // ── A. Handle New Array Structure ─────────────────────────
            if (resDoc.items && resDoc.items.length > 0) {
                resDoc.items.forEach(item => {
                    exportData.push({
                        room: resDoc.roomRef || 'N/A',
                        floor: resDoc.floorNumber || 'N/A',
                        bed: item.bedId || '—',
                        item: item.itemType || '—',
                        code: item.uniqueCode || '—',
                        status: item.status || 'AVAILABLE'
                    });
                });
            } 
            // ── B. Handle Legacy Individual Documents ─────────────────
            else {
                exportData.push({
                    room: resDoc.roomRef || 'N/A',
                    floor: resDoc.floorNumber || 'N/A',
                    bed: resDoc.bedId || '—',
                    item: resDoc.itemType || '—',
                    code: resDoc.uniqueCode || '—',
                    status: resDoc.status || 'AVAILABLE'
                });
            }
        });

        if (format === 'csv') {
            const { Parser } = require('json2csv');
            const fields = [
                { label: 'Room', value: 'room' },
                { label: 'Floor', value: 'floor' },
                { label: 'Bed', value: 'bed' },
                { label: 'Item Type', value: 'item' },
                { label: 'Unique Code', value: 'code' },
                { label: 'Status', value: 'status' }
            ];
            const parser = new Parser({ fields });
            const csv = parser.parse(exportData);
            res.header('Content-Type', 'text/csv');
            res.attachment(`hostel_inventory_${new Date().toLocaleDateString()}.csv`);
            return res.send(csv);
        }

        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            res.header('Content-Type', 'application/pdf');
            res.attachment(`hostel_inventory_${new Date().toLocaleDateString()}.pdf`);
            doc.pipe(res);

            doc.fontSize(20).font('Helvetica-Bold').text('Hostel Furniture Inventory', { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(2);

            // Table headers
            const headers = ['Room', 'Floor', 'Bed', 'Item', 'Code', 'Status'];
            const colWidths = [60, 60, 50, 80, 120, 80];
            let y = doc.y;
            let x = 40;

            doc.fontSize(10).font('Helvetica-Bold');
            headers.forEach((h, i) => {
                doc.text(h, x, y, { width: colWidths[i] });
                x += colWidths[i];
            });

            doc.font('Helvetica').fontSize(9);
            y += 20;

            exportData.forEach((row) => {
                if (y > 750) {
                    doc.addPage();
                    y = 40;
                    x = 40;
                    doc.fontSize(10).font('Helvetica-Bold');
                    headers.forEach((h, i) => {
                        doc.text(h, x, y, { width: colWidths[i] });
                        x += colWidths[i];
                    });
                    doc.font('Helvetica').fontSize(9);
                    y += 20;
                }
                x = 40;
                const vals = [row.room, String(row.floor), row.bed, row.item, row.code, row.status];
                vals.forEach((v, i) => {
                    doc.text(v, x, y, { width: colWidths[i] });
                    x += colWidths[i];
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





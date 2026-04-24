const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

// GET rooms (filter by floor, wing)
router.get('/', roomController.getRooms);

// POST migrate existing rooms to add goods into resources collection
router.post('/migrate-goods', roomController.migrateGoods);

// GET room with goods + allocation info
router.get('/:id/goods', roomController.getRoomGoods);

// GET search furniture by unique code
router.get('/search-furniture/:code', protect, roomController.searchFurniture);

// GET export inventory
router.get('/export-inventory', protect, roomController.exportResources);

// PATCH update a bed-level good (uniqueCode or status) in resources collection
router.patch('/:id/goods/:goodId', roomController.updateBedGood);

// PUT update room (number, type)
router.put('/:id', roomController.updateRoom);

// PATCH toggle room active status
router.patch('/:id/toggle', roomController.toggleRoomStatus);

// PATCH bulk toggle
router.patch('/bulk-toggle', roomController.bulkToggleRooms);

// DELETE room
router.delete('/:id', roomController.deleteRoom);

module.exports = router;



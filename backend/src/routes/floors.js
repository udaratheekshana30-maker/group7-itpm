const express = require('express');
const router = express.Router();
const floorController = require('../controllers/floorController');

// GET all floors (filter by wing)
router.get('/', floorController.getFloors);

// POST create a new floor with default rooms
router.post('/', floorController.createFloor);

// POST create multiple floors
router.post('/bulk', floorController.createFloorsBulk);

// PATCH toggle floor active status
router.patch('/:id/toggle', floorController.toggleFloorStatus);

// Debug route for checking database counts
router.get('/debug-counts', floorController.debugCounts);

// Migration route for updating existing room identification
router.post('/migrate-room-ids', floorController.migrateRoomIDs);

// DELETE floor and its rooms
router.delete('/:id', floorController.deleteFloor);

module.exports = router;

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    // ── Individual Resource fields (Sports Gear, Books, etc.) ────────
    name: { type: String, default: null }, // Optional for room-centric docs
    category: { type: String, required: true }, // e.g. 'ROOM_GOOD', 'SPORTS', etc.
    status: {
      type: String,
      enum: ['AVAILABLE', 'ALLOCATED', 'MAINTENANCE', 'OCCUPIED', 'MISSING'],
      default: 'AVAILABLE',
    },

    // ── Room metadata (Common for all items in the array) ────────────
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null
    },
    roomRef: { type: String, default: null },
    floorNumber: { type: Number, default: null },

    // ── NEW: Room furniture array (One doc per room) ─────────────────
    items: [
      {
        bedId: { type: String, enum: ['A', 'B'], required: true },
        itemType: { type: String, enum: ['CHAIR', 'CUPBOARD', 'TABLE'], required: true },
        uniqueCode: { type: String, default: null },
        status: {
          type: String,
          enum: ['AVAILABLE', 'OCCUPIED', 'MISSING', 'MAINTENANCE'],
          default: 'AVAILABLE'
        }
      }
    ],
  },
  {
    collection: 'resources',
    timestamps: true
  }
);

module.exports = mongoose.model('Resource', resourceSchema);
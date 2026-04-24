const mongoose = require('mongoose');

const commonAreaItemSchema = new mongoose.Schema(
  {
    areaName: {
      type: String,
      required: true,
      enum: ['Ground Floor', 'Floor 1']
    },
    itemType: {
      type: String,
      required: true
      // e.g. "Chair", "Table", "Fan", "Board", etc. — free text
    },
    itemName: {
      type: String,
      required: true
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'MISSING', 'MAINTENANCE'],
      default: 'AVAILABLE'
    }
  },
  {
    collection: 'common_area_items',
    timestamps: true
  }
);

module.exports = mongoose.model('CommonAreaItem', commonAreaItemSchema);

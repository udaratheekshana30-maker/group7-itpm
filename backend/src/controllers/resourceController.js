const Resource = require("../models/Resource.js");
const User = require("../models/User.js");
const CommonAreaItem = require("../models/CommonAreaItem.js");

const MAX_ACTIVE_ALLOCATIONS_PER_STUDENT = 2;

// Get all resources
// GET /api/resources
exports.getResources = async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get students 
// GET /api/resources/students
exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'student'
    }).select("_id name email role studentId"); // User model uses studentId

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create resource
// POST /api/resources
exports.createResource = async (req, res) => {
  try {
    const { name, category, status } = req.body;

    if (!name || !category) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    const existingResource = await Resource.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      category: { $regex: `^${category.trim()}$`, $options: "i" },
    });

    if (existingResource) {
      return res.status(409).json({ message: "A resource with the same name and category already exists" });
    }

    const resource = await Resource.create({
      name: name.trim(),
      category: category.trim(),
      status: status || "AVAILABLE",
    });

    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update resource
// PUT /api/resources/:id
exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const { name, category, status } = req.body;

    if (status) resource.status = status;

    const updated = await resource.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete resource
// DELETE /api/resources/:id
exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.status === "ALLOCATED") {
      return res.status(400).json({ message: "Cannot delete resource: it is currently allocated" });
    }

    await resource.deleteOne();
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return resource functionality removed as per unused collection request

// ── Common Area Items ──────────────────────────────────────────────────────────

// GET /api/resources/common-area?areaName=Ground Floor
exports.getCommonAreaItems = async (req, res) => {
  try {
    const filter = {};
    if (req.query.areaName) filter.areaName = req.query.areaName;
    const items = await CommonAreaItem.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/resources/common-area
exports.addCommonAreaItem = async (req, res) => {
  try {
    const { areaName, itemType, itemName, uniqueCode, status } = req.body;
    if (!areaName || !itemType || !itemName || !uniqueCode) {
      return res.status(400).json({ message: 'areaName, itemType, itemName, and uniqueCode are required' });
    }
    const existing = await CommonAreaItem.findOne({ uniqueCode: uniqueCode.trim() });
    if (existing) {
      return res.status(409).json({ message: 'An item with this unique code already exists' });
    }
    const item = await CommonAreaItem.create({
      areaName,
      itemType: itemType.trim(),
      itemName: itemName.trim(),
      uniqueCode: uniqueCode.trim(),
      status: status || 'AVAILABLE'
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/resources/common-area/:id/status
exports.updateCommonAreaItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['AVAILABLE', 'MISSING', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    const item = await CommonAreaItem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/resources/common-area/:id
exports.deleteCommonAreaItem = async (req, res) => {
  try {
    const item = await CommonAreaItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
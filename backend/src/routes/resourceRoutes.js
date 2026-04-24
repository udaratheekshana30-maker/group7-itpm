const express = require("express");
const router = express.Router();
const {
  getResources,
  getStudents,
  createResource,
  updateResource,
  deleteResource,
  getCommonAreaItems,
  addCommonAreaItem,
  updateCommonAreaItemStatus,
  deleteCommonAreaItem,
} = require("../controllers/resourceController.js");

// ── Inventory routes ───────────────────────────────────────────────────────────
router.route("/").get(getResources).post(createResource);
router.route("/students").get(getStudents);
router.route("/:id").put(updateResource).delete(deleteResource);

// ── Common Area routes ─────────────────────────────────────────────────────────
router.get("/common-area", getCommonAreaItems);
router.post("/common-area", addCommonAreaItem);
router.patch("/common-area/:id/status", updateCommonAreaItemStatus);
router.delete("/common-area/:id", deleteCommonAreaItem);

module.exports = router;
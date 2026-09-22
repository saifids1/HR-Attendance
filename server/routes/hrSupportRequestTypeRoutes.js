const express = require("express");
const router = express.Router();

const {
  createHrSupportRequestType,
  getHrSupportRequestTypeById,
  getAllHrSupportRequestTypes,
  getPaginatedHrSupportRequestTypes,
  updateHrSupportRequestType,
  deleteHrSupportRequestType,
} = require("../controllers/hrSupportRequestTypeController");

/* ============================================================
   HR SUPPORT REQUEST TYPE ROUTES
============================================================ */

// Paginated list
// GET /api/hr-support-request-types/paginated?page=1&limit=10&is_active=true
router.get("/paginated", getPaginatedHrSupportRequestTypes);

// Get all
// GET /api/hr-support-request-types?is_active=true
router.get("/", getAllHrSupportRequestTypes);

// Get by ID
// GET /api/hr-support-request-types/:id
router.get("/:id", getHrSupportRequestTypeById);

// Create
// POST /api/hr-support-request-types
router.post("/", createHrSupportRequestType);

// Update
// PUT /api/hr-support-request-types/:id
router.put("/:id", updateHrSupportRequestType);

// Delete / Toggle active status
// DELETE /api/hr-support-request-types/:id
router.delete("/:id", deleteHrSupportRequestType);

module.exports = router;
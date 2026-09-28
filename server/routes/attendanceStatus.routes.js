const express = require("express");
const router = express.Router();
const {
  createAttendenceStatus,
  getAllAttendenceStatuses,
  getAttendenceStatusById,
  updateAttendenceStatus,
} = require("../controllers/attendanceStatus.controller");

router.post("/", createAttendenceStatus);
router.get("/paginated", getAllAttendenceStatuses);
router.get("/:id", getAttendenceStatusById);
router.put("/:id", updateAttendenceStatus);

module.exports = router;

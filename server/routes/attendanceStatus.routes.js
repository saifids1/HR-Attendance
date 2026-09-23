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
<<<<<<< HEAD
router.put("/:id", updateAttendenceStatus);
=======
router.put("/", updateAttendenceStatus);
>>>>>>> a84cda8 (created controller and status api)

module.exports = router;

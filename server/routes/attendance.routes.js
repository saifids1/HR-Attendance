const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controller");
const auth = require("../middlewares/authMiddleware");

// Admin

router.get("/sync", controller.syncAttendance);


// Today All Employ Attendance
router.get("/today", controller.getTodayOrganizationAttendance);


// Optional
// router.get("/me", auth, controller.getMyAttendance);

module.exports = router;

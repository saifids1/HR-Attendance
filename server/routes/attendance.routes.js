const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controller");
const auth = require("../middlewares/authMiddleware");
const { addEmployController } = require("../controllers/user.controllers");

// Admin

router.get("/sync", controller.syncAttendance);


// Today All Employ Attendance
router.get("/today", controller.getTodayOrganizationAttendance);

// Add Employ by Admin

router.post("/add-employee",auth,addEmployController)

// Optional
// router.get("/me", auth, controller.getMyAttendance);

module.exports = router;

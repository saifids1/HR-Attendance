const express = require("express");
const auth = require("../middlewares/authMiddleware");
const role = require("../middlewares/roleMiddleware")
const {getTodayOrganizationAttendance} = require("../controllers/attendance.controller");
const router = express.Router();

// Admin can see all Employ attendance
// router.post("/sync", auth, role("admin"), ctrl.syncAttendance);
// router.post("/generate", auth, role("admin"), generateDailyAttendance);
router.get("/today", auth, role("admin"), getTodayOrganizationAttendance);




module.exports = router;

//  Admin clicks “Sync Attendance”

// POST /api/attendance/sync


// Admin clicks “Generate Daily Attendance”

// POST /api/attendance/generate



//  Admin dashboard

// GET /api/attendance/today
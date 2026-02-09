const express = require("express");
const auth = require("../middlewares/authMiddleware");
const {getMyAttendance,getMyTodayAttendance, getMyHolidays} = require("../controllers/attendance.controller");
const {db} = require("../db/connectDB");
const { isAdmin } = require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const { getAllEmployees } = require("../controllers/user.controllers");

const router = express.Router();



// Employ Punch In  &  Punch Out

router.get("/today",auth,getMyTodayAttendance)

// Employ all previous attendence view

router.get("/history",auth,getMyAttendance);

// Holiday 

router.get("/holiday",auth,getMyHolidays);

// Get All Employees 

router.get("/all-emp", authMiddleware, isAdmin, getAllEmployees);



module.exports = router;

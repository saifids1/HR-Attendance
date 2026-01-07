const express = require("express");
const auth = require("../middlewares/authMiddleware");
const {getMyAttendance,getMyTodayAttendance} = require("../controllers/attendance.controller")

const router = express.Router();

function formatAttendance(rawLogs, employeeMap) {
    const grouped = {};
  
    // 1Group logs by deviceUserId
    rawLogs.forEach(log => {
      const empId = log.deviceUserId;
      const time = new Date(log.recordTime);
  
      if (!grouped[empId]) {
        grouped[empId] = [];
      }
  
      grouped[empId].push(time);
    });
  
    // Build UI response
    const result = [];
  
    Object.keys(grouped).forEach(empId => {
      const times = grouped[empId].sort((a, b) => a - b);
  
      result.push({
        name: employeeMap[empId] || "Unknown",
        device_user_id: empId,
        punch_in: times[0].toISOString(),
        punch_out: times[times.length - 1].toISOString()
      });
    });
  
    return result;
  }
  

// Employ Punch In  &  Punch Out

router.get("/today",auth,getMyTodayAttendance)

// Employ all previous attendence view

router.get("/history",auth,getMyAttendance);



module.exports = router;

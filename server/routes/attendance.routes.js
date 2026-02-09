const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controller");
const auth = require("../middlewares/authMiddleware");
const { addEmployController } = require("../controllers/attendance.controller");
const { isAdmin } = require("../middlewares/roleMiddleware");
const {db} = require("../db/connectDB");

// Admin

router.get("/sync", controller.syncAttendance);


// Today All Employ Attendance
router.get("/today", controller.getTodayOrganizationAttendance);



// Add Employ by Admin

router.post("/add-employee",auth,isAdmin,addEmployController)

// Admin Attendance 
router.get("/history",auth,controller.getAdminMyAttendance)


// Admin Activity logs
router.get("/activity-log", auth, isAdmin, controller.getActivityLog);


// Express route example
router.patch('/:emp_id/status', auth,isAdmin,async (req, res) => {
    const { emp_id } = req.params;
    const { is_active } = req.body;

    console.log("is_Active",is_active)
    console.log("emp_id",emp_id);
  
    try {
      await db.query(
        'UPDATE users SET is_active = $1 WHERE emp_id = $2',
        [is_active, emp_id]
      );
      res.status(200).send({ message: "Status updated successfully" });
    } catch (error) {
      res.status(500).send({ error: "Failed to update status" });
    }
  });


  router.get("/all-attendance", auth, isAdmin, async (req, res) => {
    try {
      const { emp_id, startDate, endDate } = req.query;
  
      if (!emp_id) {
        return res.status(400).json({ success: false, message: "Employee ID is required" });
      }
  
      // This query merges the two tables to give one unique record per day
      const query = `
      SELECT 
        COALESCE(act.date_only, att.date_only) AS date,
        TO_CHAR(act.first_in, 'HH12:MI AM') AS first_in,
        TO_CHAR(act.last_out, 'HH12:MI AM') AS last_out,
        ROUND((EXTRACT(EPOCH FROM (act.last_out - act.first_in))/3600)::numeric, 2) AS total_hours,
        att.device_sn,
        att.device_ip
      FROM (
        SELECT 
          emp_id::text, -- Cast to text to ensure match
          punch_time::date AS date_only,
          MIN(punch_time) AS first_in,
          MAX(punch_time) AS last_out
        FROM activity_log
        GROUP BY 1, 2
      ) act
      FULL OUTER JOIN (
        SELECT 
          emp_id::text, 
          punch_time::date AS date_only,
          device_sn,
          device_ip
        FROM attendance_logs
      ) att ON act.emp_id = att.emp_id AND act.date_only = att.date_only
      WHERE COALESCE(act.emp_id, att.emp_id) = $1
      ${startDate && endDate ? 'AND COALESCE(act.date_only, att.date_only) BETWEEN $2 AND $3' : ''}
      ORDER BY date DESC;
    `;
  
      const params = [emp_id];
      if (startDate && endDate) {
        params.push(startDate, endDate);
      }
  
      const { rows } = await db.query(query, params);
  
      // Calculate summary statistics for the 3-month period
      const totalDays = rows.length;
      const avgHours = totalDays > 0 
        ? (rows.reduce((sum, r) => sum + parseFloat(r.total_hours || 0), 0) / totalDays).toFixed(2) 
        : 0;
  
      res.status(200).json({
        success: true,
        meta: {
          emp_id,
          total_records: totalDays,
          average_daily_hours: avgHours
        },
        attendance: rows
      });
  
    } catch (error) {
      console.error("Attendance API Error:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  });

module.exports = router;

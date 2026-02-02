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

module.exports = router;

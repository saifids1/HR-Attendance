const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controller");
const auth = require("../middlewares/authMiddleware");
const { addEmployController } = require("../controllers/attendance.controller");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { db } = require("../db/connectDB");

// Admin

router.get("/sync", controller.syncAttendance);


// Today All Employ Attendance
router.get("/today", controller.getTodayOrganizationAttendance);



// Add Employ by Admin

router.post("/add-employee", auth, isAdmin, addEmployController)

// Admin Attendance 
router.get("/history", auth,isAdmin, controller.getAdminMyAttendance)


// Admin Activity logs
router.get("/activity-log", auth, isAdmin, controller.getActivityLog);

router.get("/activity-log/exports", auth, isAdmin, controller.exportActivityLog);



// Express route example
router.patch('/:emp_id/status', auth, isAdmin, async (req, res) => {
  const { emp_id } = req.params;
  const { is_active } = req.body;

  console.log("is_Active", is_active)
  console.log("emp_id", emp_id);

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
    let { month, year, page = 1, limit = 10 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;

    const today = new Date();
 const values = [fromDate, toDate, limit, offset];
    
    const query = `
      WITH calendar AS (
        SELECT generate_series(
          $1::date,
          $2::date,
          '1 day'
        )::date AS date_only
      ),
      employee_list AS (
        SELECT u.emp_id, u.name, u.role
        FROM users u
      ),
      attendance_data AS (
        SELECT 
          al.emp_id,
          al.punch_time::date AS date_only,
          MIN(al.punch_time) AS first_in,
          MAX(al.punch_time) AS last_out,
          ROUND(
            (EXTRACT(EPOCH FROM (MAX(al.punch_time) - MIN(al.punch_time))) / 3600)::numeric,
            2
          ) AS total_hours
        FROM activity_log al
        GROUP BY al.emp_id, al.punch_time::date
      ),
      final_data AS (
        SELECT 
          el.emp_id,
          el.name,
          el.role,
          cal.date_only,
          ad.first_in,
          ad.last_out,
          COALESCE(ad.total_hours, 0.00) AS total_hours
        FROM employee_list el
        CROSS JOIN calendar cal
        LEFT JOIN attendance_data ad
          ON ad.emp_id = el.emp_id
          AND ad.date_only = cal.date_only
      )
      SELECT 
        emp_id,
        name,
        role,
        TO_CHAR(date_only, 'YYYY-MM-DD') AS date,
        TO_CHAR(first_in, 'HH12:MI AM') AS first_in,
        TO_CHAR(last_out, 'HH12:MI AM') AS last_out,
        total_hours,
        COUNT(*) OVER() AS total_count
      FROM final_data
      ORDER BY date_only DESC
      LIMIT $3
      OFFSET $4
    `;


    // Validate month (1-12) and year (>1900)             

    let filterMonth = parseInt(month);
    let filterYear = parseInt(year);

    if (isNaN(filterMonth) || filterMonth < 1 || filterMonth > 12) {
      filterMonth = today.getMonth() + 1; // JS months 1-12
    }

    if (isNaN(filterYear) || filterYear < 1900) {
      filterYear = today.getFullYear();
    }


    const fromDate = new Date(filterYear, filterMonth - 1, 1).toISOString().slice(0, 10);
    const toDate = new Date(filterYear, filterMonth, 0).toISOString().slice(0, 10);

   

    const { rows } = await db.query(query, values);

    const totalRecords = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    const cleanAttendance = rows.map(({ total_count, ...rest }) => rest);

    res.status(200).json({
      success: true,
      meta: {
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limit),
        current_page: page,
      },
      attendance: cleanAttendance,
    });
  } catch (error) {
    console.error("Attendance API Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/weekly-attendance", auth, isAdmin, async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: "Search query (emp_id or name) is required",
      });
    }

    const searchTerm = String(search).trim();

    
    const now = new Date();
    // Offset correction for local timezone
    const localToday = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );

    const toDate = localToday.toISOString().split("T")[0];

    const sevenDaysAgo = new Date(localToday);
    sevenDaysAgo.setDate(localToday.getDate() - 6);

    const fromDate = sevenDaysAgo.toISOString().split("T")[0];

    // --- 2. SQL Query Definition ---
    const query = `
      WITH calendar AS (
        SELECT generate_series($1::date, $2::date, '1 day')::date AS date_only
      ),
      employee AS (
        SELECT emp_id, name, role
        FROM users
        WHERE 
          is_active = true   
          AND (emp_id::text = $3 OR name ILIKE $4)
        LIMIT 1
      ),
      attendance AS (
        SELECT 
          al.emp_id,
          al.punch_time::date AS date_only,
          MIN(al.punch_time) AS first_in,
          MAX(al.punch_time) AS last_out,
          ROUND(
            EXTRACT(EPOCH FROM (MAX(al.punch_time) - MIN(al.punch_time))) / 3600,
            2
          ) AS total_hours
        FROM activity_log al
        WHERE al.emp_id = (SELECT emp_id FROM employee)
          AND al.punch_time::date BETWEEN $1 AND $2
        GROUP BY al.emp_id, al.punch_time::date
      )
      SELECT 
        e.emp_id,
        e.name,
        e.role,
        TO_CHAR(c.date_only, 'YYYY-MM-DD') AS date,
        TO_CHAR(a.first_in, 'HH12:MI AM') AS first_in,
        TO_CHAR(a.last_out, 'HH12:MI AM') AS last_out,
        COALESCE(a.total_hours, 0) AS total_hours
      FROM employee e
      CROSS JOIN calendar c
      LEFT JOIN attendance a 
        ON a.date_only = c.date_only
      ORDER BY c.date_only DESC;
    `;

    // --- 3. Database Execution ---
    const { rows } = await db.query(query, [
      fromDate,
      toDate,
      searchTerm,
      `%${searchTerm}%`,
    ]);

    // Handle case where no employee is found
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found with the provided search criteria",
      });
    }

    // --- 4. Response Formatting ---
    res.status(200).json({
      success: true,
      message: "Weekly attendance fetched successfully",
      date_range: {
        from: fromDate,
        to: toDate,
      },
      employee: {
        emp_id: rows[0].emp_id,
        name: rows[0].name,
        role: rows[0].role,
      },
      // Remove redundant employee info from each attendance row
      attendance: rows.map(({ emp_id, name, role, ...rest }) => rest),
    });

  } catch (error) {
    console.error("Attendance API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});




module.exports = router;

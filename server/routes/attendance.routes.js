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
router.get("/history", auth, isAdmin, controller.getAdminMyAttendance)


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


router.get("/all-attendance", auth, async (req, res) => {
  try {
    let { month, year } = req.query;

    const today = new Date();
    const filterMonth = parseInt(month) || today.getMonth() + 1;
    const filterYear = parseInt(year) || today.getFullYear();

    // console.log("filterMonth",filterMonth);
    // console.log("filterYear",filterYear);

    const fromDate = new Date(filterYear, filterMonth - 1, 1)
      .toISOString()
      .slice(0, 10);
    const toDate = new Date(filterYear, filterMonth, 1)
      .toISOString()
      .slice(0, 10);

    // console.log("fromDate",fromDate);
    // console.log("toDate",toDate);

    const values = [fromDate, toDate];

    const query = `
   WITH calendar AS (
    SELECT generate_series($1::date, $2::date, '1 day')::date AS date_only
),
daily AS (
    SELECT 
        u.emp_id,
        u.name,
        u.is_active,  
        p.department,
        cal.date_only,

       MIN(al.punch_time) AS first_in,
        MAX(al.punch_time) AS last_out,

        CASE
            WHEN hd.holiday_date IS NOT NULL THEN 'Holiday'
            WHEN MIN(al.punch_time) IS NULL THEN 'Absent'
            ELSE 'Present'
        END AS status,

        COALESCE(
          ROUND(
            EXTRACT(
              EPOCH FROM 
              MAX(al.punch_time) - MIN(al.punch_time)
            ) / 3600.0, 
            2
          ), 
          0.00
        ) AS hours_worked

    FROM users u
    CROSS JOIN calendar cal
    LEFT JOIN attendance_logs al
        ON al.emp_id = u.emp_id
        AND (
            (al.punch_time)::date = cal.date_only
        )
    LEFT JOIN personal p
        ON p.emp_id = u.emp_id
    LEFT JOIN holidays hd
        ON hd.holiday_date = cal.date_only
    GROUP BY 
        u.emp_id, 
        u.name, 
        u.is_active,   
        p.department, 
        cal.date_only, 
        hd.holiday_date
)
SELECT 
    emp_id,
    name,
    department,
    is_active,   
    JSON_AGG(
        JSON_BUILD_OBJECT(
            'date', date_only,
            'first_in', first_in,
            'last_out', last_out,
            'hours_worked', hours_worked,
            'status', status
        )
        ORDER BY date_only
    ) AS attendance
FROM daily
GROUP BY emp_id, name, department, is_active   
ORDER BY emp_id;
`;

    const { rows } = await db.query(query, values);

    return res.status(200).json({
      success: true,
      month: filterMonth,
      year: filterYear,
      total_records: rows.length,
      attendance: rows,
    });

  } catch (error) {
    console.error("All Attendance Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});


router.get("/weekly-attendance", auth, isAdmin, async (req, res) => {
  try {
    // const { search } = req.query;

    const {search,page = 1, limit = 10} = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1 ) * limitInt ;

   
    // if (!search) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Search query (emp_id or name) is required",
    //   });
    // }

    const searchTerm = search ? search.trim() : null;


    const now = new Date();
    const localToday = now; // already IST in DB
    const toDate = localToday.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(localToday);
    sevenDaysAgo.setDate(localToday.getDate() - 6);
    const fromDate = sevenDaysAgo.toISOString().split("T")[0];

    // --- 2. SQL Query Definition ---
     const query = `
      WITH calendar AS (
        SELECT generate_series($1::date, $2::date, '1 day')::date AS date_only
      ),
      employees AS (
        SELECT emp_id, name, role
        FROM users
        WHERE is_active = true
          AND (
            $3::text IS NULL
            OR emp_id::text = $3
            OR name ILIKE $4
          )
        ORDER BY emp_id
        OFFSET $5 LIMIT $6
      ),
      attendance AS (
        SELECT 
          al.emp_id,
          al.punch_time::date AS date_only,
          MIN(al.punch_time) AS first_in,
          MAX(al.punch_time) AS last_out,
          ROUND(EXTRACT(EPOCH FROM MAX(al.punch_time) - MIN(al.punch_time)) / 3600, 2) AS total_hours
        FROM attendance_logs al
        WHERE al.punch_time::date BETWEEN $1 AND $2
        GROUP BY al.emp_id, date_only
      )
      SELECT 
        e.emp_id,
        e.name,
        e.role,
        TO_CHAR(c.date_only, 'YYYY-MM-DD') AS date,
        TO_CHAR(a.first_in, 'HH12:MI AM') AS first_in,
        TO_CHAR(a.last_out, 'HH12:MI AM') AS last_out,
        COALESCE(a.total_hours, 0) AS total_hours
      FROM employees e
      CROSS JOIN calendar c
      LEFT JOIN attendance a
        ON a.emp_id = e.emp_id
        AND a.date_only = c.date_only
      ORDER BY e.emp_id, c.date_only DESC;
    `;

    // --- 3. Database Execution ---
   const { rows } = await db.query(query, [
  fromDate,
  toDate,
  searchTerm,
  searchTerm ? `%${searchTerm}%` : null,
  offset,
  limitInt
]);
    // Handle case where no employee is found
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found with the provided search criteria",
      });
    }

    // --- 4. Response Formatting ---
 const grouped = {};

rows.forEach(row => {
  if (!grouped[row.emp_id]) {
    grouped[row.emp_id] = {
      emp_id: row.emp_id,
      name: row.name,
      role: row.role,
      attendance: []
    };
  }

  grouped[row.emp_id].attendance.push({
    date: row.date,
    first_in: row.first_in,
    last_out: row.last_out,
    total_hours: row.total_hours
  });
});

// Total Employee

const countQuery = `
  SELECT COUNT(*) AS total
  FROM users
  WHERE is_active = true
    AND (
      $1::text IS NULL
      OR emp_id::text = $1
      OR name ILIKE $2
    )
`

const {rows:countRows} = await db.query(countQuery,[
  searchTerm,
  searchTerm ? `%${searchTerm}%`:null
]);

const totalItems = parseInt(countRows[0].total);
const totalPages = Math.ceil(totalItems/limitInt);

res.status(200).json({
  success: true,
  message: "Weekly attendance fetched successfully",
  date_range: {
    from: fromDate,
    to: toDate,
  },
  page:pageInt,
  totalPages,
  totalItems,
  data: Object.values(grouped)
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

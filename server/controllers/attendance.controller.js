const {db} = require("../db/connectDB");
const { getDeviceAttendance } = require("../services/zk.service");

/* Sync machine logs */
exports.syncAttendance = async (req, res) => {
  await getDeviceAttendance();
  res.json({ message: "Machine logs synced" });
};

function toIST(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false
  });
}

function calculateHours(punchIn, punchOut) {
  const start = new Date(punchIn);
  const end = new Date(punchOut);

  const diffMs = end - start; // milliseconds
  if (diffMs <= 0) return "00:00";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}



/*  Generate daily attendance */
exports.getTodayAttendance = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.name,
        u.device_user_id,

        CASE
          WHEN d.punch_in IS NOT NULL AND d.punch_out IS NOT NULL THEN 'Present'
          WHEN d.punch_in IS NOT NULL AND d.punch_out IS NULL THEN 'Working'
          ELSE 'Absent'
        END AS status,

        d.punch_in,
        d.punch_out,
        COALESCE(d.total_hours, 0) AS total_hours

      FROM users u
      LEFT JOIN daily_attendance d
        ON u.id = d.device_user_id
        AND d.attendance_date = CURRENT_DATE
      WHERE u.role = 'employee'
      ORDER BY u.name;
    `);

    // 📊 Dashboard counts
    const summary = {
      total_employees: result.rows.length,
      present_today: result.rows.filter(
        e => e.status === 'Present' || e.status === 'Working'
      ).length,
      absent_today: result.rows.filter(e => e.status === 'Absent').length
    };

    res.json({
      summary,
      employees: result.rows
    });

  } catch (err) {
    console.error("getTodayAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// /*  Admin – today attendance */ 

exports.generateDailyAttendance = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.name,
        u.device_user_id,
        CASE
          WHEN d.punch_in IS NOT NULL AND d.punch_out IS NOT NULL THEN 'Present'
          WHEN d.punch_in IS NOT NULL AND d.punch_out IS NULL THEN 'Working'
          ELSE 'Absent'
        END AS status,
        d.punch_in,
        d.punch_out,
        COALESCE(d.total_hours, 0) AS total_hours
      FROM users u
      LEFT JOIN daily_attendance d
        ON u.id = d.user_id
        AND d.attendance_date = CURRENT_DATE
      WHERE u.role = 'employee'
      ORDER BY u.name;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getTodayOrganizationAttendance = async (req, res) => {
  try {
    await db.query(`
      WITH params AS (
        SELECT
          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS ist_date,
          ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE + TIME '10:30') AS punch_in_start,
          ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE + TIME '19:00') AS punch_out_start
      ),

      punch_calc AS (
        SELECT
          al.emp_id,
          p.ist_date AS attendance_date,

          -- First punch AFTER 10:30 AM
          MIN(al.punch_time AT TIME ZONE 'Asia/Kolkata')
            FILTER (
              WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata') >= p.punch_in_start
            ) AS punch_in,

          -- First punch AT or AFTER 7:00 PM
          MIN(al.punch_time AT TIME ZONE 'Asia/Kolkata')
            FILTER (
              WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata') >= p.punch_out_start
            ) AS punch_out

        FROM attendance_logs al
        CROSS JOIN params p
        WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p.ist_date
        GROUP BY al.emp_id, p.ist_date
      )

      INSERT INTO daily_attendance (
        emp_id,
        attendance_date,
        punch_in,
        punch_out,
        total_hours,
        expected_hours,
        status
      )
      SELECT
        pc.emp_id,
        pc.attendance_date,
        pc.punch_in,
        pc.punch_out,

        CASE
          WHEN pc.punch_in IS NOT NULL AND pc.punch_out IS NOT NULL
          THEN pc.punch_out - pc.punch_in
          ELSE INTERVAL '0 minutes'
        END,

        INTERVAL '9 hours',

        CASE
          WHEN pc.punch_in IS NULL THEN 'Absent'
          WHEN pc.punch_out IS NULL THEN 'Working'
          ELSE 'Present'
        END

      FROM punch_calc pc

      ON CONFLICT (emp_id, attendance_date)
      DO UPDATE SET
        punch_in    = EXCLUDED.punch_in,
        punch_out   = EXCLUDED.punch_out,
        total_hours = EXCLUDED.total_hours,
        status      = EXCLUDED.status;
    `);

    /* -------- FETCH TODAY (IST) -------- */
    const { rows } = await db.query(`
      SELECT
        u.emp_id,
        u.name,
        u.email,
        u.is_active,

        TO_CHAR(
          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE,
          'YYYY-MM-DD'
        ) AS attendance_date,

        a.punch_in,
        a.punch_out,
        COALESCE(a.total_hours, INTERVAL '0 minutes') AS total_hours,
        COALESCE(a.expected_hours, INTERVAL '9 hours') AS expected_hours,

        CASE
          WHEN u.is_active = FALSE THEN 'Inactive'
          WHEN a.emp_id IS NULL THEN 'Absent'
          ELSE a.status
        END AS status

      FROM users u
      LEFT JOIN daily_attendance a
        ON a.emp_id = u.emp_id
       AND a.attendance_date =
         (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE

      WHERE u.role = 'employee'
      ORDER BY u.name;
    `);

    res.status(200).json(rows);

  } catch (error) {
    console.error("❌ Attendance fetch error:", error);
    res.status(500).json({ message: "Failed to fetch today's attendance" });
  }
};


















// exports.getTodayOrganizationAttendance = async (req, res) => {
//   try {
//     const { rows } = await db.query(`
//       SELECT
//         u.id AS emp_id,
//         u.device_user_id,
//         u.name,

//         -- ✅ Today date strictly in IST
//         (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS attendance_date,

//         a.punch_in,
//         a.punch_out,

//         COALESCE(a.total_hours, INTERVAL '0 minutes') AS total_hours,
//         INTERVAL '9 hours' AS expected_hours,

//         CASE
//           WHEN a.emp_id IS NULL THEN 'Absent'
//           WHEN a.punch_in IS NOT NULL AND a.punch_out IS NULL THEN 'Working'
//           ELSE 'Present'
//         END AS status

//       FROM users u
//       LEFT JOIN daily_attendance a
//         ON a.emp_id = u.id
//        AND a.attendance_date =
//            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE

//       WHERE u.role = 'employee'
//       ORDER BY u.name;
//     `);

//     res.json(rows);
//   } catch (err) {
//     console.error("❌ getTodayOrganizationAttendance:", err);
//     res.status(500).json({ message: "Failed to fetch attendance" });
//   }
// };







// /*  Employee – Today attendance */  

// single Emp Attendance




exports.getMyTodayAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    /* -------------------------------------------------
       TODAY ATTENDANCE (IST)
    --------------------------------------------------*/
    const todayResult = await db.query(
      `
      SELECT
        punch_in,
        punch_out,
        total_hours,
        status
      FROM daily_attendance
      WHERE emp_id = $1
        AND attendance_date =
          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
      LIMIT 1
      `,
      [empId]
    );

    const today = todayResult.rows[0] || null;

    /* ---------- Convert INTERVAL → HH:MM ---------- */
    let todayHours = "00:00";

    if (today?.total_hours) {
      const secRes = await db.query(
        `SELECT EXTRACT(EPOCH FROM $1::interval) AS seconds`,
        [today.total_hours]
      );

      const secs = Number(secRes.rows[0].seconds);
      const hrs = Math.floor(secs / 3600);
      const mins = Math.floor((secs % 3600) / 60);

      todayHours = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
        2,
        "0"
      )}`;
    }

    /* -------------------------------------------------
       WEEKLY HOURS (MONDAY → TODAY, IST)
       Present → total_hours
       Working → NOW - punch_in
    --------------------------------------------------*/
    const weeklyResult = await db.query(
      `
      WITH daily AS (
        SELECT
          emp_id,
          (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE AS attendance_date,
          MIN(punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_in,
          MAX(punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_out
        FROM attendance_logs
        WHERE emp_id = $1
          AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE >=
              DATE_TRUNC(
                'week',
                (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
              )::DATE
        GROUP BY emp_id, attendance_date
      )
      SELECT
        COALESCE(
          SUM(EXTRACT(EPOCH FROM (punch_out - punch_in))),
          0
        ) AS total_seconds
      FROM daily
      WHERE punch_in IS NOT NULL
        AND punch_out IS NOT NULL
      `,
      [empId]
    );
    

    const weeklySeconds = Number(weeklyResult.rows[0].total_seconds);
    const weeklyHrs = Math.floor(weeklySeconds / 3600);
    const weeklyMins = Math.floor((weeklySeconds % 3600) / 60);

    /* -------------------------------------------------
       RESPONSE
    --------------------------------------------------*/
    res.json({
      today: {
        punch_in: today?.punch_in ?? null,
        punch_out: today?.punch_out ?? null,
        total_hours: todayHours,
        status: today?.status ?? "Absent",
      },
      weekly: {
        total_hours: `${String(weeklyHrs).padStart(2, "0")}:${String(
          weeklyMins
        ).padStart(2, "0")}`,
      },
    });
  } catch (err) {
    console.error("❌ getMyTodayAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};










// /*  Employee – All  attendance */ 
exports.getMyAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    const { rows } = await db.query(
      `
      WITH dates AS (
        SELECT generate_series(
          (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata') - INTERVAL '29 days',
          (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'),
          INTERVAL '1 day'
        )::DATE AS attendance_date
      ),

      daily_punches AS (
        SELECT
          al.emp_id,
          (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE AS attendance_date,
          COUNT(*) AS punch_count,
          MIN(al.punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_in,
          MAX(al.punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_out
        FROM attendance_logs al
        WHERE al.emp_id = $1
        GROUP BY al.emp_id, attendance_date
      )

      SELECT
        u.emp_id,
        u.name AS employee_name,
        TO_CHAR(d.attendance_date, 'YYYY-MM-DD') AS attendance_date,

        dp.punch_in,
        dp.punch_out,

        -- ✅ total worked seconds (SAFE)
        CASE
          WHEN dp.punch_in IS NOT NULL
           AND dp.punch_out IS NOT NULL
           AND dp.punch_out > dp.punch_in
          THEN EXTRACT(EPOCH FROM (dp.punch_out - dp.punch_in))
          ELSE 0
        END AS total_seconds,

        CASE
          WHEN dp.punch_in IS NULL THEN 'Absent'
          WHEN dp.punch_out IS NULL THEN 'Working'
          WHEN dp.punch_in = dp.punch_out THEN 'Working'
          ELSE 'Present'
        END AS status

      FROM users u
      CROSS JOIN dates d
      LEFT JOIN daily_punches dp
        ON dp.emp_id = u.emp_id
       AND dp.attendance_date = d.attendance_date

      WHERE u.emp_id = $1
      ORDER BY d.attendance_date DESC
      `,
      [empId]
    );

    /* ---------- seconds → HH:MM (CARRY SAFE) ---------- */
    const formattedRows = rows.map(r => {
      const totalSeconds = Number(r.total_seconds || 0);

      // convert to total minutes first
      let totalMinutes = Math.floor(totalSeconds / 60);

      let hours = Math.floor(totalMinutes / 60);
      let minutes = totalMinutes % 60;

      // 🔁 safety carry (never exceed 59)
      if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
      }

      return {
        ...r,
        total_hours: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      };
    });

    res.status(200).json(formattedRows);

  } catch (err) {
    console.error("❌ getMyAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




























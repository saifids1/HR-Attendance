const { db } = require("../db/connectDB");
const { getDeviceAttendance } = require("../services/zk.service");
const sendEmail = require("../utils/mailer");
const cron = require('node-cron');
const bcrypt = require("bcrypt");

/* Sync machine logs */
exports.syncAttendance = async (req, res) => {
  await getDeviceAttendance();
  res.json({ message: "Machine logs synced" });
};

exports.getAdminMyAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    // 1. Sync recent activity (No changes here, remains efficient)
    await db.query(`
      INSERT INTO daily_attendance (emp_id, attendance_date, punch_in, punch_out, expected_hours)
      SELECT 
        emp_id, 
        attendance_date, 
        MIN(local_time) FILTER (WHERE local_time::time >= TIME '10:00') AS punch_in,
        MAX(local_time) AS punch_out,
        NULL AS expected_hours
      FROM (
        SELECT 
          emp_id, 
          punch_time AT TIME ZONE 'Asia/Kolkata' AS local_time,
          CASE 
            WHEN (punch_time AT TIME ZONE 'Asia/Kolkata')::time < TIME '04:00' 
            THEN (punch_time AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'
            ELSE (punch_time AT TIME ZONE 'Asia/Kolkata')::date
          END AS attendance_date
        FROM activity_log
        WHERE emp_id = $1 
          AND (punch_time AT TIME ZONE 'Asia/Kolkata')::date >= CURRENT_DATE - INTERVAL '2 day'
      ) t
      GROUP BY emp_id, attendance_date
      ON CONFLICT (emp_id, attendance_date) DO NOTHING;
    `, [empId]);

    // 2. Fetch attendance with Working Hours Calculation
    const { rows } = await db.query(`
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days', 
          CURRENT_DATE, 
          INTERVAL '1 day'
        )::date AS attendance_date
      ),
      activity_data AS (
        SELECT emp_id, attendance_date,
               MIN(local_time) FILTER (WHERE local_time::time >= TIME '10:00') AS punch_in,
               MAX(local_time) AS punch_out
        FROM (
          SELECT emp_id, punch_time AT TIME ZONE 'Asia/Kolkata' AS local_time,
          CASE WHEN (punch_time AT TIME ZONE 'Asia/Kolkata')::time < TIME '04:00' 
               THEN (punch_time AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'
               ELSE (punch_time AT TIME ZONE 'Asia/Kolkata')::date END AS attendance_date
          FROM activity_log WHERE emp_id = $1
        ) t GROUP BY emp_id, attendance_date
      ),
      attendance_log_data AS (
        SELECT emp_id, attendance_date, MIN(local_time) AS punch_in, MAX(local_time) AS punch_out
        FROM (
          SELECT emp_id, punch_time AT TIME ZONE 'Asia/Kolkata' AS local_time,
          CASE WHEN (punch_time AT TIME ZONE 'Asia/Kolkata')::time < TIME '04:00' 
               THEN (punch_time AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'
               ELSE (punch_time AT TIME ZONE 'Asia/Kolkata')::date END AS attendance_date
          FROM attendance_logs WHERE emp_id = $1
        ) x GROUP BY emp_id, attendance_date
      )
    SELECT 
  $1 AS emp_id,
  u.name AS employee_name,
  to_char(d.attendance_date, 'YYYY-MM-DD') AS attendance_date,
  COALESCE(ad.punch_in, da.punch_in, al.punch_in) AS punch_in,
  COALESCE(ad.punch_out, da.punch_out, al.punch_out) AS punch_out,
  -- CALCULATE WORKING HOURS
  (COALESCE(ad.punch_out, da.punch_out, al.punch_out) - COALESCE(ad.punch_in, da.punch_in, al.punch_in)) AS total_hours,
  CASE 
    -- If there is no punch_in at all, they are Absent
    WHEN COALESCE(ad.punch_in, da.punch_in, al.punch_in) IS NULL THEN 'Absent'
    
    -- If they have a punch_in, they are Present 
    -- (This covers 'Working', 'Present', and same-time punches)
    ELSE 'Present'
  END AS status
FROM dates d
JOIN users u ON u.emp_id = $1
LEFT JOIN activity_data ad ON ad.attendance_date = d.attendance_date
LEFT JOIN daily_attendance da ON da.attendance_date = d.attendance_date AND da.emp_id = $1
LEFT JOIN attendance_log_data al ON al.attendance_date = d.attendance_date
WHERE u.is_active = true  -- Ensuring only active users are processed
ORDER BY d.attendance_date DESC;
    `, [empId]);

    // 3. Format result for Frontend (consistent with your table row logic)
    const formattedData = rows.map(r => {
      const formatTime = (isoStr) => {
        if (!isoStr) return '---';
        return new Date(isoStr).toLocaleTimeString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
        });
      };

      // Handle PostgreSQL interval object correctly
      const hours = r.total_hours?.hours || 0;
      const minutes = r.total_hours?.minutes || 0;

      return {
        ...r,
        punch_in: formatTime(r.punch_in),
        punch_out: formatTime(r.punch_out),
        total_hours_str: `${hours}h ${minutes}m`
      };
    });

    res.status(200).json({
      total_documents: formattedData.length,
      attendance: formattedData
    });

  } catch (err) {
    console.error("❌ getAdminMyAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.addEmployController = async (req, res) => {

  const client = await db.connect();

  // console.log(req.body)
  try {
    const {
      name,
      email,
      password,
      emp_id,
      role,
      shift_id,
      dob,
      gender,
      department,
      joining_date,
      maritalstatus,
      nominee,
      aadharnumber,
      bloodgroup,
      nationality,
      address,
      is_active,
    } = req.body;


    // console.log(name,email,password,emp_id,department);
    
    // 1. Validation
    if (!name || !email || !password || !emp_id || !department) {
      return res.status(400).json({ message: "All essential fields required" });
    }

    // 2. Start Transaction
    await client.query("BEGIN");

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(String(password), 10);
    const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

    // 4. Insert into 'users' table
    const userResult = await client.query(
      `
      INSERT INTO users 
        (name, email, password, role, emp_id, is_active, shift_id, profile_image)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        name,
        email.toLowerCase().trim(),
        hashedPassword,
        role || "employee",
        emp_id,
        is_active === undefined ? true : is_active,
        shift_id || 1,
        profile_image,
      ]
    );

    const newUserId = userResult.rows[0].id;

    // 5. Insert into 'personal' table
    await client.query(
      `
      INSERT INTO personal 
        (emp_id, dob, gender, department, joining_date, maritalstatus, nominee, aadharnumber, bloodgroup, nationality, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        emp_id,
        dob || null,
        gender,
        department,
        joining_date || null,
        maritalstatus,
        nominee,
        aadharnumber,
        bloodgroup,
        nationality,
        address,
      ]
    );

  

    // 6. Commit Transaction
    await client.query("COMMIT");


    await sendEmail(email, "Welcome to the Company", "employee_creation", { name, emp_id, email });


    res.status(201).json({
      message: "Employee created successfully",
      user: { id: newUserId, emp_id, name, email },
    });

  } catch (error) {
    // 7. Rollback in case of error (avoids partial data)
    await client.query("ROLLBACK");
    console.error("Transaction Error:", error);

    // Handle unique constraint errors (e.g., duplicate email or emp_id)
    if (error.code === '23505') {
      return res.status(400).json({ message: "Email or Employee ID already exists" });
    }

    res.status(500).json({ message: "Internal Server Error" });
    // } finally {
    // Release client back to the pool
    client.release();
  }
};






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

    // Dashboard counts
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
        u.emp_id,
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


// Main
// exports.getTodayOrganizationAttendance = async (req, res) => {
//   try {
//     await db.query(`
//       WITH params AS (
//         SELECT
//           (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS ist_date,
//           ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE + TIME '10:30') AS punch_in_start,
//           ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE + TIME '19:00') AS punch_out_start
//       ),

//       punch_calc AS (
//         SELECT
//           al.emp_id,
//           p.ist_date AS attendance_date,

//           -- First punch AFTER 10:30 AM
//           MIN(al.punch_time AT TIME ZONE 'Asia/Kolkata')
//             FILTER (
//               WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata') >= p.punch_in_start
//             ) AS punch_in,

//           -- First punch AT or AFTER 7:00 PM
//           MIN(al.punch_time AT TIME ZONE 'Asia/Kolkata')
//             FILTER (
//               WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata') >= p.punch_out_start
//             ) AS punch_out

//         FROM attendance_logs al
//         CROSS JOIN params p
//         WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p.ist_date
//         GROUP BY al.emp_id, p.ist_date
//       )

//       INSERT INTO daily_attendance (
//         emp_id,
//         attendance_date,
//         punch_in,
//         punch_out,
//         total_hours,
//         expected_hours,
//         status
//       )
//       SELECT
//         pc.emp_id,
//         pc.attendance_date,
//         pc.punch_in,
//         pc.punch_out,

//         CASE
//           WHEN pc.punch_in IS NOT NULL AND pc.punch_out IS NOT NULL
//           THEN pc.punch_out - pc.punch_in
//           ELSE INTERVAL '0 minutes'
//         END,

//         INTERVAL '9 hours',

//         CASE
//           WHEN pc.punch_in IS NULL THEN 'Absent'
//           WHEN pc.punch_out IS NULL THEN 'Working'
//           ELSE 'Present'
//         END

//       FROM punch_calc pc

//       ON CONFLICT (emp_id, attendance_date)
//       DO UPDATE SET
//         punch_in    = EXCLUDED.punch_in,
//         punch_out   = EXCLUDED.punch_out,
//         total_hours = EXCLUDED.total_hours,
//         status      = EXCLUDED.status;
//     `);

//     /* -------- FETCH TODAY (IST) -------- */
//     const { rows } = await db.query(`
//       SELECT
//         u.emp_id,
//         u.name,
//         u.email,
//         u.is_active,

//         TO_CHAR(
//           (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE,
//           'YYYY-MM-DD'
//         ) AS attendance_date,

//         a.punch_in,
//         a.punch_out,
//         COALESCE(a.total_hours, INTERVAL '0 minutes') AS total_hours,
//         COALESCE(a.expected_hours, INTERVAL '9 hours') AS expected_hours,

//         CASE
//           WHEN u.is_active = FALSE THEN 'Inactive'
//           WHEN a.emp_id IS NULL THEN 'Absent'
//           ELSE a.status
//         END AS status

//       FROM users u
//       LEFT JOIN daily_attendance a
//         ON a.emp_id = u.emp_id
//        AND a.attendance_date =
//          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE

//       WHERE u.role = 'employee'
//       ORDER BY u.name;
//     `);

//     res.status(200).json(rows);

//   } catch (error) {
//     console.error("❌ Attendance fetch error:", error);
//     res.status(500).json({ message: "Failed to fetch today's attendance" });
//   }
// };

// 2.0

exports.runAttendanceTask = async () => {
  try {
    console.log(`[${new Date().toISOString()}] CRON: Triggering processAndSendAttendanceReport...`);
    
    // Pass 'true' so the email actually sends during the cron run
    const data = await exports.processAndSendAttendanceReport(true);
    
    console.log(`[${new Date().toISOString()}] CRON: Success. Processed ${data.length} records.`);
  } catch (error) {
    // This catch block is vital so a database error doesn't crash your whole Node app
    console.error(`[${new Date().toISOString()}] CRON ERROR:`, error);
  }
};

// Reusable logic for both API and Scheduler
// const processAndSendAttendanceReport = async (sendEmailToAdmin = true) => {
//   // 1. Run the UPSERT query to sync logs to daily_attendance
//   await db.query(`
//     WITH params AS (SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS ist_date),
//     punch_calc AS (
//       SELECT al.emp_id, p.ist_date AS attendance_date,
//       MIN(al.punch_time) AS punch_in,
//       CASE WHEN COUNT(al.punch_time) > 1 THEN MAX(al.punch_time) ELSE NULL END AS punch_out
//       FROM attendance_logs al CROSS JOIN params p
//       WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = p.ist_date
//       GROUP BY al.emp_id, p.ist_date
//     )
//     INSERT INTO daily_attendance (emp_id, attendance_date, punch_in, punch_out, total_hours, expected_hours, status)
//     SELECT pc.emp_id, pc.attendance_date, pc.punch_in, pc.punch_out,
//       CASE WHEN pc.punch_in IS NOT NULL AND pc.punch_out IS NOT NULL THEN pc.punch_out - pc.punch_in ELSE INTERVAL '0 minutes' END,
//       INTERVAL '9 hours',
//       CASE WHEN pc.punch_in IS NULL THEN 'Absent' WHEN pc.punch_out IS NULL THEN 'Working' ELSE 'Present' END
//     FROM punch_calc pc
//     ON CONFLICT (emp_id, attendance_date) DO UPDATE SET
//       punch_in = EXCLUDED.punch_in, punch_out = EXCLUDED.punch_out,
//       total_hours = EXCLUDED.total_hours, status = EXCLUDED.status;
//   `);

//   // 2. Fetch the updated list
//   const { rows } = await db.query(`
//     SELECT 
//       u.emp_id, 
//       u.name, 
//       u.email,
//       u.is_active,
//       (a.attendance_date + time '12:00:00') AT TIME ZONE 'Asia/Kolkata' AS attendance_date,
//       a.punch_in, 
//       a.punch_out, 
//       COALESCE(a.total_hours, INTERVAL '0 minutes') AS total_hours,
//       CASE 
//         WHEN u.is_active = FALSE THEN 'Inactive' 
//         WHEN a.emp_id IS NULL THEN 'Absent' 
//         ELSE a.status 
//       END AS status
//     FROM users u
//     LEFT JOIN daily_attendance a ON a.emp_id = u.emp_id AND a.attendance_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
//     WHERE u.role IN ('employee', 'admin') 
//     AND u.emp_id IS NOT NULL
//     ORDER BY u.is_active DESC, u.name; -- Active users first
//   `);

//   // console.log("rows",rows)
//   // 3. Generate HTML
//   const tableRowsHtml = rows
//   // 1. Filter out inactive employees first
//   .filter(emp => emp.is_active === true || emp.is_active === 1) 
//   .map(emp => {
//     // 2. Formatting Helpers
//     const formatTime = (ts) => ts ? new Date(ts).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '---';
//     const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '---';
    
//     // Handle Postgres interval or pre-calculated string
//     const durationStr = emp.total_hours_str || `${emp.total_hours?.hours || 0}h ${emp.total_hours?.minutes || 0}m`;
    
//     // 3. Dynamic Status Colors
//     const statusColor = emp.status === 'Present' ? '#28a745' : (emp.status === 'Working' ? '#ff9800' : '#dc3545');

//     return `<tr>
//       <td style="border:1px solid #ddd; padding:8px;">${emp.emp_id}</td>
//       <td style="border:1px solid #ddd; padding:8px;"><strong>${emp.name}</strong></td>
//       <td style="border:1px solid #ddd; text-align: center;">${formatDate(emp.attendance_date)}</td>
//       <td style="border:1px solid #ddd; text-align: center;">${formatTime(emp.punch_in)}</td>
//       <td style="border:1px solid #ddd; text-align: center;">${formatTime(emp.punch_out)}</td>
//       <td style="border:1px solid #ddd; text-align: center;">${durationStr}</td>
//       <td style="border: 1px solid #ddd; padding: 12px; text-align: center; vertical-align: middle;">
//         <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto; border-collapse: separate !important;">
//           <tr>
//             <td align="center" style="
//               border-radius: 50px; 
//               background-color: ${statusColor}; 
//               width: 100px;
//               height: 28px;
//             ">
//               <span style="
//                 display: block;
//                 padding: 6px 0;
//                 color: #ffffff;
//                 font-family: Arial, sans-serif;
//                 font-size: 10px;
//                 font-weight: 800;
//                 text-transform: uppercase;
//                 line-height: 1;
//               ">
//                 ${emp.status}
//               </span>
//             </td>
//           </tr>
//         </table>
//       </td>
//     </tr>`;
//   }).join('');

//   console.log("sendEmailToAdmin",sendEmailToAdmin)
//   // Send email
//   // if (sendEmailToAdmin) {
//   //   const adminEmails = "s.imran@i-diligence.com"
//   //   // const adminEmails = "hradmin@i-diligence.com,s.hanif@i-diligence.com"; 
//   //   // const ccEmails = "s.irfan@i-diligence.com,s.hanif@i-diligence.com";
//   //   const subject = "Daily Organization Attendance Report";
  
//   //   console.log("adminEmails",adminEmails);
//   //   // console.log("Preparing to send email:", { to: adminEmails, cc: ccEmails, subject });
  
//   //   await sendEmail(
//   //     adminEmails, 
//   //     subject, 
//   //     "admin_all_present", 
//   //     {
//   //       time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
//   //       employee_rows: tableRowsHtml
//   //     },
//   //     // ccEmails 
//   //   );
//   // }

//   console.log("rows",rows);
//   return rows;
// };
// Add req and res here so they are defined
// const processAndSendAttendanceReport = async (req, res) => {
//   try {
//     // Standardizing the date to avoid timezone shifts between JS and PostgreSQL
//     const 
// 
//  = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

//     const query = `
//       -- 1. Identify users who have logs but are missing from attendance table
//       -- ADDED: u.is_active filter so inactive employees aren't auto-synced
//       WITH missing_records AS (
//         SELECT 
//           al.emp_id,
//           '${todayIST}'::DATE as attendance_date,
//           MIN(al.punch_time) as first_p,
//           MAX(al.punch_time) as last_p,
//           COUNT(al.punch_time) as p_count
//         FROM activity_log al
//         INNER JOIN users u ON al.emp_id = u.emp_id
//         LEFT JOIN daily_attendance da 
//           ON al.emp_id = da.emp_id 
//           AND (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = da.attendance_date
//         WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = '${todayIST}'::DATE
//           AND da.emp_id IS NULL 
//           AND u.is_active = true  -- Only sync those who are currently ACTIVE
//         GROUP BY al.emp_id
//       ),
//       -- 2. Insert the missing records
//       auto_sync AS (
//         INSERT INTO daily_attendance (emp_id, attendance_date, punch_in, punch_out, total_hours, status)
//         SELECT 
//           mr.emp_id,
//           mr.attendance_date,
//           mr.first_p,
//           CASE WHEN mr.p_count > 1 THEN mr.last_p ELSE NULL END,
//           CASE WHEN mr.p_count > 1 THEN (mr.last_p - mr.first_p) ELSE INTERVAL '0 hours' END,
//           CASE WHEN mr.p_count = 1 THEN 'Working' ELSE 'Present' END
//         FROM missing_records mr
//         RETURNING *
//       )
//       -- 3. Final Select: Combine all employees with their attendance status
//       SELECT 
//         u.emp_id, 
//         u.name, 
//         u.email,
//         u.is_active,
//         '${todayIST}' AS attendance_date,
//         da.punch_in,
//         da.punch_out,
//         -- If inactive, mark as Inactive; if no log, mark as Absent
//         CASE 
//           WHEN u.is_active = false THEN 'Inactive'
//           WHEN da.status IS NULL THEN 'Absent'
//           ELSE da.status 
//         END as status,
//         TO_CHAR(da.total_hours, 'HH24:MI') as duration
//       FROM users u
//       LEFT JOIN daily_attendance da 
//         ON u.emp_id = da.emp_id 
//         AND da.attendance_date = '${todayIST}'::DATE
//       WHERE u.role IN ('employee', 'admin') 
//       ORDER BY u.is_active DESC, u.name ASC;
//     `;

//     const { rows } = await db.query(query);

//     if (res) {
//       return res.status(200).json(rows);
//     }
//     return rows;

//   } catch (error) {
//     console.error("Auto-sync fetch error:", error);
//     if (res) {
//       return res.status(500).json({ message: "Failed to sync and fetch attendance" });
//     }
//   }
// };

// Reusable logic: handles DB sync, Emailing (if flag is true), and Data Return
const formatInterval = (interval) => {
  if (!interval) return "0h 0m";

  const hours = interval.hours || 0;
  const minutes = interval.minutes || 0;

  return `${hours}h ${minutes}m`;
};

exports.processAndSendAttendanceReport = async (sendEmailToAdmin = false, req = null, res = null) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

   
   const query = `
      WITH missing_records AS (
        SELECT 
          al.emp_id,
          '${todayIST}'::DATE as attendance_date,
          MIN(al.punch_time) as first_p,
          MAX(al.punch_time) as last_p,
          COUNT(al.punch_time) as p_count
        FROM activity_log al
        INNER JOIN users u ON al.emp_id = u.emp_id
        LEFT JOIN daily_attendance da 
          ON al.emp_id = da.emp_id 
          AND (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = da.attendance_date
        WHERE (al.punch_time AT TIME ZONE 'Asia/Kolkata')::DATE = '${todayIST}'::DATE
          AND da.emp_id IS NULL 
          AND u.is_active = true
        GROUP BY al.emp_id
      ),
      auto_sync AS (
        INSERT INTO daily_attendance (emp_id, attendance_date, punch_in, punch_out, total_hours, status)
        SELECT 
          mr.emp_id, mr.attendance_date, mr.first_p,
          CASE WHEN mr.p_count > 1 THEN mr.last_p ELSE NULL END,
          CASE WHEN mr.p_count > 1 THEN (mr.last_p - mr.first_p) ELSE INTERVAL '0 hours' END,
          CASE WHEN mr.p_count = 1 THEN 'Working' ELSE 'Present' END
        FROM missing_records mr
        RETURNING *
      )
      SELECT 
        u.emp_id,
         u.name,
          u.email,
           u.is_active,
           p.department,   
          p.joining_date,
        '${todayIST}' AS attendance_date,
       -- Replace the punch_in and punch_out lines in your final SELECT with this:
      (da.punch_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_in,
      (da.punch_out AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_out,
        CASE 
          WHEN u.is_active = false THEN 'Inactive'
          WHEN da.status IS NULL THEN 'Absent'
          ELSE da.status 
        END as status,
        da.total_hours -- Keeping interval for formatInterval helper
      FROM users u
      LEFT JOIN personal p ON u.emp_id = p.emp_id
      LEFT JOIN daily_attendance da ON u.emp_id = da.emp_id AND da.attendance_date = '${todayIST}'::DATE
      WHERE u.role IN ('employee', 'admin') 
      ORDER BY u.is_active DESC, u.name ASC;
    `;
    const { rows } = await db.query(query);

    // --- EMAIL LOGIC ---
    // Only runs when triggered by Cron (passing true)
    if (sendEmailToAdmin) {
      // const adminEmails = "hradmin@i-diligence.com,s.hanif@i-diligence.com,s.imran@i-diligence.com"; 
      const adminEmails = "s.imran@i-diligence.com"
      const ccEmails = "s.irfan@i-diligence.com";
      const subject = `Attendance Report - ${todayIST}`;

      // Generate HTML rows for the email

      // console.log("rows",rows)
      const tableRowsHtml = rows
      .filter(emp => emp.is_active && emp.emp_id)
      .map(emp => {

        // console.log("emp",emp)
        // 1. Status Colors (Backgrounds)
        const statusBg = emp.status === 'Working' ? '#ff9800' : (emp.status === 'Absent' ? '#dc3545' : '#28a745');
        
        // 2. Format Times & Date
        const timeIn = emp.punch_in 
          ? new Date(emp.punch_in).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) 
          : '---';
          
        const timeOut = emp.punch_out 
          ? new Date(emp.punch_out).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) 
          : '---';
    
        const attendanceDate = emp.punch_in 
          ? new Date(emp.punch_in).toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' })
          : '---';
    
        // 3. Return Table Row

        // console.log("emp",emp)
        return `
          <tr>
            <td style="border:1px solid #ddd; padding:8px;">${emp.emp_id}</td>
            <td style="border:1px solid #ddd; padding:8px;">${emp.name}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${attendanceDate}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${timeIn}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${timeOut}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${formatInterval(emp.total_hours) || '0h 0m'}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center; vertical-align: middle;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; width: 90px;">
    <tr>
      <td 
        style="background-color: ${statusBg}; padding: 6px 0; border-radius: 20px; font-family: Arial, sans-serif; text-align: center; width: 90px;" 
        bgcolor="${statusBg}"
      >
        <div style="color: #ffffff; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; line-height: 1; white-space: nowrap;">
          ${emp.status}
        </div>
      </td>
    </tr>
  </table>
</td>
          </tr>`;
      }).join('');
      
        // console.log("rows",rows)
      const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    timeZone: 'Asia/Kolkata' 
  });
      await sendEmail(
        adminEmails, 
        subject, 
        "admin_all_present", 
        {
          date:formattedDate,
          time: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
          employee_rows: tableRowsHtml
        },
        ccEmails 
      );
      console.log("CRON: Email sent successfully.");
    }

    // Handle API Response vs Cron return
    if (res) return res.status(200).json(rows);
    return rows;

  } catch (error) {
    console.error("Attendance Process Error:", error);
    if (res) return res.status(500).json({ message: "Internal Server Error" });
    throw error;
  }
};


exports.getTodayOrganizationAttendance = async (req, res) => {
  try {
    
    const data = await exports.processAndSendAttendanceReport(false); 
    res.status(200).json(data);
  } catch (error) {
    console.error("Manual report error:", error);
    res.status(500).json({ message: "Failed to process attendance" });
  }
};



// cron.schedule('0 11,18,21 * * 1-6', async () => {
//   console.log(`[${new Date().toISOString()}] Starting hourly attendance report...`);
//   runAttendanceTask();
// }, {
//   scheduled: true,
//   timezone: "Asia/Kolkata"
// });

// cron.schedule('36 18 * * 1-6', async () => {
//   console.log(`[${new Date().toISOString()}] Starting 18:55 attendance report...`);
//   exports.runAttendanceTask();
// }, {
//   scheduled: true,
//   timezone: "Asia/Kolkata"
// });


cron.schedule('4 12 * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting 8:30 PM attendance report...`);
  exports.runAttendanceTask();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});


  

// single Emp Attendance

// Main Code
// exports.getMyTodayAttendance = async (req, res) => {
//   try {
//     const empId = req.user.emp_id;

//     /* -------------------------------------------------
//        TODAY ATTENDANCE (daily_attendance FIRST)
//     --------------------------------------------------*/
//     let today;
//     let todayHours = "00:00";

//     const dailyResult = await db.query(
//       `
//       SELECT punch_in, punch_out, total_hours, status
//       FROM daily_attendance
//       WHERE emp_id = $1
//         AND attendance_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
//       LIMIT 1
//       `,
//       [empId]
//     );

//     if (dailyResult.rows.length > 0) {
//       today = dailyResult.rows[0];

//       if (today.total_hours) {
//         const seconds =
//           parseInt(today.total_hours.split(":")[0]) * 3600 +
//           parseInt(today.total_hours.split(":")[1]) * 60;

//         const hrs = Math.floor(seconds / 3600);
//         const mins = Math.floor((seconds % 3600) / 60);

//         todayHours = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
//           2,
//           "0"
//         )}`;
//       }
//     } else {
//       const liveResult = await db.query(
//         `
//         WITH today_logs AS (
//           SELECT
//             MIN(punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_in,
//             MAX(punch_time AT TIME ZONE 'Asia/Kolkata') AS punch_out
//           FROM attendance_logs
//           WHERE emp_id = $1
//             AND (punch_time AT TIME ZONE 'Asia/Kolkata')::DATE =
//                 (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
//         )
//         SELECT
//           punch_in,
//           CASE
//             WHEN punch_in IS NULL THEN NULL
//             WHEN punch_out = punch_in THEN NULL
//             ELSE punch_out
//           END AS punch_out,
//           CASE
//             WHEN punch_in IS NULL THEN 'Absent'
//             WHEN punch_out = punch_in THEN 'Working'
//             ELSE 'Present'
//           END AS status,
//           CASE
//             WHEN punch_in IS NULL THEN INTERVAL '0'
//             WHEN punch_out = punch_in
//               THEN (NOW() AT TIME ZONE 'Asia/Kolkata') - punch_in
//             ELSE punch_out - punch_in
//           END AS total_hours
//         FROM today_logs
//         `,
//         [empId]
//       );

//       today = liveResult.rows[0];

//       if (today?.total_hours) {
//         const totalSeconds = Math.floor(
//           today.total_hours.seconds ||
//           (today.total_hours.hours || 0) * 3600 +
//           (today.total_hours.minutes || 0) * 60
//         );

//         const hrs = Math.floor(totalSeconds / 3600);
//         const mins = Math.floor((totalSeconds % 3600) / 60);

//         todayHours = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
//           2,
//           "0"
//         )}`;
//       }
//     }

//     /* -------------------------------------------------
//        WEEKLY HOURS (ALREADY CORRECT)
//     --------------------------------------------------*/
//     const weeklyResult = await db.query(
//       `
//       WITH week_bounds AS (
//         SELECT
//           DATE_TRUNC(
//             'week',
//             (NOW() AT TIME ZONE 'Asia/Kolkata')
//           )::DATE AS week_start,
//           ((NOW() AT TIME ZONE 'Asia/Kolkata')::DATE - INTERVAL '1 day')::DATE AS week_end
//       )
//       SELECT
//         COALESCE(
//           SUM(
//             EXTRACT(
//               EPOCH FROM (punch_out - punch_in)
//             )
//           ),
//           0
//         ) AS total_seconds
//       FROM daily_attendance, week_bounds
//       WHERE emp_id = $1
//         AND attendance_date BETWEEN week_bounds.week_start AND week_bounds.week_end
//         AND punch_in IS NOT NULL
//         AND punch_out IS NOT NULL
//         AND status = 'Present'
//       `,
//       [empId]
//     );





//     const weeklySeconds = Number(weeklyResult.rows[0].total_seconds);

//     const weeklyHrs = Math.floor(weeklySeconds / 3600);
//     const weeklyMins = Math.floor((weeklySeconds % 3600) / 60);

//     const weeklyHours = `${String(weeklyHrs).padStart(2, "0")}:${String(
//       weeklyMins
//     ).padStart(2, "0")}`;


//     /* -------------------------------------------------
//        RESPONSE
//     --------------------------------------------------*/
//     res.json({
//       today: {
//         punch_in: today?.punch_in ?? null,
//         punch_out: today?.punch_out ?? null,
//         total_hours: todayHours,
//         status: today?.status ?? "Absent",
//       },
//       weekly: {
//         total_hours: `${String(weeklyHrs).padStart(2, "0")}:${String(
//           weeklyMins
//         ).padStart(2, "0")}`,
//       },
//     });
//   } catch (err) {
//     console.error("❌ getMyTodayAttendance error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };



function intervalToHHMM(total_hours) {
  if (!total_hours) return "00:00";

  // Case  already string "HH:MM"
  if (typeof total_hours === "string") {
    return total_hours;
  }

  // Case  PostgreSQL INTERVAL object
  const h = total_hours.hours || 0;
  const m = total_hours.minutes || 0;
  const s = total_hours.seconds || 0;

  const totalSeconds = h * 3600 + m * 60 + s;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Single Employee Attendance
exports.getMyTodayAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    let today = null;
    let todayHours = "00:00";

    // Helper to format interval to HH:mm
    const intervalToHHMM = (interval) => {
      if (!interval) return "00:00";
      const totalSeconds = Math.floor(interval.total_seconds ?? interval);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    // Helper to format timestamp to IST string
    const formatIST = (ts) => {
      if (!ts) return null;
      return new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    };

    // Fetch today from daily_attendance if exists
    const dailyResult = await db.query(
      `
      SELECT punch_in AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS punch_in,
             punch_out AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS punch_out,
             total_hours, status
      FROM daily_attendance
      WHERE emp_id = $1
        AND attendance_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
      LIMIT 1
      `,
      [empId]
    );

    if (dailyResult.rows.length > 0) {
      today = dailyResult.rows[0];
      todayHours = intervalToHHMM(today.total_hours);
      today.punch_in = formatIST(today.punch_in);
      today.punch_out = formatIST(today.punch_out);
    }

    // If no record in daily_attendance, compute from live activity_log
    if (!today) {
      const liveResult = await db.query(
        `
        WITH today_logs AS (
          SELECT
            MIN(punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_in,
            MAX(punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_out
          FROM activity_log
          WHERE emp_id = $1
            AND (punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::DATE =
                (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
        )
        SELECT
          punch_in,
          CASE
            WHEN punch_in IS NULL THEN NULL
            WHEN punch_out = punch_in THEN NULL
            ELSE punch_out
          END AS punch_out,
          CASE
            WHEN punch_in IS NULL THEN 'Absent'
            WHEN punch_out = punch_in THEN 'Working'
            ELSE 'Present'
          END AS status,
          CASE
            WHEN punch_in IS NULL THEN INTERVAL '0'
            WHEN punch_out = punch_in
              THEN (NOW() AT TIME ZONE 'Asia/Kolkata') - punch_in
            ELSE punch_out - punch_in
          END AS total_hours
        FROM today_logs
        `,
        [empId]
      );

      today = liveResult.rows[0];
      todayHours = intervalToHHMM(today?.total_hours);
      today.punch_in = formatIST(today?.punch_in);
      today.punch_out = formatIST(today?.punch_out);
    }

    // Weekly total hours
    const weeklyResult = await db.query(
      `
      WITH week_bounds AS (
        SELECT
          DATE_TRUNC('week', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date AS week_start,
          ((NOW() AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day')::date AS week_end
      ),
      daily_logs AS (
        SELECT
          (punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS work_date,
          MIN(punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_in,
          MAX(punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS punch_out
        FROM activity_log
        WHERE emp_id = $1
        GROUP BY (punch_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
      )
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (dl.punch_out - dl.punch_in))), 0) AS total_seconds
      FROM daily_logs dl, week_bounds wb
      WHERE dl.work_date BETWEEN wb.week_start AND wb.week_end
        AND dl.punch_in IS NOT NULL
        AND dl.punch_out IS NOT NULL
        AND dl.punch_out > dl.punch_in
      `,
      [empId]
    );

    const weeklySeconds = Number(weeklyResult.rows[0].total_seconds || 0);
    const weeklyHrs = Math.floor(weeklySeconds / 3600);
    const weeklyMins = Math.floor((weeklySeconds % 3600) / 60);

    res.json({
      today: {
        punch_in: today?.punch_in ?? null,
        punch_out: today?.punch_out ?? null,
        total_hours: todayHours,
        status: today?.status ?? "Absent",
      },
      weekly: {
        total_hours: `${String(weeklyHrs).padStart(2, "0")}:${String(weeklyMins).padStart(2, "0")}`,
      },
    });
  } catch (err) {
    console.error("getMyTodayAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Device → activity_log (every punch, real time)
//         ↓
// Cron / Trigger (every 5–15 min OR after sync)
//         ↓
// daily_attendance (refreshed snapshot for today)
//         ↓
// UI


exports.getMyAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    const { rows } = await db.query(`
    WITH date_range AS (
  SELECT generate_series(
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '30 days',
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date,
    '1 day'
  )::date AS attendance_date
),

punch_summary AS (
  SELECT 
      emp_id,
      (punch_time AT TIME ZONE 'Asia/Kolkata')::date AS attendance_day,
      MIN(punch_time AT TIME ZONE 'Asia/Kolkata') AS first_punch,
      MAX(punch_time AT TIME ZONE 'Asia/Kolkata') AS last_punch
  FROM attendance_logs
  WHERE emp_id = $1
    AND punch_time >= (
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '32 days')
      AT TIME ZONE 'Asia/Kolkata'
    )
  GROUP BY emp_id, attendance_day
)

SELECT 
  $1 AS emp_id,
  u.name AS employee_name,
  to_char(dr.attendance_date, 'YYYY-MM-DD') AS attendance_date,
  ps.first_punch AS punch_in,
  ps.last_punch AS punch_out,

  CASE 
    WHEN ps.first_punch IS NULL THEN 0
    WHEN ps.first_punch = ps.last_punch THEN 0
    ELSE EXTRACT(EPOCH FROM (ps.last_punch - ps.first_punch))
  END AS total_seconds,

  CASE 
    WHEN ps.first_punch IS NULL THEN 'Absent'
    WHEN ps.first_punch = ps.last_punch 
         AND dr.attendance_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
      THEN 'Working'
    ELSE 'Present'
  END AS status

FROM date_range dr
CROSS JOIN (SELECT name FROM users WHERE emp_id = $1) u
LEFT JOIN punch_summary ps 
  ON ps.attendance_day = dr.attendance_date

ORDER BY dr.attendance_date DESC;
    `, [empId]);

    // Format the hours and minutes for the frontend
    const attendance = rows.map(r => {
      let total_hours = null;
      if (r.total_seconds && r.punch_in !== r.punch_out) {
        const secs = Math.abs(Number(r.total_seconds));
        total_hours = {
          hours: Math.floor(secs / 3600),
          minutes: Math.floor((secs % 3600) / 60)
        };
      }
      return { ...r, total_hours };
    });

    res.status(200).json({ success: true, count: attendance.length, attendance });

  } catch (err) {
    console.error("getMyAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};








exports.getMyHolidays = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM holidays ORDER BY holiday_date ASC`
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("getMyHolidays error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getActivityLog = async (req, res) => {
  try {
    const { from, to, emp_id, page = 1, limit = 20 } = req.query;

    const isExport = Number(limit) === -1;
    const parsedLimit = Number(limit) || 20;
    const parsedPage = Number(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    const conditions = [];
    const values = [];

    /* ---------------- Date Filter ---------------- */
    if (from && to) {
      values.push(from, to);
      conditions.push(`
        (punch_time AT TIME ZONE 'UTC' 
         AT TIME ZONE 'Asia/Kolkata')::date 
        BETWEEN $${values.length - 1} AND $${values.length}
      `);
    }

    /* ---------------- Employee Filter ---------------- */
    if (emp_id) {
      values.push(emp_id);
      conditions.push(`emp_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? ` WHERE ${conditions.join(" AND ")}`
      : "";

    /* ---------------- Data Query ---------------- */
   let dataQuery = `
  SELECT 
  
    emp_id,
    device_ip,
    device_sn,

    TO_CHAR(
      punch_time AT TIME ZONE 'UTC' 
      AT TIME ZONE 'Asia/Kolkata',
      'YYYY-MM-DD HH24:MI:SS'
    ) AS punch_time,

      TO_CHAR(
      received_time AT TIME ZONE 'UTC' 
      AT TIME ZONE 'Asia/Kolkata',
      'YYYY-MM-DD HH24:MI:SS'
    ) AS received_time

  FROM activity_log
  ${whereClause}
  ORDER BY punch_time DESC
`;
    /* ---------------- Count Query ---------------- */
    let countQuery = `
      SELECT COUNT(*)
      FROM activity_log
      ${whereClause}
    `;

    let finalValues = [...values];

    /* ---------------- Pagination ---------------- */
    if (!isExport) {
      finalValues.push(parsedLimit, offset);
      dataQuery += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    }

    const [data, count] = await Promise.all([
      db.query(dataQuery, finalValues),
      db.query(countQuery, values),
    ]);

    res.json({
      success: true,
      pagination: isExport
        ? null
        : {
            totalRecords: Number(count.rows[0].count),
            currentPage: parsedPage,
            totalPages: Math.ceil(count.rows[0].count / parsedLimit),
            limit: parsedLimit,
          },
      data: data.rows,
    });

  } catch (err) {
    console.error("Activity Log Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// GET /api/activity-log/export
exports.exportActivityLog = async (req, res) => {
  try {
    const { from, to, emp_id } = req.query;

    let queryText = `SELECT * FROM activity_log`;
    const filters = [];
    const params = [];

    // Same filter logic as above
    if (from && to) {
      params.push(from, to);
      filters.push(`punch_time::DATE BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    if (emp_id) {
      params.push(emp_id);
      filters.push(`emp_id = $${params.length}`);
    }

    const whereClause = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";
    const finalQuery = `${queryText} ${whereClause} ORDER BY punch_time DESC`;

    const { rows } = await db.query(finalQuery, params);

    res.status(200).json({
      success: true,
      data: rows // Returns the full array
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Export Data Error" });
  }
};


























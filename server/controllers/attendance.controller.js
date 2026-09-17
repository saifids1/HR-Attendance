const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");
require("dotenv").config();
const { getDeviceAttendance } = require("../services/zk.service");
const sendEmail = require("../utils/mailer");
const cron = require("node-cron");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const path = require("path");
const { Op, fn, col, literal, where: seqWhere } = require("sequelize");
const env = process.env.NODE_ENV;

// Pick the correct file
const envFile = env === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Determine admin emails dynamically
const adminEmails =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_ADMIN_EMAILS
    : process.env.LOCAL_ADMIN_EMAILS;

const ccEmails =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_CC_EMAILS || ""
    : process.env.LOCAL_CC_EMAILS;

/* ---------------- Destructure models ---------------- */
const {
  Personal,
  Organizations,
  Login,
  UserRoleRelation,
  UsrRoleMaster,
  UserImage,
  DailyAttendance,
  ActivityLog,
  AttendanceLog,
  AttendanceStatus,
  EmployeeEmail,
  Holiday,
  HolidayTypeMaster,
} = db;

/* ============================================================
   HELPER — Universal interval formatter
   Handles BOTH string (from ORM) and object (from pg driver)
   ============================================================ */
const formatInterval = (interval) => {
  if (!interval) return "0h 0m";

  if (typeof interval === "string") {
    const parts = interval.split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return `${hours}h ${minutes}m`;
  }

  const hours = interval.hours || 0;
  const minutes = interval.minutes || 0;
  return `${hours}h ${minutes}m`;
};

/* ============================================================
   SYNC MACHINE LOGS
   ============================================================ */
exports.syncAttendance = async (req, res) => {
  await getDeviceAttendance();
  res.json({ message: "Machine logs synced" });
};

/* ============================================================
   ADMIN — MY ATTENDANCE
   ============================================================ */
exports.getAdminMyAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    /* ---------------------------------------------------------
       1. Sync recent activity into daily_attendance
       --------------------------------------------------------- */
    await sequelize.query(
      `
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
        WHERE emp_id = :empId 
          AND (punch_time AT TIME ZONE 'Asia/Kolkata')::date >= CURRENT_DATE - INTERVAL '2 day'
      ) t
      GROUP BY emp_id, attendance_date
      ON CONFLICT (emp_id, attendance_date) DO NOTHING;
      `,
      { replacements: { empId }, type: sequelize.QueryTypes.INSERT }
    );

    /* ---------------------------------------------------------
       2. Fetch 30-day attendance (CTE — kept as SQL)
       --------------------------------------------------------- */
    const rows = await sequelize.query(
      `
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
          FROM activity_log WHERE emp_id = :empId
        ) t GROUP BY emp_id, attendance_date
      ),
      attendance_log_data AS (
        SELECT emp_id, attendance_date, MIN(local_time) AS punch_in, MAX(local_time) AS punch_out
        FROM (
          SELECT emp_id, punch_time AT TIME ZONE 'Asia/Kolkata' AS local_time,
          CASE WHEN (punch_time AT TIME ZONE 'Asia/Kolkata')::time < TIME '04:00' 
               THEN (punch_time AT TIME ZONE 'Asia/Kolkata')::date - INTERVAL '1 day'
               ELSE (punch_time AT TIME ZONE 'Asia/Kolkata')::date END AS attendance_date
          FROM attendance_logs WHERE emp_id = :empId
        ) x GROUP BY emp_id, attendance_date
      )
      SELECT 
        :empId AS emp_id,
        p.pr_first_name || ' ' || COALESCE(p.pr_last_name, '') AS employee_name,
        to_char(d.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        COALESCE(ad.punch_in, da.punch_in, al.punch_in) AS punch_in,
        COALESCE(ad.punch_out, da.punch_out, al.punch_out) AS punch_out,
        (COALESCE(ad.punch_out, da.punch_out, al.punch_out) - COALESCE(ad.punch_in, da.punch_in, al.punch_in)) AS total_hours,
        CASE 
          WHEN COALESCE(ad.punch_in, da.punch_in, al.punch_in) IS NULL THEN 'Absent'
          ELSE 'Present'
        END AS status
      FROM dates d
      JOIN organizations o ON o.or_emp_id = :empId
      JOIN personal p ON p.pr_id = o.pr_id
      LEFT JOIN activity_data ad ON ad.attendance_date = d.attendance_date
      LEFT JOIN daily_attendance da ON da.attendance_date = d.attendance_date AND da.emp_id = :empId
      LEFT JOIN attendance_log_data al ON al.attendance_date = d.attendance_date
      WHERE COALESCE(o.or_is_active, TRUE) = true
      ORDER BY d.attendance_date DESC;
      `,
      { replacements: { empId }, type: sequelize.QueryTypes.SELECT }
    );

    console.log(rows);

    /* ---------------------------------------------------------
       3. Format result
       --------------------------------------------------------- */
    const formattedData = rows.map((r) => {
      const formatTime = (isoStr) => {
        if (!isoStr) return "---";
        return new Date(isoStr).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });
      };

      let hours = 0;
      let minutes = 0;
      if (r.total_hours) {
        if (typeof r.total_hours === "string") {
          const parts = r.total_hours.split(":");
          hours = parseInt(parts[0], 10) || 0;
          minutes = parseInt(parts[1], 10) || 0;
        } else {
          hours = r.total_hours.hours || 0;
          minutes = r.total_hours.minutes || 0;
        }
      }

      return {
        ...r,
        punch_in: formatTime(r.punch_in),
        punch_out: formatTime(r.punch_out),
        total_hours_str: `${hours}h ${minutes}m`,
      };
    });

    res.status(200).json({
      total_documents: formattedData.length,
      attendance: formattedData,
    });
  } catch (err) {
    console.error("❌ getAdminMyAttendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ADD EMPLOYEE (Model-based)
   ============================================================ */
exports.addEmployController = async (req, res) => {
  const t = await sequelize.transaction();

  console.log("addEmp", req.body);

  try {
    const { name, email, password, is_active, roles } = req.body;

    if (!name || !email || !password || !is_active || !roles) {
      await t.rollback();
      return res.status(400).json({ message: "All essential fields required" });
    }

    if (roles !== undefined && !Array.isArray(roles)) {
      await t.rollback();
      return res.status(400).json({ message: "Roles must be an array" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

    /* 1. Create personal row */
    const newPersonal = await Personal.create(
      {
        pr_first_name: name,
        pr_email: email.toLowerCase().trim(),
        pr_is_active: is_active === undefined ? true : is_active,
        pr_profile_image: profile_image,
      },
      { transaction: t }
    );

    const newPrId = newPersonal.pr_id;

    /* 2. Create login row */
    await Login.create(
      {
        pr_id: newPrId,
        lg_password: hashedPassword,
      },
      { transaction: t }
    );

    /* 3. Create role relations */
    if (roles && roles.length > 0) {
      const roleRows = roles.map((roleId) => ({
        pr_id: newPrId,
        rl_role_id: roleId,
      }));
      await UserRoleRelation.bulkCreate(roleRows, { transaction: t });
    }

    await t.commit();

    res.status(201).json({
      message: "Employee created successfully",
      user: {
        id: newPrId,
        name,
        email,
        roles: roles || [],
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Transaction Error:", error);

    if (
      error.code === "23505" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        message: "Email or Employee ID already exists",
      });
    }

    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   UPDATE EMPLOYEE (Model-based)
   ============================================================ */
exports.updateEmployController = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { name, email, password, is_active, emp_id, roles } = req.body;

    console.log("Update Employee:", id, req.body);

    if (roles !== undefined && !Array.isArray(roles)) {
      await t.rollback();
      return res.status(400).json({ message: "Roles must be an array" });
    }

    if (roles !== undefined && roles.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "At least one role is required" });
    }

    /* 1. Check personal exists */
    const personal = await Personal.findByPk(id, { transaction: t });

    if (!personal) {
      await t.rollback();
      return res.status(404).json({ message: "Employee not found" });
    }

    /* 2. Build update payload for Personal */
    const personalPayload = {};
    if (name !== undefined) personalPayload.pr_first_name = name;
    if (email !== undefined)
      personalPayload.pr_email = email.toLowerCase().trim();
    if (is_active !== undefined) personalPayload.pr_is_active = is_active;

    if (Object.keys(personalPayload).length > 0) {
      await personal.update(personalPayload, { transaction: t });
    }

    /* 3. Update Organizations (emp_id) */
    if (emp_id !== undefined) {
      const org = await Organizations.findOne({
        where: { pr_id: id },
        transaction: t,
      });
      if (org) {
        await org.update({ or_emp_id: emp_id }, { transaction: t });
      }
    }

    /* 4. Password */
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(String(password), 10);
      const login = await Login.findOne({
        where: { pr_id: id },
        transaction: t,
      });
      if (login) {
        await login.update({ lg_password: hashedPassword }, { transaction: t });
      }
    }

    /* 5. Replace roles if provided */
    if (roles !== undefined) {
      await UserRoleRelation.destroy({
        where: { pr_id: id },
        transaction: t,
      });

      const roleRows = roles.map((roleId) => ({
        pr_id: id,
        rl_role_id: roleId,
      }));
      await UserRoleRelation.bulkCreate(roleRows, { transaction: t });
    }

    /* 6. Fetch current roles */
    const roleResult = await UserRoleRelation.findAll({
      where: { pr_id: id },
      include: [
        {
          model: UsrRoleMaster,
          as: "role",
          attributes: ["rm_role_id", "rm_role_name"],
          required: true,
        },
      ],
      transaction: t,
    });

    await t.commit();

    const formattedRoles = roleResult.map((r) => ({
      role_id: r.role?.rm_role_id,
      role_name: r.role?.rm_role_name,
    }));

    /* Fetch org for response */
    const orgRow = await Organizations.findOne({ where: { pr_id: id } });

    return res.status(200).json({
      message: "Employee updated successfully",
      user: {
        id: personal.pr_id,
        name: personal.pr_first_name,
        email: personal.pr_email,
        is_active: personal.pr_is_active,
        emp_id: orgRow?.or_emp_id,
        roles: formattedRoles,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Update Employee Error:", error);

    if (
      error.code === "23505" ||
      error.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   TODAY ATTENDANCE (model-based)
   ============================================================ */
exports.getTodayAttendance = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    /* Total employees */
    const totalItems = await Personal.count({
      where: { pr_is_active: true },
      include: [
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: true,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: true,
              where: seqWhere(fn("LOWER", col("role.rm_role_name")), {
                [Op.in]: ["employee", "admin"],
              }),
            },
          ],
        },
      ],
      distinct: true,
      col: "pr_id",
    });

    /* Attendance list */
    const employees = await Personal.findAll({
      attributes: ["pr_id", "pr_first_name", "pr_last_name"],
      where: { pr_is_active: true },
      include: [
        {
          model: Organizations,
          as: "organizations",
          required: true,
          attributes: ["or_emp_id"],
        },
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: true,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: true,
              where: seqWhere(fn("LOWER", col("role.rm_role_name")), {
                [Op.in]: ["employee", "admin"],
              }),
            },
          ],
        },
      ],
      order: [["pr_first_name", "ASC"]],
      limit,
      offset,
      subQuery: false,
    });

    /* Fetch attendance for these emp_ids */
    const empIds = employees
      .map((e) => e.organizations?.[0]?.or_emp_id)
      .filter(Boolean);

    const attendanceMap = {};
    if (empIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const attRows = await DailyAttendance.findAll({
        where: {
          emp_id: { [Op.in]: empIds },
          attendance_date: today,
        },
        raw: true,
      });
      attRows.forEach((a) => {
        attendanceMap[a.emp_id] = a;
      });
    }

    const result = employees.map((p) => {
      const empId = p.organizations?.[0]?.or_emp_id;
      const d = attendanceMap[empId] || null;

      const status =
        d?.punch_in && d?.punch_out
          ? "Present"
          : d?.punch_in
          ? "Working"
          : "Absent";

      return {
        id: p.pr_id,
        name: `${p.pr_first_name || ""} ${p.pr_last_name || ""}`.trim(),
        emp_id: empId,
        status,
        punch_in: d?.punch_in || null,
        punch_out: d?.punch_out || null,
        total_hours: d?.total_hours || 0,
      };
    });

    res.json({
      employees: result,
      pagination: {
        currentPage: page,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("getTodayAttendance error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ============================================================
   GENERATE DAILY ATTENDANCE (model-based)
   ============================================================ */
exports.generateDailyAttendance = async (req, res) => {
  try {
    const employees = await Personal.findAll({
      attributes: ["pr_id", "pr_first_name", "pr_last_name"],
      where: { pr_is_active: true },
      include: [
        {
          model: Organizations,
          as: "organizations",
          required: true,
          attributes: ["or_emp_id"],
        },
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: true,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: true,
              where: seqWhere(fn("LOWER", col("role.rm_role_name")), {
                [Op.in]: ["employee", "admin"],
              }),
            },
          ],
        },
      ],
      order: [["pr_first_name", "ASC"]],
      subQuery: false,
    });

    const empIds = employees
      .map((e) => e.organizations?.[0]?.or_emp_id)
      .filter(Boolean);

    const attendanceMap = {};
    if (empIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const attRows = await DailyAttendance.findAll({
        where: {
          emp_id: { [Op.in]: empIds },
          attendance_date: today,
        },
        raw: true,
      });
      attRows.forEach((a) => {
        attendanceMap[a.emp_id] = a;
      });
    }

    const result = employees.map((p) => {
      const empId = p.organizations?.[0]?.or_emp_id;
      const d = attendanceMap[empId] || null;

      const status =
        d?.punch_in && d?.punch_out
          ? "Present"
          : d?.punch_in
          ? "Working"
          : "Absent";

      return {
        id: p.pr_id,
        name: `${p.pr_first_name || ""} ${p.pr_last_name || ""}`.trim(),
        emp_id: empId,
        status,
        punch_in: d?.punch_in || null,
        punch_out: d?.punch_out || null,
        total_hours: d?.total_hours || 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   CRON TASK
   ============================================================ */
exports.runAttendanceTask = async () => {
  try {
    console.log(
      `[${new Date().toISOString()}] CRON: Triggering processAndSendAttendanceReport...`
    );

    const data = await exports.processAndSendAttendanceReport(true);

    console.log(
      `[${new Date().toISOString()}] CRON: Success. Processed ${data.length} records.`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] CRON ERROR:`, error);
  }
};

/* ============================================================
   PROCESS + SEND REPORT
   (Kept as sequelize.query — complex CTE — no model equivalent)
   ============================================================ */
exports.processAndSendAttendanceReport = async (
  sendEmailToAdmin = false,
  req = null,
  res = null
) => {
  try {
    const todayIST = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    console.log("env", env);

    const query = `
      WITH attendance_summary AS (
        SELECT
          da.emp_id,
          da.attendance_date,
          COUNT(*) AS punch_count,
          MIN(da.punch_in) AS first_punch,
          MAX(
            CASE
              WHEN da.punch_out = da.punch_in THEN NULL
              ELSE da.punch_out
            END
          ) AS last_punch,
          COALESCE(
            SUM(
              CASE 
                WHEN da.punch_out IS NOT NULL 
                THEN da.punch_out - da.punch_in
                ELSE INTERVAL '0'
              END
            ),
            INTERVAL '0 hours'
          ) AS total_hours
        FROM public.daily_attendance da
        WHERE da.attendance_date = :todayIST
        GROUP BY da.emp_id, da.attendance_date
      )
      SELECT
        o.or_emp_id AS emp_id,
        p.pr_first_name || ' ' || COALESCE(p.pr_last_name, '') AS name,
        p.pr_email AS email,
        COALESCE(o.or_is_active, TRUE) AS is_active,
        o.or_department_id AS department,
        o.or_joining_date AS joining_date,
        COALESCE(a.attendance_date, :todayIST::DATE) AS attendance_date,
        a.first_punch AS punch_in,
        a.last_punch AS punch_out,
        CASE
          WHEN a.punch_count IS NULL THEN 'Absent'
          WHEN a.punch_count >= 1 AND a.last_punch IS NULL THEN 'Working'
          WHEN a.punch_count >= 1 THEN 'Present'
          ELSE 'Absent'
        END AS status,
        COALESCE(a.punch_count, 0) AS punch_count,
        COALESCE(a.total_hours, INTERVAL '0 hours') AS total_hours
      FROM organizations o
      JOIN personal p ON p.pr_id = o.pr_id
      JOIN user_role_relation urr ON urr.pr_id = p.pr_id
      JOIN usr_role_master rm ON rm.rm_role_id = urr.rl_role_id
      LEFT JOIN attendance_summary a ON a.emp_id = o.or_emp_id
      WHERE LOWER(rm.rm_role_name) IN ('employee', 'admin')
      ORDER BY COALESCE(o.or_is_active, TRUE) DESC, p.pr_first_name ASC;
    `;

    const rows = await sequelize.query(query, {
      replacements: { todayIST },
      type: sequelize.QueryTypes.SELECT,
    });

    console.log("Attendance Rows Fetched:", rows);

    const mailDateFormat = new Date()
      .toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");

    dotenv.config({
      path:
        process.env.NODE_ENV === "production"
          ? ".env.production"
          : ".env.local",
    });

    /* ---------------- EMAIL LOGIC ---------------- */
    if (sendEmailToAdmin) {
      const subject = `Attendance Report - ${mailDateFormat}`;

      const type =
        process.env.NODE_ENV === "production" ? "production" : "local";

      /* Model-based email fetch */
      const emailRows = await EmployeeEmail.findAll({
        where: { type },
        attributes: ["email"],
      });

      const adminEmails = emailRows
        .map((r) => r.email?.trim())
        .filter(Boolean)
        .join(",");

      console.log("adminEmails", adminEmails);

      const tableRowsHtml = rows
        .filter((emp) => emp.is_active && emp.emp_id && emp.emp_id !== "2020")
        .map((emp) => {
          const statusBg =
            emp.status === "Working"
              ? "#ff9800"
              : emp.status === "Absent"
              ? "#dc3545"
              : "#28a745";

          const timeIn = emp.punch_in
            ? new Date(emp.punch_in).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "---";

          const timeOut = emp.punch_out
            ? new Date(emp.punch_out).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "---";

          const attendanceDate = emp.punch_in
            ? new Date(emp.punch_in)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                .replace(/\//g, "-")
            : "---";

          return `
          <tr>
            <td style="border:1px solid #ddd; padding:8px;">${emp.emp_id}</td>
            <td style="border:1px solid #ddd; padding:8px;">${emp.name}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${attendanceDate}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${timeIn}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${timeOut}</td>
            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${formatInterval(emp.total_hours) || "0h 0m"}</td>
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
        })
        .join("");

      const now = new Date();
      const formattedDate = now
        .toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
        .replace(/\//g, "-");

      console.log("adminEmail Send Mail", adminEmails);

      await sendEmail(
        adminEmails,
        subject,
        "admin_all_present",
        {
          date: formattedDate,
          time: new Date().toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
          }),
          employee_rows: tableRowsHtml,
        },
        ccEmails
      );
      console.log("CRON: Email sent successfully.");
    }

    if (res) return res.status(200).json(rows);
    return rows;
  } catch (error) {
    console.error("Attendance Process Error:", error);
    if (res) return res.status(500).json({ message: "Internal Server Error" });
    throw error;
  }
};

/* ============================================================
   ORGANIZATION ATTENDANCE (today)
   (Kept as sequelize.query — cross-schema 3-table join)
   ============================================================ */
exports.getTodayOrganizationAttendance = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 15, 1);
    const offset = (page - 1) * limit;
    const showInactive = req.query.showInactive === "true";

    /* ---------------- TODAY ---------------- */
    const [todayRow] = await sequelize.query(
      `SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS today`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const today = todayRow.today;

    /* ---------------- COUNT ---------------- */
    let countQuery = `
      SELECT COUNT(DISTINCT o.or_id) AS total
      FROM public.organizations o
      INNER JOIN public.personal p ON p.pr_id = o.pr_id
      WHERE o.or_emp_id IS NOT NULL AND TRIM(o.or_emp_id) <> ''
    `;
    if (!showInactive) {
      countQuery += ` AND COALESCE(o.or_is_active, TRUE) = TRUE`;
    }

    const [countRow] = await sequelize.query(countQuery, {
      type: sequelize.QueryTypes.SELECT,
    });
    const totalItems = parseInt(countRow.total, 10);

    /* ---------------- SUMMARY ---------------- */
    let summaryQuery = `
      SELECT
        COUNT(DISTINCT o.or_id) AS total_employees,
        COUNT(DISTINCT CASE WHEN da.punch_in IS NOT NULL THEN o.or_id END) AS punch_in,
        COUNT(DISTINCT CASE WHEN da.punch_out IS NOT NULL THEN o.or_id END) AS punch_out,
        COUNT(DISTINCT CASE WHEN ast.status_name = 'Leave' THEN o.or_id END) AS leave,
        COUNT(DISTINCT CASE WHEN da.punch_in IS NULL
                            AND COALESCE(ast.status_name, 'Absent') <> 'Leave'
                       THEN o.or_id END) AS absent
      FROM public.organizations o
      INNER JOIN public.personal p ON p.pr_id = o.pr_id
      LEFT JOIN public.daily_attendance da
        ON TRIM(da.emp_id) = TRIM(o.or_emp_id)
       AND da.attendance_date = :today
      LEFT JOIN public.attendence_status ast
        ON ast.id = da.status_id
       AND COALESCE(ast.is_active, TRUE) = TRUE
      WHERE o.or_emp_id IS NOT NULL AND TRIM(o.or_emp_id) <> ''
    `;
    if (!showInactive) {
      summaryQuery += ` AND COALESCE(o.or_is_active, TRUE) = TRUE`;
    }

    const [summaryRow] = await sequelize.query(summaryQuery, {
      replacements: { today },
      type: sequelize.QueryTypes.SELECT,
    });

    const attendanceSummary = {
      total_employees: parseInt(summaryRow.total_employees, 10) || 0,
      punch_in: parseInt(summaryRow.punch_in, 10) || 0,
      punch_out: parseInt(summaryRow.punch_out, 10) || 0,
      leave: parseInt(summaryRow.leave, 10) || 0,
      absent: parseInt(summaryRow.absent, 10) || 0,
    };

    /* ---------------- ATTENDANCE LIST ---------------- */
    let query = `
      SELECT
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE AS attendance_date,
        TRIM(o.or_emp_id) AS emp_id,
        ui.ui_imagepath AS profile_image,
        COALESCE(o.or_is_active, FALSE) AS is_active,
        COALESCE(
          NULLIF(TRIM(p.pr_first_name), ''),
          TRIM(CONCAT_WS(' ', p.pr_first_name, p.pr_last_name)),
          '-'
        ) AS name,
        o."or_official_email" AS email,
        'employee' AS role,
        da.punch_in,
        da.punch_out,
        da.status_id,
        CASE
          WHEN da.expected_hours IS NULL THEN '00:00'
          ELSE
            LPAD(FLOOR(EXTRACT(EPOCH FROM da.expected_hours) / 3600)::TEXT, 2, '0')
            || ':' ||
            LPAD(FLOOR(MOD(EXTRACT(EPOCH FROM da.expected_hours), 3600) / 60)::TEXT, 2, '0')
        END AS expected_hours,
        COALESCE(ast.status_name, 'Absent') AS status,
        CASE
          WHEN da.punch_in IS NOT NULL AND da.punch_out IS NOT NULL
          THEN EXTRACT(EPOCH FROM (da.punch_out - da.punch_in))
          ELSE 0
        END AS total_seconds
      FROM public.organizations o
      INNER JOIN public.personal p ON p.pr_id = o.pr_id
      LEFT JOIN public.User_Image ui ON ui.pr_id = p.pr_id
      LEFT JOIN public.daily_attendance da
        ON TRIM(da.emp_id) = TRIM(o.or_emp_id)
       AND da.attendance_date = :today
      LEFT JOIN public.attendence_status ast
        ON ast.id = da.status_id
       AND COALESCE(ast.is_active, TRUE) = TRUE
      WHERE o.or_emp_id IS NOT NULL AND TRIM(o.or_emp_id) <> ''
    `;
    if (!showInactive) {
      query += ` AND COALESCE(o.or_is_active, TRUE) = TRUE`;
    }
    query += ` ORDER BY TRIM(o.or_emp_id) ASC LIMIT :limit OFFSET :offset`;

    const rows = await sequelize.query(query, {
      replacements: { today, limit, offset },
      type: sequelize.QueryTypes.SELECT,
    });

    console.log("Attendance Rows Fetched: organization", rows);

    /* ---------------- FORMAT ---------------- */
    const formattedRows = rows.map((row) => {
      const totalSeconds = Number(row.total_seconds) || 0;
      let totalHours = "00:00";
      if (totalSeconds > 0) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        totalHours = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }

      const punchIn = row.punch_in
        ? new Date(row.punch_in).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "--";

      const punchOut = row.punch_out
        ? new Date(row.punch_out).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "--";

      let expectedHours = "00:00";
      if (row.expected_hours !== null && row.expected_hours !== undefined) {
        expectedHours = String(row.expected_hours);
      }

      return {
        attendance_date: `${row.attendance_date}T18:30:00.000Z`,
        emp_id: row.emp_id,
        is_active: row.is_active,
        name: row.name,
        email: row.email || "-",
        punch_in: punchIn,
        punch_out: punchOut,
        role: row.role,
        status_id: row.status_id,
        status: row.status,
        total_hours: totalHours,
        expected_hours: expectedHours,
        profile_image: row.profile_image || "-",
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        total_employees: attendanceSummary.total_employees,
        punch_in: attendanceSummary.punch_in,
        punch_out: attendanceSummary.punch_out,
        absent: attendanceSummary.absent,
        leave: attendanceSummary.leave,
      },
      employees: formattedRows,
      pagination: {
        currentPage: page,
        totalItems: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        limit: limit,
      },
    });
  } catch (error) {
    console.error("Organization attendance error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process attendance",
    });
  }
};

/* ============================================================
   SINGLE EMP — TODAY (model-based)
   ============================================================ */
exports.getMyTodayAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;

    const formatTime = (ts) => {
      if (!ts) return null;

      return new Date(ts).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    };

    const secondsToHHMM = (seconds) => {
      const total = Math.max(Number(seconds || 0), 0);
      const hrs = Math.floor(total / 3600);
      const mins = Math.floor((total % 3600) / 60);

      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
        2,
        "0"
      )}`;
    };

    const todayResult = await DailyAttendance.findOne({
      where: {
        emp_id: empId,
        [Op.and]: [
          seqWhere(
            col("attendance_date"),
            "=",
            literal("CURRENT_DATE")
          ),
        ],
      },
      attributes: [
        "punch_in",
        "punch_out",
        "total_hours",
      ],
      raw: true,
    });

    let today;

    if (todayResult) {
      const punchIn = todayResult.punch_in;

      const samePunch =
        punchIn &&
        todayResult.punch_out &&
        new Date(todayResult.punch_out).getTime() ===
          new Date(punchIn).getTime();

      const punchOut = samePunch
        ? null
        : todayResult.punch_out;

      let totalHours = "00:00";

      if (punchIn && punchOut) {
        const totalSeconds =
          (new Date(punchOut) - new Date(punchIn)) / 1000;

        totalHours = secondsToHHMM(totalSeconds);
      }

      today = {
        punch_in: formatTime(punchIn),
        punch_out: formatTime(punchOut),
        total_hours: totalHours,
        status: !punchIn
          ? "Absent"
          : !punchOut
          ? "Working"
          : "Present",
      };
    } else {
      const liveRow = await ActivityLog.findOne({
        where: {
          emp_id: empId,
          [Op.and]: [
            seqWhere(
              fn("DATE", col("punch_time")),
              literal("CURRENT_DATE")
            ),
          ],
        },
        attributes: [
          [fn("MIN", col("punch_time")), "punch_in"],
          [fn("MAX", col("punch_time")), "punch_out"],
        ],
        raw: true,
      });

      if (!liveRow || !liveRow.punch_in) {
        today = {
          punch_in: null,
          punch_out: null,
          total_hours: "00:00",
          status: "Absent",
        };
      } else {
        const samePunch =
          liveRow.punch_out &&
          new Date(liveRow.punch_out).getTime() ===
            new Date(liveRow.punch_in).getTime();

        const punchOut = samePunch
          ? null
          : liveRow.punch_out;

        const totalSeconds = punchOut
          ? (new Date(punchOut) - new Date(liveRow.punch_in)) / 1000
          : (new Date() - new Date(liveRow.punch_in)) / 1000;

        today = {
          punch_in: formatTime(liveRow.punch_in),
          punch_out: formatTime(punchOut),
          total_hours: secondsToHHMM(totalSeconds),
          status: punchOut ? "Present" : "Working",
        };
      }
    }

    const weeklyDays = await DailyAttendance.count({
      where: {
        emp_id: empId,
        [Op.and]: [
          seqWhere(
            col("attendance_date"),
            ">=",
            literal("DATE_TRUNC('week', CURRENT_DATE)::date")
          ),
          seqWhere(
            col("attendance_date"),
            "<=",
            literal("CURRENT_DATE")
          ),
        ],
        punch_in: {
          [Op.ne]: null,
        },
      },
      distinct: true,
      col: "attendance_date",
    });

    return res.status(200).json({
      today,
      weekly: {
        days: Number(weeklyDays || 0),
      },
    });
  } catch (err) {
    console.error("getMyTodayAttendance error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* ============================================================
   MY ATTENDANCE HISTORY (model-based)
   ============================================================ */
exports.getMyAttendance = async (req, res) => {
  try {
    const empId = req.user.emp_id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 15, 1);
    const offset = (page - 1) * limit;

    const { startDate, endDate } = req.query;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be greater than endDate",
      });
    }

    const now = new Date();
    const defaultTo = now.toISOString().split("T")[0];
    const defaultFrom = new Date(now.getTime() - 30 * 86400000)
      .toISOString()
      .split("T")[0];

    const fromDate = startDate || defaultFrom;
    const toDate = endDate || defaultTo;

    /* ---------------- COUNT ---------------- */
    const totalItems = await DailyAttendance.count({
      where: {
        emp_id: empId,
        attendance_date: { [Op.between]: [fromDate, toDate] },
      },
    });

    /* ---------------- DATA ---------------- */
    const rows = await DailyAttendance.findAll({
      where: {
        emp_id: empId,
        attendance_date: { [Op.between]: [fromDate, toDate] },
      },
      attributes: [
        "emp_id",
        "attendance_date",
        "punch_in",
        "punch_out",
        "total_hours",
        "expected_hours",
        "late_arrival",
        "is_late_arrived",
        "early_go",
        "is_early_gone",
        "status_id",
      ],
      include: [
        {
          model: AttendanceStatus,
          as: "status",
          attributes: ["status_name"],
          required: false,
        },
      ],
      order: [["attendance_date", "DESC"]],
      limit,
      offset,
    });

    /* ---------------- FORMAT ---------------- */
    const attendance = rows.map((r) => {
      const plain = r.toJSON();

      if (plain.attendance_date) {
        plain.attendance_date = new Date(plain.attendance_date)
          .toISOString()
          .split("T")[0];
      }

      plain.status_name = plain.status?.status_name || null;
      delete plain.status;

      let total_hours = null;
      if (plain.total_hours !== null && plain.total_hours !== undefined) {
        total_hours = plain.total_hours;
      } else if (plain.punch_in && plain.punch_out) {
        const secs =
          (new Date(plain.punch_out) - new Date(plain.punch_in)) / 1000;
        if (secs > 0) {
          total_hours = {
            hours: Math.floor(secs / 3600),
            minutes: Math.floor((secs % 3600) / 60),
          };
        }
      }

      return { ...plain, total_hours };
    });

    return res.status(200).json({
      success: true,
      attendance,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
        hasNext: page < Math.ceil(totalItems / limit),
        hasPrevious: page > 1,
      },
    });
  } catch (err) {
    console.error("getMyAttendance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   MY HOLIDAYS (model-based)
   ============================================================ */
exports.getMyHolidays = async (req, res) => {
  try {
    const rows = await Holiday.findAll({
      include: [
        {
          model: HolidayTypeMaster,
          as: "holidayType",
          attributes: ["holiday_type_name"],
          required: false,
        },
      ],
      order: [["holiday_date", "ASC"]],
    });

    const formatted = rows.map((h) => {
      const plain = h.toJSON();
      return {
        ...plain,
        holiday_type_name: plain.holidayType?.holiday_type_name || null,
        holidayType: undefined,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error("getMyHolidays error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ACTIVITY LOG (model-based)
   ============================================================ */
exports.getActivityLog = async (req, res) => {
  try {
    const { from, to, emp_id, search, page = 1, limit = 20 } = req.query;

    const isExport = Number(limit) === -1;
    const parsedLimit = Number(limit) || 20;
    const parsedPage = Number(page) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    /* ---------------- WHERE ---------------- */
    const where = {};

    if (from && to) {
      where.punch_time = { [Op.between]: [from, to] };
    }

    if (emp_id) {
      where.emp_id = emp_id;
    }

    if (search) {
      const s = search.trim();
      where[Op.or] = [
        { emp_id: { [Op.iLike]: `%${s}%` } },
        { device_ip: { [Op.iLike]: `%${s}%` } },
        seqWhere(fn("TO_CHAR", col("punch_time"), "HH12:MI AM"), {
          [Op.iLike]: `%${s}%`,
        }),
        seqWhere(fn("TO_CHAR", col("punch_time"), "HH24:MI:SS"), {
          [Op.iLike]: `%${s}%`,
        }),
      ];
    }

    /* ---------------- QUERY ---------------- */
    const findOptions = {
      where,
      attributes: [
        "emp_id",
        "device_ip",
        "device_sn",
        [fn("TO_CHAR", col("punch_time"), "YYYY-MM-DD HH24:MI:SS"), "punch_time"],
        [
          fn("TO_CHAR", col("created_at"), "YYYY-MM-DD HH24:MI:SS"),
          "received_time",
        ],
      ],
      order: [["punch_time", "DESC"]],
      raw: true,
    };

    if (!isExport) {
      findOptions.limit = parsedLimit;
      findOptions.offset = offset;
    }

    const [data, count] = await Promise.all([
      ActivityLog.findAll(findOptions),
      ActivityLog.count({ where }),
    ]);

    res.json({
      success: true,
      pagination: isExport
        ? null
        : {
            totalRecords: Number(count),
            currentPage: parsedPage,
            totalPages: Math.ceil(count / parsedLimit),
            limit: parsedLimit,
          },
      data,
    });
  } catch (err) {
    console.error("Activity Log Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   ORGANIZATION ATTENDANCE (ALL USERS — model-based)
   ============================================================ */
exports.getTodayOrganizationAttendanceAll = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 15, 1);
    const offset = (page - 1) * limit;

    /* ---------------- COUNT ---------------- */
    const totalItems = await Personal.count({
      distinct: true,
      col: "pr_id",
      where: { pr_is_active: true },
      include: [
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: true,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: true,
              where: seqWhere(fn("LOWER", col("role.rm_role_name")), {
                [Op.in]: ["employee", "admin"],
              }),
            },
          ],
        },
      ],
    });

    /* ---------------- DATA ---------------- */
    const rows = await Personal.findAll({
      where: { pr_is_active: true },
      attributes: [
        "pr_id",
        "pr_first_name",
        "pr_last_name",
        "pr_email",
        "pr_is_active",
      ],
      include: [
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: true,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: true,
              where: seqWhere(fn("LOWER", col("role.rm_role_name")), {
                [Op.in]: ["employee", "admin"],
              }),
            },
          ],
        },
        {
          model: Organizations,
          as: "organizations",
          required: false,
          attributes: [
            "or_emp_id",
            "or_is_active",
            "or_organization_email",
            "or_organization_name",
            "or_organization_location",
            "or_department_id",
            "or_designation_id",
            "or_employee_type_id",
            "or_reporting_location_id",
            "or_reporting_to_id",
            "or_joining_date",
            "or_leaving_date",
          ],
        },
      ],
      order: [["pr_first_name", "ASC"]],
      limit,
      offset,
      subQuery: false,
    });

    /* Attach attendance separately */
    const empIds = rows
      .map((r) => r.organizations?.[0]?.or_emp_id)
      .filter(Boolean);

    const attendanceMap = {};
    if (empIds.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const attRows = await DailyAttendance.findAll({
        where: {
          emp_id: { [Op.in]: empIds },
          attendance_date: today,
        },
        raw: true,
      });
      attRows.forEach((a) => {
        attendanceMap[a.emp_id] = a;
      });
    }

    /* ---------------- FORMAT ---------------- */
    const formattedRows = rows.map((p) => {
      const plain = p.toJSON();
      const org = plain.organizations?.[0] || {};
      const empId = org.or_emp_id;
      const att = attendanceMap[empId] || {};

      const role = (plain.userRoles || [])
        .map((ur) => ur.role?.rm_role_name)
        .filter(Boolean)
        .sort()
        .join(", ");

      const name =
        [plain.pr_first_name, plain.pr_last_name]
          .filter(Boolean)
          .join(" ")
          .trim() || "-";

      let status = "Absent";
      if (!plain.pr_is_active || org.or_is_active === false) status = "Inactive";
      else if (att.punch_in && att.punch_out) status = "Present";
      else if (att.punch_in) status = "Working";

      let totalHours = "00:00";
      if (att.total_hours) {
        const interval = String(att.total_hours);
        const match = interval.match(
          /(?:(\d+)\s+days?\s+)?(\d{1,3}):(\d{2}):(\d{2}(?:\.\d+)?)/
        );
        if (match) {
          const days = parseInt(match[1] || 0, 10);
          const hours = parseInt(match[2] || 0, 10);
          const minutes = parseInt(match[3] || 0, 10);
          const totalMinutes = days * 24 * 60 + hours * 60 + minutes;
          const finalHours = Math.floor(totalMinutes / 60);
          const finalMinutes = totalMinutes % 60;
          totalHours = `${String(finalHours).padStart(2, "0")}:${String(
            finalMinutes
          ).padStart(2, "0")}`;
        }
      } else if (att.punch_in && att.punch_out) {
        const secs =
          (new Date(att.punch_out) - new Date(att.punch_in)) / 1000;
        if (secs > 0) {
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          totalHours = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
      }

      return {
        pr_id: plain.pr_id,
        emp_id: empId,
        name,
        email: plain.pr_email,
        role,
        is_active: plain.pr_is_active,
        organization_is_active: org.or_is_active,
        organization_email: org.or_organization_email,
        organization_name: org.or_organization_name,
        organization_location: org.or_organization_location,
        department_id: org.or_department_id,
        designation_id: org.or_designation_id,
        employee_type_id: org.or_employee_type_id,
        reporting_location_id: org.or_reporting_location_id,
        reporting_to_id: org.or_reporting_to_id,
        joining_date: org.or_joining_date,
        leaving_date: org.or_leaving_date,
        attendance_date: att.attendance_date || new Date(),
        punch_in: att.punch_in
          ? new Date(att.punch_in).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            })
          : "--",
        punch_out: att.punch_out
          ? new Date(att.punch_out).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZone: "Asia/Kolkata",
            })
          : "--",
        status,
        total_hours: totalHours,
      };
    });

    return res.status(200).json({
      success: true,
      employees: formattedRows,
      pagination: {
        currentPage: page,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Manual report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process attendance",
      error: error.message,
    });
  }
};

/* ============================================================
   EXPORT ACTIVITY LOG (model-based)
   ============================================================ */
exports.exportActivityLog = async (req, res) => {
  try {
    const { from, to, emp_id } = req.query;

    const where = {};
    if (from && to) where.punch_time = { [Op.between]: [from, to] };
    if (emp_id) where.emp_id = emp_id;

    const rows = await ActivityLog.findAll({
      where,
      order: [["punch_time", "DESC"]],
      raw: true,
    });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Export Data Error:", error);
    res.status(500).json({ success: false, message: "Export Data Error" });
  }
};
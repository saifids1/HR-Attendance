const express = require("express");
const router = express.Router();
const controller = require("../controllers/attendance.controller");
const auth = require("../middlewares/authMiddleware");
const { addEmployController } = require("../controllers/attendance.controller");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { db } = require("../db/SequelizeDB");
const uploadProfileImage = require("../middlewares/uploadProfileImage");
const {
  updateEmployController,
} = require("../controllers/attendance.controller");

// Admin

router.get("/sync", controller.syncAttendance);

// Today All Employ Attendance
router.get("/today", auth, isAdmin, controller.getTodayOrganizationAttendance);

// Add Employ by Admin

router.post(
  "/add-employee",
  uploadProfileImage.single("profile"),
  addEmployController,
);
router.put("/employee/:id", updateEmployController);

// Admin Attendance
router.get("/history", auth, isAdmin, controller.getAdminMyAttendance);

// Admin Activity logs
router.get("/activity-log", auth, isAdmin, controller.getActivityLog);

router.get(
  "/activity-log/exports",
  auth,
  isAdmin,
  controller.exportActivityLog,
);
// New API for all employees
router.get(
  "/today/all",
  auth,
  isAdmin,
  controller.getTodayOrganizationAttendanceAll,
);

// Express route example
router.patch("/:emp_id/status", auth, isAdmin, async (req, res) => {
  const { emp_id } = req.params;
  const { is_active } = req.body;

  try {
    await db.query("UPDATE users SET is_active = $1 WHERE emp_id = $2", [
      is_active,
      emp_id,
    ]);
    res.status(200).send({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).send({ error: "Failed to update status" });
  }
});

router.get("/all-attendance", auth, async (req, res) => {
  try {
    let { month, year } = req.query;

    /*
     * =========================================================
     * CURRENT DATE
     * =========================================================
     */
    const today = new Date();

    const filterMonth = parseInt(month, 10) || today.getMonth() + 1;

    const filterYear = parseInt(year, 10) || today.getFullYear();

    /*
     * =========================================================
     * VALIDATE MONTH
     * =========================================================
     */
    if (filterMonth < 1 || filterMonth > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month. Month must be between 1 and 12.",
      });
    }

    /*
     * =========================================================
     * MONTH DATE RANGE
     * =========================================================
     */

    const fromDate = `${filterYear}-${String(filterMonth).padStart(2, "0")}-01`;

    const nextMonth = filterMonth === 12 ? 1 : filterMonth + 1;

    const nextMonthYear = filterMonth === 12 ? filterYear + 1 : filterYear;

    const toDate = `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const values = [fromDate, toDate];

    console.log("Attendance Date Range:", {
      fromDate,
      toDate,
      filterMonth,
      filterYear,
    });

    /*
     * =========================================================
     * MONTHLY ATTENDANCE QUERY
     * =========================================================
     */
    const query = `
      WITH calendar AS
      (
        SELECT
          generate_series(
            $1::DATE,
            ($2::DATE - INTERVAL '1 day'),
            INTERVAL '1 day'
          )::DATE AS date_only
      ),

      employees AS
      (
        SELECT DISTINCT

          TRIM(o.or_emp_id) AS emp_id,

          COALESCE(
            NULLIF(
              TRIM(p.pr_first_name),
              ''
            ),

            NULLIF(
              TRIM(
                CONCAT_WS(
                  ' ',
                  p.pr_first_name,
                  p.pr_last_name
                )
              ),
              ''
            ),

            '-'
          ) AS name,

          COALESCE(
            dm."DepartmentName",
            '-'
          ) AS department,

          COALESCE(
            o.or_is_active,
            FALSE
          ) AS is_active

        FROM public.organizations o

        INNER JOIN public.personal p
          ON p.pr_id = o.pr_id

        LEFT JOIN public.department_master dm
          ON dm."DepartmentId" =
             o.or_department_id

        WHERE
          o.or_emp_id IS NOT NULL

          AND TRIM(o.or_emp_id) <> ''

          AND COALESCE(
            o.or_is_active,
            FALSE
          ) = TRUE

        ORDER BY
          TRIM(o.or_emp_id)
      )

      SELECT

        e.emp_id,
        e.name,
        e.department,
        e.is_active,

        c.date_only,

        TO_CHAR(
          c.date_only,
          'YYYY-MM-DD'
        ) AS date,

        EXTRACT(
          ISODOW FROM c.date_only
        )::INTEGER AS day_of_week,

        /*
         * Is this date in the future relative to "today" in IST?
         * Computed in SQL, from IST "today", so it's consistent
         * regardless of server timezone.
         */
        (
          c.date_only >
          (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE
        ) AS is_future,

        ma.id AS attendance_id,
        ma.attendance_date,
        ma.punch_in AS first_in,
        ma.punch_out AS last_out,

        COALESCE(
          ROUND(
            EXTRACT(
              EPOCH FROM ma.total_hours
            ) / 3600.0,
            2
          ),
          0.00
        ) AS hours_worked,

        ma.status_id,
        ma.is_late_arrived,

        ast.status_name AS status

      FROM employees e

      CROSS JOIN calendar c

      LEFT JOIN public.monthly_attendance ma

        ON TRIM(
          ma.emp_id
        ) = TRIM(
          e.emp_id
        )

        AND ma.attendance_date =
            c.date_only

      LEFT JOIN public.attendence_status ast

        ON ast.id =
           ma.status_id

        AND COALESCE(
          ast.is_active,
          TRUE
        ) = TRUE

      ORDER BY
        c.date_only,
        e.emp_id;
    `;

    /*
     * =========================================================
     * EXECUTE QUERY
     * =========================================================
     */
    const { rows } = await db.query(query, values);

    /*
     * =========================================================
     * GROUP BY EMPLOYEE
     * =========================================================
     */
    const employeeMap = {};

    rows.forEach((row) => {
      if (!employeeMap[row.emp_id]) {
        employeeMap[row.emp_id] = {
          emp_id: row.emp_id,

          name: row.name,

          department: row.department,

          is_active: row.is_active,

          attendance: [],
        };
      }

      employeeMap[row.emp_id].attendance.push({
        date: row.date,

        day_of_week: row.day_of_week,

        is_future: row.is_future === true,

        first_in: row.first_in,

        last_out: row.last_out,

        hours_worked: row.hours_worked,

        status_id: row.status_id,

        status: row.status,

        is_late_arrived: row.is_late_arrived === true,
      });
    });

    /*
     * =========================================================
     * PER-EMPLOYEE SUMMARY
     * =========================================================
     *
     * Rules:
     *
     * - Future dates (is_future === true) are SKIPPED entirely
     *   from every count — they don't count as absent, present,
     *   or anything else, since that data doesn't exist yet.
     *
     * - "Present" AND "Working" both count as present_days.
     *   "Working" means punched in with no punch_out yet, which
     *   in practice only ever appears on today's row (an
     *   in-progress day) — treated as present, not left uncounted.
     *
     * - absent_days counts ONLY "Absent" status, and only for
     *   past/today dates. Holiday and Weekly Off both resolve to
     *   the "Holiday" status upstream, and Leave resolves to its
     *   own "Leave" status — neither is "Absent", so both are
     *   naturally excluded without extra filtering.
     *
     * - leave_days counts "Leave" status days.
     * - holiday_days counts "Holiday" status days (declared
     *   holidays + weekly-offs, since they share one status).
     * - late_mark_days counts is_late_arrived === true days.
     *
     * SATURDAY HALF-DAY PAIRING (unchanged from before):
     * two Half Day Saturdays => 1 present day; unpaired
     * Saturday half day or any non-Saturday half day => 0.5
     * present day.
     * =========================================================
     */
    function summarizeAttendance(attendanceList) {
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let holidayDays = 0;
      let weeklyOffDays = 0; // ← new
      let lateMarkDays = 0;
      let halfDayCount = 0;
      let saturdayHalfDayCount = 0;

      for (const day of attendanceList) {
        if (day.is_future) {
          continue;
        }

        const statusLower = (day.status || "").toLowerCase().trim();

        if (day.is_late_arrived) {
          lateMarkDays += 1;
        }

        if (statusLower === "present" || statusLower === "working") {
          presentDays += 1;
        } else if (statusLower === "absent") {
          absentDays += 1;
        } else if (statusLower === "leave") {
          leaveDays += 1;
        } else if (statusLower === "holiday") {
          holidayDays += 1;
        } else if (statusLower === "weekly off") {
          // ← new
          weeklyOffDays += 1;
        } else if (statusLower === "half day") {
          halfDayCount += 1;

          if (day.day_of_week === 6) {
            saturdayHalfDayCount += 1;
          }
        }
      }

      const saturdayPairedDays = Math.floor(saturdayHalfDayCount / 2);
      const saturdayLeftover = saturdayHalfDayCount % 2;

      presentDays += saturdayPairedDays;

      const nonSaturdayHalfDays = halfDayCount - saturdayHalfDayCount;
      const fractionalHalfDays = nonSaturdayHalfDays + saturdayLeftover;

      const presentDaysTotal = presentDays + fractionalHalfDays * 0.5;

      return {
        present_days: Number(presentDaysTotal.toFixed(2)),
        absent_days: absentDays,
        leave_days: leaveDays,
        holiday_days: holidayDays,
        weekly_off_days: weeklyOffDays, // ← new
        late_mark_days: lateMarkDays,
        half_day_count: halfDayCount,
        saturday_half_day_pairs_applied: saturdayPairedDays,
      };
    }

    Object.values(employeeMap).forEach((employee) => {
      employee.summary = summarizeAttendance(employee.attendance);
    });

    const attendance = Object.values(employeeMap);

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */
    return res.status(200).json({
      success: true,

      month: filterMonth,

      year: filterYear,

      total_records: attendance.length,

      attendance,
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
    const { search, page = 1, limit = 10, weekStart, weekEnd } = req.query;

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.max(parseInt(limit) || 10, 1);
    const offset = (pageInt - 1) * limitInt;

    const searchTerm = search && search.trim() ? search.trim() : null;

    const isTimeSearch = !!searchTerm && searchTerm.includes(":");

    /*
     * =========================================================
     * RESOLVE DATE RANGE
     * =========================================================
     */

    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    let fromDate;
    let today;

    if (weekStart || weekEnd) {
      if (!weekStart || !weekEnd) {
        return res.status(400).json({
          success: false,
          message: "Both weekStart and weekEnd are required together",
        });
      }

      if (!DATE_REGEX.test(weekStart) || !DATE_REGEX.test(weekEnd)) {
        return res.status(400).json({
          success: false,
          message: "weekStart and weekEnd must be in YYYY-MM-DD format",
        });
      }

      const startDate = new Date(weekStart);
      const endDate = new Date(weekEnd);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "weekStart or weekEnd is not a valid date",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "weekStart must be before or equal to weekEnd",
        });
      }

      const MAX_RANGE_DAYS = 31;

      const rangeDays =
        Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      if (rangeDays > MAX_RANGE_DAYS) {
        return res.status(400).json({
          success: false,
          message: `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
        });
      }

      fromDate = weekStart;
      today = weekEnd;
    } else {
      const dateQuery = `
        SELECT
          (
            CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
          )::DATE AS today,

          (
            (
              CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
            )::DATE - 6
          ) AS from_date
      `;

      const { rows: dateRows } = await db.query(dateQuery);

      today = dateRows[0].today;
      fromDate = dateRows[0].from_date;
    }

    /*
     * =========================================================
     * COUNT ACTIVE EMPLOYEES
     * =========================================================
     */

    const countQuery = `
      SELECT COUNT(DISTINCT o.or_id) AS total

      FROM public.organizations o

      INNER JOIN public.personal p
        ON p.pr_id = o.pr_id

      WHERE o.or_emp_id IS NOT NULL
        AND TRIM(o.or_emp_id) <> ''

        AND COALESCE(
          o.or_is_active,
          FALSE
        ) = TRUE
    `;

    const countResult = await db.query(countQuery);

    const totalItems = parseInt(countResult.rows[0].total, 10);

    /*
     * =========================================================
     * TODAY ATTENDANCE SUMMARY
     * =========================================================
     */

    const todayAttendanceQuery = `
      WITH active_employees AS (
        SELECT DISTINCT
          TRIM(o.or_emp_id) AS emp_id

        FROM public.organizations o

        INNER JOIN public.personal p
          ON p.pr_id = o.pr_id

        WHERE o.or_emp_id IS NOT NULL
          AND TRIM(o.or_emp_id) <> ''

          AND COALESCE(
            o.or_is_active,
            FALSE
          ) = TRUE
      ),

      today_attendance AS (
        SELECT DISTINCT
          TRIM(wa.emp_id) AS emp_id,
          wa.punch_in,
          wa.punch_out

        FROM public.weekly_attendance wa

        WHERE wa.attendance_date = (
          CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
        )::DATE
      )

      SELECT
        COUNT(a.emp_id) AS total_employees,

        COUNT(
          CASE
            WHEN ta.punch_in IS NOT NULL
            THEN 1
          END
        ) AS present,

        COUNT(
          CASE
            WHEN ta.punch_in IS NOT NULL
             AND ta.punch_out IS NULL
            THEN 1
          END
        ) AS working,

        COUNT(
          CASE
            WHEN ta.punch_in IS NULL
            THEN 1
          END
        ) AS absent

      FROM active_employees a

      LEFT JOIN today_attendance ta
        ON ta.emp_id = a.emp_id;
    `;

    const todayAttendanceResult = await db.query(todayAttendanceQuery);

    const todaySummary = {
      totalEmployees: parseInt(
        todayAttendanceResult.rows[0].total_employees,
        10,
      ),

      present: parseInt(todayAttendanceResult.rows[0].present, 10),

      working: parseInt(todayAttendanceResult.rows[0].working, 10),

      absent: parseInt(todayAttendanceResult.rows[0].absent, 10),
    };

    /*
     * =========================================================
     * WEEKLY ATTENDANCE
     * =========================================================
     */

    const query = `
      WITH calendar AS (
        SELECT
          generate_series(
            $1::DATE,
            $2::DATE,
            INTERVAL '1 day'
          )::DATE AS date_only
      ),

      employees AS (
        SELECT DISTINCT

          TRIM(o.or_emp_id) AS emp_id,

          COALESCE(
            NULLIF(
              TRIM(p.pr_first_name),
              ''
            ),

            NULLIF(
              TRIM(
                CONCAT_WS(
                  ' ',
                  p.pr_first_name,
                  p.pr_last_name
                )
              ),
              ''
            ),

            '-'
          ) AS name,

          'employee' AS role,

          COALESCE(
            o.or_is_active,
            FALSE
          ) AS is_active,

          ui.Ui_ImagePath AS profile_image

        FROM public.organizations o

        INNER JOIN public.personal p
          ON p.pr_id = o.pr_id

        LEFT JOIN public.User_Image ui
          ON ui.pr_id = p.pr_id

        WHERE o.or_emp_id IS NOT NULL
          AND TRIM(o.or_emp_id) <> ''

          AND COALESCE(
            o.or_is_active,
            FALSE
          ) = TRUE

        ORDER BY
          TRIM(o.or_emp_id)

        OFFSET $3
        LIMIT $4
      )

      SELECT

        c.date_only,

        TO_CHAR(
          c.date_only,
          'YYYY-MM-DD'
        ) AS date,

        e.emp_id,
        e.name,
        e.role,
        e.is_active,
        e.profile_image,

        wa.id AS attendance_id,
        wa.attendance_date,
        wa.punch_in,
        wa.punch_out,

        /*
         * Raw seconds
         */
        COALESCE(
          EXTRACT(
            EPOCH FROM wa.total_hours
          ),
          0
        )::BIGINT AS total_seconds,

        /*
         * Total working hours
         */
        CASE
          WHEN wa.total_hours IS NULL THEN
            '00:00'

          ELSE
            LPAD(
              FLOOR(
                EXTRACT(
                  EPOCH FROM wa.total_hours
                ) / 3600
              )::TEXT,
              2,
              '0'
            )
            || ':' ||
            LPAD(
              FLOOR(
                MOD(
                  EXTRACT(
                    EPOCH FROM wa.total_hours
                  ),
                  3600
                ) / 60
              )::TEXT,
              2,
              '0'
            )
        END AS total_hours,

        /*
         * Expected hours
         */
        CASE
          WHEN wa.expected_hours IS NULL THEN
            '09:00'

          ELSE
            LPAD(
              FLOOR(
                EXTRACT(
                  EPOCH FROM wa.expected_hours
                ) / 3600
              )::TEXT,
              2,
              '0'
            )
            || ':' ||
            LPAD(
              FLOOR(
                MOD(
                  EXTRACT(
                    EPOCH FROM wa.expected_hours
                  ),
                  3600
                ) / 60
              )::TEXT,
              2,
              '0'
            )
        END AS expected_hours,

        wa.late_arrival,
        wa.is_late_arrived,
        wa.early_go,
        wa.is_early_gone,

        /*
         * Attendance status
         */
        wa.status_id,

        ast.status_name AS status,

        /*
         * Status colors from attendence_status table
         */
        COALESCE(
          NULLIF(
            TRIM(ast.background_color),
            ''
          ),
          '#94A3B8'
        ) AS background_color,

        COALESCE(
          NULLIF(
            TRIM(ast.font_color),
            ''
          ),
          '#FFFFFF'
        ) AS font_color

      FROM employees e

      CROSS JOIN calendar c

      LEFT JOIN public.weekly_attendance wa
        ON TRIM(wa.emp_id) = TRIM(e.emp_id)

        AND wa.attendance_date = c.date_only

      /*
       * Map weekly_attendance.status_id
       * to attendence_status.id
       */
      LEFT JOIN public.attendence_status ast
        ON ast.id = wa.status_id

        AND COALESCE(
          ast.is_active,
          TRUE
        ) = TRUE

      WHERE
      (
        $5::TEXT IS NULL

        OR

        (
          $6::BOOLEAN = FALSE

          AND
          (
            e.emp_id ILIKE $7

            OR

            e.name ILIKE $7
          )
        )

        OR

        (
          $6::BOOLEAN = TRUE

          AND
          (
            COALESCE(
              TO_CHAR(
                wa.punch_in,
                'HH12:MI AM'
              ),
              ''
            ) ILIKE $8

            OR

            COALESCE(
              TO_CHAR(
                wa.punch_out,
                'HH12:MI AM'
              ),
              ''
            ) ILIKE $8
          )
        )
      )

      ORDER BY
        c.date_only DESC,
        e.emp_id;
    `;

    const searchLike = searchTerm ? `%${searchTerm}%` : null;

    const timeSearch = isTimeSearch ? `%${searchTerm}%` : "%";

    const { rows } = await db.query(query, [
      fromDate, // $1
      today, // $2
      offset, // $3
      limitInt, // $4
      searchTerm, // $5
      isTimeSearch, // $6
      searchLike, // $7
      timeSearch, // $8
    ]);

    console.log("Weekly attendance rows fetched:", rows.length);

    /*
     * =========================================================
     * FORMAT HELPER
     * =========================================================
     */

    function formatSecondsToHHMM(totalSeconds) {
      const safeSeconds = Number(totalSeconds) || 0;

      const hours = Math.floor(safeSeconds / 3600);

      const minutes = Math.floor((safeSeconds % 3600) / 60);

      return `${String(hours).padStart(
        2,
        "0",
      )}:${String(minutes).padStart(2, "0")}`;
    }

    /*
     * =========================================================
     * FORMAT ROWS
     * =========================================================
     */

    const formattedRows = rows.map((row) => {
      const punchIn = row.punch_in
        ? new Date(row.punch_in).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "-";

      const punchOut = row.punch_out
        ? new Date(row.punch_out).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "-";

      return {
        date: row.date,

        emp_id: row.emp_id,

        name: row.name,

        role: row.role,

        first_in: punchIn,

        last_out: punchOut,

        total_hours: row.total_hours || "00:00",

        total_seconds: Number(row.total_seconds) || 0,

        expected_hours: row.expected_hours || "09:00",

        late_arrival: row.late_arrival,

        is_late_arrived: row.is_late_arrived,

        early_go: row.early_go,

        is_early_gone: row.is_early_gone,

        status_id: row.status_id,

        status: row.status,

        /*
         * Colors returned from attendance status master
         */
        background_color: row.background_color || "#94A3B8",

        font_color: row.font_color || "#FFFFFF",

        profile_image: row.profile_image || "-",
      };
    });

    /*
     * =========================================================
     * GROUP BY DATE
     * =========================================================
     */

    const grouped = {};

    formattedRows.forEach((row) => {
      if (!grouped[row.date]) {
        grouped[row.date] = {
          date: row.date,
          employees: [],
        };
      }

      grouped[row.date].employees.push({
        emp_id: row.emp_id,

        name: row.name,

        role: row.role,

        first_in: row.first_in,

        last_out: row.last_out,

        total_hours: row.total_hours,

        expected_hours: row.expected_hours,

        late_arrival: row.late_arrival,

        is_late_arrived: row.is_late_arrived,

        early_go: row.early_go,

        is_early_gone: row.is_early_gone,

        status_id: row.status_id,

        status: row.status,

        /*
         * Return status colors
         */
        background_color: row.background_color,

        font_color: row.font_color,

        profile_image: row.profile_image || "-",
      });
    });

    /*
     * =========================================================
     * SORT GROUPED DATA BY DATE
     * =========================================================
     */

    const result = Object.values(grouped).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    /*
     * =========================================================
     * TOTAL HOURS WITHIN DATE RANGE
     * =========================================================
     */

    const employeeTotalsMap = {};

    formattedRows.forEach((row) => {
      if (!employeeTotalsMap[row.emp_id]) {
        employeeTotalsMap[row.emp_id] = {
          emp_id: row.emp_id,
          name: row.name,
          total_seconds: 0,
        };
      }

      employeeTotalsMap[row.emp_id].total_seconds += row.total_seconds;
    });

    const employeeTotals = Object.values(employeeTotalsMap).map((e) => ({
      emp_id: e.emp_id,

      name: e.name,

      total_hours: formatSecondsToHHMM(e.total_seconds),
    }));

    /*
     * =========================================================
     * GRAND TOTAL HOURS
     * =========================================================
     */

    const grandTotalSeconds = formattedRows.reduce(
      (sum, row) => sum + row.total_seconds,
      0,
    );

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */

    return res.status(200).json({
      success: true,

      message: "Weekly attendance fetched successfully",

      data: result,

      /*
       * Pagination
       */
      totalItems,

      page: pageInt,

      limit: limitInt,

      weekStart: fromDate,

      weekEnd: today,

      /*
       * Existing totals
       */
      employeeTotals,

      grandTotalHours: formatSecondsToHHMM(grandTotalSeconds),

      /*
       * Today's attendance summary
       */
      todaySummary,
    });
  } catch (error) {
    console.error("Weekly Attendance API Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

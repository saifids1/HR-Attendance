require("dotenv").config();

const db = require("../models");

const TIME_ZONE = "Asia/Kolkata";

function getDateString(date) {
  if (!date) {
    const now = new Date();

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }

  if (date instanceof Date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  return String(date).substring(0, 10);
}

function getPreviousDate(dateString) {
  const [year, month, day] = dateString
    .substring(0, 10)
    .split("-")
    .map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().substring(0, 10);
}

function getMonthStart(dateString) {
  return `${dateString.substring(0, 7)}-01`;
}

function getMonthEnd(dateString) {
  const [year, month] = dateString
    .substring(0, 7)
    .split("-")
    .map(Number);

  const lastDay = new Date(year, month, 0).getDate();

  return `${year}-${String(month).padStart(2, "0")}-${String(
    lastDay
  ).padStart(2, "0")}`;
}

async function generateDailyAttendance(
  attendanceDate = null,
  transaction = null
) {
  const date = getDateString(attendanceDate);

  console.log(`[ATTENDANCE] Daily generation started: ${date}`);

  await db.sequelize.query(
    `
    WITH punch_data AS (
      SELECT
        al.emp_id,

        MIN(
          al.punch_time AT TIME ZONE 'Asia/Kolkata'
        ) AS punch_in,

        MAX(
          al.punch_time AT TIME ZONE 'Asia/Kolkata'
        ) AS punch_out,

        COUNT(*) AS punch_count

      FROM attendance_logs al

      WHERE al.is_active = TRUE

        AND (
          al.punch_time AT TIME ZONE 'Asia/Kolkata'
        ) >= :date::date

        AND (
          al.punch_time AT TIME ZONE 'Asia/Kolkata'
        ) < (
          :date::date + INTERVAL '1 day'
        )

      GROUP BY al.emp_id
    ),

    calculated AS (
      SELECT
        p.emp_id,

        :date::date AS attendance_date,

        p.punch_in,

        CASE
          WHEN p.punch_count > 1
          THEN p.punch_out
          ELSE NULL
        END AS punch_out,

        CASE
          WHEN p.punch_count > 1
          THEN p.punch_out - p.punch_in
          ELSE INTERVAL '00:00:00'
        END AS total_hours,

        INTERVAL '09:00:00' AS expected_hours,

        CASE
          WHEN p.punch_in IS NOT NULL
          THEN GREATEST(
            0,
            EXTRACT(
              EPOCH FROM (
                p.punch_in -
                (:date::date + TIME '10:30:00')
              )
            ) / 60
          )::INTEGER
          ELSE 0
        END AS late_arrival,

        CASE
          WHEN p.punch_in IS NOT NULL
           AND p.punch_in >
               (:date::date + TIME '11:00:00')
          THEN TRUE
          ELSE FALSE
        END AS is_late_arrived,

        CASE
          WHEN p.punch_count > 1
          THEN GREATEST(
            0,
            EXTRACT(
              EPOCH FROM (
                (:date::date + TIME '19:30:00') -
                p.punch_out
              )
            ) / 60
          )::INTEGER
          ELSE 0
        END AS early_go,

        CASE
          WHEN p.punch_count > 1
           AND p.punch_out <
               (:date::date + TIME '18:00:00')
          THEN TRUE
          ELSE FALSE
        END AS is_early_gone,

        CASE
          WHEN p.punch_count > 1
           AND (
             p.punch_out - p.punch_in
           ) >= INTERVAL '09:00:00'
          THEN 1

          WHEN p.punch_count > 1
          THEN 4

          ELSE 3
        END AS status_id

      FROM punch_data p
    )

    INSERT INTO daily_attendance
    (
      emp_id,
      attendance_date,
      punch_in,
      punch_out,
      total_hours,
      expected_hours,
      late_arrival,
      is_late_arrived,
      early_go,
      is_early_gone,
      status_id,
      is_regularized,
      regularization_id,
      regularized_at,
      regularized_by,
      created_at,
      updated_at
    )

    SELECT
      c.emp_id,
      c.attendance_date,
      c.punch_in,
      c.punch_out,
      c.total_hours,
      c.expected_hours,
      c.late_arrival,
      c.is_late_arrived,
      c.early_go,
      c.is_early_gone,
      c.status_id,
      FALSE,
      NULL,
      NULL,
      NULL,
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    FROM calculated c

    ON CONFLICT (emp_id, attendance_date)

    DO UPDATE SET
      punch_in = EXCLUDED.punch_in,
      punch_out = EXCLUDED.punch_out,
      total_hours = EXCLUDED.total_hours,
      expected_hours = EXCLUDED.expected_hours,
      late_arrival = EXCLUDED.late_arrival,
      is_late_arrived = EXCLUDED.is_late_arrived,
      early_go = EXCLUDED.early_go,
      is_early_gone = EXCLUDED.is_early_gone,
      status_id = EXCLUDED.status_id,
      updated_at =
        CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    WHERE daily_attendance.is_regularized = FALSE
    `,
    {
      replacements: {
        date,
      },
      transaction,
    }
  );

  console.log(`[ATTENDANCE] Daily generation completed: ${date}`);
}

async function generateWeeklyAttendance(
  attendanceDate = null,
  transaction = null
) {
  const date = getDateString(attendanceDate);

  console.log(`[ATTENDANCE] Weekly generation started: ${date}`);

  await db.sequelize.query(
    `
    WITH weekly_data AS (
      SELECT
        da.emp_id,

        MIN(da.punch_in) AS punch_in,

        MAX(da.punch_out) AS punch_out,

        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM da.total_hours)
          ) * INTERVAL '1 second',
          INTERVAL '00:00:00'
        ) AS total_hours,

        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM da.expected_hours)
          ) * INTERVAL '1 second',
          INTERVAL '00:00:00'
        ) AS expected_hours,

        SUM(
          COALESCE(da.late_arrival, 0)
        )::INTEGER AS late_arrival,

        BOOL_OR(
          COALESCE(da.is_late_arrived, FALSE)
        ) AS is_late_arrived,

        SUM(
          COALESCE(da.early_go, 0)
        )::INTEGER AS early_go,

        BOOL_OR(
          COALESCE(da.is_early_gone, FALSE)
        ) AS is_early_gone

      FROM daily_attendance da

      WHERE da.attendance_date >=
        DATE_TRUNC(
          'week',
          :date::date
        )::date

        AND da.attendance_date <
        (
          DATE_TRUNC(
            'week',
            :date::date
          ) + INTERVAL '7 days'
        )::date

      GROUP BY da.emp_id
    )

    INSERT INTO weekly_attendance
    (
      emp_id,
      attendance_date,
      punch_in,
      punch_out,
      total_hours,
      expected_hours,
      late_arrival,
      is_late_arrived,
      early_go,
      is_early_gone,
      status_id,
      is_regularized,
      regularization_id,
      regularized_at,
      regularized_by,
      created_at,
      updated_at
    )

    SELECT
      w.emp_id,
      :date::date,
      w.punch_in,
      w.punch_out,
      w.total_hours,
      w.expected_hours,
      w.late_arrival,
      w.is_late_arrived,
      w.early_go,
      w.is_early_gone,

      CASE
        WHEN w.total_hours >= w.expected_hours
         AND w.expected_hours > INTERVAL '0'
        THEN 1

        WHEN w.total_hours > INTERVAL '0'
        THEN 4

        ELSE 2
      END,

      FALSE,
      NULL,
      NULL,
      NULL,

      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    FROM weekly_data w

    ON CONFLICT (emp_id, attendance_date)

    DO UPDATE SET
      punch_in = EXCLUDED.punch_in,
      punch_out = EXCLUDED.punch_out,
      total_hours = EXCLUDED.total_hours,
      expected_hours = EXCLUDED.expected_hours,
      late_arrival = EXCLUDED.late_arrival,
      is_late_arrived = EXCLUDED.is_late_arrived,
      early_go = EXCLUDED.early_go,
      is_early_gone = EXCLUDED.is_early_gone,
      status_id = EXCLUDED.status_id,
      updated_at =
        CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    WHERE weekly_attendance.is_regularized = FALSE
    `,
    {
      replacements: {
        date,
      },
      transaction,
    }
  );

  console.log(`[ATTENDANCE] Weekly generation completed: ${date}`);
}

async function generateMonthlyAttendance(
  attendanceDate = null,
  transaction = null
) {
  const date = getDateString(attendanceDate);

  const monthStart = getMonthStart(date);
  const monthEnd = getMonthEnd(date);

  console.log(`[ATTENDANCE] Monthly generation started: ${date}`);

  await db.sequelize.query(
    `
    WITH monthly_data AS (
      SELECT
        da.emp_id,

        MIN(da.punch_in) AS punch_in,

        MAX(da.punch_out) AS punch_out,

        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM da.total_hours)
          ) * INTERVAL '1 second',
          INTERVAL '00:00:00'
        ) AS total_hours,

        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM da.expected_hours)
          ) * INTERVAL '1 second',
          INTERVAL '00:00:00'
        ) AS expected_hours,

        SUM(
          COALESCE(da.late_arrival, 0)
        )::INTEGER AS late_arrival,

        BOOL_OR(
          COALESCE(da.is_late_arrived, FALSE)
        ) AS is_late_arrived,

        SUM(
          COALESCE(da.early_go, 0)
        )::INTEGER AS early_go,

        BOOL_OR(
          COALESCE(da.is_early_gone, FALSE)
        ) AS is_early_gone

      FROM daily_attendance da

      WHERE da.attendance_date >= :monthStart::date
        AND da.attendance_date <= :monthEnd::date

      GROUP BY da.emp_id
    )

    INSERT INTO monthly_attendance
    (
      emp_id,
      attendance_date,
      punch_in,
      punch_out,
      total_hours,
      expected_hours,
      late_arrival,
      is_late_arrived,
      early_go,
      is_early_gone,
      status_id,
      is_regularized,
      regularization_id,
      regularized_at,
      regularized_by,
      created_at,
      updated_at
    )

    SELECT
      m.emp_id,
      :date::date,
      m.punch_in,
      m.punch_out,
      m.total_hours,
      m.expected_hours,
      m.late_arrival,
      m.is_late_arrived,
      m.early_go,
      m.is_early_gone,

      CASE
        WHEN m.total_hours >= m.expected_hours
         AND m.expected_hours > INTERVAL '0'
        THEN 1

        WHEN m.total_hours > INTERVAL '0'
        THEN 4

        ELSE 2
      END,

      FALSE,
      NULL,
      NULL,
      NULL,

      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    FROM monthly_data m

    ON CONFLICT (emp_id, attendance_date)

    DO UPDATE SET
      punch_in = EXCLUDED.punch_in,
      punch_out = EXCLUDED.punch_out,
      total_hours = EXCLUDED.total_hours,
      expected_hours = EXCLUDED.expected_hours,
      late_arrival = EXCLUDED.late_arrival,
      is_late_arrived = EXCLUDED.is_late_arrived,
      early_go = EXCLUDED.early_go,
      is_early_gone = EXCLUDED.is_early_gone,
      status_id = EXCLUDED.status_id,
      updated_at =
        CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'

    WHERE monthly_attendance.is_regularized = FALSE
    `,
    {
      replacements: {
        date,
        monthStart,
        monthEnd,
      },
      transaction,
    }
  );

  console.log(`[ATTENDANCE] Monthly generation completed: ${date}`);
}

async function generateAllAttendance(
  attendanceDate = null,
  transaction = null
) {
  const date = getDateString(attendanceDate);

  if (transaction) {
    await generateDailyAttendance(
      date,
      transaction
    );

    await generateWeeklyAttendance(
      date,
      transaction
    );

    await generateMonthlyAttendance(
      date,
      transaction
    );

    return;
  }

  const t = await db.sequelize.transaction();

  try {
    await generateDailyAttendance(
      date,
      t
    );

    await generateWeeklyAttendance(
      date,
      t
    );

    await generateMonthlyAttendance(
      date,
      t
    );

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  generateDailyAttendance,
  generateWeeklyAttendance,
  generateMonthlyAttendance,
  generateAllAttendance,
  getDateString,
  getPreviousDate,
  getMonthStart,
  getMonthEnd,
};
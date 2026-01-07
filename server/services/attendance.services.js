const { db } = require("../db/connectDB");

async function processDailyAttendance(date) {
  await db.query(`
    INSERT INTO daily_attendance
    (employee_id, attendance_date, punch_in, punch_out, total_hours, status)
    SELECT
      e.id,
      DATE(a.punch_time),
      MIN(a.punch_time),
      MAX(a.punch_time),
      ROUND(EXTRACT(EPOCH FROM (MAX(a.punch_time) - MIN(a.punch_time))) / 3600,2),
      'Present'
    FROM attendance_logs a
    JOIN employees e ON e.device_user_id = a.device_user_id
    WHERE DATE(a.punch_time) = DATE($1)
    GROUP BY e.id, DATE(a.punch_time)
    ON CONFLICT DO UPDATE SET
      punch_in = EXCLUDED.punch_in,
      punch_out = EXCLUDED.punch_out,
      total_hours = EXCLUDED.total_hours;
  `,[date]);
}

module.exports = { processDailyAttendance };

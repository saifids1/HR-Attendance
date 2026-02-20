const ZKLib = require("zklib-js");
const { db } = require("../db/connectDB");
const cron = require("node-cron");
const sendEmail = require("../utils/mailer");

// Normalize device punch time
// function normalizePunchTime(recordTime) {
//   if (!recordTime) return null;
//   const parts = recordTime.split(" ");
//   if (parts.length < 5) return null;

//   const day = parts[2];
//   const monthStr = parts[1];
//   const year = parts[3];
//   const time = parts[4];

//   const monthMap = {
//     Jan: "01", Feb: "02", Mar: "03", Apr: "04",
//     May: "05", Jun: "06", Jul: "07", Aug: "08",
//     Sep: "09", Oct: "10", Nov: "11", Dec: "12"
//   };

//   const month = monthMap[monthStr];
//   if (!month) return null;

//   return `${year}-${month}-${day} ${time}`;
// }

function normalizePunchTime(recordTime) {
  if (!recordTime) return null;
  const parts = recordTime.split(" ");
  if (parts.length < 5) return null;

  const day = parts[2].padStart(2, '0'); // Ensure 2 digits for day
  const monthStr = parts[1];
  const year = parts[3];
  const time = parts[4];

  const monthMap = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };

  const month = monthMap[monthStr];
  if (!month) return null;

  // Append +05:30 so the system knows this is India Time (IST)
  // Format: YYYY-MM-DD HH:mm:ss+05:30
  return `${year}-${month}-${day} ${time}+05:30`;
}

// Fetch and sync punches
// async function getDeviceAttendance() {
//   const deviceSN = "EUF7251400009";
//   const zk = new ZKLib("192.168.0.10", 4370, 10000, 4000);

//   try {
//     console.log("[SYNC] Connecting to device...");
//     await zk.createSocket();
//     await zk.enableDevice();

//     console.log("[SYNC] Fetching attendance logs...");
//     const logs = await zk.getAttendances();

//     if (!logs?.data?.length) {
//       console.log("[SYNC] No logs found");
//       return [];
//     }

//     /* ---------- LAST SYNC ---------- */
//     const { rows: trackerRows } = await db.query(
//       `SELECT last_sync FROM attendance_tracker WHERE device_sn = $1`,
//       [deviceSN]
//     );

//     let lastSync = trackerRows[0]?.last_sync || "1970-01-01 00:00:00";
//     let lastSyncDate = new Date(lastSync);
//     lastSyncDate.setSeconds(lastSyncDate.getSeconds() - 2); // buffer

//     /* ---------- FILTER NEW LOGS ---------- */
//     const newLogs = logs.data.filter(log => {
//       const punchTime = new Date(normalizePunchTime(log.recordTime));
//       return punchTime > lastSyncDate;
//     });

//     console.log(`[SYNC] New punches found: ${newLogs.length}`);

//     let latestPunch = lastSyncDate;

//     /* ---------- PROCESS LOGS ---------- */
//     for (const log of newLogs) {
//       const punchTimeStr = normalizePunchTime(log.recordTime);
//       if (!punchTimeStr) continue;

//       // SAFETY CHECK
//       const { rows: userRows } = await db.query(
//         `SELECT emp_id FROM users WHERE emp_id = $1`,
//         [String(log.deviceUserId)]
//       );

//       if (!userRows.length) continue; // skip if no employee

//       const empId = userRows[0].emp_id;

//       await db.query(
//         `INSERT INTO activity_log (emp_id, punch_time, device_ip, device_sn)
//          VALUES ($1, $2, $3, $4)
//          ON CONFLICT (emp_id, punch_time) DO NOTHING`,
//         [empId, punchTimeStr, log.ip || null, deviceSN]
//       );

//       const punchDate = new Date(punchTimeStr);
//       if (punchDate > latestPunch) latestPunch = punchDate;

//       /* ---------- SEND EMAIL ---------- */
//       try {
//         const { rows: employeeRows } = await db.query(
//           `SELECT name, email FROM users WHERE emp_id = $1`,
//           [empId]
//         );

//         if (employeeRows.length) {
//           const employee = employeeRows[0];
//           const time = punchDate.toLocaleTimeString("en-IN", { hour12: false });
//           const action = log.type || "in"; // if your device provides type

//           // await sendEmail(
//           //   employee.email,
//           //   `Punch ${action}`,
//           //   "punch_in_out",
//           //   { name: employee.name, action, time }
//           // );

//           console.log(` Punch ${action} email sent to ${employee.email}`);
//         }
//       } catch (err) {
//         console.error(" Error sending punch email:", err);
//       }
//     }

   
//     if (newLogs.length) {
//       const finalLastSync = latestPunch
//         .toISOString()
//         .slice(0, 19)
//         .replace("T", " ");

//       await db.query(
//         `INSERT INTO attendance_tracker (device_sn, last_sync)
//          VALUES ($1, $2)
//          ON CONFLICT (device_sn)
//          DO UPDATE SET last_sync = EXCLUDED.last_sync`,
//         [deviceSN, finalLastSync]
//       );
//     }

//     console.log("[SYNC] Punch sync completed successfully");
//     return newLogs;

//   } catch (err) {
//     console.error("[SYNC] Error:", err);
//     throw err;
//   } finally {
//     try {
//       await zk.disconnect();
//       console.log("[SYNC] Device disconnected");
//     } catch {
//       console.warn("[SYNC] Device disconnect failed");
//     }
//   }
// }

// async function getDeviceAttendance({ forceSync = false } = {}) {
//   const deviceSN = "EUF7251400009";
//   const deviceIP = "60.254.61.177";
//   const zk = new ZKLib(deviceIP, 4370, 10000, 4000);

//   try {
//     console.log("[SYNC] Connecting to device...");
//     await zk.createSocket();
//     await zk.enableDevice();

//     console.log("[SYNC] Fetching logs from machine...");
//     const logs = await zk.getAttendances();

//     if (!logs?.data?.length) {
//       console.log("[SYNC] No logs found.");
//       return [];
//     }

//     /* ---------------- GET LAST SYNC ---------------- */
//     const { rows: trackerRows } = await db.query(
//       `SELECT last_sync FROM attendance_tracker WHERE device_sn = $1`,
//       [deviceSN]
//     );

//     let lastSync = trackerRows[0]?.last_sync || "1970-01-01 00:00:00";
//     let lastSyncDate = new Date(lastSync);
//     lastSyncDate.setSeconds(lastSyncDate.getSeconds() - 2);

//     /* ---------------- FILTER LOGS ---------------- */
//     let filteredLogs;

//     if (forceSync) {
//       console.log("[SYNC] FULL SYNC MODE ENABLED");
//       filteredLogs = logs.data;
//     } else {
//       filteredLogs = logs.data.filter((log) => {
//         const punchTime = new Date(normalizePunchTime(log.recordTime));
//         return punchTime > lastSyncDate;
//       });
//     }

//     console.log(`[SYNC] Processing ${filteredLogs.length} logs...`);

//     if (!filteredLogs.length) {
//       console.log("[SYNC] No new logs to process.");
//       return [];
//     }

//     let latestPunch = lastSyncDate;

//     await db.query("BEGIN");

//     for (const log of filteredLogs) {
//       const punchTimeStr = normalizePunchTime(log.recordTime);
//       if (!punchTimeStr) continue;

//       const punchDate = new Date(punchTimeStr);

//       /* -------- CHECK USER -------- */
//       const { rows: userRows } = await db.query(
//         `SELECT emp_id FROM users WHERE emp_id = $1`,
//         [String(log.deviceUserId)]
//       );

//       if (!userRows.length) continue;

//       const empId = userRows[0].emp_id;
//       const cleanTimestamp = new Date(log.recordTime).toISOString();

//       /* -------- INSERT MASTER LOG -------- */
//       await db.query(
//         `INSERT INTO attendance_logs 
//         (emp_id, punch_time, device_sn, device_ip, raw_log, created_at)
//          VALUES ($1, $2, $3, $4, $5, NOW())
//          ON CONFLICT (emp_id, punch_time) DO NOTHING`,
//         [
//           empId,
//           cleanTimestamp,
//           deviceSN,
//           deviceIP,
//           JSON.stringify(log),
//         ]
//       );

//       /* -------- INSERT ACTIVITY LOG -------- */
//       const insertRes = await db.query(
//         `INSERT INTO activity_log 
//         (emp_id, punch_time, device_ip, device_sn)
//          VALUES ($1, $2, $3, $4)
//          ON CONFLICT (emp_id, punch_time) DO NOTHING
//          RETURNING *`,
//         [empId, punchTimeStr, deviceIP, deviceSN]
//       );

//       /* -------- UPDATE DAILY ATTENDANCE -------- */
//       if (insertRes.rowCount > 0) {
//         await db.query(
//           `
//           INSERT INTO daily_attendance
//           (emp_id, attendance_date, punch_in, punch_out, total_hours, expected_hours, status)
//           SELECT 
//             $1,
//             $2::date,
//             MIN(punch_time),
//             MAX(punch_time),
//             MAX(punch_time) - MIN(punch_time),
//             INTERVAL '9 hours 30 minutes',
//             CASE 
//               WHEN (MAX(punch_time) - MIN(punch_time)) >= INTERVAL '9 hours 30 minutes'
//                 THEN 'Present'
//               ELSE 'Working'
//             END
//           FROM attendance_logs
//           WHERE emp_id = $1
//           AND punch_time::date = $2::date
//           GROUP BY emp_id, punch_time::date
//           ON CONFLICT (emp_id, attendance_date)
//           DO UPDATE SET
//             punch_in = EXCLUDED.punch_in,
//             punch_out = EXCLUDED.punch_out,
//             total_hours = EXCLUDED.total_hours,
//             status = EXCLUDED.status
//           `,
//           [empId, punchTimeStr]
//         );

//         console.log(`[SAVED] ${empId} - ${punchTimeStr}`);
//       }

//       if (punchDate > latestPunch) latestPunch = punchDate;
//     }

//     /* -------- UPDATE TRACKER -------- */
//     const finalLastSync = latestPunch
//       .toISOString()
//       .slice(0, 19)
//       .replace("T", " ");

//     await db.query(
//       `INSERT INTO attendance_tracker (device_sn, last_sync)
//        VALUES ($1, $2)
//        ON CONFLICT (device_sn)
//        DO UPDATE SET last_sync = EXCLUDED.last_sync`,
//       [deviceSN, finalLastSync]
//     );

//     await db.query("COMMIT");

//     console.log("[SYNC] Completed successfully.");
//     return filteredLogs;

//   } catch (err) {
//     await db.query("ROLLBACK");
//     console.error("[SYNC ERROR]", err);
//     throw err;
//   } finally {
//     try {
//       await zk.disconnect();
//     } catch {
//       console.warn("[SYNC] Device disconnect cleanup failed.");
//     }
//   }
// }


// 5-minute cron sync
async function getDeviceAttendance({ forceSync = false } = {}) {
  const deviceSN = "EUF7251400009";
  const deviceIP = "60.254.61.177";
  const zk = new ZKLib(deviceIP, 4370, 10000, 4000);

  try {
    console.log("[SYNC] Connecting to device...");
    await zk.createSocket();
    await zk.enableDevice();

    console.log("[SYNC] Fetching logs from machine...");
    const logs = await zk.getAttendances();

    if (!logs?.data?.length) {
      console.log("[SYNC] No logs found.");
      return [];
    }

    /* ---------- GET LAST SYNC ---------- */
    const { rows: trackerRows } = await db.query(
      `SELECT last_sync FROM attendance_tracker WHERE device_sn = $1`,
      [deviceSN]
    );

    let lastSync = trackerRows[0]?.last_sync || "1970-01-01 00:00:00";
    let lastSyncDate = new Date(lastSync);
    lastSyncDate.setSeconds(lastSyncDate.getSeconds() - 2);

    /* ---------- FILTER LOGS ---------- */
    let filteredLogs;

    if (forceSync) {
      console.log("[SYNC] FULL SYNC MODE ENABLED");
      filteredLogs = logs.data;
    } else {
      filteredLogs = logs.data.filter((log) => {
        const punchTime = new Date(normalizePunchTime(log.recordTime));
        return punchTime > lastSyncDate;
      });
    }

    console.log(`[SYNC] Processing ${filteredLogs.length} logs...`);

    if (!filteredLogs.length) {
      console.log("[SYNC] No new logs to process.");
      return [];
    }

    let latestPunch = lastSyncDate;

    await db.query("BEGIN");

    for (const log of filteredLogs) {
      const normalizedTime = normalizePunchTime(log.recordTime);
      if (!normalizedTime) continue;

      const punchTimestamp = new Date(normalizedTime).toISOString();
      const punchDateOnly = punchTimestamp.slice(0, 10);
        const receivedTime = new Date();

      /* ---------- CHECK USER ---------- */
      const { rows: userRows } = await db.query(
    `SELECT emp_id FROM users WHERE emp_id = $1`,
    [String(log.deviceUserId)]
  );

      if (!userRows.length) continue;

      const empId = userRows[0].emp_id;

      /* ---------- INSERT ATTENDANCE LOG ---------- */
await db.query(
  `INSERT INTO attendance_logs 
   (emp_id, punch_time, device_sn, device_ip, raw_log)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (emp_id, punch_time) DO NOTHING`,
  [
    empId.toString(),
    punchTimestamp,
    deviceSN,
    deviceIP,
    JSON.stringify(log)
  ]
);
/* ---------- INSERT ACTIVITY LOG ---------- */
const insertRes = await db.query(
  `INSERT INTO activity_log 
     (emp_id, punch_time, received_time ,device_ip, device_sn)
     VALUES ($1, $2, $3, $4,$5)
     ON CONFLICT (emp_id, punch_time) DO NOTHING
     RETURNING *`,
  [empId.toString(), punchTimestamp,receivedTime, deviceIP, deviceSN]
);

/* ---------- UPDATE DAILY ATTENDANCE ---------- */
if (insertRes.rowCount > 0) {
  await db.query(
    `
    INSERT INTO daily_attendance
      (emp_id, attendance_date, punch_in, punch_out, total_hours, expected_hours, status)
    SELECT 
      $1::varchar,
      $2::date,
      MIN(punch_time),
      MAX(punch_time),
      MAX(punch_time) - MIN(punch_time),
      INTERVAL '9 hours 30 minutes',
      CASE 
        WHEN (MAX(punch_time) - MIN(punch_time)) >= INTERVAL '9 hours 30 minutes'
          THEN 'Present'
        ELSE 'Working'
      END
    FROM attendance_logs
    WHERE emp_id = $1
      AND punch_time::date = $2::date
    GROUP BY emp_id, punch_time::date
    ON CONFLICT (emp_id, attendance_date)
    DO UPDATE SET
      punch_in = EXCLUDED.punch_in,
      punch_out = EXCLUDED.punch_out,
      total_hours = EXCLUDED.total_hours,
      status = EXCLUDED.status
    `,
    [empId.toString(), punchDateOnly]
  );

  // console.log(`[SAVED] ${empId} - ${punchTimestamp}`);
}


      const punchDateObj = new Date(punchTimestamp);
      if (punchDateObj > latestPunch) latestPunch = punchDateObj;
    }

    /* ---------- UPDATE TRACKER ---------- */
    const finalLastSync = latestPunch
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    await db.query(
      `INSERT INTO attendance_tracker (device_sn, last_sync)
       VALUES ($1, $2::timestamp)
       ON CONFLICT (device_sn)
       DO UPDATE SET last_sync = EXCLUDED.last_sync`,
      [deviceSN, finalLastSync]
    );

    await db.query("COMMIT");

    console.log("[SYNC] Completed successfully.");
    return filteredLogs;

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("[SYNC ERROR]", err);
    throw err;
  } finally {
    try {
      await zk.disconnect();
    } catch {
      console.warn("[SYNC] Device disconnect cleanup failed.");
    }
  }
}

let isSyncRunning = false;
cron.schedule("*/5 * * * *", async () => {
  if (isSyncRunning) {
    console.warn("[CRON] Previous sync still running, skipping");
    return;
  }
  isSyncRunning = true;
  try {
    await getDeviceAttendance();
  } finally {
    isSyncRunning = false;
  }
});

// 
let isSyncRunning2 = false;
cron.schedule("*/1 * * * *", async () => {
  if (isSyncRunning2) {
    console.warn("[CRON] Previous sync still running, skipping");
    return;
  }
  isSyncRunning2 = true;
  try {
    await getDeviceAttendance();
  } finally {
    isSyncRunning2 = false;
  }
});
module.exports = { getDeviceAttendance };



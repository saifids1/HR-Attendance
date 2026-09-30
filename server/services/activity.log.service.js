const { getDeviceAttendance } = require("../services/zk.service");

function normalizeMachineLog(log) {
  if (!log) {
    return null;
  }

  const empId =
    log.emp_id ??
    log.empId ??
    log.user_id ??
    log.userId ??
    log.uid;

  const punchTime =
    log.punch_time ??
    log.punchTime ??
    log.timestamp ??
    log.time ??
    log.datetime;

  const deviceIp =
    log.device_ip ??
    log.deviceIp ??
    log.ip ??
    null;

  const deviceSn =
    log.device_sn ??
    log.deviceSn ??
    log.serialNumber ??
    log.sn ??
    null;

  if (
    empId === undefined ||
    empId === null ||
    String(empId).trim() === ""
  ) {
    return null;
  }

  if (
    punchTime === undefined ||
    punchTime === null ||
    String(punchTime).trim() === ""
  ) {
    return null;
  }

  return {
    emp_id: String(empId).trim(),
    punch_time: punchTime,
    device_ip: deviceIp,
    device_sn: deviceSn,
  };
}

async function syncMachineToActivityLog(client) {
  console.log("[CRON] Machine sync started");

  const machineResponse = await getDeviceAttendance();

  console.log(
    "[CRON] Machine logs fetched:",
    Array.isArray(machineResponse)
      ? machineResponse.length
      : Array.isArray(machineResponse?.data)
        ? machineResponse.data.length
        : 0
  );

  const machineLogs = Array.isArray(machineResponse)
    ? machineResponse
    : Array.isArray(machineResponse?.data)
      ? machineResponse.data
      : [];

  // console.log(machineLogs, "logs from activity");

  if (machineLogs.length === 0) {
    console.log("[CRON] Machine returned no logs");

    return {
      received: 0,
      inserted: 0,
    };
  }

  const normalizedLogs = machineLogs
    .map(normalizeMachineLog)
    .filter(Boolean);

  if (normalizedLogs.length === 0) {
    console.log(
      "[CRON] Machine returned logs but none were valid"
    );

    return {
      received: machineLogs.length,
      inserted: 0,
    };
  }

  const values = [];
  const placeholders = [];

  let parameterIndex = 1;

  for (const log of normalizedLogs) {
    values.push(
      log.emp_id,
      log.punch_time,
      log.device_ip,
      log.device_sn
    );

    placeholders.push(
      `(
        $${parameterIndex},
        $${parameterIndex + 1},
        $${parameterIndex + 2},
        $${parameterIndex + 3},
        TRUE,
        NULL
      )`
    );

    parameterIndex += 4;
  }

  const query = `
    INSERT INTO public.activity_log
    (
      emp_id,
      punch_time,
      device_ip,
      device_sn,
      is_active,
      regularization_id
    )
    VALUES
      ${placeholders.join(",")}
    ON CONFLICT (emp_id, punch_time)
    DO NOTHING
  `;

  const result = await client.query(query, values);

  const inserted = result.rowCount || 0;

  console.log(
    `[CRON] Machine sync completed. Received: ${normalizedLogs.length}, Inserted: ${inserted}`
  );

  return {
    received: normalizedLogs.length,
    inserted,
  };
}

module.exports = {
  syncMachineToActivityLog,
};
const db = require("../models");

const STATUS_NAME = {
  PRESENT: "present",
  WORKING: "working",
  HALF_DAY: "half day",
  HOLIDAY: "holiday",
  WEEKLY_OFF: "weekly off",
  ABSENT: "absent",
  LEAVE: "leave",
};

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeTimestampString(value) {
  if (!value) {
    return null;
  }

  const str = String(value).trim();
  const match = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) {
    throw createError(`Invalid timestamp value: ${str}`);
  }

  const [, y, mo, d, h, mi, s = "00"] = match;

  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}

function timeStringToMinutes(value) {
  if (!value) {
    return null;
  }

  const parts = String(value).split(":").map(Number);

  return parts[0] * 60 + (parts[1] || 0);
}

function getMinutesFromTimestamp(value) {
  if (!value) {
    return null;
  }

  const normalized = normalizeTimestampString(value);
  const timePart = normalized.split(" ")[1];

  return timeStringToMinutes(timePart);
}

function createTimestampString(attendanceDate, hours, minutes, seconds = 0) {
  return (
    `${attendanceDate} ` +
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}

function secondsToTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

function timestampStringToEpochSeconds(value) {
  const normalized = normalizeTimestampString(value);
  const [datePart, timePart] = normalized.split(" ");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi, s] = timePart.split(":").map(Number);

  return Date.UTC(y, mo - 1, d, h, mi, s) / 1000;
}

function calculateTotalHours(punchIn, punchOut) {
  if (!punchIn || !punchOut) {
    return "00:00:00";
  }

  const diff =
    timestampStringToEpochSeconds(punchOut) -
    timestampStringToEpochSeconds(punchIn);

  if (diff <= 0) {
    return "00:00:00";
  }

  return secondsToTime(diff);
}

function serializeAttendance(row) {
  if (!row) {
    return null;
  }

  return row.toJSON ? row.toJSON() : { ...row };
}

async function getBaseAttendance(empId, attendanceDate, transaction) {
  const [daily, weekly, monthly] = await Promise.all([
    db.DailyAttendance.findOne({
      where: { emp_id: empId, attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
    db.WeeklyAttendance.findOne({
      where: { emp_id: empId, attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
    db.MonthlyAttendance.findOne({
      where: { emp_id: empId, attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
  ]);

  const base =
    serializeAttendance(daily) ||
    serializeAttendance(weekly) ||
    serializeAttendance(monthly) ||
    {};

  return { base, daily, weekly, monthly };
}

function applyItemsToPunches(items, base) {
  let punchIn = base && base.punch_in ? normalizeTimestampString(base.punch_in) : null;
  let punchOut = base && base.punch_out ? normalizeTimestampString(base.punch_out) : null;
  let onDuty = false;

  for (const item of items) {
    const typeCode = String(item.ari_type_code || item.typeCode || "")
      .trim()
      .toUpperCase();

    const punchTime = item.ari_punch_time || item.punchTime || null;
    const parsedTime = punchTime ? normalizeTimestampString(punchTime) : null;

    if (typeCode === "PUNCH_IN") {
      if (!parsedTime) {
        throw createError("punchTime is required for PUNCH_IN");
      }

      punchIn = parsedTime;
    }

    if (typeCode === "PUNCH_OUT") {
      if (!parsedTime) {
        throw createError("punchTime is required for PUNCH_OUT");
      }

      punchOut = parsedTime;
    }

    if (typeCode === "ON_DUTY") {
      onDuty = true;

      if (parsedTime) {
        if (!punchIn) {
          punchIn = parsedTime;
        } else if (!punchOut) {
          punchOut = parsedTime;
        }
      }
    }
  }

  return { punchIn, punchOut, onDuty };
}

async function getActiveSetting(transaction) {
  const [rows] = await db.sequelize.query(
    `SELECT id, office_start_time, office_end_time, grace_period_minutes,
            half_day_after_minutes, early_go_minutes
     FROM public.attendance_settings
     WHERE is_active = TRUE
     ORDER BY id DESC
     LIMIT 1`,
    { transaction }
  );

  if (!rows || !rows.length) {
    throw createError("No active attendance settings configured");
  }

  return rows[0];
}

async function getDayRule(attendanceDate, setting, transaction) {
  const [y, mo, d] = attendanceDate.split("-").map(Number);
  const jsDow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const isoDow = jsDow === 0 ? 7 : jsDow;

  const [rows] = await db.sequelize.query(
    `SELECT is_working_day, start_time, end_time, half_day_hours, full_day_hours
     FROM public.attendance_weekly_rules
     WHERE attendance_setting_id = :settingId
       AND day_of_week = :dayOfWeek
     LIMIT 1`,
    {
      replacements: { settingId: setting.id, dayOfWeek: isoDow },
      transaction,
    }
  );

  const rule = rows && rows.length ? rows[0] : null;

  return {
    is_working_day: rule ? Boolean(rule.is_working_day) : true,
    start_time: rule && rule.start_time ? rule.start_time : setting.office_start_time,
    end_time: rule && rule.end_time ? rule.end_time : setting.office_end_time,
    half_day_hours: rule ? rule.half_day_hours : null,
    full_day_hours: rule ? rule.full_day_hours : null,
    grace_period_minutes: setting.grace_period_minutes,
    half_day_after_minutes: setting.half_day_after_minutes,
    early_go_minutes: setting.early_go_minutes,
  };
}

async function getHoliday(attendanceDate, transaction) {
  return db.Holiday.findOne({
    where: {
      holiday_date: attendanceDate,
      is_active: true,
    },
    transaction,
  });
}

async function getLeave(prId, attendanceDate, transaction) {
  return db.LeaveRequests.findOne({
    where: {
      lr_pr_id: prId,
      lr_status_id: 2,
      lr_from_date: { [db.Sequelize.Op.lte]: attendanceDate },
      lr_to_date: { [db.Sequelize.Op.gte]: attendanceDate },
    },
    transaction,
  });
}

async function getStatusIds(transaction) {
  const rows = await db.AttendanceStatus.findAll({
    where: { is_active: true },
    transaction,
  });

  const map = {};

  for (const row of rows) {
    const name = String(row.status_name || "").trim().toLowerCase();
    map[name] = row.id;
  }

  return {
    present: map[STATUS_NAME.PRESENT],
    working: map[STATUS_NAME.WORKING],
    half_day: map[STATUS_NAME.HALF_DAY],
    holiday: map[STATUS_NAME.HOLIDAY],
    weekly_off: map[STATUS_NAME.WEEKLY_OFF],
    absent: map[STATUS_NAME.ABSENT],
    leave: map[STATUS_NAME.LEAVE],
  };
}

function computeAttendance({
  attendanceDate,
  punchIn,
  punchOut,
  onDuty,
  dayRule,
  holiday,
  leave,
  statusIds,
}) {
  const startMinutes = timeStringToMinutes(dayRule.start_time);
  const endMinutes = timeStringToMinutes(dayRule.end_time);

  const isNonWorking = Boolean(holiday) || !dayRule.is_working_day;

  const totalHours = calculateTotalHours(punchIn, punchOut);

  const expectedHours = isNonWorking
    ? "00:00:00"
    : secondsToTime((endMinutes - startMinutes) * 60);

  let lateArrival = 0;
  let isLateArrived = false;

  if (punchIn && !isNonWorking) {
    const punchInMinutes = getMinutesFromTimestamp(punchIn);

    if (punchInMinutes > startMinutes) {
      lateArrival = punchInMinutes - startMinutes;
    }

    if (punchInMinutes > startMinutes + Number(dayRule.grace_period_minutes || 0)) {
      isLateArrived = true;
    }
  }

  let earlyGo = 0;
  let isEarlyGone = false;

  if (punchOut && !isNonWorking) {
    const punchOutMinutes = getMinutesFromTimestamp(punchOut);

    if (punchOutMinutes < endMinutes) {
      earlyGo = endMinutes - punchOutMinutes;
    }

    if (punchOutMinutes < endMinutes - Number(dayRule.early_go_minutes || 0)) {
      isEarlyGone = true;
    }
  }

  let statusId;

  if (holiday) {
    statusId = statusIds.holiday;
  } else if (!dayRule.is_working_day) {
    statusId = statusIds.weekly_off;
  } else if (leave) {
    statusId = statusIds.leave;
  } else if (onDuty) {
    statusId = statusIds.present;
  } else if (!punchIn) {
    statusId = statusIds.absent;
  } else if (
    getMinutesFromTimestamp(punchIn) >=
    startMinutes + Number(dayRule.half_day_after_minutes || 0)
  ) {
    statusId = statusIds.half_day;
  } else if (!punchOut) {
    statusId = statusIds.working;
  } else if (
    dayRule.half_day_hours &&
    timestampStringToEpochSeconds(punchOut) -
      timestampStringToEpochSeconds(punchIn) <
      Number(dayRule.half_day_hours) * 3600
  ) {
    statusId = statusIds.half_day;
  } else {
    statusId = statusIds.present;
  }

  return {
    punch_in: punchIn,
    punch_out: punchOut,
    total_hours: totalHours,
    expected_hours: expectedHours,
    late_arrival: lateArrival,
    is_late_arrived: isLateArrived,
    early_go: earlyGo,
    is_early_gone: isEarlyGone,
    status_id: statusId,
  };
}

async function upsertAttendanceRow(Model, empId, attendanceDate, values, transaction) {
  const now = new Date();

  const existing = await Model.findOne({
    where: {
      emp_id: empId,
      attendance_date: attendanceDate,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const payload = {
    emp_id: empId,
    attendance_date: attendanceDate,
    punch_in: values.punch_in || null,
    punch_out: values.punch_out || null,
    total_hours: values.total_hours,
    expected_hours: values.expected_hours,
    late_arrival: values.late_arrival,
    is_late_arrived: values.is_late_arrived,
    early_go: values.early_go,
    is_early_gone: values.is_early_gone,
    status_id: values.status_id,
    is_regularized: true,
    updated_at: now,
  };

  if (existing) {
    await existing.update(payload, { transaction });
    return existing;
  }

  return Model.create(
    {
      ...payload,
      created_at: now,
    },
    { transaction }
  );
}

async function recalculateAttendanceForRegularization({
  transaction,
  prId,
  empId,
  attendanceDate,
  requestId,
  items,
}) {
  if (!empId) {
    throw createError("empId is required");
  }

  if (!attendanceDate) {
    throw createError("attendanceDate is required");
  }

  const setting = await getActiveSetting(transaction);
  const dayRule = await getDayRule(attendanceDate, setting, transaction);
  const holiday = await getHoliday(attendanceDate, transaction);
  const leave = await getLeave(prId, attendanceDate, transaction);
  const statusIds = await getStatusIds(transaction);

  const { base } = await getBaseAttendance(empId, attendanceDate, transaction);

  const { punchIn, punchOut, onDuty } = applyItemsToPunches(items || [], base);

  let finalPunchIn = punchIn;
  let finalPunchOut = punchOut;

  if (onDuty) {
    if (!finalPunchIn) {
      finalPunchIn = createTimestampString(
        attendanceDate,
        Math.floor(timeStringToMinutes(dayRule.start_time) / 60),
        timeStringToMinutes(dayRule.start_time) % 60
      );
    }

    if (!finalPunchOut) {
      finalPunchOut = createTimestampString(
        attendanceDate,
        Math.floor(timeStringToMinutes(dayRule.end_time) / 60),
        timeStringToMinutes(dayRule.end_time) % 60
      );
    }
  }

  const values = computeAttendance({
    attendanceDate,
    punchIn: finalPunchIn,
    punchOut: finalPunchOut,
    onDuty,
    dayRule,
    holiday,
    leave,
    statusIds,
  });

  values.regularization_id = requestId;
  values.regularized_at = new Date();
  values.regularized_by = null;

  const daily = await upsertAttendanceRow(
    db.DailyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  const weekly = await upsertAttendanceRow(
    db.WeeklyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  const monthly = await upsertAttendanceRow(
    db.MonthlyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  await daily.update(
    {
      regularization_id: requestId,
      regularized_at: new Date(),
    },
    { transaction }
  );

  return {
    daily: daily.toJSON ? daily.toJSON() : daily,
    weekly: weekly.toJSON ? weekly.toJSON() : weekly,
    monthly: monthly.toJSON ? monthly.toJSON() : monthly,
  };
}

async function applyPunchOnRaise({ transaction, prId, empId, attendanceDate, items }) {
  if (!empId) {
    throw createError("empId is required");
  }

  if (!attendanceDate) {
    throw createError("attendanceDate is required");
  }

  const setting = await getActiveSetting(transaction);
  const dayRule = await getDayRule(attendanceDate, setting, transaction);
  const holiday = await getHoliday(attendanceDate, transaction);
  const leave = await getLeave(prId, attendanceDate, transaction);
  const statusIds = await getStatusIds(transaction);

  const { base } = await getBaseAttendance(empId, attendanceDate, transaction);

  const { punchIn, punchOut, onDuty } = applyItemsToPunches(items || [], base);

  let finalPunchIn = punchIn;
  let finalPunchOut = punchOut;

  if (onDuty) {
    if (!finalPunchIn) {
      finalPunchIn = createTimestampString(
        attendanceDate,
        Math.floor(timeStringToMinutes(dayRule.start_time) / 60),
        timeStringToMinutes(dayRule.start_time) % 60
      );
    }

    if (!finalPunchOut) {
      finalPunchOut = createTimestampString(
        attendanceDate,
        Math.floor(timeStringToMinutes(dayRule.end_time) / 60),
        timeStringToMinutes(dayRule.end_time) % 60
      );
    }
  }

  const values = computeAttendance({
    attendanceDate,
    punchIn: finalPunchIn,
    punchOut: finalPunchOut,
    onDuty,
    dayRule,
    holiday,
    leave,
    statusIds,
  });

  const daily = await upsertAttendanceRow(
    db.DailyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  const weekly = await upsertAttendanceRow(
    db.WeeklyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  const monthly = await upsertAttendanceRow(
    db.MonthlyAttendance,
    empId,
    attendanceDate,
    values,
    transaction
  );

  return {
    daily: daily.toJSON ? daily.toJSON() : daily,
    weekly: weekly.toJSON ? weekly.toJSON() : weekly,
    monthly: monthly.toJSON ? monthly.toJSON() : monthly,
  };
}

module.exports = {
  recalculateAttendanceForRegularization,
  applyPunchOnRaise,
};
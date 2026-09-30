const db = require("../models");
const { Op } = require("sequelize");
const {
  recalculateAttendanceForRegularization,
} = require("../services/recalculateAttendanceService");

const STATUS_ABSENT = 2;

const WEEKDAY_EXPECTED_HOURS = "09:18:00";
const WEEKEND_EXPECTED_HOURS = "00:00:00";

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeAttendanceDate(value) {
  if (!value) {
    throw createError("attendanceDate is required");
  }

  const valueString = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valueString)) {
    throw createError("Invalid attendanceDate. Use YYYY-MM-DD");
  }

  const [y, mo, d] = valueString.split("-").map(Number);
  const check = new Date(Date.UTC(y, mo - 1, d));

  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    throw createError("Invalid attendanceDate");
  }

  return valueString;
}

function getExpectedHours(attendanceDate) {
  const [y, mo, d] = attendanceDate.split("-").map(Number);
  const day = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();

  if (day === 0 || day === 6) {
    return WEEKEND_EXPECTED_HOURS;
  }

  return WEEKDAY_EXPECTED_HOURS;
}

function serializeAttendance(row) {
  if (!row) {
    return null;
  }

  return row.toJSON ? row.toJSON() : { ...row };
}

function normalizePunchTime(value) {
  if (!value) {
    return null;
  }

  const valueString = String(value).trim();

  const match = valueString.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    throw createError("Invalid punchTime. Use YYYY-MM-DD HH:mm:ss");
  }

  const [, year, month, day, hour, minute, second = "00"] = match;

  const check = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    )
  );

  if (
    check.getUTCFullYear() !== Number(year) ||
    check.getUTCMonth() !== Number(month) - 1 ||
    check.getUTCDate() !== Number(day) ||
    check.getUTCHours() !== Number(hour) ||
    check.getUTCMinutes() !== Number(minute) ||
    check.getUTCSeconds() !== Number(second)
  ) {
    throw createError("Invalid punchTime");
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function findAttendanceRows(empId, attendanceDate, transaction) {
  const [daily, weekly, monthly] = await Promise.all([
    db.DailyAttendance.findOne({
      where: { emp_id: String(empId), attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
    db.WeeklyAttendance.findOne({
      where: { emp_id: String(empId), attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
    db.MonthlyAttendance.findOne({
      where: { emp_id: String(empId), attendance_date: attendanceDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
  ]);

  return { daily, weekly, monthly };
}

async function createOrReplaceBackup(
  arId,
  empId,
  attendanceDate,
  rows,
  hrPrId,
  transaction
) {
  const snapshot = {
    daily: serializeAttendance(rows.daily),
    weekly: serializeAttendance(rows.weekly),
    monthly: serializeAttendance(rows.monthly),
  };

  const existing = await db.AttendanceRegularizationBackup.findOne({
    where: { ar_id: arId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existing) {
    await existing.update(
      {
        emp_id: String(empId),
        attendance_date: attendanceDate,
        snapshot_json: snapshot,
        created_by: hrPrId,
        created_at: new Date(),
        restored_at: null,
        restored_by: null,
      },
      { transaction }
    );

    return existing;
  }

  return db.AttendanceRegularizationBackup.create(
    {
      ar_id: arId,
      emp_id: String(empId),
      attendance_date: attendanceDate,
      snapshot_json: snapshot,
      created_by: hrPrId,
      created_at: new Date(),
      restored_at: null,
      restored_by: null,
    },
    { transaction }
  );
}

async function restoreAttendanceRow(
  Model,
  snapshot,
  empId,
  attendanceDate,
  transaction
) {
  const current = await Model.findOne({
    where: { emp_id: String(empId), attendance_date: attendanceDate },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!snapshot) {
    if (current) {
      await current.destroy({ transaction });
    }

    return;
  }

  const values = {
    emp_id: snapshot.emp_id || String(empId),
    attendance_date: snapshot.attendance_date || attendanceDate,
    punch_in: snapshot.punch_in || null,
    punch_out: snapshot.punch_out || null,
    total_hours: snapshot.total_hours || "00:00:00",
    expected_hours:
      snapshot.expected_hours || getExpectedHours(attendanceDate),
    late_arrival: snapshot.late_arrival || 0,
    is_late_arrived: Boolean(snapshot.is_late_arrived),
    early_go: snapshot.early_go || 0,
    is_early_gone: Boolean(snapshot.is_early_gone),
    status_id: snapshot.status_id || STATUS_ABSENT,
    is_regularized: false,
    regularization_id: null,
    regularized_at: null,
    regularized_by: null,
    updated_at: snapshot.updated_at || new Date(),
  };

  if (current) {
    await current.update(values, { transaction });
    return;
  }

  await Model.create(
    { ...values, created_at: snapshot.created_at || new Date() },
    { transaction }
  );
}

async function getMasters() {
  const [regularizationTypes, approvalStatuses] = await Promise.all([
    db.RegularizationType.findAll({
      where: { rt_is_active: true },
      order: [["rt_id", "ASC"]],
    }),
    db.ApprovalStatus.findAll({
      order: [["as_code", "ASC"]],
    }),
  ]);

  return { regularizationTypes, approvalStatuses };
}

async function raiseRequest(payload) {
  const t = await db.sequelize.transaction();

  try {
    const { prId, attendanceDate, reason, items } = payload;

    if (!prId) {
      throw createError("prId is required");
    }

    const normalizedDate = normalizeAttendanceDate(attendanceDate);

    if (!Array.isArray(items) || items.length === 0) {
      throw createError("At least one regularization item is required");
    }

    const normalizedItems = items.map((item) => {
      const typeCode = String(item.typeCode || item.ari_type_code || "")
        .trim()
        .toUpperCase();

      if (!["PUNCH_IN", "PUNCH_OUT", "ON_DUTY"].includes(typeCode)) {
        throw createError(`Invalid regularization type: ${typeCode}`);
      }

      let punchTime = null;

      if (item.punchTime) {
        punchTime = normalizePunchTime(item.punchTime);
      }

      if (["PUNCH_IN", "PUNCH_OUT"].includes(typeCode) && !punchTime) {
        throw createError(`punchTime is required for ${typeCode}`);
      }

      return {
        typeCode,
        punchTime,
        remarks: item.remarks || item.ari_remarks || null,
      };
    });

    const employee = await db.Personal.findByPk(Number(prId), {
      transaction: t,
    });

    if (!employee) {
      throw createError("Employee not found", 404);
    }

    const existing = await db.AttendanceRegularization.findOne({
      where: {
        ar_pr_id: Number(prId),
        ar_attendance_date: normalizedDate,
        ar_status: {
          [Op.in]: ["PENDING_MANAGER", "PENDING_HR", "APPROVED"],
        },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existing) {
      throw createError(
        "An active regularization request already exists for this attendance date"
      );
    }

    let managerId = null;

    const organization = await db.Organizations.findOne({
      where: { pr_id: employee.pr_id },
      transaction: t,
    });

    if (organization && organization.or_reporting_to_id) {
      managerId = organization.or_reporting_to_id;
    }

    const request = await db.AttendanceRegularization.create(
      {
        ar_pr_id: Number(prId),
        ar_attendance_date: normalizedDate,
        ar_reason: reason || null,
        ar_status: "PENDING_MANAGER",
        ar_manager_id: managerId,
        ar_created_by: Number(prId),
        ar_created_at: new Date(),
      },
      { transaction: t }
    );

    for (const item of normalizedItems) {
      await db.AttendanceRegularizationItem.create(
        {
          ar_id: request.ar_id,
          ari_type_code: item.typeCode,
          ari_punch_time: item.punchTime || null,
          ari_remarks: item.remarks,
          created_at: new Date(),
        },
        { transaction: t }
      );
    }

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: request.ar_id,
        action_by: Number(prId),
        action_role: "EMPLOYEE",
        action: "RAISED",
        remarks: reason || null,
        action_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    return {
      ar_id: request.ar_id,
      ar_pr_id: request.ar_pr_id,
      ar_attendance_date: request.ar_attendance_date,
      ar_status: request.ar_status,
      ar_manager_id: request.ar_manager_id,
      items: normalizedItems.map((item) => ({
        typeCode: item.typeCode,
        punchTime: item.punchTime,
        remarks: item.remarks,
      })),
    };
  } catch (err) {
    if (!t.finished) {
      await t.rollback();
    }

    throw err;
  }
}

async function getMyRequests(prId, options = {}) {
  const {
    limit = 10,
    offset = 0,
    status = null,
    fromDate = null,
    toDate = null,
  } = options;

  const where = { ar_pr_id: prId };

  if (status) {
    where.ar_status = status;
  }

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] = fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] = toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [{ model: db.AttendanceRegularizationItem, as: "items" }],
    order: [["ar_created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function getRequestWithItems(arId) {
  return db.AttendanceRegularization.findOne({
    where: { ar_id: arId },
    include: [
      { model: db.AttendanceRegularizationItem, as: "items" },
      {
        model: db.AttendanceRegularizationLog,
        as: "logs",
        separate: true,
        order: [["action_at", "DESC"]],
      },
      { model: db.AttendanceRegularizationBackup, as: "backup" },
    ],
  });
}

async function cancelRequest(arId, empPrId) {
  const t = await db.sequelize.transaction();

  try {
    const request = await db.AttendanceRegularization.findOne({
      where: { ar_id: arId, ar_pr_id: empPrId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      throw createError("Regularization request not found", 404);
    }

    if (!["PENDING_MANAGER", "PENDING_HR"].includes(request.ar_status)) {
      throw createError(
        "Only pending regularization requests can be cancelled"
      );
    }

    await request.update(
      {
        ar_status: "CANCELLED",
        ar_updated_by: empPrId,
        ar_updated_at: new Date(),
      },
      { transaction: t }
    );

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: empPrId,
        action_role: "EMPLOYEE",
        action: "CANCELLED",
        remarks: "Request cancelled by employee",
        action_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    return request;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getPendingForManager(managerPrId, options = {}) {
  const {
    limit = 10,
    offset = 0,
    status = "PENDING_MANAGER",
    fromDate = null,
    toDate = null,
  } = options;

  const where = { ar_manager_id: managerPrId, ar_status: status };

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] = fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] = toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [{ model: db.AttendanceRegularizationItem, as: "items" }],
    order: [["ar_created_at", "ASC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function managerAction(arId, managerPrId, action, remarks) {
  const t = await db.sequelize.transaction();

  try {
    const normalizedAction = String(action || "").trim().toUpperCase();

    if (!["APPROVED", "REJECTED"].includes(normalizedAction)) {
      throw createError("Action must be APPROVED or REJECTED");
    }

    const request = await db.AttendanceRegularization.findOne({
      where: { ar_id: arId, ar_manager_id: managerPrId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      throw createError("Regularization request not found", 404);
    }

    if (request.ar_status !== "PENDING_MANAGER") {
      throw createError("Request is not pending with manager");
    }

    const now = new Date();

    await request.update(
      {
        ar_status: normalizedAction === "APPROVED" ? "PENDING_HR" : "REJECTED",
        ar_manager_action_at: now,
        ar_manager_remarks: remarks || null,
        ar_updated_by: managerPrId,
        ar_updated_at: now,
      },
      { transaction: t }
    );

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: managerPrId,
        action_role: "MANAGER",
        action: normalizedAction,
        remarks: remarks || null,
        action_at: now,
      },
      { transaction: t }
    );

    await t.commit();

    return request;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getPendingForHR(options = {}) {
  const {
    limit = 10,
    offset = 0,
    status = "PENDING_HR",
    fromDate = null,
    toDate = null,
  } = options;

  const where = { ar_status: status };

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] = fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] = toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [{ model: db.AttendanceRegularizationItem, as: "items" }],
    order: [["ar_created_at", "ASC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function hrAction(arId, hrPrId, action, remarks) {
  const t = await db.sequelize.transaction();

  try {
    const normalizedAction = String(action || "").trim().toUpperCase();

    if (!["APPROVED", "REJECTED"].includes(normalizedAction)) {
      throw createError("Action must be APPROVED or REJECTED");
    }

    const request = await db.AttendanceRegularization.findOne({
      where: { ar_id: arId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      throw createError("Regularization request not found", 404);
    }

    if (request.ar_status !== "PENDING_HR") {
      throw createError("Request is not pending with HR");
    }

    const now = new Date();

    const items = await db.AttendanceRegularizationItem.findAll({
      where: { ar_id: arId },
      order: [["ari_id", "ASC"]],
      transaction: t,
    });

    request.setDataValue("items", items);

    if (normalizedAction === "REJECTED") {
      await request.update(
        {
          ar_status: "REJECTED",
          ar_hr_id: hrPrId,
          ar_hr_action_at: now,
          ar_hr_remarks: remarks || null,
          ar_updated_by: hrPrId,
          ar_updated_at: now,
        },
        { transaction: t }
      );

      await db.AttendanceRegularizationLog.create(
        {
          ar_id: arId,
          action_by: hrPrId,
          action_role: "HR",
          action: "REJECTED",
          remarks: remarks || null,
          action_at: now,
        },
        { transaction: t }
      );

      await t.commit();

      return { ar_id: arId, status: "REJECTED" };
    }

    const employee = await db.Personal.findByPk(Number(request.ar_pr_id), {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!employee) {
      throw createError("Employee not found", 404);
    }

    const organization = await db.Organizations.findOne({
      where: { pr_id: Number(request.ar_pr_id) },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!organization) {
      throw createError("Employee organization record not found", 404);
    }

    const empId = String(organization.or_emp_id || "").trim();

    if (!empId) {
      throw createError(
        "Attendance employee ID is not configured for this employee"
      );
    }

    const attendanceDate = normalizeAttendanceDate(
      request.ar_attendance_date
    );

    const rows = await findAttendanceRows(empId, attendanceDate, t);

    await createOrReplaceBackup(arId, empId, attendanceDate, rows, hrPrId, t);

    const attendance = await recalculateAttendanceForRegularization({
      transaction: t,
      prId: Number(request.ar_pr_id),
      empId,
      attendanceDate,
      requestId: arId,
      items,
    });

    await request.update(
      {
        ar_status: "APPROVED",
        ar_hr_id: hrPrId,
        ar_hr_action_at: now,
        ar_hr_remarks: remarks || null,
        ar_updated_by: hrPrId,
        ar_updated_at: now,
      },
      { transaction: t }
    );

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR",
        action: "APPROVED",
        remarks: remarks || null,
        action_at: now,
      },
      { transaction: t }
    );

    await t.commit();

    return {
      ar_id: arId,
      status: "APPROVED",
      emp_id: empId,
      attendance_date: attendanceDate,
      attendance,
      regularized: true,
    };
  } catch (err) {
    if (!t.finished) {
      await t.rollback();
    }

    throw err;
  }
}

async function cancelHrAction(arId, hrPrId, remarks) {
  const t = await db.sequelize.transaction();

  try {
    const request = await db.AttendanceRegularization.findOne({
      where: { ar_id: arId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!request) {
      throw createError("Regularization request not found", 404);
    }

    if (request.ar_status !== "APPROVED") {
      throw createError("Only approved regularization requests can be reverted");
    }

    const backup = await db.AttendanceRegularizationBackup.findOne({
      where: { ar_id: arId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!backup) {
      throw createError("Attendance backup not found");
    }

    const empId = backup.emp_id;
    const attendanceDate = normalizeAttendanceDate(backup.attendance_date);
    const snapshot = backup.snapshot_json || {};

    await restoreAttendanceRow(
      db.DailyAttendance,
      snapshot.daily,
      empId,
      attendanceDate,
      t
    );

    await restoreAttendanceRow(
      db.WeeklyAttendance,
      snapshot.weekly,
      empId,
      attendanceDate,
      t
    );

    await restoreAttendanceRow(
      db.MonthlyAttendance,
      snapshot.monthly,
      empId,
      attendanceDate,
      t
    );

    const now = new Date();

    await backup.update(
      { restored_at: now, restored_by: hrPrId },
      { transaction: t }
    );

    await request.update(
      {
        ar_status: "PENDING_HR",
        ar_hr_id: hrPrId,
        ar_hr_action_at: now,
        ar_hr_remarks: remarks || "Regularization reverted",
        ar_updated_by: hrPrId,
        ar_updated_at: now,
      },
      { transaction: t }
    );

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR",
        action: "CANCELLED",
        remarks:
          remarks ||
          "Regularization reverted and original attendance restored",
        action_at: now,
      },
      { transaction: t }
    );

    await t.commit();

    return {
      ar_id: arId,
      status: "PENDING_HR",
      emp_id: String(empId),
      attendance_date: attendanceDate,
      restored: true,
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  getMasters,
  raiseRequest,
  getMyRequests,
  getRequestWithItems,
  cancelRequest,
  getPendingForManager,
  managerAction,
  getPendingForHR,
  hrAction,
  cancelHrAction,
};
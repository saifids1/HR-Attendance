const db = require("../models");
const { Op } = require("sequelize");

/* ============================================================
   Helper: resolve manager's personal.pr_id
   ============================================================ */
async function resolveManagerPrId(employeePrId, transaction) {
  const empOrg = await db.Organizations.findOne({
    where: { pr_id: employeePrId },
    transaction,
  });
  if (!empOrg || !empOrg.or_reporting_to_id) return null;

  const managerOrg = await db.Organizations.findOne({
    where: { or_id: empOrg.or_reporting_to_id },
    transaction,
  });
  return managerOrg ? managerOrg.pr_id : null;
}

/* ============================================================
   STEP 1 — Employee raises request
   ============================================================ */
async function raiseRequest(payload, currentUser) {
  const t = await db.sequelize.transaction();
  try {
    const { prId, attendanceDate, reason, items } = payload;

    if (!prId) throw new Error("prId is required");
    if (!items?.length) throw new Error("At least one item required");

    // Validate type codes
    const valid = await db.RegularizationType.findAll({
      where: { rt_code: { [Op.in]: items.map((i) => i.typeCode) } },
      transaction: t,
    });
    const validCodes = valid.map((v) => v.rt_code);
    for (const it of items) {
      if (!validCodes.includes(it.typeCode))
        throw new Error(`Invalid type code: ${it.typeCode}`);
    }

    // Duplicate pending check
    const existing = await db.AttendanceRegularization.findOne({
      where: {
        ar_pr_id: prId,
        ar_attendance_date: attendanceDate,
        ar_status: { [Op.in]: ["PENDING_MANAGER", "PENDING_HR"] },
      },
      transaction: t,
    });
    if (existing)
      throw new Error("Pending request already exists for this date");

    const managerPrId = await resolveManagerPrId(prId, t);
    const empOrg = await db.Organizations.findOne({
      where: { pr_id: prId },
      transaction: t,
    });

    const request = await db.AttendanceRegularization.create(
      {
        ar_pr_id: prId,
        ar_attendance_date: attendanceDate,
        ar_reason: reason,
        ar_status: "PENDING_MANAGER",
        ar_manager_id: managerPrId,
        ar_company_id: empOrg?.or_company_id || null,
        ar_created_by: currentUser?.pr_id || prId,
      },
      { transaction: t }
    );

    await db.AttendanceRegularizationItem.bulkCreate(
      items.map((i) => ({
        ar_id: request.ar_id,
        ari_type_code: i.typeCode,
        ari_punch_time: i.punchTime || null,
        ari_remarks: i.remarks || null,
      })),
      { transaction: t }
    );

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: request.ar_id,
        action_by: currentUser?.pr_id || prId,
        action_role: "EMPLOYEE",
        action: "RAISED",
        remarks: reason,
      },
      { transaction: t }
    );

    await t.commit();
    return getRequestWithItems(request.ar_id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/* ============================================================
   STEP 2 — Manager action
   ============================================================ */
async function managerAction(arId, managerPrId, action, remarks) {
  const t = await db.sequelize.transaction();
  try {
    console.log(arId, managerPrId, action, remarks);
    console.log("-----------------------------");
    const req = await db.AttendanceRegularization.findByPk(arId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!req) throw new Error("Request not found");

    if (req.ar_status !== "PENDING_MANAGER")
      throw new Error("Already processed at manager level");

    // ✅ FIX: coerce both sides to Number before comparing
    if (Number(req.ar_manager_id) !== Number(managerPrId))
      throw new Error("You are not the assigned reporting manager");

    if (!["APPROVED", "REJECTED"].includes(action))
      throw new Error("Invalid action");

    req.ar_status = action === "APPROVED" ? "PENDING_HR" : "REJECTED";
    req.ar_manager_action_at = new Date();
    req.ar_manager_remarks = remarks;
    req.ar_updated_by = managerPrId;
    req.ar_updated_at = new Date();
    await req.save({ transaction: t });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: managerPrId,
        action_role: "MANAGER",
        action,
        remarks,
      },
      { transaction: t }
    );

    await t.commit();
    return getRequestWithItems(arId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/* ============================================================
   STEP 3 — HR action (+ override activity_log on approval)
   ============================================================ */

async function hrAction(arId, hrPrId, action, remarks) {
  const t = await db.sequelize.transaction();
  try {
    // Lock only the parent row — no include, so FOR UPDATE works fine.
    const req = await db.AttendanceRegularization.findByPk(arId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!req) throw new Error("Request not found");
    if (req.ar_status !== "PENDING_HR") throw new Error("Not pending with HR");
    if (!["APPROVED", "REJECTED"].includes(action))
      throw new Error("Invalid action");

    // Fetch items separately (no lock needed on children).
    const items = await db.AttendanceRegularizationItem.findAll({
      where: { ar_id: arId },
      transaction: t,
    });
    req.items = items;

    if (action === "REJECTED") {
      req.ar_status = "REJECTED";
      req.ar_hr_id = hrPrId;
      req.ar_hr_action_at = new Date();
      req.ar_hr_remarks = remarks;
      req.ar_updated_by = hrPrId;
      req.ar_updated_at = new Date();
      await req.save({ transaction: t });

      await db.AttendanceRegularizationLog.create(
        {
          ar_id: arId,
          action_by: hrPrId,
          action_role: "HR_ADMIN",
          action: "REJECTED",
          remarks,
        },
        { transaction: t }
      );

      await t.commit();
      return getRequestWithItems(arId);
    }

    const empOrg = await db.Organizations.findOne({
      where: { pr_id: req.ar_pr_id },
      transaction: t,
    });
    if (!empOrg) throw new Error("Employee org record not found");

    const empCode = empOrg.or_emp_id;
    const attDate = req.ar_attendance_date;
    const startOfDay = new Date(`${attDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${attDate}T23:59:59.999Z`);

    await db.AttendanceRegularizationBackup.destroy({
      where: { ar_id: arId, restored_at: { [Op.ne]: null } },
      transaction: t,
    });

    const existingPunches = await db.ActivityLog.findAll({
      where: {
        emp_id: empCode,
        punch_time: { [Op.between]: [startOfDay, endOfDay] },
      },
      transaction: t,
      raw: true,
    });
    console.log("------------------------------");
    console.log(arId, hrPrId, action, remarks);

    await db.AttendanceRegularizationBackup.create(
      {
        ar_id: arId,
        emp_id: empCode,
        attendance_date: attDate,
        snapshot_json: existingPunches,
        created_by: hrPrId,
      },
      { transaction: t }
    );

    await db.ActivityLog.destroy({
      where: {
        emp_id: empCode,
        punch_time: { [Op.between]: [startOfDay, endOfDay] },
      },
      transaction: t,
    });

    const punches = [];

    for (const item of req.items) {
      switch (item.ari_type_code) {
        case "PUNCH_IN":
          if (!item.ari_punch_time)
            throw new Error("PUNCH_IN requires punch_time");
          punches.push({
            emp_id: empCode,
            punch_time: item.ari_punch_time,
            punch_type: "IN",
            source: "REGULARIZATION",
            device_ip: "REGULARIZATION",
            device_sn: "REGULARIZATION",
          });
          break;

        case "PUNCH_OUT": {
          let outTime = item.ari_punch_time;

          if (!outTime) {
            if (existingPunches.length === 0)
              throw new Error(
                "PUNCH_OUT requires punch_time (no existing punches to fall back to)"
              );
            const last = existingPunches
              .slice()
              .sort((a, b) => new Date(b.punch_time) - new Date(a.punch_time))[0];
            outTime = last.punch_time;
          }

          punches.push({
            emp_id: empCode,
            punch_time: outTime,
            punch_type: "OUT",
            source: "REGULARIZATION",
            device_ip: "REGULARIZATION",
            device_sn: "REGULARIZATION",
          });
          break;
        }

        case "ON_DUTY": {
          if (item.ari_punch_time) {
            punches.push({
              emp_id: empCode,
              punch_time: item.ari_punch_time,
              punch_type: "ON_DUTY",
              source: "REGULARIZATION",
              device_ip: "REGULARIZATION",
              device_sn: "REGULARIZATION",
            });
            break;
          }

          let firstTime, lastTime;

          if (existingPunches.length > 0) {
            const sorted = existingPunches
              .slice()
              .sort((a, b) => new Date(a.punch_time) - new Date(b.punch_time));
            firstTime = sorted[0].punch_time;
            lastTime = sorted[sorted.length - 1].punch_time;
          } else {
            firstTime = new Date(`${attDate}T00:00:00.000Z`);
            lastTime = new Date(`${attDate}T23:59:59.000Z`);
          }

          punches.push(
            {
              emp_id: empCode,
              punch_time: firstTime,
              punch_type: "ON_DUTY",
              source: "REGULARIZATION",
              device_ip: "REGULARIZATION",
              device_sn: "REGULARIZATION",
            },
            {
              emp_id: empCode,
              punch_time: lastTime,
              punch_type: "ON_DUTY",
              source: "REGULARIZATION",
              device_ip: "REGULARIZATION",
              device_sn: "REGULARIZATION",
            }
          );
          break;
        }

        default:
          throw new Error(`Unknown item type: ${item.ari_type_code}`);
      }
    }

    if (punches.length) {
      const insertedLogs = await db.ActivityLog.bulkCreate(punches, {
        transaction: t,
        returning: true,
      });

      await db.AttendanceRegularizationInserted.bulkCreate(
        insertedLogs.map((row) => ({
          ar_id: arId,
          activity_log_id: row.id,
        })),
        { transaction: t }
      );
    }

    req.ar_status = "APPROVED";
    req.ar_hr_id = hrPrId;
    req.ar_hr_action_at = new Date();
    req.ar_hr_remarks = remarks;
    req.ar_updated_by = hrPrId;
    req.ar_updated_at = new Date();
    await req.save({ transaction: t });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR_ADMIN",
        action: "APPROVED",
        remarks,
        metadata: {
          deleted_count: existingPunches.length,
          inserted_count: punches.length,
          attendance_date: attDate,
        },
      },
      { transaction: t }
    );

    await t.commit();
    return getRequestWithItems(arId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/* ============================================================
   Cancel own request
   ============================================================ */
async function cancelRequest(arId, empPrId) {
  const t = await db.sequelize.transaction();
  try {
    const req = await db.AttendanceRegularization.findByPk(arId, {
      transaction: t,
    });
    if (!req) throw new Error("Request not found");
    if (req.ar_pr_id !== empPrId) throw new Error("Not your request");
    if (req.ar_status !== "PENDING_MANAGER")
      throw new Error("Only PENDING_MANAGER requests can be cancelled");

    req.ar_status = "CANCELLED";
    req.ar_updated_by = empPrId;
    req.ar_updated_at = new Date();
    await req.save({ transaction: t });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: empPrId,
        action_role: "EMPLOYEE",
        action: "CANCELLED",
      },
      { transaction: t }
    );

    await t.commit();
    return getRequestWithItems(arId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/* ============================================================
   Query helpers
   ============================================================ */
async function getRequestWithItems(arId) {
  return db.AttendanceRegularization.findByPk(arId, {
    include: [
      { model: db.AttendanceRegularizationItem, as: "items" },
      { model: db.AttendanceRegularizationLog, as: "logs" },
      {
        model: db.Personal,
        as: "employee",
        attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
      },
      {
        model: db.Personal,
        as: "manager",
        attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
      },
      {
        model: db.Personal,
        as: "hr",
        attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
      },
    ],
  });
}

async function getPendingForManager(managerPrId, { limit, offset, status, fromDate, toDate }) {
  const where = { ar_manager_id: managerPrId };
  if (status) where.ar_status = status;
  if (fromDate || toDate) {
    where.ar_attendance_date = {};
    if (fromDate) where.ar_attendance_date[Op.gte] = fromDate;
    if (toDate) where.ar_attendance_date[Op.lte] = toDate;
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [
      { model: db.AttendanceRegularizationItem, as: "items" },
      {
        model: db.Personal,
        as: "employee",
        attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
      },
    ],
    order: [["ar_created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function getPendingForHR({ limit, offset, status, fromDate, toDate }) {
  const where = {};
  if (status) where.ar_status = status;
  if (fromDate || toDate) {
    where.ar_attendance_date = {};
    if (fromDate) where.ar_attendance_date[Op.gte] = fromDate;
    if (toDate) where.ar_attendance_date[Op.lte] = toDate;
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [
      { model: db.AttendanceRegularizationItem, as: "items" },
      { model: db.Personal, as: "employee" },
      { model: db.Personal, as: "manager" },
    ],
    order: [["ar_created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function getMyRequests(prId, { limit, offset, status, fromDate, toDate }) {
  const where = { ar_pr_id: prId };
  if (status) where.ar_status = status;
  if (fromDate || toDate) {
    where.ar_attendance_date = {};
    if (fromDate) where.ar_attendance_date[Op.gte] = fromDate;
    if (toDate) where.ar_attendance_date[Op.lte] = toDate;
  }

  return db.AttendanceRegularization.findAndCountAll({
    where,
    include: [
      { model: db.AttendanceRegularizationItem, as: "items" },
      { model: db.Personal, as: "manager" },
      { model: db.Personal, as: "hr" },
    ],
    order: [["ar_created_at", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
}

async function cancelHrAction(arId, hrPrId, remarks) {
  const t = await db.sequelize.transaction();
  try {
    const req = await db.AttendanceRegularization.findByPk(arId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!req) throw new Error("Request not found");
    if (req.ar_status !== "APPROVED")
      throw new Error("Only APPROVED requests can be cancelled");

    const inserted = await db.AttendanceRegularizationInserted.findAll({
      where: { ar_id: arId },
      transaction: t,
    });
    const insertedIds = inserted.map((r) => r.activity_log_id);

    if (insertedIds.length) {
      await db.ActivityLog.destroy({
        where: { id: { [Op.in]: insertedIds } },
        transaction: t,
      });
    }

    await db.AttendanceRegularizationInserted.destroy({
      where: { ar_id: arId },
      transaction: t,
    });

    const backup = await db.AttendanceRegularizationBackup.findOne({
      where: { ar_id: arId },
      transaction: t,
      order: [["created_at", "DESC"]],
    });
    if (!backup) throw new Error("Backup not found — cannot revert");

    let restoredCount = 0;
    if (Array.isArray(backup.snapshot_json) && backup.snapshot_json.length) {
      const toRestore = backup.snapshot_json.map((row) => {
        const { id, ...rest } = row;
        return rest;
      });
      await db.ActivityLog.bulkCreate(toRestore, { transaction: t });
      restoredCount = toRestore.length;
    }

    backup.restored_at = new Date();
    backup.restored_by = hrPrId;
    await backup.save({ transaction: t });

    req.ar_status = "PENDING_HR";
    req.ar_hr_id = null;
    req.ar_hr_action_at = null;
    req.ar_hr_remarks = null;
    req.ar_updated_by = hrPrId;
    req.ar_updated_at = new Date();
    await req.save({ transaction: t });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR_ADMIN",
        action: "CANCELLED",
        remarks,
        metadata: {
          restored_count: restoredCount,
          deleted_count: insertedIds.length,
        },
      },
      { transaction: t }
    );

    await t.commit();
    return getRequestWithItems(arId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}


async function getMasters() {
  const [types, statuses, punchTypes] = await Promise.all([
    db.RegularizationType.findAll({ where: { rt_is_active: true } }),
    db.ApprovalStatus.findAll({ where: { as_is_active: true } }),
    db.ActivityLogPunchType.findAll({ where: { alpt_is_active: true } }),
  ]);
  return { types, statuses, punchTypes };
}

module.exports = {
  raiseRequest,
  managerAction,
  hrAction,
  cancelRequest,
  getPendingForManager,
  getPendingForHR,
  getMyRequests,
  getRequestWithItems,
  getMasters,
  resolveManagerPrId,
  cancelHrAction,
};
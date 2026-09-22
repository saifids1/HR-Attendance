const service = require("../services/attendanceRegularizationService");
const db = require("../models");
const { Op } = require("sequelize");

const ok = (res, data, message = "Success") =>
  res.status(200).json({ success: true, message, data });

const created = (res, data, message = "Created") =>
  res.status(201).json({ success: true, message, data });

const bad = (res, message = "Bad request", code = 400) =>
  res.status(code).json({ success: false, message });

const fail = (res, err) => {
  console.error("[Regularization]", err);
  return res
    .status(500)
    .json({ success: false, message: err.message || "Internal server error" });
};

function getLoggedInPrId(req) {
  const prId =
    req.user?.pr_id ?? req.user?.Pr_Id ?? req.user?.user_id ?? req.user?.id;
  if (!prId) {
    const error = new Error("Employee information not found in JWT token.");
    error.statusCode = 401;
    throw error;
  }
  const parsedPrId = Number(prId);
  if (!Number.isInteger(parsedPrId) || parsedPrId <= 0) {
    const error = new Error("Invalid employee information in JWT token.");
    error.statusCode = 401;
    throw error;
  }
  return parsedPrId;
}

const getPagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

exports.getMasters = async (req, res) => {
  try {
    const data = await service.getMasters();
    return ok(res, data, "Masters fetched");
  } catch (err) {
    return fail(res, err);
  }
};

exports.raiseRequest = async (req, res) => {
  try {
    const loggedInPrId = getLoggedInPrId(req);
    const payload = { ...req.body, prId: loggedInPrId };
    console.log(payload);
    console.log("--------------------------------------");
    const data = await service.raiseRequest(payload, req.user);
    return created(res, data, "Regularization request raised");
  } catch (err) {
    return bad(res, err.message);
  }
};

exports.myRequests = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const empPrId = req.user.pr_id;

    const { rows, count } = await service.getMyRequests(empPrId, {
      limit,
      offset,
      status: req.query.status || null,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
    });

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
      "My requests fetched"
    );
  } catch (err) {
    return fail(res, err);
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const data = await service.cancelRequest(
      Number(req.params.id),
      req.user.pr_id
    );
    return ok(res, data, "Request cancelled");
  } catch (err) {
    return bad(res, err.message);
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await service.getRequestWithItems(Number(req.params.id));
    if (!data) return bad(res, "Request not found", 404);
    return ok(res, data, "Request fetched");
  } catch (err) {
    return fail(res, err);
  }
};

exports.managerPending = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    //const managerPrId = req.user.pr_id;

    const loggedInPrId = getLoggedInPrId(req);
console.log("----------------------");
console.log(loggedInPrId);
    const { rows, count } = await service.getPendingForManager(loggedInPrId, {
      limit,
      offset,
      status: req.query.status || "PENDING_MANAGER",
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
    });

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
      "Pending requests for manager"
    );
  } catch (err) {
    return fail(res, err);
  }
};

exports.managerAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    console.log("----------------------");
    
    const loggedInPrId = getLoggedInPrId(req);
    console.log(Number(req.params.id),
      loggedInPrId,
      action,
      remarks);
    const data = await service.managerAction(
      Number(req.params.id),
      loggedInPrId,
      action,
      remarks
    );
    return ok(res, data, `Manager ${action.toLowerCase()}`);
  } catch (err) {
    return bad(res, err.message);
  }
};

exports.hrPending = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req);
    const status = req.query.status || "PENDING_HR";

    console.log("[hrPending] query:", req.query);
    console.log("[hrPending] filter status:", status);
    console.log("[hrPending] pagination:", { page, limit, offset });

    const result = await service.getPendingForHR({
      limit,
      offset,
      status,
      fromDate: req.query.fromDate || null,
      toDate: req.query.toDate || null,
    });

    console.log("[hrPending] result type:", typeof result);
    console.log("[hrPending] result keys:", result && Object.keys(result));
    console.log("[hrPending] count:", result?.count);
    console.log("[hrPending] rows length:", result?.rows?.length);

    const { rows, count } = result;

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: count === 0 ? 0 : Math.ceil(count / limit),
        },
      },
      "Pending requests for HR"
    );
  } catch (err) {
    console.error("[hrPending] FAILED:", err);
    return fail(res, err);
  }
};

exports.hrAction = async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const loggedInPrId = getLoggedInPrId(req);
    const data = await service.hrAction(
      Number(req.params.id),
      loggedInPrId,
      action,
      remarks
    );
    return ok(res, data, `HR ${action.toLowerCase()}`);
  } catch (err) {
    return bad(res, err.message);
  }
};

exports.cancelHrAction = async (req, res) => {
  const { arId } = req.params;
  const { remarks } = req.body || {};
  const loggedInPrId = getLoggedInPrId(req);
  // hrPrId comes from auth middleware (JWT / session)
  const hrPrId = loggedInPrId;
  console.log(loggedInPrId);
  console.log("------------------------");
  if (!hrPrId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const t = await db.sequelize.transaction();
  try {
    // 1) Load request with row lock
    const reqRow = await db.AttendanceRegularization.findByPk(arId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!reqRow) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Request not found" });
    }
    if (reqRow.ar_status !== "APPROVED") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Only APPROVED requests can be cancelled",
      });
    }

    // 2) Delete punches that were inserted during approval
    const inserted = await db.AttendanceRegularizationInserted.findAll({
      where: { ar_id: arId },
      transaction: t,
    });
    const insertedIds = inserted.map((r) => r.activity_log_id);

    if (insertedIds.length) {
      await db.ActivityLog.destroy({
        where: { id: { [Op.in]: insertedIds } }, // ✅ explicit column name
        transaction: t,
      });
    }

    // 3) Restore snapshot from backup
    const backup = await db.AttendanceRegularizationBackup.findOne({
      where: { ar_id: arId },
      transaction: t,
    });
    if (!backup) throw new Error("Backup not found — cannot revert");

    let restoredCount = 0;
    if (Array.isArray(backup.snapshot_json) && backup.snapshot_json.length) {
      const toRestore = backup.snapshot_json.map((row) => {
        // drop PK so DB regenerates it
        const { id, ...rest } = row; // ✅ PK column is "id"
        return rest;
      });
      await db.ActivityLog.bulkCreate(toRestore, { transaction: t });
      restoredCount = toRestore.length;
    }

    // 4) Mark backup as restored
    backup.restored_at = new Date();
    backup.restored_by = hrPrId;
    await backup.save({ transaction: t });

    // 5) Reset request status → back to PENDING_HR so HR can re-decide
    reqRow.ar_status = "PENDING_HR";
    reqRow.ar_hr_id = null;
    reqRow.ar_hr_action_at = null;
    reqRow.ar_hr_remarks = null;
    reqRow.ar_updated_by = hrPrId;
    reqRow.ar_updated_at = new Date();
    await reqRow.save({ transaction: t });

    // 6) Audit log
    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR_ADMIN",
        action: "CANCELLED",
        remarks: remarks || null,
        metadata: {
          restored_count: restoredCount,
          deleted_count: insertedIds.length,
        },
      },
      { transaction: t }
    );

    await t.commit();
  } catch (err) {
    // Only rollback if the transaction is still active
    if (!t.finished) {
      await t.rollback();
    }
    console.error("cancelHrAction error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to cancel regularization",
    });
  }

  // 7) Return updated request — OUTSIDE the transaction
  try {
    const updated = await getRequestWithItems(arId);
    return res.status(200).json({
      success: true,
      message: "Regularization cancelled and attendance reverted",
      data: updated,
    });
  } catch (err) {
    console.error("getRequestWithItems error:", err);
    return res.status(500).json({
      success: false,
      message: "Cancelled successfully, but failed to load updated request",
    });
  }
};

/* ============================================================
   NEW: Activity Log by emp_id + punch_time (single day)
   GET /activity-log/by-emp-date?emp_id=202000005&punch_time=2026-09-08
   ============================================================ */
exports.getActivityLogByEmpDate = async (req, res) => {
  try {
    const { emp_id, punch_time } = req.query;

    if (!emp_id) return bad(res, "emp_id is required");
    if (!punch_time) return bad(res, "punch_time (YYYY-MM-DD) is required");

    const startOfDay = new Date(`${punch_time}T00:00:00.000Z`);
    const endOfDay = new Date(`${punch_time}T23:59:59.999Z`);

    if (isNaN(startOfDay.getTime()))
      return bad(res, "Invalid punch_time format. Use YYYY-MM-DD");

    const rows = await db.ActivityLog.findAll({
      where: {
        emp_id: String(emp_id).trim(),
        punch_time: { [Op.between]: [startOfDay, endOfDay] },
      },
      order: [["punch_time", "ASC"]],
    });

    return ok(
      res,
      {
        emp_id,
        date: punch_time,
        total: rows.length,
        records: rows,
      },
      "Activity log fetched"
    );
  } catch (err) {
    return fail(res, err);
  }
};
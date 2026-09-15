const { Op, literal, Transaction, QueryTypes } = require("sequelize");
require("dotenv").config();

const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");

const {
  Personal,
  Organizations,
  LeaveTypes,
  LeaveStatus,
  LeaveQuota,
  LeaveRequests,
  CompaniesMaster,
  EmployeeTypeMaster,
  UserRoleRelation,
  UsrRoleMaster,
} = db;

const sendEmail = require("../utils/mailer");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleDbError,
} = require("../utils/response");
const { getPaginationParams } = require("../utils/pagination");

const CARRY_FORWARD_PERCENTAGE = 0.5;

/* ============================================================
   HELPERS
============================================================ */

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year}:${hours}:${minutes}`;
};

const formatDateTime12 = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const amPm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  hours = String(hours).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes} ${amPm}`;
};

const formatDDMMYYYY = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = String(dateStr).split("-");
  return `${day}-${month}-${year}`;
};

function getLoggedInPrId(req) {
  const prId =
    req.user?.pr_id ?? req.user?.Pr_Id ?? req.user?.user_id ?? req.user?.id;
  if (!prId) {
    const error = new Error("Employee information not found in JWT token.");
    error.statusCode = 401;
    throw error;
  }
  const parsed = Number(prId);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error("Invalid employee information in JWT token.");
    error.statusCode = 401;
    throw error;
  }
  return parsed;
}

function isValidDate(dateString) {
  if (!dateString || typeof dateString !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  const date = new Date(`${dateString}T00:00:00Z`);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateString;
}

function validateYear(year) {
  const parsed = Number(year);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) return null;
  return parsed;
}

const calculateTotalDays = (fromDate, toDate, leaveTypeCode) => {
  const start = new Date(`${fromDate}T00:00:00`);
  const end = new Date(`${toDate}T00:00:00`);
  const code = String(leaveTypeCode || "").trim().toUpperCase();
  let totalDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (code === "PL" && d.getDay() === 0) continue;
    totalDays++;
  }
  return totalDays;
};

async function withTransaction(callback) {
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    async (t) => callback(t)
  );
}

/* ============================================================
   LOOKUPS
============================================================ */

async function getLeaveStatusId(statusName, t) {
  const row = await LeaveStatus.findOne({
    where: {
      ls_is_active: true,
      [Op.and]: literal(
        `LOWER("leave_status"."ls_leave_status_name") = LOWER(${sequelize.escape(statusName)})`
      ),
    },
    attributes: ["ls_leave_status_id"],
    transaction: t,
  });
  if (!row) {
    const error = new Error(`Leave status '${statusName}' is not configured.`);
    error.statusCode = 500;
    throw error;
  }
  return row.ls_leave_status_id;
}

async function getEmployee(prId, t) {
  const employee = await Organizations.findOne({
    where: { pr_id: prId },
    attributes: [
      "or_id", "pr_id", "or_emp_id", "or_organization_name",
      "or_is_active", "or_employee_type_id", "or_reporting_to_id",
      "or_department_id", "or_designation_id", "or_joining_date",
    ],
    transaction: t,
  });
  if (!employee) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }
  if (employee.or_is_active !== true) {
    const error = new Error("Employee is inactive.");
    error.statusCode = 400;
    throw error;
  }
  if (!employee.or_employee_type_id) {
    const error = new Error("Employee type is not assigned.");
    error.statusCode = 400;
    throw error;
  }
  return {
    or_id: employee.or_id,
    pr_id: employee.pr_id,
    employee_id: employee.or_emp_id,
    employee_name: employee.or_organization_name,
    is_active: employee.or_is_active,
    employee_type_id: employee.or_employee_type_id,
    reporting_to_id: employee.or_reporting_to_id,
    department_id: employee.or_department_id,
    designation_id: employee.or_designation_id,
    joining_date: employee.or_joining_date,
  };
}

async function getEmployeeType(employeeTypeId, t) {
  const row = await EmployeeTypeMaster.findOne({
    where: { employee_type_id: employeeTypeId },
    attributes: ["employee_type_id", "employee_type_name", "is_active"],
    transaction: t,
  });
  if (!row) {
    const error = new Error("Employee type not found.");
    error.statusCode = 400;
    throw error;
  }
  if (row.is_active !== true) {
    const error = new Error("Employee type is inactive.");
    error.statusCode = 400;
    throw error;
  }
  return row;
}

async function getApplicableLeaveType(prId, leaveTypeId, fromDate, toDate, t) {
  const employee = await getEmployee(prId, t);
  await getEmployeeType(employee.employee_type_id, t);

  const row = await LeaveTypes.findOne({
    where: {
      lt_leave_type_id: leaveTypeId,
      lt_emptype: employee.employee_type_id,
      lt_is_active: true,
      [Op.and]: [
        literal(`("leave_types"."lt_from_date" IS NULL OR "leave_types"."lt_from_date" <= ${sequelize.escape(fromDate)})`),
        literal(`("leave_types"."lt_to_date" IS NULL OR "leave_types"."lt_to_date" >= ${sequelize.escape(toDate)})`),
      ],
    },
    transaction: t,
  });
  if (!row) {
    const error = new Error("Selected leave type is not available for this employee type.");
    error.statusCode = 400;
    throw error;
  }
  return row;
}

/* ============================================================
   ENSURE EMPLOYEE QUOTA
============================================================ */
async function ensureEmployeeQuota(prId, year, createdBy, t) {
  const employee = await getEmployee(prId, t);

  const leaveTypes = await LeaveTypes.findAll({
    where: {
      lt_emptype: employee.employee_type_id,
      lt_is_active: true,
      [Op.and]: [
        literal(`("leave_types"."lt_from_date" IS NULL OR "leave_types"."lt_from_date" <= make_date(${year}, 12, 31))`),
        literal(`("leave_types"."lt_to_date" IS NULL OR "leave_types"."lt_to_date" >= make_date(${year}, 1, 1))`),
      ],
    },
    order: [["lt_leave_type_id", "ASC"]],
    transaction: t,
  });

  for (const lt of leaveTypes) {
    const existing = await LeaveQuota.findOne({
      where: {
        lq_pr_id: prId,
        lq_leave_type_id: lt.lt_leave_type_id,
        lq_leave_year: year,
      },
      attributes: ["lq_id"],
      transaction: t,
    });
    if (existing) continue;

    const isPaid = Boolean(lt.lt_is_paid);
    const masterDays = Number(lt.lt_total_days_per_year) || 0;
    const allocatedDays = isPaid ? masterDays : 0;

    let carryForwardDays = 0;
    if (isPaid) {
      const previous = await LeaveQuota.findOne({
        where: {
          lq_pr_id: prId,
          lq_leave_type_id: lt.lt_leave_type_id,
          lq_leave_year: year - 1,
        },
        attributes: [
          "lq_allocated_days", "lq_carry_forward_days",
          "lq_used_days", "lq_pending_days",
        ],
        transaction: t,
      });
      if (previous) {
        const available = Math.max(
          Number(previous.lq_allocated_days || 0) +
            Number(previous.lq_carry_forward_days || 0) -
            Number(previous.lq_used_days || 0) -
            Number(previous.lq_pending_days || 0),
          0
        );
        carryForwardDays = Math.floor(available * CARRY_FORWARD_PERCENTAGE);
      }
    }

    const [record, created] = await LeaveQuota.findOrCreate({
      where: {
        lq_pr_id: prId,
        lq_leave_type_id: lt.lt_leave_type_id,
        lq_leave_year: year,
      },
      defaults: {
        lq_emptype: employee.employee_type_id,
        lq_allocated_days: allocatedDays,
        lq_carry_forward_days: carryForwardDays,
        lq_used_days: 0,
        lq_pending_days: 0,
        lq_created_by: createdBy || prId,
      },
      transaction: t,
    });
  }

  return {
    pr_id: prId,
    employee_type_id: employee.employee_type_id,
    year,
    leave_types: leaveTypes.length,
  };
}

/* ============================================================
   GET MY LEAVE SUMMARY  (matches raw SQL response 1:1)
   Returns: PL-only totals + request counts + LWP
============================================================ */
exports.getMyLeaveSummary = async (req, res) => {
  try {
    const loggedInPrId = getLoggedInPrId(req);
    const prId = req.query.pr_id ? Number(req.query.pr_id) : loggedInPrId;
    if (!Number.isInteger(prId) || prId <= 0) {
      return errorResponse(res, "Valid pr_id is required.", 400);
    }
    const year = validateYear(req.query.year) || new Date().getFullYear();

    const result = await withTransaction(async (t) => {
      // ---- PL QUOTA ----
      const plQuotaRows = await LeaveQuota.findAll({
        where: { lq_pr_id: prId, lq_leave_year: year },
        include: [
          {
            model: LeaveTypes,
            as: "leaveType",
            required: true,
            where: { lt_leave_type_code: "PL" },
            attributes: [],
          },
        ],
        attributes: [
          [sequelize.fn("SUM", sequelize.col("lq_allocated_days")), "total_allocated_days"],
          [sequelize.fn("SUM", sequelize.col("lq_carry_forward_days")), "total_carry_forward_days"],
          [sequelize.fn("SUM", sequelize.col("lq_pending_days")), "total_pending_days"],
          [sequelize.fn("SUM", sequelize.col("lq_used_days")), "total_used_days"],
        ],
        raw: true,
        transaction: t,
      });

      const q = plQuotaRows[0] || {};
      const total_allocated_days = Number(q.total_allocated_days || 0);
      const total_carry_forward_days = Number(q.total_carry_forward_days || 0);
      const total_pending_days = Number(q.total_pending_days || 0);
      const total_used_days = Number(q.total_used_days || 0);
      const remaining_days = Math.max(
        total_allocated_days + total_carry_forward_days - total_used_days - total_pending_days,
        0
      );

      // ---- REQUEST COUNTS ----
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const requests = await LeaveRequests.findAll({
        where: {
          lr_pr_id: prId,
          lr_from_date: { [Op.gte]: yearStart, [Op.lte]: yearEnd },
        },
        include: [
          {
            model: LeaveStatus,
            as: "status",
            attributes: ["ls_leave_status_name"],
          },
        ],
        attributes: ["lr_leave_request_id"],
        transaction: t,
      });

      let total_requests = requests.length;
      let pending_requests = 0;
      let approved_requests = 0;
      let rejected_requests = 0;
      let cancelled_requests = 0;

      for (const r of requests) {
        const s = String(r.status?.ls_leave_status_name || "").toLowerCase();
        if (s === "pending") pending_requests++;
        else if (s === "approved") approved_requests++;
        else if (s === "rejected") rejected_requests++;
        else if (s === "cancelled") cancelled_requests++;
      }

      // ---- LWP ----
      const lwpRows = await LeaveQuota.findAll({
        where: { lq_pr_id: prId, lq_leave_year: year },
        include: [
          {
            model: LeaveTypes,
            as: "leaveType",
            required: true,
            where: { lt_leave_type_code: "LWP" },
            attributes: [],
          },
        ],
        attributes: [
          [sequelize.fn("SUM", sequelize.col("lq_used_days")), "total_unpaid_leave_days"],
        ],
        raw: true,
        transaction: t,
      });

      const total_unpaid_leave_days = Number(lwpRows[0]?.total_unpaid_leave_days || 0);

      return {
        pr_id: prId,
        leave_year: year,
        total_allocated_days,
        total_carry_forward_days,
        total_pending_days,
        total_used_days,
        remaining_days,
        total_requests,
        pending_requests,
        approved_requests,
        rejected_requests,
        cancelled_requests,
        total_unpaid_leave_days,
      };
    });

    return successResponse(res, 200, result, "Leave summary fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET ALL EMPLOYEES LEAVE SUMMARY (admin)
   Response shape identical to raw SQL
============================================================ */
exports.getAllEmployeesLeaveSummary = async (req, res) => {
  try {
    const year = validateYear(req.query.year) || new Date().getFullYear();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    const total = await Organizations.count({
      where: { or_is_active: true },
    });
    const totalPages = Math.ceil(total / limit);

    const employees = await Organizations.findAll({
      where: { or_is_active: true },
      include: [
        {
          model: Personal,
          as: "personal",
          attributes: [
            "pr_email", "pr_first_name", "pr_last_name", "pr_dob", "pr_contact",
            "pr_gender_id", "pr_blood_group_id", "pr_marital_status_id",
            "pr_nationality_id", "pr_profile_image", "pr_is_active",
          ],
        },
      ],
      order: [["or_id", "DESC"]],
      limit,
      offset,
    });

    const prIds = employees.map((e) => e.pr_id).filter(Boolean);

    // Quota summary (PL only)
    const quotaRows = prIds.length
      ? await LeaveQuota.findAll({
          where: { lq_pr_id: { [Op.in]: prIds }, lq_leave_year: year },
          include: [
            {
              model: LeaveTypes,
              as: "leaveType",
              required: true,
              where: { lt_leave_type_code: "PL" },
              attributes: [],
            },
          ],
          attributes: [
            "lq_pr_id",
            [sequelize.fn("SUM", sequelize.col("lq_allocated_days")), "total_allocated_days"],
            [sequelize.fn("SUM", sequelize.col("lq_carry_forward_days")), "total_carry_forward_days"],
            [sequelize.fn("SUM", sequelize.col("lq_pending_days")), "total_pending_days"],
            [sequelize.fn("SUM", sequelize.col("lq_used_days")), "total_used_days"],
          ],
          group: ["lq_pr_id"],
          raw: true,
        })
      : [];

    const quotaMap = {};
    for (const r of quotaRows) quotaMap[r.lq_pr_id] = r;

    // Request summary (all types)
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const requests = prIds.length
      ? await LeaveRequests.findAll({
          where: {
            lr_pr_id: { [Op.in]: prIds },
            lr_from_date: { [Op.gte]: yearStart, [Op.lte]: yearEnd },
          },
          include: [
            { model: LeaveStatus, as: "status", attributes: ["ls_leave_status_name"] },
          ],
          attributes: ["lr_pr_id", "lr_leave_request_id"],
        })
      : [];

    const reqMap = {};
    for (const r of requests) {
      const s = String(r.status?.ls_leave_status_name || "").toLowerCase();
      if (!reqMap[r.lr_pr_id]) {
        reqMap[r.lr_pr_id] = {
          total_requests: 0, pending_requests: 0, approved_requests: 0,
          rejected_requests: 0, cancelled_requests: 0,
        };
      }
      reqMap[r.lr_pr_id].total_requests++;
      if (s === "pending") reqMap[r.lr_pr_id].pending_requests++;
      else if (s === "approved") reqMap[r.lr_pr_id].approved_requests++;
      else if (s === "rejected") reqMap[r.lr_pr_id].rejected_requests++;
      else if (s === "cancelled") reqMap[r.lr_pr_id].cancelled_requests++;
    }

    // LWP summary
    const lwpRows = prIds.length
      ? await LeaveQuota.findAll({
          where: { lq_pr_id: { [Op.in]: prIds }, lq_leave_year: year },
          include: [
            {
              model: LeaveTypes,
              as: "leaveType",
              required: true,
              where: { lt_leave_type_code: "LWP" },
              attributes: [],
            },
          ],
          attributes: [
            "lq_pr_id",
            [sequelize.fn("SUM", sequelize.col("lq_used_days")), "total_unpaid_leave_days"],
          ],
          group: ["lq_pr_id"],
          raw: true,
        })
      : [];

    const lwpMap = {};
    for (const r of lwpRows) lwpMap[r.lq_pr_id] = r;

    const rows = employees.map((e) => {
      const raw = e.toJSON();
      const p = raw.personal || {};
      const qq = quotaMap[e.pr_id] || {};
      const rr = reqMap[e.pr_id] || {
        total_requests: 0, pending_requests: 0, approved_requests: 0,
        rejected_requests: 0, cancelled_requests: 0,
      };
      const uu = lwpMap[e.pr_id] || {};

      const total_allocated_days = Number(qq.total_allocated_days || 0);
      const total_carry_forward_days = Number(qq.total_carry_forward_days || 0);
      const total_pending_days = Number(qq.total_pending_days || 0);
      const total_used_days = Number(qq.total_used_days || 0);
      const remaining_days = Math.max(
        total_allocated_days + total_carry_forward_days - total_used_days - total_pending_days,
        0
      );

      return {
        or_id: raw.or_id,
        pr_id: raw.pr_id,
        or_emp_id: raw.or_emp_id,
        or_official_email: raw.or_official_email,
        or_official_contact: raw.or_official_contact,
        or_is_active: raw.or_is_active,
        or_employee_type_id: raw.or_employee_type_id,
        or_reporting_location_id: raw.or_reporting_location_id,
        or_organization_email: raw.or_organization_email,
        or_reporting_to_id: raw.or_reporting_to_id,
        or_department_id: raw.or_department_id,
        or_designation_id: raw.or_designation_id,
        or_joining_date: raw.or_joining_date,
        or_leaving_date: raw.or_leaving_date,
        or_created_at: raw.or_created_at,
        or_updated_at: raw.or_updated_at,
        or_created_by: raw.or_created_by,
        or_updated_by: raw.or_updated_by,
        pr_email: p.pr_email,
        pr_first_name: p.pr_first_name,
        pr_last_name: p.pr_last_name,
        pr_dob: p.pr_dob,
        pr_contact: p.pr_contact,
        pr_gender_id: p.pr_gender_id,
        pr_blood_group_id: p.pr_blood_group_id,
        pr_marital_status_id: p.pr_marital_status_id,
        pr_nationality_id: p.pr_nationality_id,
        pr_profile_image: p.pr_profile_image,
        pr_is_active: p.pr_is_active,
        total_allocated_days,
        total_carry_forward_days,
        total_pending_days,
        total_used_days,
        remaining_days,
        total_requests: rr.total_requests,
        pending_requests: rr.pending_requests,
        approved_requests: rr.approved_requests,
        rejected_requests: rr.rejected_requests,
        cancelled_requests: rr.cancelled_requests,
        total_unpaid_leave_days: Number(uu.total_unpaid_leave_days || 0),
      };
    });

    return successResponse(
      res,
      200,
      {
        year,
        employees: rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_previous_page: page > 1,
        },
      },
      "Employees leave summary fetched successfully."
    );
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET MY LEAVE TYPES
============================================================ */
exports.getMyLeaveTypes = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const year = validateYear(req.query.year) || new Date().getFullYear();

    const result = await withTransaction(async (t) => {
      const employee = await getEmployee(prId, t);
      await ensureEmployeeQuota(prId, year, prId, t);

      const rows = await LeaveQuota.findAll({
        where: { lq_pr_id: prId, lq_leave_year: year },
        include: [
          {
            model: LeaveTypes,
            as: "leaveType",
            required: true,
            where: { lt_emptype: employee.employee_type_id, lt_is_active: true },
          },
        ],
        attributes: [
          "lq_allocated_days", "lq_carry_forward_days",
          "lq_used_days", "lq_pending_days",
          [
            literal(
              `("leave_quota"."lq_allocated_days" + "leave_quota"."lq_carry_forward_days" - "leave_quota"."lq_used_days" - "leave_quota"."lq_pending_days")`
            ),
            "available_days",
          ],
        ],
        order: [[{ model: LeaveTypes, as: "leaveType" }, "lt_leave_type_name", "ASC"]],
        transaction: t,
      });

      return {
        year,
        employee_type_id: employee.employee_type_id,
        leave_types: rows.map((r) => ({
          lt_leave_type_id: r.leaveType.lt_leave_type_id,
          lt_leave_type_code: r.leaveType.lt_leave_type_code,
          lt_leave_type_name: r.leaveType.lt_leave_type_name,
          lt_total_days_per_year: r.leaveType.lt_total_days_per_year,
          lt_is_paid: r.leaveType.lt_is_paid,
          lq_allocated_days: r.lq_allocated_days,
          lq_carry_forward_days: r.lq_carry_forward_days,
          lq_used_days: r.lq_used_days,
          lq_pending_days: r.lq_pending_days,
          available_days: r.get("available_days"),
        })),
      };
    });

    return successResponse(res, 200, result, "Leave types fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET MY LEAVE BALANCE
============================================================ */
exports.getMyLeaveBalance = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const year = validateYear(req.query.year) || new Date().getFullYear();

    const result = await withTransaction(async (t) => {
      const employee = await getEmployee(prId, t);
      await ensureEmployeeQuota(prId, year, prId, t);

      const rows = await LeaveQuota.findAll({
        where: { lq_pr_id: prId, lq_leave_year: year },
        include: [
          {
            model: LeaveTypes,
            as: "leaveType",
            attributes: ["lt_leave_type_code", "lt_leave_type_name", "lt_is_paid"],
          },
        ],
        attributes: [
          "lq_id", "lq_pr_id", "lq_leave_type_id", "lq_emptype", "lq_leave_year",
          "lq_allocated_days", "lq_carry_forward_days", "lq_used_days", "lq_pending_days",
          [
            literal(
              `("leave_quota"."lq_allocated_days" + "leave_quota"."lq_carry_forward_days" - "leave_quota"."lq_used_days" - "leave_quota"."lq_pending_days")`
            ),
            "lq_available_days",
          ],
        ],
        order: [[{ model: LeaveTypes, as: "leaveType" }, "lt_leave_type_name", "ASC"]],
        transaction: t,
      });

      return {
        year,
        employee_type_id: employee.employee_type_id,
        balance: rows.map((r) => ({
          lq_id: r.lq_id,
          lq_pr_id: r.lq_pr_id,
          lq_leave_type_id: r.lq_leave_type_id,
          lq_emptype: r.lq_emptype,
          lq_leave_year: r.lq_leave_year,
          lt_leave_type_code: r.leaveType?.lt_leave_type_code,
          lt_leave_type_name: r.leaveType?.lt_leave_type_name,
          lt_is_paid: r.leaveType?.lt_is_paid,
          lq_allocated_days: r.lq_allocated_days,
          lq_carry_forward_days: r.lq_carry_forward_days,
          lq_used_days: r.lq_used_days,
          lq_pending_days: r.lq_pending_days,
          lq_available_days: r.get("lq_available_days"),
        })),
      };
    });

    return successResponse(res, 200, result, "Leave balance fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   APPLY LEAVE (response shape identical to raw SQL)
============================================================ */
exports.applyLeave = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { leave_type_id, from_date, to_date, reason } = req.body;

    const leaveTypeId = Number(leave_type_id);
    if (!Number.isInteger(leaveTypeId) || leaveTypeId <= 0) {
      return errorResponse(res, "Valid leave_type_id is required.", 400);
    }
    if (!isValidDate(from_date)) {
      return errorResponse(res, "Valid from_date is required in YYYY-MM-DD format.", 400);
    }
    if (!isValidDate(to_date)) {
      return errorResponse(res, "Valid to_date is required in YYYY-MM-DD format.", 400);
    }
    if (from_date > to_date) {
      return errorResponse(res, "from_date cannot be greater than to_date.", 400);
    }
    if (from_date.substring(0, 4) !== to_date.substring(0, 4)) {
      return errorResponse(
        res,
        "Leave request cannot span multiple years. Please submit separate requests.",
        400
      );
    }

    const year = Number(from_date.substring(0, 4));

    const result = await withTransaction(async (t) => {
      const employee = await getEmployee(prId, t);

      const empOrg = await Organizations.findOne({
        where: { pr_id: prId, or_is_active: true },
        include: [
          {
            model: Personal,
            as: "personal",
            attributes: ["pr_first_name", "pr_last_name", "pr_email"],
          },
        ],
        attributes: [
          "or_id", "pr_id", "or_emp_id", "or_organization_name",
          "or_official_email", "or_reporting_to_id",
          "or_department_id", "or_designation_id",
        ],
        transaction: t,
      });

      if (!empOrg) {
        const error = new Error("Employee organization information not found.");
        error.statusCode = 400;
        throw error;
      }

      const reportingTo = empOrg.or_reporting_to_id;
      if (!reportingTo) {
        const error = new Error("Reporting manager is not assigned to this employee.");
        error.statusCode = 400;
        throw error;
      }

      const managerOrg = await Organizations.findOne({
        where: { pr_id: reportingTo, or_is_active: true },
        include: [
          {
            model: Personal,
            as: "personal",
            attributes: ["pr_first_name", "pr_last_name", "pr_email"],
          },
        ],
        attributes: ["or_id", "pr_id", "or_emp_id", "or_official_email"],
        transaction: t,
      });

      if (!managerOrg) {
        const error = new Error("Reporting manager details not found.");
        error.statusCode = 400;
        throw error;
      }
      if (!managerOrg.or_official_email) {
        const error = new Error("Reporting manager email is not configured.");
        error.statusCode = 400;
        throw error;
      }

      const employeeName = [empOrg.personal?.pr_first_name, empOrg.personal?.pr_last_name]
        .filter(Boolean).join(" ").trim();
      const managerName = [managerOrg.personal?.pr_first_name, managerOrg.personal?.pr_last_name]
        .filter(Boolean).join(" ").trim();
      const employeeEmail = empOrg.or_official_email || empOrg.personal?.pr_email || null;

      const leaveType = await getApplicableLeaveType(prId, leaveTypeId, from_date, to_date, t);
      const leaveTypeCode = String(leaveType.lt_leave_type_code || "").trim().toUpperCase();
      const totalDays = calculateTotalDays(from_date, to_date, leaveTypeCode);

      if (totalDays <= 0) {
        const error = new Error(
          leaveTypeCode === "PL"
            ? "Invalid leave duration. PL leave does not count Sundays."
            : "Invalid leave duration."
        );
        error.statusCode = 400;
        throw error;
      }

      const isPaid = Boolean(leaveType.lt_is_paid);

      await ensureEmployeeQuota(prId, year, prId, t);

      const pendingStatusId = await getLeaveStatusId("Pending", t);

      const overlap = await LeaveRequests.findOne({
        where: {
          lr_pr_id: prId,
          lr_leave_type_id: leaveTypeId,
          lr_from_date: { [Op.lte]: to_date },
          lr_to_date: { [Op.gte]: from_date },
          [Op.and]: literal(
            `EXISTS (SELECT 1 FROM leave_status ls WHERE ls.ls_leave_status_id = "leave_requests"."lr_status_id" AND LOWER(ls.ls_leave_status_name) IN ('pending','approved'))`
          ),
        },
        attributes: ["lr_leave_request_id", "lr_from_date", "lr_to_date", "lr_total_days"],
        transaction: t,
      });

      if (overlap) {
        const error = new Error(
          `Leave already exists from ${formatDDMMYYYY(
            String(overlap.lr_from_date)
          )} to ${formatDDMMYYYY(String(overlap.lr_to_date))}.`
        );
        error.statusCode = 409;
        throw error;
      }

      const quota = await LeaveQuota.findOne({
        where: { lq_pr_id: prId, lq_leave_type_id: leaveTypeId, lq_leave_year: year },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!quota) {
        const error = new Error("Leave quota could not be created.");
        error.statusCode = 400;
        throw error;
      }

      const availableDays =
        Number(quota.lq_allocated_days || 0) +
        Number(quota.lq_carry_forward_days || 0) -
        Number(quota.lq_used_days || 0) -
        Number(quota.lq_pending_days || 0);

      if (leaveTypeCode === "PL") {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        let earnedPLDays = 12;
        if (year === currentYear) earnedPLDays = Math.min(currentMonth, 12);
        if (year < currentYear) earnedPLDays = 12;
        if (year > currentYear) earnedPLDays = 0;

        const utilizedPLDays =
          Number(quota.lq_used_days || 0) + Number(quota.lq_pending_days || 0);
        const remainingEarnedPLDays = Math.max(0, earnedPLDays - utilizedPLDays);

        if (totalDays > remainingEarnedPLDays) {
          const error = new Error(
            `PL leave limit exceeded. Available: ${remainingEarnedPLDays} day(s), Requested: ${totalDays} day(s).`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      if (isPaid && availableDays < totalDays) {
        const error = new Error(
          `Insufficient leave balance.Available: ${availableDays}, Requested: ${totalDays}. Use Unpaid Quota.`
        );
        error.statusCode = 400;
        throw error;
      }

      // Generate request ID
      const currentDate = new Date();
      const day = String(currentDate.getDate()).padStart(2, "0");
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const currentYear = currentDate.getFullYear();

      const startOfDay = new Date(
        currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0
      );
      const startOfNextDay = new Date(startOfDay);
      startOfNextDay.setDate(startOfNextDay.getDate() + 1);

      const todaysCount = await LeaveRequests.count({
        where: { lr_created_at: { [Op.gte]: startOfDay, [Op.lt]: startOfNextDay } },
        transaction: t,
      });

      const nextRequestId = Number(todaysCount) + 1;
      const requestId = `IHR-${day}${month}${currentYear}-${String(nextRequestId).padStart(3, "0")}`;

      const created = await LeaveRequests.create(
        {
          lr_pr_id: prId,
          lr_leave_type_id: leaveTypeId,
          lr_from_date: from_date,
          lr_to_date: to_date,
          lr_total_days: totalDays,
          lr_reason: reason || null,
          lr_status_id: pendingStatusId,
          lr_reporting_to: reportingTo,
          lr_ismailfromrequester: false,
          lr_ismailfromapprover: false,
          lr_applied_at: new Date(),
          lr_created_at: new Date(),
          lr_created_by: prId,
          request_id: requestId,
        },
        { transaction: t }
      );

      quota.lq_pending_days = Number(quota.lq_pending_days || 0) + totalDays;
      quota.lq_updated_at = new Date();
      quota.lq_updated_by = prId;
      await quota.save({ transaction: t });

      return {
        request: created.toJSON(),
        employee: {
          pr_id: empOrg.pr_id,
          emp_id: empOrg.or_emp_id,
          name: employeeName || empOrg.or_emp_id || "Employee",
          email: employeeEmail,
        },
        reporting_manager: {
          pr_id: managerOrg.pr_id,
          emp_id: managerOrg.or_emp_id,
          name: managerName || managerOrg.or_emp_id || "Manager",
          email: managerOrg.or_official_email || managerOrg.personal?.pr_email || null,
        },
        employee_type_id: employee.employee_type_id,
        reporting_to: reportingTo,
        leave_type: leaveType.toJSON(),
        total_days: totalDays,
        is_paid: isPaid,
        available_before: isPaid ? availableDays : null,
        available_after: isPaid ? availableDays - totalDays : null,
      };
    });

    // ---- Emails (identical logic to raw) ----
    try {
      const request = result.request;
      const employee = result.employee;
      const manager = result.reporting_manager;

      if (!manager.email) throw new Error("Reporting manager email is not configured.");

      const appliedAt = formatDateTime12(request.lr_applied_at);

      const emailData = {
        manager_name: manager.name || "Manager",
        manager_id: manager.emp_id || manager.pr_id,
        employee_name: employee.name || "Employee",
        employee_id: employee.emp_id || employee.pr_id,
        employee_email: employee.email || "-",
        leave_request_id: request.request_id,
        leave_type: result.leave_type.lt_leave_type_name,
        leave_type_code: result.leave_type.lt_leave_type_code || "-",
        from_date: formatDateTime(request.lr_from_date),
        to_date: formatDateTime(request.lr_to_date),
        total_days: result.total_days,
        reason: request.lr_reason || "No reason provided",
        status: "Pending",
        applied_at: appliedAt,
      };

      await sendEmail(
        manager.email,
        `Leave Request - ${request.request_id || employee.emp_id}`,
        "leave_request",
        emailData
      );

      if (employee.email) {
        await sendEmail(
          employee.email,
          `Leave Request Submitted - ${request.request_id || employee.emp_id}`,
          "leave_request_employee",
          emailData
        );
      }

      await LeaveRequests.update(
        { lr_ismailfromrequester: true },
        { where: { lr_leave_request_id: request.lr_leave_request_id } }
      );

      console.log(
        `[LEAVE EMAIL SENT] Request=${request.request_id} Manager=${manager.email} Employee=${employee.email || "N/A"}`
      );
    } catch (emailError) {
      console.error(
        `[LEAVE EMAIL ERROR] Request=${result.request.request_id}`,
        emailError
      );
    }

    return successResponse(res, 200, result, "Leave applied successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET MY LEAVE REQUESTS  (paginated)
============================================================ */
exports.getMyLeaveRequests = async (req, res) => {
    try {
        const prId = getLoggedInPrId(req);

        let page = parseInt(req.query.page, 10);
        let limit = parseInt(req.query.limit, 10);

        if (!Number.isInteger(page) || page < 1) page = 1;
        if (!Number.isInteger(limit) || limit < 1) limit = 10;
        if (limit > 1000) limit = 1000;

        const offset = (page - 1) * limit;

        const year = req.query.year ? validateYear(req.query.year) : null;
        const status = req.query.status || null;

        const where = { lr_pr_id: prId };

        if (year) {
            where[Op.and] = [
                literal(
                    `EXTRACT(YEAR FROM "leave_requests"."lr_from_date") = ${Number(year)}`
                ),
            ];
        }

        const include = [
            {
                model: LeaveTypes,
                as: "leaveType",
                required: true,
                attributes: [
                    "lt_leave_type_code",
                    "lt_leave_type_name",
                    "lt_total_days_per_year",
                    "lt_is_paid",
                ],
            },
            {
                model: LeaveStatus,
                as: "status",
                required: true,
                attributes: [
                    "ls_leave_status_id",
                    "ls_leave_status_name",
                ],
            },
        ];

        if (status) {
            include[1].where = literal(
                `LOWER("status"."ls_leave_status_name") = LOWER(${db.sequelize.escape(status)})`
            );
        }

        const { rows, count: total } = await LeaveRequests.findAndCountAll({
            where,
            include,
            order: [["lr_applied_at", "DESC"]],
            limit,
            offset,
            distinct: true,
        });

        const data = rows.map((r) => {
            const j = r.toJSON();
            const lt = j.leaveType || {};
            const ls = j.status || {};

            return {
                lr_leave_request_id: j.lr_leave_request_id,
                request_id: j.request_id,
                lr_pr_id: j.lr_pr_id,
                lr_leave_type_id: j.lr_leave_type_id,
                lt_leave_type_code: lt.lt_leave_type_code ?? null,
                lt_leave_type_name: lt.lt_leave_type_name ?? null,
                lt_total_days_per_year: lt.lt_total_days_per_year ?? null,
                lt_is_paid: lt.lt_is_paid ?? null,
                lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
                lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
                lr_total_days: j.lr_total_days,
                lr_reason: j.lr_reason,
                lr_status_id: j.lr_status_id,
                request_status: ls.ls_leave_status_name ?? null,
                lr_ismailfromrequester: j.lr_ismailfromrequester,
                lr_applied_at: j.lr_applied_at,
                lr_approver_by: j.lr_approver_by,
                lr_approver_at: j.lr_approver_at,
                lr_approver_remark: j.lr_approver_remark,
                lr_ismailfromapprover: j.lr_ismailfromapprover,
                lr_cancelled_at: j.lr_cancelled_at,
                lr_cancellation_reason: j.lr_cancellation_reason,
                lr_created_at: j.lr_created_at,
                lr_created_by: j.lr_created_by,
                lr_updated_at: j.lr_updated_at,
                lr_updated_by: j.lr_updated_by,
            };
        });

        return res.status(200).json({
            success: true,
            message: data,
            data: total,
            pagination: limit,
        });
    } catch (error) {
        console.error("getMyLeaveRequests Error:", error);
        return handleDbError(res, error);
    }
};

/* ============================================================
   GET LEAVE REQUEST BY ID  (flat shape — identical to raw)
============================================================ */
exports.getLeaveRequestById = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return errorResponse(res, "Valid leave request ID is required.", 400);
    }

    const lr = await LeaveRequests.findOne({
      where: { lr_leave_request_id: requestId },
      include: [
        { model: LeaveTypes, as: "leaveType" },
        { model: LeaveStatus, as: "status" },
      ],
    });

    if (!lr) return errorResponse(res, "Leave request not found.", 404);

    const [employeePersonal, reportingPersonal, employeeOrg, reportingOrg] = await Promise.all([
      Personal.findOne({ where: { pr_id: lr.lr_pr_id } }),
      Personal.findOne({ where: { pr_id: lr.lr_reporting_to } }),
      Organizations.findOne({ where: { pr_id: lr.lr_pr_id } }),
      Organizations.findOne({ where: { pr_id: lr.lr_reporting_to } }),
    ]);

    const j = lr.toJSON();
    const payload = {
      lr_leave_request_id: j.lr_leave_request_id,
      request_id: j.request_id,
      pr_first_name: employeePersonal?.pr_first_name ?? null,
      pr_last_name: employeePersonal?.pr_last_name ?? null,
      emp_email: employeeOrg?.or_official_email ?? null,
      or_emp_id: employeeOrg?.or_emp_id ?? null,
      reportingemail: reportingOrg?.or_official_email ?? null,
      reportingname: reportingPersonal?.pr_first_name ?? null,
      reportingLastname: reportingPersonal?.pr_last_name ?? null,
      lr_pr_id: j.lr_pr_id,
      lr_leave_type_id: j.lr_leave_type_id,
      lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
      lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
      lr_total_days: j.lr_total_days,
      lr_reason: j.lr_reason,
      lr_status_id: j.lr_status_id,
      ls_leave_status_name: lr.status?.ls_leave_status_name ?? null,
      lr_ismailfromrequester: j.lr_ismailfromrequester,
      lr_ismailfromapprover: j.lr_ismailfromapprover,
      lr_applied_at: j.lr_applied_at,
      lr_approver_by: j.lr_approver_by,
      lr_approver_at: j.lr_approver_at,
      lr_approver_remark: j.lr_approver_remark,
      lr_cancelled_at: j.lr_cancelled_at,
      lr_cancellation_reason: j.lr_cancellation_reason,
      lr_created_at: j.lr_created_at,
      lr_updated_at: j.lr_updated_at,
      lt_leave_type_code: lr.leaveType?.lt_leave_type_code ?? null,
      lt_leave_type_name: lr.leaveType?.lt_leave_type_name ?? null,
      lt_is_paid: lr.leaveType?.lt_is_paid ?? null,
    };

    return successResponse(res, 200, payload, "Leave request fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   CANCEL LEAVE  (response + emails identical to raw)
============================================================ */
exports.cancelLeave = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const requestId = Number(req.params.id);
    const reason = req.body?.reason || null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return errorResponse(res, "Valid leave request ID is required.", 400);
    }
    if (!prId) {
      return errorResponse(res, "Unable to identify logged-in employee.", 401);
    }

    const result = await withTransaction(async (t) => {
      const cancelledStatusId = await getLeaveStatusId("Cancelled", t);

      const lr = await LeaveRequests.findOne({
        where: { lr_leave_request_id: requestId, lr_pr_id: prId },
        include: [
          { model: LeaveStatus, as: "status" },
          { model: LeaveTypes, as: "leaveType" },
        ],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!lr) {
        const error = new Error("Leave request not found.");
        error.statusCode = 404;
        throw error;
      }

      const currentStatus = String(lr.status?.ls_leave_status_name || "").toLowerCase();
      if (currentStatus !== "pending" && currentStatus !== "approved") {
        const error = new Error(
          `Leave cannot be cancelled because current status is ${lr.status?.ls_leave_status_name}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const today = new Date().toISOString().slice(0, 10);
      const fromDate = String(lr.lr_from_date).slice(0, 10);
      if (fromDate <= today) {
        const error = new Error(
          "Leave cannot be cancelled on or after the leave start date."
        );
        error.statusCode = 400;
        throw error;
      }

      const requestYear = Number(fromDate.slice(0, 4));

      const quota = await LeaveQuota.findOne({
        where: {
          lq_pr_id: prId,
          lq_leave_type_id: lr.lr_leave_type_id,
          lq_leave_year: requestYear,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!quota) {
        const error = new Error("Leave quota not found.");
        error.statusCode = 400;
        throw error;
      }

      const requestedDays = Number(lr.lr_total_days || 0);
      if (requestedDays <= 0) {
        const error = new Error("Invalid leave request days.");
        error.statusCode = 400;
        throw error;
      }

      const pendingBefore = Number(quota.lq_pending_days || 0);
      const usedBefore = Number(quota.lq_used_days || 0);
      let pendingAfter = pendingBefore;
      let usedAfter = usedBefore;

      if (currentStatus === "pending") {
        pendingAfter = Math.max(pendingBefore - requestedDays, 0);
        quota.lq_pending_days = pendingAfter;
      }
      if (currentStatus === "approved") {
        usedAfter = Math.max(usedBefore - requestedDays, 0);
        quota.lq_used_days = usedAfter;
      }

      quota.lq_updated_at = new Date();
      quota.lq_updated_by = prId;
      await quota.save({ transaction: t });

      lr.lr_status_id = cancelledStatusId;
      lr.lr_cancelled_at = new Date();
      lr.lr_cancellation_reason = reason;
      lr.lr_updated_at = new Date();
      lr.lr_updated_by = prId;
      await lr.save({ transaction: t });

      const employeeOrg = await Organizations.findOne({ where: { pr_id: prId } });
      const employeePersonal = await Personal.findOne({ where: { pr_id: prId } });
      const managerPrId = employeeOrg?.or_reporting_to_id;
      const managerOrg = managerPrId
        ? await Organizations.findOne({ where: { pr_id: managerPrId } })
        : null;
      const managerPersonal = managerPrId
        ? await Personal.findOne({ where: { pr_id: managerPrId } })
        : null;

      const employeeName = [
        employeePersonal?.pr_first_name,
        employeePersonal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();
      const managerName = [
        managerPersonal?.pr_first_name,
        managerPersonal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();

      const employeeEmail =
        employeeOrg?.or_official_email ||
        employeePersonal?.pr_email ||
        null;
      const managerEmail =
        managerOrg?.or_official_email ||
        managerPersonal?.pr_email ||
        null;

      return {
        request: lr.toJSON(),
        employee: {
          name: employeeName || employeeOrg?.or_emp_id || "Employee",
          emp_id: employeeOrg?.or_emp_id,
          email: employeeEmail,
          or_official_email: employeeOrg?.or_official_email || null,
        },
        manager: {
          name: managerName || managerOrg?.or_emp_id || "Manager",
          emp_id: managerOrg?.or_emp_id,
          email: managerEmail,
          or_official_email: managerOrg?.or_official_email || null,
        },
        leave_type: {
          name: lr.leaveType?.lt_leave_type_name,
          code: lr.leaveType?.lt_leave_type_code,
        },
        original_status: lr.status?.ls_leave_status_name,
        quota: {
          pending_days_before: pendingBefore,
          pending_days_after: pendingAfter,
          used_days_before: usedBefore,
          used_days_after: usedAfter,
          released_days: requestedDays,
        },
      };
    });

    const request = result.request;

    const emailData = {
      employee_name: result.employee.name,
      employee_id: result.employee.emp_id,
      leave_request_id: request.request_id || request.lr_leave_request_id,
      leave_type: result.leave_type.name,
      leave_type_code: result.leave_type.code || "-",
      from_date: formatDateTime(request.lr_from_date),
      to_date: formatDateTime(request.lr_to_date),
      total_days: request.lr_total_days,
      original_status: result.original_status,
      reason: request.lr_reason || "No reason provided",
      cancellation_reason:
        request.lr_cancellation_reason || "No cancellation reason provided",
      status: "Cancelled",
      applied_at: formatDateTime(request.lr_applied_at),
      cancelled_at: formatDateTime(request.lr_cancelled_at),
      pending_days: result.quota.pending_days_after,
      used_days: result.quota.used_days_after,
      manager_name: result.manager.name,
      manager_id: result.manager.emp_id,
    };

    if (result.employee.or_official_email) {
      try {
        await sendEmail(
          result.employee.or_official_email,
          `Leave Request Cancelled - ${request.request_id || request.lr_leave_request_id}`,
          "leave_cancelled",
          emailData
        );
        console.log(
          `[LEAVE CANCELLATION EMPLOYEE EMAIL SENT] Request=${request.request_id || request.lr_leave_request_id} To=${result.employee.or_official_email}`
        );
      } catch (emailError) {
        console.error(
          `[LEAVE CANCELLATION EMPLOYEE EMAIL ERROR] Request=${request.request_id || request.lr_leave_request_id} To=${result.employee.or_official_email}`,
          emailError
        );
      }
    }

    if (result.manager.or_official_email) {
      try {
        await sendEmail(
          result.manager.or_official_email,
          `Leave Request Cancelled - ${request.request_id || request.lr_leave_request_id}`,
          "leave_cancelled_manager",
          emailData
        );
        console.log(
          `[LEAVE CANCELLATION MANAGER EMAIL SENT] Request=${request.request_id || request.lr_leave_request_id} To=${result.manager.or_official_email}`
        );
      } catch (emailError) {
        console.error(
          `[LEAVE CANCELLATION MANAGER EMAIL ERROR] Request=${request.request_id || request.lr_leave_request_id} To=${result.manager.or_official_email}`,
          emailError
        );
      }
    }

    return successResponse(res, 200, result, "Leave cancelled successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   PENDING APPROVALS
============================================================ */
exports.getPendingApprovals = async (req, res) => {
  try {
    const approverPrId = getLoggedInPrId(req);
    const { page, limit, offset } = getPaginationParams(req);

    const { rows, count } = await LeaveRequests.findAndCountAll({
      where: { lr_reporting_to: approverPrId },
      include: [
        {
          model: LeaveStatus,
          as: "status",
          required: true,
          where: literal(`LOWER("status"."ls_leave_status_name") = 'pending'`),
        },
        { model: LeaveTypes, as: "leaveType" },
      ],
      order: [["lr_applied_at", "ASC"]],
      limit,
      offset,
      distinct: true,
    });

    const mapped = rows.map((r) => {
      const j = r.toJSON();
      return {
        lr_leave_request_id: j.lr_leave_request_id,
        lr_pr_id: j.lr_pr_id,
        employee_id: null,
        employee_name: null,
        department_id: null,
        designation_id: null,
        lr_leave_type_id: j.lr_leave_type_id,
        lt_leave_type_code: r.leaveType?.lt_leave_type_code,
        lt_leave_type_name: r.leaveType?.lt_leave_type_name,
        lt_is_paid: r.leaveType?.lt_is_paid,
        lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
        lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
        lr_total_days: j.lr_total_days,
        lr_reason: j.lr_reason,
        lr_applied_at: j.lr_applied_at,
        ls_leave_status_id: r.status?.ls_leave_status_id,
        ls_leave_status_name: r.status?.ls_leave_status_name,
      };
    });

    return paginatedResponse(res, 200, mapped, page, limit, count);
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   APPROVE LEAVE — response shape identical to raw
============================================================ */
exports.approveLeave = async (req, res) => {
  try {
    const approverPrId = getLoggedInPrId(req);
    const requestId = Number(req.params.id);
    const remark = req.body?.remark || null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return errorResponse(res, "Valid leave request ID is required.", 400);
    }
    if (!approverPrId) {
      return errorResponse(res, "Unable to identify logged-in approver.", 401);
    }

    const result = await withTransaction(async (t) => {
      const approvedStatusId = await getLeaveStatusId("Approved", t);

      const lr = await LeaveRequests.findOne({
        where: { lr_leave_request_id: requestId },
        include: [{ model: LeaveStatus, as: "status" }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!lr) {
        const error = new Error("Leave request not found.");
        error.statusCode = 404;
        throw error;
      }

      const employeeOrg = await Organizations.findOne({
        where: { pr_id: lr.lr_pr_id },
        transaction: t,
      });
      if (!employeeOrg) {
        const error = new Error("Employee organization not found.");
        error.statusCode = 404;
        throw error;
      }

      const managerOrg = await Organizations.findOne({
        where: { or_id: employeeOrg.or_reporting_to_id },
        transaction: t,
      });
      if (!managerOrg || Number(managerOrg.pr_id) !== Number(approverPrId)) {
        const error = new Error("You are not authorized to approve this leave request.");
        error.statusCode = 403;
        throw error;
      }

      if (String(lr.status?.ls_leave_status_name || "").toLowerCase() !== "pending") {
        const error = new Error(
          `Leave cannot be approved because current status is ${lr.status?.ls_leave_status_name}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const requestYear = Number(String(lr.lr_from_date).slice(0, 4));

      const quota = await LeaveQuota.findOne({
        where: {
          lq_pr_id: lr.lr_pr_id,
          lq_leave_type_id: lr.lr_leave_type_id,
          lq_leave_year: requestYear,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!quota) {
        const error = new Error("Leave quota not found.");
        error.statusCode = 400;
        throw error;
      }

      const pendingDays = Number(quota.lq_pending_days || 0);
      const requestedDays = Number(lr.lr_total_days || 0);

      if (requestedDays <= 0) {
        const error = new Error("Invalid leave request days.");
        error.statusCode = 400;
        throw error;
      }
      if (pendingDays < requestedDays) {
        const error = new Error(
          "Invalid quota state. Pending leave balance is insufficient."
        );
        error.statusCode = 409;
        throw error;
      }

      const usedDaysBefore = Number(quota.lq_used_days || 0);
      const pendingDaysAfter = pendingDays - requestedDays;
      const usedDaysAfter = usedDaysBefore + requestedDays;

      quota.lq_pending_days = pendingDaysAfter;
      quota.lq_used_days = usedDaysAfter;
      quota.lq_updated_at = new Date();
      quota.lq_updated_by = approverPrId;
      await quota.save({ transaction: t });

      // Generate request_id if missing
      const requestNumber = Number(lr.lr_leave_request_id);
      const requestDate = lr.lr_applied_at ? new Date(lr.lr_applied_at) : new Date();
      const day = String(requestDate.getDate()).padStart(2, "0");
      const month = String(requestDate.getMonth() + 1).padStart(2, "0");
      const year = requestDate.getFullYear();
      const generatedRequestId = `${day}${month}${year}${String(requestNumber).padStart(2, "0")}`;

      lr.request_id = lr.request_id || generatedRequestId;
      lr.lr_status_id = approvedStatusId;
      lr.lr_approver_by = approverPrId;
      lr.lr_approver_at = new Date();
      lr.lr_approver_remark = remark;
      lr.lr_ismailfromapprover = false;
      lr.lr_updated_at = new Date();
      lr.lr_updated_by = approverPrId;
      await lr.save({ transaction: t });

      const employeePersonal = await Personal.findOne({ where: { pr_id: lr.lr_pr_id } });
      const managerPersonal = await Personal.findOne({ where: { pr_id: managerOrg.pr_id } });
      const company = employeeOrg.or_company_id
        ? await CompaniesMaster.findOne({ where: { cpt_id: employeeOrg.or_company_id } })
        : null;

      const employeeName = [employeePersonal?.pr_first_name, employeePersonal?.pr_last_name]
        .filter(Boolean).join(" ").trim();
      const managerName = [managerPersonal?.pr_first_name, managerPersonal?.pr_last_name]
        .filter(Boolean).join(" ").trim();

      return {
        request: lr.toJSON(),
        employee: {
          pr_id: employeeOrg.pr_id,
          emp_id: employeeOrg.or_emp_id,
          name: employeeName || employeeOrg.or_emp_id || "Employee",
          official_email: employeeOrg.or_official_email || null,
          email: employeeOrg.or_official_email || null,
          personal_email: employeePersonal?.pr_email || null,
          organization: company?.cpt_name || "-",
        },
        manager: {
          pr_id: managerOrg.pr_id,
          emp_id: managerOrg.or_emp_id,
          name: managerName || managerOrg.or_emp_id || "Manager",
          official_email: managerOrg.or_official_email || null,
          email: managerOrg.or_official_email || null,
          personal_email: managerPersonal?.pr_email || null,
        },
        leave_type: {
          name: lr.leaveType?.lt_leave_type_name,
          code: lr.leaveType?.lt_leave_type_code,
        },
        quota: {
          lq_id: quota.lq_id,
          allocated_days: Number(quota.lq_allocated_days || 0),
          carry_forward_days: Number(quota.lq_carry_forward_days || 0),
          pending_days_before: pendingDays,
          pending_days_after: pendingDaysAfter,
          used_days_before: usedDaysBefore,
          used_days_after: usedDaysAfter,
        },
      };
    });

    const request = result.request;
    const leaveRequestId = request.request_id || request.lr_leave_request_id;
    const formattedAppliedAt = formatDateTime12(request.lr_applied_at);
    const formattedApprovedAt = formatDateTime12(request.lr_approver_at);

    const emailData = {
      employee_name: result.employee.name,
      employee_id: result.employee.emp_id,
      employee_official_email: result.employee.official_email || "-",
      organization_name: result.employee.organization,
      manager_name: result.manager.name,
      manager_id: result.manager.emp_id,
      manager_official_email: result.manager.official_email || "-",
      leave_request_id: leaveRequestId,
      leave_type: result.leave_type.name,
      leave_type_code: result.leave_type.code || "-",
      from_date: formatDateTime(request.lr_from_date),
      to_date: formatDateTime(request.lr_to_date),
      total_days: request.lr_total_days,
      reason: request.lr_reason || "No reason provided",
      status: "Approved",
      applied_at: formattedAppliedAt,
      approved_at: formattedApprovedAt,
      approver_remark: request.lr_approver_remark || "No remark provided",
      allocated_days: result.quota.allocated_days,
      carry_forward_days: result.quota.carry_forward_days,
      pending_days_before: result.quota.pending_days_before,
      pending_days: result.quota.pending_days_after,
      used_days_before: result.quota.used_days_before,
      used_days: result.quota.used_days_after,
    };

    let employeeEmailSent = false;
    let managerEmailSent = false;

    try {
      const employeeEmail = result.employee.official_email;
      if (employeeEmail && String(employeeEmail).trim()) {
        await sendEmail(
          employeeEmail.trim(),
          `Leave Request Approved - ${leaveRequestId}`,
          "leave_approved",
          emailData
        );
        employeeEmailSent = true;
        console.log(
          `[LEAVE APPROVAL EMAIL SENT] Request=${leaveRequestId} Employee=${result.employee.name} To=${employeeEmail}`
        );
      } else {
        console.warn(
          `[LEAVE APPROVAL EMAIL SKIPPED] Employee official email not found. Request=${leaveRequestId} EmployeePR=${result.employee.pr_id} EmpId=${result.employee.emp_id}`
        );
      }

      const managerEmail = result.manager.official_email;
      if (managerEmail && String(managerEmail).trim()) {
        await sendEmail(
          managerEmail.trim(),
          `Leave Request Approved - ${leaveRequestId}`,
          "leave_approved_manager",
          emailData
        );
        managerEmailSent = true;
        console.log(
          `[LEAVE APPROVAL MANAGER EMAIL SENT] Request=${leaveRequestId} Manager=${result.manager.name} To=${managerEmail}`
        );
      } else {
        console.warn(
          `[LEAVE APPROVAL MANAGER EMAIL SKIPPED] Manager official email not found. Request=${leaveRequestId} ManagerPR=${result.manager.pr_id} ManagerEmpId=${result.manager.emp_id}`
        );
      }

      if (employeeEmailSent || managerEmailSent) {
        await LeaveRequests.update(
          {
            lr_ismailfromapprover: true,
            lr_updated_at: new Date(),
            lr_updated_by: approverPrId,
          },
          { where: { lr_leave_request_id: request.lr_leave_request_id } }
        );
      }
    } catch (emailError) {
      console.error(
        `[LEAVE APPROVAL EMAIL ERROR] Request=${leaveRequestId}`,
        emailError
      );
    }

    return successResponse(
      res,
      200,
      {
        ...result,
        email: {
          employee_email: result.employee.official_email,
          manager_email: result.manager.official_email,
          employee_email_sent: employeeEmailSent,
          manager_email_sent: managerEmailSent,
          both_sent: employeeEmailSent && managerEmailSent,
        },
      },
      "Leave approved successfully."
    );
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   EDIT LEAVE — response shape identical to raw
============================================================ */
exports.editLeave = async (req, res) => {
  try {
    const prId = Number(getLoggedInPrId(req));
    const requestId = Number(req.params.id);
    const { leave_type_id, from_date, to_date, reason } = req.body;

    if (!Number.isInteger(prId) || prId <= 0) {
      return errorResponse(res, "Valid employee ID is required.", 400);
    }
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return errorResponse(res, "Valid leave request ID is required.", 400);
    }
    const leaveTypeId = Number(leave_type_id);
    if (!Number.isInteger(leaveTypeId) || leaveTypeId <= 0) {
      return errorResponse(res, "Valid leave_type_id is required.", 400);
    }
    if (!isValidDate(from_date)) {
      return errorResponse(res, "Valid from_date is required in YYYY-MM-DD format.", 400);
    }
    if (!isValidDate(to_date)) {
      return errorResponse(res, "Valid to_date is required in YYYY-MM-DD format.", 400);
    }
    if (from_date > to_date) {
      return errorResponse(res, "From date cannot be greater than to date.", 400);
    }

    const fromYear = Number(String(from_date).substring(0, 4));
    const toYear = Number(String(to_date).substring(0, 4));
    if (!Number.isInteger(fromYear) || !Number.isInteger(toYear)) {
      return errorResponse(res, "Invalid leave year.", 400);
    }
    if (fromYear !== toYear) {
      return errorResponse(res, "Leave dates must belong to the same year.", 400);
    }
    const newYear = fromYear;

    const result = await withTransaction(async (t) => {
      const pendingStatusId = await getLeaveStatusId("Pending", t);

      const oldRequest = await LeaveRequests.findOne({
        where: { lr_leave_request_id: requestId },
        include: [
          { model: LeaveStatus, as: "status" },
          { model: LeaveTypes, as: "leaveType" },
        ],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!oldRequest) {
        const error = new Error("Leave request not found.");
        error.statusCode = 404;
        throw error;
      }

      if (Number(oldRequest.lr_pr_id) !== Number(prId)) {
        const error = new Error("You are not authorized to edit this leave request.");
        error.statusCode = 403;
        throw error;
      }

      const currentStatus = String(oldRequest.status?.ls_leave_status_name || "")
        .trim()
        .toLowerCase();
      const editableStatuses = ["pending", "approved", "rejected", "cancelled"];
      if (!editableStatuses.includes(currentStatus)) {
        const error = new Error(
          `Leave cannot be edited because current status is ${oldRequest.status?.ls_leave_status_name}.`
        );
        error.statusCode = 400;
        throw error;
      }

      if (!oldRequest.lr_from_date) {
        const error = new Error("Existing leave request has no valid from date.");
        error.statusCode = 400;
        throw error;
      }

      const oldFromDate = String(oldRequest.lr_from_date).slice(0, 10);
      const oldYear = Number(oldFromDate.substring(0, 4));
      if (!Number.isInteger(oldYear) || oldYear <= 0) {
        const error = new Error("Existing leave request has an invalid leave year.");
        error.statusCode = 400;
        throw error;
      }

      const oldLeaveTypeId = Number(oldRequest.lr_leave_type_id);
      if (!Number.isInteger(oldLeaveTypeId) || oldLeaveTypeId <= 0) {
        const error = new Error("Existing leave request has an invalid leave type.");
        error.statusCode = 400;
        throw error;
      }

      const oldDays = Number(oldRequest.lr_total_days || 0);
      if (!Number.isFinite(oldDays) || oldDays < 0) {
        const error = new Error("Existing leave request has an invalid total days value.");
        error.statusCode = 400;
        throw error;
      }

      const employeeOrg = await Organizations.findOne({
        where: { pr_id: prId, or_is_active: true },
        include: [{ model: Personal, as: "personal" }],
        transaction: t,
      });
      if (!employeeOrg) {
        const error = new Error("Employee organization information not found.");
        error.statusCode = 400;
        throw error;
      }
      if (!employeeOrg.or_official_email) {
        const error = new Error("Employee official email is not configured.");
        error.statusCode = 400;
        throw error;
      }

      const reportingToId = Number(employeeOrg.or_reporting_to_id);
      if (!Number.isInteger(reportingToId) || reportingToId <= 0) {
        const error = new Error("Reporting manager is not assigned to this employee.");
        error.statusCode = 400;
        throw error;
      }

      const managerOrg = await Organizations.findOne({
        where: { pr_id: reportingToId, or_is_active: true },
        include: [{ model: Personal, as: "personal" }],
        transaction: t,
      });
      if (!managerOrg) {
        const error = new Error("Reporting manager information not found.");
        error.statusCode = 400;
        throw error;
      }
      if (!managerOrg.or_official_email) {
        const error = new Error("Reporting manager official email is not configured.");
        error.statusCode = 400;
        throw error;
      }

      const newLeaveType = await getApplicableLeaveType(
        prId, leaveTypeId, from_date, to_date, t
      );

      const newLeaveTypeCode = String(newLeaveType.lt_leave_type_code || "")
        .trim()
        .toUpperCase();
      const requestedDays = Number(
        calculateTotalDays(from_date, to_date, newLeaveTypeCode)
      );
      if (!Number.isFinite(requestedDays) || requestedDays <= 0) {
        const error = new Error(
          newLeaveTypeCode === "PL"
            ? "Invalid leave duration. PL leave does not count Sundays."
            : "Invalid leave duration."
        );
        error.statusCode = 400;
        throw error;
      }

      const oldConsumesQuota =
        currentStatus === "pending" || currentStatus === "approved";
      const sameLeaveType = oldLeaveTypeId === leaveTypeId;
      const sameLeaveYear = oldYear === newYear;

      const overlap = await LeaveRequests.findOne({
        where: {
          lr_pr_id: prId,
          lr_leave_request_id: { [Op.ne]: requestId },
          lr_leave_type_id: leaveTypeId,
          lr_from_date: { [Op.lte]: to_date },
          lr_to_date: { [Op.gte]: from_date },
          [Op.and]: literal(
            `EXISTS (SELECT 1 FROM leave_status ls WHERE ls.ls_leave_status_id = "leave_requests"."lr_status_id" AND LOWER(ls.ls_leave_status_name) IN ('pending','approved'))`
          ),
        },
        transaction: t,
      });

      if (overlap) {
        const error = new Error(
          `Leave dates overlap with another ${newLeaveType.lt_leave_type_name} request.`
        );
        error.statusCode = 409;
        throw error;
      }

      const oldQuota = await LeaveQuota.findOne({
        where: {
          lq_pr_id: prId,
          lq_leave_type_id: oldLeaveTypeId,
          lq_leave_year: oldYear,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const newQuota = await LeaveQuota.findOne({
        where: {
          lq_pr_id: prId,
          lq_leave_type_id: leaveTypeId,
          lq_leave_year: newYear,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (newLeaveTypeCode === "PL") {
        if (!newQuota) {
          const error = new Error("PL leave quota not found.");
          error.statusCode = 400;
          throw error;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        let earnedPLDays = 12;
        if (newYear === currentYear) earnedPLDays = Math.min(currentMonth, 12);
        if (newYear < currentYear) earnedPLDays = 12;
        if (newYear > currentYear) earnedPLDays = 0;

        let usedPLDays = Number(newQuota.lq_used_days || 0);
        let pendingPLDays = Number(newQuota.lq_pending_days || 0);

        if (oldConsumesQuota && sameLeaveType && sameLeaveYear) {
          if (currentStatus === "approved") usedPLDays = Math.max(0, usedPLDays - oldDays);
          if (currentStatus === "pending") pendingPLDays = Math.max(0, pendingPLDays - oldDays);
        }

        const remainingEarnedPLDays = Math.max(
          0,
          earnedPLDays - usedPLDays - pendingPLDays
        );

        if (requestedDays > remainingEarnedPLDays) {
          const error = new Error(
            `PL leave limit exceeded. Available: ${remainingEarnedPLDays} day(s)`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      if (newLeaveType.lt_is_paid === true) {
        if (!newQuota) {
          const error = new Error("Leave quota not found for the selected leave type.");
          error.statusCode = 400;
          throw error;
        }

        let usedDays = Number(newQuota.lq_used_days || 0);
        let pendingDays = Number(newQuota.lq_pending_days || 0);
        const allocatedDays = Number(newQuota.lq_allocated_days || 0);
        const carryForwardDays = Number(newQuota.lq_carry_forward_days || 0);

        if (oldConsumesQuota && sameLeaveType && sameLeaveYear) {
          if (currentStatus === "approved") usedDays = Math.max(0, usedDays - oldDays);
          if (currentStatus === "pending") pendingDays = Math.max(0, pendingDays - oldDays);
        }

        const availableDays = allocatedDays + carryForwardDays - usedDays - pendingDays;
        if (availableDays < requestedDays) {
          const error = new Error(
            `Insufficient leave balance. Available: ${availableDays}, Requested: ${requestedDays}. Use Unpaid Quota.`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      // Release old quota
      if (oldConsumesQuota && oldQuota) {
        if (currentStatus === "pending") {
          oldQuota.lq_pending_days = Math.max(
            Number(oldQuota.lq_pending_days || 0) - oldDays,
            0
          );
        } else if (currentStatus === "approved") {
          oldQuota.lq_used_days = Math.max(
            Number(oldQuota.lq_used_days || 0) - oldDays,
            0
          );
        }
        oldQuota.lq_updated_at = new Date();
        oldQuota.lq_updated_by = prId;
        await oldQuota.save({ transaction: t });
      }

      if (!newQuota) {
        const error = new Error("Leave quota not found for the selected leave type.");
        error.statusCode = 400;
        throw error;
      }

      newQuota.lq_pending_days = Number(newQuota.lq_pending_days || 0) + requestedDays;
      newQuota.lq_updated_at = new Date();
      newQuota.lq_updated_by = prId;
      await newQuota.save({ transaction: t });

      oldRequest.lr_leave_type_id = leaveTypeId;
      oldRequest.lr_from_date = from_date;
      oldRequest.lr_to_date = to_date;
      oldRequest.lr_total_days = requestedDays;
      oldRequest.lr_reason = reason || null;
      oldRequest.lr_status_id = Number(pendingStatusId);
      oldRequest.lr_reporting_to = reportingToId;
      oldRequest.lr_approver_by = null;
      oldRequest.lr_approver_at = null;
      oldRequest.lr_approver_remark = null;
      oldRequest.lr_ismailfromapprover = false;
      oldRequest.lr_ismailfromrequester = false;
      oldRequest.lr_updated_at = new Date();
      oldRequest.lr_updated_by = prId;
      await oldRequest.save({ transaction: t });

      const employeeName = [
        employeeOrg.personal?.pr_first_name,
        employeeOrg.personal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();
      const managerName = [
        managerOrg.personal?.pr_first_name,
        managerOrg.personal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();

      return {
        request: oldRequest.toJSON(),
        employee: {
          pr_id: employeeOrg.pr_id,
          name: employeeName || employeeOrg.or_emp_id || "Employee",
          emp_id: employeeOrg.or_emp_id,
          official_email: employeeOrg.or_official_email || null,
        },
        manager: {
          pr_id: managerOrg.pr_id,
          emp_id: managerOrg.or_emp_id,
          name: managerName || managerOrg.or_emp_id || "Manager",
          official_email: managerOrg.or_official_email || null,
        },
        leave_type: {
          name: newLeaveType.lt_leave_type_name,
          code: newLeaveType.lt_leave_type_code || "-",
        },
        previous_status: oldRequest.status?.ls_leave_status_name,
        new_status: "Pending",
        previous_leave_type_id: oldLeaveTypeId,
        new_leave_type_id: leaveTypeId,
        previous_days: oldDays,
        new_days: requestedDays,
        quota_status: "Quota updated successfully",
      };
    });

    // ---- Emails ----
    try {
      const request = result.request;
      const employeeEmail = result.employee?.official_email || null;
      const managerEmail = result.manager?.official_email || null;
      const requestNumber = request.lr_leave_request_id;

      const emailData = {
        manager_name: result.manager.name,
        employee_name: result.employee.name,
        employee_id: result.employee.emp_id || "-",
        employee_email: employeeEmail || "-",
        manager_email: managerEmail || "-",
        leave_request_id: requestNumber,
        request_id: request.request_id,
        leave_type: result.leave_type.name,
        leave_type_code: result.leave_type.code,
        from_date: formatDDMMYYYY(String(request.lr_from_date).slice(0, 10)),
        to_date: formatDDMMYYYY(String(request.lr_to_date).slice(0, 10)),
        total_days: request.lr_total_days,
        reason: request.lr_reason || "No reason provided",
        previous_status: result.previous_status || "-",
        status: "Pending",
        applied_at: formatDateTime12(request.lr_applied_at),
        updated_at: formatDateTime12(request.lr_updated_at),
      };

      const emailPromises = [];
      if (managerEmail) {
        emailPromises.push(
          sendEmail(
            managerEmail,
            `Leave Request Updated - ${request.request_id}`,
            "leave_request_edit_manager",
            emailData
          )
            .then(() => ({ type: "manager", email: managerEmail, success: true }))
            .catch((error) => ({ type: "manager", email: managerEmail, success: false, error }))
        );
      }
      if (employeeEmail) {
        emailPromises.push(
          sendEmail(
            employeeEmail,
            `Leave Request Updated - ${request.request_id}`,
            "leave_request_edit",
            emailData
          )
            .then(() => ({ type: "employee", email: employeeEmail, success: true }))
            .catch((error) => ({ type: "employee", email: employeeEmail, success: false, error }))
        );
      }

      const emailResults = await Promise.all(emailPromises);
      let managerMailSent = false;
      let employeeMailSent = false;

      for (const r of emailResults) {
        if (r.success) {
          if (r.type === "manager") managerMailSent = true;
          if (r.type === "employee") employeeMailSent = true;
          console.log(
            `[LEAVE EDIT EMAIL SENT] Request=${requestNumber} Type=${r.type} To=${r.email}`
          );
        } else {
          console.error(
            `[LEAVE EDIT EMAIL ERROR] Request=${requestNumber} Type=${r.type} To=${r.email}`,
            r.error
          );
        }
      }

      if (managerMailSent || employeeMailSent) {
        await LeaveRequests.update(
          {
            lr_ismailfromrequester: employeeMailSent,
            lr_updated_at: new Date(),
            lr_updated_by: prId,
          },
          { where: { lr_leave_request_id: requestNumber } }
        );
      }
    } catch (emailError) {
      console.error(
        `[LEAVE EDIT EMAIL ERROR] Request=${result.request.lr_leave_request_id}`,
        emailError
      );
    }

    return successResponse(
      res,
      200,
      result,
      "Leave request edited successfully and sent for approval again."
    );
  } catch (error) {
    console.error("[EDIT LEAVE ERROR]", error);
    return handleDbError(res, error);
  }
};

/* ============================================================
   REJECT LEAVE — response + emails identical to raw
============================================================ */
exports.rejectLeave = async (req, res) => {
  try {
    const approverPrId = getLoggedInPrId(req);
    const requestId = Number(req.params.id);
    const remark = req.body?.remark || null;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return errorResponse(res, "Valid leave request ID is required.", 400);
    }
    if (!approverPrId) {
      return errorResponse(res, "Unable to identify logged-in approver.", 401);
    }

    const result = await withTransaction(async (t) => {
      const rejectedStatusId = await getLeaveStatusId("Rejected", t);

      const lr = await LeaveRequests.findOne({
        where: { lr_leave_request_id: requestId },
        include: [
          { model: LeaveStatus, as: "status" },
          { model: LeaveTypes, as: "leaveType" },
        ],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!lr) {
        const error = new Error("Leave request not found.");
        error.statusCode = 404;
        throw error;
      }

      const employeeOrg = await Organizations.findOne({
        where: { pr_id: lr.lr_pr_id },
        include: [{ model: Personal, as: "personal" }],
        transaction: t,
      });
      const managerOrg = await Organizations.findOne({
        where: { or_id: employeeOrg?.or_reporting_to_id },
        include: [{ model: Personal, as: "personal" }],
        transaction: t,
      });
      if (!managerOrg || Number(managerOrg.pr_id) !== Number(approverPrId)) {
        const error = new Error("You are not authorized to reject this leave request.");
        error.statusCode = 403;
        throw error;
      }

      if (String(lr.status?.ls_leave_status_name || "").toLowerCase() !== "pending") {
        const error = new Error(
          `Leave cannot be rejected because current status is ${lr.status?.ls_leave_status_name}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const requestYear = Number(String(lr.lr_from_date).slice(0, 4));

      const quota = await LeaveQuota.findOne({
        where: {
          lq_pr_id: lr.lr_pr_id,
          lq_leave_type_id: lr.lr_leave_type_id,
          lq_leave_year: requestYear,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!quota) {
        const error = new Error("Leave quota not found.");
        error.statusCode = 400;
        throw error;
      }

      const pendingDays = Number(quota.lq_pending_days || 0);
      const requestedDays = Number(lr.lr_total_days || 0);

      if (requestedDays <= 0) {
        const error = new Error("Invalid leave request days.");
        error.statusCode = 400;
        throw error;
      }
      if (pendingDays < requestedDays) {
        const error = new Error(
          "Invalid quota state. Pending leave balance is insufficient."
        );
        error.statusCode = 409;
        throw error;
      }

      const pendingDaysAfter = pendingDays - requestedDays;
      const usedDays = Number(quota.lq_used_days || 0);

      quota.lq_pending_days = pendingDaysAfter;
      quota.lq_updated_at = new Date();
      quota.lq_updated_by = approverPrId;
      await quota.save({ transaction: t });

      lr.lr_status_id = rejectedStatusId;
      lr.lr_approver_by = approverPrId;
      lr.lr_approver_at = new Date();
      lr.lr_approver_remark = remark;
      lr.lr_ismailfromapprover = false;
      lr.lr_updated_at = new Date();
      lr.lr_updated_by = approverPrId;
      await lr.save({ transaction: t });

      const company = employeeOrg.or_company_id
        ? await CompaniesMaster.findOne({ where: { cpt_id: employeeOrg.or_company_id } })
        : null;

      const employeeName = [
        employeeOrg.personal?.pr_first_name,
        employeeOrg.personal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();
      const managerName = [
        managerOrg.personal?.pr_first_name,
        managerOrg.personal?.pr_last_name,
      ].filter(Boolean).join(" ").trim();

      return {
        request: lr.toJSON(),
        employee: {
          pr_id: employeeOrg.pr_id,
          emp_id: employeeOrg.or_emp_id,
          name: employeeName || employeeOrg.or_emp_id || "Employee",
          official_email: employeeOrg.or_official_email || null,
          email: employeeOrg.or_official_email || null,
          personal_email: employeeOrg.personal?.pr_email || null,
          organization: company?.cpt_name || "-",
        },
        manager: {
          pr_id: managerOrg.pr_id,
          emp_id: managerOrg.or_emp_id,
          name: managerName || managerOrg.or_emp_id || "Manager",
          official_email: managerOrg.or_official_email || null,
          email: managerOrg.or_official_email || null,
          personal_email: managerOrg.personal?.pr_email || null,
        },
        leave_type: {
          name: lr.leaveType?.lt_leave_type_name,
          code: lr.leaveType?.lt_leave_type_code,
        },
        quota: {
          lq_id: quota.lq_id,
          allocated_days: Number(quota.lq_allocated_days || 0),
          carry_forward_days: Number(quota.lq_carry_forward_days || 0),
          pending_days_before: pendingDays,
          pending_days_after: pendingDaysAfter,
          used_days: usedDays,
          released_days: requestedDays,
        },
      };
    });

    const request = result.request;
    const leaveRequestId = request.request_id || request.lr_leave_request_id;

    const emailData = {
      employee_name: result.employee.name,
      employee_id: result.employee.emp_id,
      employee_official_email: result.employee.official_email || "-",
      organization_name: result.employee.organization,
      manager_name: result.manager.name,
      manager_id: result.manager.emp_id,
      manager_official_email: result.manager.official_email || "-",
      leave_request_id: leaveRequestId,
      leave_type: result.leave_type.name,
      leave_type_code: result.leave_type.code || "-",
      from_date: formatDateTime(request.lr_from_date),
      to_date: formatDateTime(request.lr_to_date),
      total_days: request.lr_total_days,
      reason: request.lr_reason || "No reason provided",
      status: "Rejected",
      applied_at: formatDateTime(request.lr_applied_at),
      rejected_at: formatDateTime(request.lr_approver_at),
      approver_remark: request.lr_approver_remark || "No remark provided",
      pending_days_before: result.quota.pending_days_before,
      pending_days: result.quota.pending_days_after,
      used_days: result.quota.used_days,
      released_days: result.quota.released_days,
      allocated_days: result.quota.allocated_days,
      carry_forward_days: result.quota.carry_forward_days,
    };

    let employeeEmailSent = false;
    let managerEmailSent = false;

    try {
      const employeeEmail = result.employee.official_email;
      if (employeeEmail && String(employeeEmail).trim()) {
        await sendEmail(
          employeeEmail.trim(),
          `Leave Request Rejected - ${leaveRequestId}`,
          "leave_rejected",
          emailData
        );
        employeeEmailSent = true;
        console.log(
          `[LEAVE REJECTION EMAIL SENT] Request=${leaveRequestId} Employee=${result.employee.name} To=${employeeEmail}`
        );
      } else {
        console.warn(
          `[LEAVE REJECTION EMAIL SKIPPED] Employee official email not found. Request=${leaveRequestId} EmployeePR=${result.employee.pr_id} EmpId=${result.employee.emp_id}`
        );
      }

      const managerEmail = result.manager.official_email;
      if (managerEmail && String(managerEmail).trim()) {
        await sendEmail(
          managerEmail.trim(),
          `Leave Request Rejected - ${leaveRequestId}`,
          "leave_rejected_manager",
          emailData
        );
        managerEmailSent = true;
        console.log(
          `[LEAVE REJECTION MANAGER EMAIL SENT] Request=${leaveRequestId} Manager=${result.manager.name} To=${managerEmail}`
        );
      } else {
        console.warn(
          `[LEAVE REJECTION MANAGER EMAIL SKIPPED] Manager official email not found. Request=${leaveRequestId} ManagerPR=${result.manager.pr_id} ManagerEmpId=${result.manager.emp_id}`
        );
      }

      if (employeeEmailSent || managerEmailSent) {
        await LeaveRequests.update(
          {
            lr_ismailfromapprover: true,
            lr_updated_at: new Date(),
            lr_updated_by: approverPrId,
          },
          { where: { lr_leave_request_id: request.lr_leave_request_id } }
        );
      }
    } catch (emailError) {
      console.error(
        `[LEAVE REJECTION EMAIL ERROR] Request=${leaveRequestId}`,
        emailError
      );
    }

    return successResponse(
      res,
      200,
      {
        ...result,
        email: {
          employee_email: result.employee.official_email,
          manager_email: result.manager.official_email,
          employee_email_sent: employeeEmailSent,
          manager_email_sent: managerEmailSent,
          both_sent: employeeEmailSent && managerEmailSent,
        },
      },
      "Leave rejected successfully."
    );
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET ALL LEAVE REQUESTS (admin)
============================================================ */
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const year = req.query.year ? validateYear(req.query.year) : null;
    const status = req.query.status || null;
    const employeePrId = req.query.pr_id ? Number(req.query.pr_id) : null;

    const where = {};
    if (year) where.lr_from_date = { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` };
    if (employeePrId && Number.isInteger(employeePrId)) where.lr_pr_id = employeePrId;

    const include = [
      {
        model: Organizations,
        as: "personal_org",
        required: false,
        attributes: ["or_emp_id", "or_organization_name", "or_department_id", "or_designation_id"],
      },
      { model: LeaveTypes, as: "leaveType" },
      {
        model: LeaveStatus,
        as: "status",
        attributes: ["ls_leave_status_id", "ls_leave_status_name"],
      },
    ];

    if (status) {
      include[2].where = literal(
        `LOWER("status"."ls_leave_status_name") = LOWER(${sequelize.escape(status)})`
      );
    }

    const { rows, count } = await LeaveRequests.findAndCountAll({
      where,
      include,
      order: [["lr_applied_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const mapped = rows.map((r) => {
      const j = r.toJSON();
      const org = j.personal_org || {};
      return {
        lr_leave_request_id: j.lr_leave_request_id,
        lr_pr_id: j.lr_pr_id,
        employee_id: org.or_emp_id || null,
        employee_name: org.or_organization_name || null,
        department_id: org.or_department_id || null,
        designation_id: org.or_designation_id || null,
        lr_leave_type_id: j.lr_leave_type_id,
        lt_leave_type_code: r.leaveType?.lt_leave_type_code,
        lt_leave_type_name: r.leaveType?.lt_leave_type_name,
        lt_is_paid: r.leaveType?.lt_is_paid,
        lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
        lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
        lr_total_days: j.lr_total_days,
        lr_reason: j.lr_reason,
        ls_leave_status_id: r.status?.ls_leave_status_id,
        ls_leave_status_name: r.status?.ls_leave_status_name,
        lr_applied_at: j.lr_applied_at,
        lr_approver_by: j.lr_approver_by,
        lr_approver_at: j.lr_approver_at,
        lr_approver_remark: j.lr_approver_remark,
        lr_cancelled_at: j.lr_cancelled_at,
        lr_cancellation_reason: j.lr_cancellation_reason,
        lr_created_at: j.lr_created_at,
        lr_updated_at: j.lr_updated_at,
      };
    });

    return paginatedResponse(res, mapped, page, limit, count);
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET EMPLOYEE LEAVE BALANCE (admin)
============================================================ */
exports.getEmployeeLeaveBalance = async (req, res) => {
  try {
    const employeePrId = Number(req.params.prId);
    if (!Number.isInteger(employeePrId) || employeePrId <= 0) {
      return errorResponse(res, "Valid employee pr_id is required.", 400);
    }
    const year = validateYear(req.query.year) || new Date().getFullYear();

    const result = await withTransaction(async (t) => {
      const employee = await getEmployee(employeePrId, t);
      await ensureEmployeeQuota(employeePrId, year, getLoggedInPrId(req), t);

      const rows = await LeaveQuota.findAll({
        where: { lq_pr_id: employeePrId, lq_leave_year: year },
        include: [
          {
            model: LeaveTypes,
            as: "leaveType",
            attributes: ["lt_leave_type_code", "lt_leave_type_name", "lt_is_paid"],
          },
        ],
        attributes: [
          "lq_id", "lq_pr_id", "lq_leave_type_id", "lq_emptype", "lq_leave_year",
          "lq_allocated_days", "lq_carry_forward_days", "lq_used_days", "lq_pending_days",
          [
            literal(
              `("leave_quota"."lq_allocated_days" + "leave_quota"."lq_carry_forward_days" - "leave_quota"."lq_used_days" - "leave_quota"."lq_pending_days")`
            ),
            "available_days",
          ],
        ],
        order: [[{ model: LeaveTypes, as: "leaveType" }, "lt_leave_type_name", "ASC"]],
        transaction: t,
      });

      return {
        employee: {
          pr_id: employee.pr_id,
          employee_id: employee.employee_id,
          employee_type_id: employee.employee_type_id,
        },
        year,
        balance: rows.map((r) => ({
          lq_id: r.lq_id,
          lq_pr_id: r.lq_pr_id,
          lq_leave_type_id: r.lq_leave_type_id,
          lq_emptype: r.lq_emptype,
          lq_leave_year: r.lq_leave_year,
          lt_leave_type_code: r.leaveType?.lt_leave_type_code,
          lt_leave_type_name: r.leaveType?.lt_leave_type_name,
          lt_is_paid: r.leaveType?.lt_is_paid,
          lq_allocated_days: r.lq_allocated_days,
          lq_carry_forward_days: r.lq_carry_forward_days,
          lq_used_days: r.lq_used_days,
          lq_pending_days: r.lq_pending_days,
          available_days: r.get("available_days"),
        })),
      };
    });

    return successResponse(res, 200, result, "Employee leave balance fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET EMPLOYEE LEAVE REQUESTS (admin)
============================================================ */
exports.getEmployeeLeaveRequests = async (req, res) => {
  try {
    const employeePrId = Number(req.params.prId);
    if (!Number.isInteger(employeePrId) || employeePrId <= 0) {
      return errorResponse(res, "Valid employee pr_id is required.", 400);
    }
    const { page, limit, offset } = getPaginationParams(req);
    const year = req.query.year ? validateYear(req.query.year) : null;

    const where = { lr_pr_id: employeePrId };
    if (year) where.lr_from_date = { [Op.gte]: `${year}-01-01`, [Op.lte]: `${year}-12-31` };

    const { rows, count } = await LeaveRequests.findAndCountAll({
      where,
      include: [
        { model: LeaveTypes, as: "leaveType" },
        { model: LeaveStatus, as: "status" },
      ],
      order: [["lr_applied_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const mapped = rows.map((r) => {
      const j = r.toJSON();
      return {
        lr_leave_request_id: j.lr_leave_request_id,
        lr_pr_id: j.lr_pr_id,
        lt_leave_type_code: r.leaveType?.lt_leave_type_code,
        lt_leave_type_name: r.leaveType?.lt_leave_type_name,
        lt_is_paid: r.leaveType?.lt_is_paid,
        lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
        lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
        lr_total_days: j.lr_total_days,
        lr_reason: j.lr_reason,
        ls_leave_status_id: r.status?.ls_leave_status_id,
        ls_leave_status_name: r.status?.ls_leave_status_name,
        lr_applied_at: j.lr_applied_at,
        lr_approver_by: j.lr_approver_by,
        lr_approver_at: j.lr_approver_at,
        lr_approver_remark: j.lr_approver_remark,
        lr_cancelled_at: j.lr_cancelled_at,
        lr_cancellation_reason: j.lr_cancellation_reason,
      };
    });

    return paginatedResponse(res, mapped, page, limit, count);
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET LEAVE DASHBOARD
============================================================ */
exports.getLeaveDashboard = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const year = validateYear(req.query.year) || new Date().getFullYear();

    const result = await withTransaction(async (t) => {
      await ensureEmployeeQuota(prId, year, prId, t);

      const quotas = await LeaveQuota.findAll({
        where: { lq_pr_id: prId, lq_leave_year: year },
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("lq_id")), "total_leave_types"],
          [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("lq_allocated_days")), 0), "total_allocated_days"],
          [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("lq_carry_forward_days")), 0), "total_carry_forward_days"],
          [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("lq_used_days")), 0), "total_used_days"],
          [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("lq_pending_days")), 0), "total_pending_days"],
          [
            sequelize.fn(
              "COALESCE",
              sequelize.fn(
                "SUM",
                literal(
                  `("leave_quota"."lq_allocated_days" + "leave_quota"."lq_carry_forward_days" - "leave_quota"."lq_used_days" - "leave_quota"."lq_pending_days")`
                )
              ),
              0
            ),
            "total_available_days",
          ],
        ],
        raw: true,
        transaction: t,
      });

      const recent = await LeaveRequests.findAll({
        where: { lr_pr_id: prId },
        include: [
          { model: LeaveTypes, as: "leaveType" },
          { model: LeaveStatus, as: "status" },
        ],
        order: [["lr_applied_at", "DESC"]],
        limit: 5,
        transaction: t,
      });

      return {
        year,
        summary: quotas[0] || {
          total_leave_types: 0,
          total_allocated_days: 0,
          total_carry_forward_days: 0,
          total_used_days: 0,
          total_pending_days: 0,
          total_available_days: 0,
        },
        recent_requests: recent.map((r) => ({
          lr_leave_request_id: r.lr_leave_request_id,
          lt_leave_type_name: r.leaveType?.lt_leave_type_name,
          lr_from_date: r.lr_from_date ? String(r.lr_from_date).slice(0, 10) : null,
          lr_to_date: r.lr_to_date ? String(r.lr_to_date).slice(0, 10) : null,
          lr_total_days: r.lr_total_days,
          ls_leave_status_name: r.status?.ls_leave_status_name,
          lr_applied_at: r.lr_applied_at,
        })),
      };
    });

    return successResponse(res, 200, result, "Leave dashboard fetched successfully.");
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   GET MANAGER LEAVE REQUESTS (admin-aware)
============================================================ */
exports.getManagerLeaveRequests = async (req, res) => {
  try {
    const managerPrId = getLoggedInPrId(req);

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 10;
    if (limit > 1000) limit = 1000;
    const offset = (page - 1) * limit;

    const { employee_id, request_status, leave_type_code } = req.query;

    // Admin check
    const adminRoles = await UserRoleRelation.findAll({
      where: { pr_id: managerPrId },
      include: [
        {
          model: UsrRoleMaster,
          as: "role",
          required: true,
          where: literal(
            `UPPER("role"."rm_role_name") IN ('SUPER-ADMIN','HR-ADMIN')`
          ),
          attributes: [],
        },
      ],
      attributes: ["rl_id"],
    });
    const isAdmin = adminRoles.length > 0;

    const where = {};
    if (!isAdmin) where.lr_reporting_to = managerPrId;

    // Search
    if (employee_id) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        literal(
          `(
            EXISTS (
              SELECT 1 FROM organizations emp
              WHERE emp.pr_id = "leave_requests"."lr_pr_id"
                AND emp.or_is_active = TRUE
                AND (
                  emp.or_emp_id::TEXT ILIKE ${sequelize.escape(`%${employee_id}%`)}
                  OR emp.or_organization_name ILIKE ${sequelize.escape(`%${employee_id}%`)}
                  OR emp.or_official_email ILIKE ${sequelize.escape(`%${employee_id}%`)}
                  OR emp.or_official_contact ILIKE ${sequelize.escape(`%${employee_id}%`)}
                )
            )
            OR "leave_requests"."request_id"::TEXT ILIKE ${sequelize.escape(`%${employee_id}%`)}
          )`
        ),
      ];
    }

    // Status filter
    if (request_status) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        literal(
          `EXISTS (
            SELECT 1 FROM leave_status ls
            WHERE ls.ls_leave_status_id = "leave_requests"."lr_status_id"
              AND LOWER(ls.ls_leave_status_name) = LOWER(${sequelize.escape(request_status)})
          )`
        ),
      ];
    }

    // Leave type filter
    if (leave_type_code) {
      where[Op.and] = [
        ...(where[Op.and] || []),
        literal(
          `EXISTS (
            SELECT 1 FROM leave_types lt
            WHERE lt.lt_leave_type_id = "leave_requests"."lr_leave_type_id"
              AND LOWER(lt.lt_leave_type_code) = LOWER(${sequelize.escape(leave_type_code)})
          )`
        ),
      ];
    }

    // Active employee filter
    where[Op.and] = [
      ...(where[Op.and] || []),
      literal(
        `EXISTS (
          SELECT 1 FROM organizations emp2
          WHERE emp2.pr_id = "leave_requests"."lr_pr_id"
            AND emp2.or_is_active = TRUE
        )`
      ),
    ];

    const { rows, count } = await LeaveRequests.findAndCountAll({
      where,
      include: [
        { model: LeaveTypes, as: "leaveType" },
        { model: LeaveStatus, as: "status" },
        { model: Personal, as: "personal" },
      ],
      order: [
        [
          literal(
            `CASE
              WHEN LOWER("status"."ls_leave_status_name") = 'pending' THEN 0
              WHEN LOWER("status"."ls_leave_status_name") = 'approved' THEN 1
              WHEN LOWER("status"."ls_leave_status_name") = 'rejected' THEN 2
              WHEN LOWER("status"."ls_leave_status_name") = 'cancelled' THEN 3
              ELSE 4
            END`
          ),
          "ASC",
        ],
        ["lr_created_at", "DESC"],
      ],
      limit,
      offset,
      distinct: true,
    });

    const prIds = [...new Set(rows.map((r) => r.lr_pr_id).filter(Boolean))];
    const orgs = prIds.length
      ? await Organizations.findAll({ where: { pr_id: { [Op.in]: prIds } } })
      : [];
    const orgMap = {};
    for (const o of orgs) orgMap[o.pr_id] = o;

    const mapped = rows.map((r) => {
      const j = r.toJSON();
      const org = orgMap[r.lr_pr_id] || {};
      return {
        lr_leave_request_id: j.lr_leave_request_id,
        lr_pr_id: j.lr_pr_id,
        request_id: j.request_id,
        lr_reporting_to: j.lr_reporting_to,
        employee_or_id: org.or_id || null,
        employee_id: org.or_emp_id || null,
        or_official_email: org.or_official_email || null,
        or_official_contact: org.or_official_contact || null,
        pr_first_name: r.personal?.pr_first_name || null,
        pr_last_name: r.personal?.pr_last_name || null,
        lr_leave_type_id: j.lr_leave_type_id,
        lt_leave_type_code: r.leaveType?.lt_leave_type_code,
        lt_leave_type_name: r.leaveType?.lt_leave_type_name,
        lt_total_days_per_year: r.leaveType?.lt_total_days_per_year,
        lt_is_paid: r.leaveType?.lt_is_paid,
        lr_from_date: j.lr_from_date ? String(j.lr_from_date).slice(0, 10) : null,
        lr_to_date: j.lr_to_date ? String(j.lr_to_date).slice(0, 10) : null,
        lr_total_days: j.lr_total_days,
        lr_reason: j.lr_reason,
        lr_status_id: j.lr_status_id,
        request_status: r.status?.ls_leave_status_name,
        lr_ismailfromrequester: j.lr_ismailfromrequester,
        lr_applied_at: j.lr_applied_at,
        lr_approver_by: j.lr_approver_by,
        lr_approver_at: j.lr_approver_at,
        lr_approver_remark: j.lr_approver_remark,
        lr_ismailfromapprover: j.lr_ismailfromapprover,
        lr_cancelled_at: j.lr_cancelled_at,
        lr_cancellation_reason: j.lr_cancellation_reason,
        lr_created_at: j.lr_created_at,
        lr_created_by: j.lr_created_by,
        lr_updated_at: j.lr_updated_at,
        lr_updated_by: j.lr_updated_by,
      };
    });

    const totalPages = limit > 0 ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return res.status(200).json({
      success: true,
      data: mapped,
      pagination: {
        page, limit, offset,
        totalRecords: count,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
    });
  } catch (error) {
    console.error("getManagerLeaveRequests Error:", error);
    return handleDbError(res, error);
  }
};

/* ============================================================
   MY REPORTING DETAILS (flat, identical to raw)
============================================================ */
exports.getMyReportingDetails = async (req, res) => {
  try {
    const prId = Number(req.query.pr_id);
    if (!Number.isInteger(prId) || prId <= 0) {
      return errorResponse(res, "Valid pr_id is required.", 400);
    }

    const org = await Organizations.findOne({
      where: { pr_id: prId },
      include: [{ model: Personal, as: "personal" }],
    });

    let reportingOrg = null;
    let reportingPersonal = null;
    if (org?.or_reporting_to_id) {
      reportingOrg = await Organizations.findOne({ where: { pr_id: org.or_reporting_to_id } });
      reportingPersonal = await Personal.findOne({ where: { pr_id: org.or_reporting_to_id } });
    }

    const p = org?.personal || {};

    const payload = org
      ? {
          employee_pr_id: org.pr_id,
          employee_first_name: p.pr_first_name ?? null,
          employee_last_name: p.pr_last_name ?? null,
          employee_email: p.pr_email ?? null,
          employee_contact: p.pr_contact ?? null,
          employee_id: org.or_emp_id,
          employee_official_email: org.or_official_email,
          employee_official_contact: org.or_official_contact,
          employee_organization_name: org.or_organization_name,
          employee_organization_location: org.or_organization_location,
          employee_joining_date: org.or_joining_date,
          employee_department_id: org.or_department_id,
          employee_designation_id: org.or_designation_id,
          employee_type_id: org.or_employee_type_id,
          reporting_pr_id: reportingOrg?.pr_id ?? null,
          reporting_first_name: reportingPersonal?.pr_first_name ?? null,
          reporting_last_name: reportingPersonal?.pr_last_name ?? null,
          reporting_email: reportingPersonal?.pr_email ?? null,
          reporting_contact: reportingPersonal?.pr_contact ?? null,
          reporting_employee_id: reportingOrg?.or_emp_id ?? null,
          reporting_official_email: reportingOrg?.or_official_email ?? null,
          reporting_official_contact: reportingOrg?.or_official_contact ?? null,
          reporting_organization_name: reportingOrg?.or_organization_name ?? null,
          reporting_organization_location: reportingOrg?.or_organization_location ?? null,
          reporting_joining_date: reportingOrg?.or_joining_date ?? null,
          reporting_department_id: reportingOrg?.or_department_id ?? null,
          reporting_designation_id: reportingOrg?.or_designation_id ?? null,
          reporting_type_id: reportingOrg?.or_employee_type_id ?? null,
        }
      : null;

    return successResponse(res, 200, payload);
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   REPORTING LEAVE STATUS COUNTS
============================================================ */
exports.getReportingLeaveStatusCounts = async (req, res) => {
  try {
    const reportingTo = Number(req.params.id);
    if (!Number.isInteger(reportingTo) || reportingTo <= 0) {
      return errorResponse(res, 400, null, "Invalid reporting user ID");
    }

    const statuses = await LeaveStatus.findAll({
      attributes: ["ls_leave_status_id", "ls_leave_status_name"],
      order: [["ls_leave_status_id", "ASC"]],
    });

    const counts = await LeaveRequests.findAll({
      where: { lr_reporting_to: reportingTo },
      attributes: [
        "lr_status_id",
        [sequelize.fn("COUNT", sequelize.col("lr_leave_request_id")), "total_count"],
      ],
      group: ["lr_status_id"],
      raw: true,
    });

    const countMap = {};
    for (const c of counts) countMap[c.lr_status_id] = Number(c.total_count || 0);

    const rows = statuses.map((s) => ({
      status_id: s.ls_leave_status_id,
      status: s.ls_leave_status_name,
      total_count: countMap[s.ls_leave_status_id] || 0,
    }));

    return successResponse(
      res,
      200,
      rows,
      "Leave status counts fetched successfully"
    );
  } catch (error) {
    return handleDbError(res, error);
  }
};

/* ============================================================
   EXPORTS (helpers)
============================================================ */
module.exports.getLoggedInPrId = getLoggedInPrId;
module.exports.calculateTotalDays = calculateTotalDays;
module.exports.validateYear = validateYear;
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleDbError,
} = require("../utils/response");

const {
  getPaginationParams,
} = require("../utils/pagination");

const db = require("../models");
const { LeaveTypes, Organizations } = db;

/* ============================================================
   CREATE LEAVE TYPE
============================================================ */
const createLeaveType = async (req, res) => {
  try {
    const {
      leave_type_code,
      leave_type_name,
      total_days_per_year,
      is_paid,
      from_date,
      to_date,
      emptype,
      created_by,
    } = req.body;

    if (!leave_type_code || leave_type_code.trim() === "") {
      return errorResponse(res, 400, "leave_type_code is required", null);
    }

    if (!leave_type_name || leave_type_name.trim() === "") {
      return errorResponse(res, 400, "leave_type_name is required", null);
    }

    if (total_days_per_year === undefined || total_days_per_year === null) {
      return errorResponse(res, 400, "total_days_per_year is required", null);
    }

    if (
      !Number.isInteger(Number(total_days_per_year)) ||
      Number(total_days_per_year) < 0
    ) {
      return errorResponse(
        res,
        400,
        "total_days_per_year must be a non-negative integer",
        null
      );
    }

    if (is_paid !== undefined && typeof is_paid !== "boolean") {
      return errorResponse(res, 400, "is_paid must be true or false", null);
    }

    if (
      emptype === undefined ||
      emptype === null ||
      !Number.isInteger(Number(emptype))
    ) {
      return errorResponse(res, 400, "valid emptype is required", null);
    }

    if (from_date && to_date && new Date(to_date) < new Date(from_date)) {
      return errorResponse(
        res,
        400,
        "to_date must be greater than or equal to from_date",
        null
      );
    }

    const created = await LeaveTypes.create({
      lt_leave_type_code: leave_type_code.trim().toUpperCase(),
      lt_leave_type_name: leave_type_name.trim(),
      lt_total_days_per_year: Number(total_days_per_year),
      lt_is_paid: is_paid !== undefined ? is_paid : true,
      lt_from_date: from_date || null,
      lt_to_date: to_date || null,
      lt_emptype: Number(emptype),
      lt_is_active: true,
      lt_created_at: new Date(),
      lt_created_by: created_by || null,
    });

    return successResponse(
      res,
      201,
      "Leave type created successfully",
      created.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to create leave type");
  }
};

/* ============================================================
   GET LEAVE TYPE BY ID
============================================================ */
const getLeaveTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid leave_type_id is required", null);
    }

    const row = await LeaveTypes.findOne({
      where: { lt_leave_type_id: Number(id) },
    });

    if (!row) {
      return errorResponse(res, 404, "Leave type not found", null);
    }

    return successResponse(
      res,
      200,
      "Leave type fetched successfully",
      row.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to fetch leave type");
  }
};

/* ============================================================
   GET ALL LEAVE TYPES (by employee type from pr_id)
============================================================ */
const getAllLeaveTypes = async (req, res) => {
  try {
    const { pr_id, is_active } = req.query;

    if (!pr_id) {
      return res.status(400).json({
        success: false,
        message: "Pr_Id is required",
      });
    }

    const employeeOrg = await Organizations.findOne({
      where: {
        pr_id,
        or_employee_type_id: { [db.Sequelize.Op.ne]: null },
        [db.Sequelize.Op.or]: [
          { or_is_active: true },
          { or_is_active: null },
        ],
      },
      attributes: ["or_employee_type_id"],
      order: [["or_id", "DESC"]],
    });

    if (!employeeOrg) {
      return res.status(404).json({
        success: false,
        message: `Active organization information not found for Pr_Id ${pr_id}`,
      });
    }

    const employeeTypeId = employeeOrg.or_employee_type_id;

    // Validate is_active
    let activeValue = true;
    if (is_active !== undefined) {
      const v = String(is_active).toLowerCase();
      if (v === "true") activeValue = true;
      else if (v === "false") activeValue = false;
      else {
        return res.status(400).json({
          success: false,
          message: "is_active must be true or false",
        });
      }
    }

    const rows = await LeaveTypes.findAll({
      where: {
        lt_emptype: employeeTypeId,
        lt_leave_type_code: { [db.Sequelize.Op.in]: ["PL", "LWP"] },
        lt_is_active: activeValue,
      },
      order: [["lt_leave_type_id", "ASC"]],
    });

    return successResponse(
      res,
      200,
      "Leave types fetched successfully",
      rows.map((r) => r.toJSON())
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to fetch leave types");
  }
};

/* ============================================================
   GET PAGINATED LEAVE TYPES
============================================================ */
const getPaginatedLeaveTypes = async (req, res) => {
  try {
    const { is_active } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);

    const where = {};

    if (is_active !== undefined) {
      const v = String(is_active).toLowerCase();
      if (v === "true") where.lt_is_active = true;
      else if (v === "false") where.lt_is_active = false;
    }

    const { rows, count: total_records } = await LeaveTypes.findAndCountAll({
      where,
      order: [["lt_leave_type_id", "ASC"]],
      limit,
      offset,
    });

    const total_pages = Math.ceil(total_records / limit) || 0;

    return paginatedResponse(
      res,
      200,
      "Leave types fetched successfully",
      rows.map((r) => r.toJSON()),
      {
        page,
        limit,
        total_records,
        total_pages,
      }
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to fetch paginated leave types");
  }
};

/* ============================================================
   UPDATE LEAVE TYPE
============================================================ */
const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid leave_type_id is required", null);
    }

    const existing = await LeaveTypes.findOne({
      where: { lt_leave_type_id: id },
    });

    if (!existing) {
      return errorResponse(res, 404, "Leave type not found", null);
    }

    const {
      leave_type_code,
      leave_type_name,
      total_days_per_year,
      is_paid,
      from_date,
      to_date,
      emptype,
      is_active,
      updated_by,
    } = req.body;

    if (
      leave_type_code !== undefined &&
      (!leave_type_code || leave_type_code.trim() === "")
    ) {
      return errorResponse(res, 400, "leave_type_code cannot be empty", null);
    }

    if (
      leave_type_name !== undefined &&
      (!leave_type_name || leave_type_name.trim() === "")
    ) {
      return errorResponse(res, 400, "leave_type_name cannot be empty", null);
    }

    if (total_days_per_year !== undefined) {
      if (
        !Number.isInteger(Number(total_days_per_year)) ||
        Number(total_days_per_year) < 0
      ) {
        return errorResponse(
          res,
          400,
          "total_days_per_year must be a non-negative integer",
          null
        );
      }
    }

    if (is_paid !== undefined && typeof is_paid !== "boolean") {
      return errorResponse(res, 400, "is_paid must be true or false", null);
    }

    if (emptype !== undefined && !Number.isInteger(Number(emptype))) {
      return errorResponse(res, 400, "emptype must be a valid integer", null);
    }

    if (from_date && to_date && new Date(to_date) < new Date(from_date)) {
      return errorResponse(
        res,
        400,
        "to_date must be greater than or equal to from_date",
        null
      );
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return errorResponse(res, 400, "is_active must be true or false", null);
    }

    // Apply only provided fields
    if (leave_type_code !== undefined)
      existing.lt_leave_type_code = leave_type_code.trim().toUpperCase();
    if (leave_type_name !== undefined)
      existing.lt_leave_type_name = leave_type_name.trim();
    if (total_days_per_year !== undefined)
      existing.lt_total_days_per_year = Number(total_days_per_year);
    if (is_paid !== undefined) existing.lt_is_paid = is_paid;
    if (from_date !== undefined) existing.lt_from_date = from_date;
    if (to_date !== undefined) existing.lt_to_date = to_date;
    if (emptype !== undefined) existing.lt_emptype = Number(emptype);
    if (is_active !== undefined) existing.lt_is_active = is_active;
    if (updated_by !== undefined) existing.lt_updated_by = updated_by;

    existing.lt_updated_at = new Date();
    await existing.save();

    return successResponse(
      res,
      200,
      "Leave type updated successfully",
      existing.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to update leave type");
  }
};

/* ============================================================
   DELETE / TOGGLE LEAVE TYPE ACTIVE STATUS
============================================================ */
const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid leave_type_id is required", null);
    }

    const existing = await LeaveTypes.findOne({
      where: { lt_leave_type_id: id },
    });

    if (!existing) {
      return errorResponse(res, 404, "Leave type not found", null);
    }

    const { is_active, updated_by } = req.body;

    if (typeof is_active !== "boolean") {
      return errorResponse(res, 400, "is_active must be true or false", null);
    }

    existing.lt_is_active = is_active;
    if (updated_by !== undefined && updated_by !== null) {
      existing.lt_updated_by = updated_by;
    }
    existing.lt_updated_at = new Date();
    await existing.save();

    return successResponse(
      res,
      200,
      `Leave type ${is_active ? "activated" : "deactivated"} successfully`,
      existing.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to update leave type status");
  }
};

module.exports = {
  createLeaveType,
  getLeaveTypeById,
  getAllLeaveTypes,
  getPaginatedLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
};
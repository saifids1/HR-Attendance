const {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleDbError,
} = require("../utils/response");

const { getPaginationParams } = require("../utils/pagination");

const db = require("../models");
const { HrSupportRequestType } = db;

/* ============================================================
   CREATE HR SUPPORT REQUEST TYPE
============================================================ */
const createHrSupportRequestType = async (req, res) => {
  try {
    const { name, is_active, created_by } = req.body;

    if (!name || name.trim() === "") {
      return errorResponse(res, 400, "name is required", null);
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return errorResponse(res, 400, "is_active must be true or false", null);
    }

    const created = await HrSupportRequestType.create({
      rst_name: name.trim(),
      rst_is_active: is_active !== undefined ? is_active : true,
      rst_created_by: created_by || null,
    });

    return successResponse(
      res,
      201,
      "HR support request type created successfully",
      created.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to create HR support request type");
  }
};

/* ============================================================
   GET HR SUPPORT REQUEST TYPE BY ID
============================================================ */
const getHrSupportRequestTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid rst_id is required", null);
    }

    const row = await HrSupportRequestType.findOne({
      where: { rst_id: Number(id) },
    });

    if (!row) {
      return errorResponse(res, 404, "HR support request type not found", null);
    }

    return successResponse(
      res,
      200,
      "HR support request type fetched successfully",
      row.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to fetch HR support request type");
  }
};

/* ============================================================
   GET ALL HR SUPPORT REQUEST TYPES
============================================================ */
const getAllHrSupportRequestTypes = async (req, res) => {
  try {
    const { is_active } = req.query;

    // Validate is_active
    let activeValue = true;
    if (is_active !== undefined) {
      const v = String(is_active).toLowerCase();
      if (v === "true") activeValue = true;
      else if (v === "false") activeValue = false;
      else {
        return errorResponse(res, 400, "is_active must be true or false", null);
      }
    }

    const rows = await HrSupportRequestType.findAll({
      where: {
        rst_is_active: activeValue,
      },
      order: [["rst_id", "ASC"]],
    });

    return successResponse(
      res,
      200,
      "HR support request types fetched successfully",
      rows.map((r) => r.toJSON())
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to fetch HR support request types");
  }
};

/* ============================================================
   GET PAGINATED HR SUPPORT REQUEST TYPES
============================================================ */
const getPaginatedHrSupportRequestTypes = async (req, res) => {
  try {
    const { is_active } = req.query;
    const { page, limit, offset } = getPaginationParams(req.query);

    const where = {};

    if (is_active !== undefined) {
      const v = String(is_active).toLowerCase();
      if (v === "true") where.rst_is_active = true;
      else if (v === "false") where.rst_is_active = false;
    }

    const { rows, count: total_records } =
      await HrSupportRequestType.findAndCountAll({
        where,
        order: [["rst_id", "ASC"]],
        limit,
        offset,
      });

    const total_pages = Math.ceil(total_records / limit) || 0;

    return paginatedResponse(
      res,
      200,
      "HR support request types fetched successfully",
      rows.map((r) => r.toJSON()),
      {
        page,
        limit,
        total_records,
        total_pages,
      }
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to fetch paginated HR support request types"
    );
  }
};

/* ============================================================
   UPDATE HR SUPPORT REQUEST TYPE
============================================================ */
const updateHrSupportRequestType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid rst_id is required", null);
    }

    const existing = await HrSupportRequestType.findOne({
      where: { rst_id: id },
    });

    if (!existing) {
      return errorResponse(res, 404, "HR support request type not found", null);
    }

    const { name, is_active, updated_by } = req.body;

    if (name !== undefined && (!name || name.trim() === "")) {
      return errorResponse(res, 400, "name cannot be empty", null);
    }

    if (is_active !== undefined && typeof is_active !== "boolean") {
      return errorResponse(res, 400, "is_active must be true or false", null);
    }

    if (name !== undefined) existing.rst_name = name.trim();
    if (is_active !== undefined) existing.rst_is_active = is_active;
    if (updated_by !== undefined) existing.rst_updated_by = updated_by;

    existing.rst_updated_at = new Date();
    await existing.save();

    return successResponse(
      res,
      200,
      "HR support request type updated successfully",
      existing.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to update HR support request type");
  }
};

/* ============================================================
   DELETE / TOGGLE HR SUPPORT REQUEST TYPE ACTIVE STATUS
============================================================ */
const deleteHrSupportRequestType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid rst_id is required", null);
    }

    const existing = await HrSupportRequestType.findOne({
      where: { rst_id: id },
    });

    if (!existing) {
      return errorResponse(res, 404, "HR support request type not found", null);
    }

    const { is_active, updated_by } = req.body;

    if (typeof is_active !== "boolean") {
      return errorResponse(res, 400, "is_active must be true or false", null);
    }

    existing.rst_is_active = is_active;
    if (updated_by !== undefined && updated_by !== null) {
      existing.rst_updated_by = updated_by;
    }
    existing.rst_updated_at = new Date();
    await existing.save();

    return successResponse(
      res,
      200,
      `HR support request type ${
        is_active ? "activated" : "deactivated"
      } successfully`,
      existing.toJSON()
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to update HR support request type status"
    );
  }
};

module.exports = {
  createHrSupportRequestType,
  getHrSupportRequestTypeById,
  getAllHrSupportRequestTypes,
  getPaginatedHrSupportRequestTypes,
  updateHrSupportRequestType,
  deleteHrSupportRequestType,
};
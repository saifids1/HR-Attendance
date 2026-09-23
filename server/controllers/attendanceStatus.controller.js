const { db } = require("../db/SequelizeDB");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  handleDbError,
} = require("../utils/response");
<<<<<<< HEAD

const {
  getPaginationParams,
=======
const {
  getPaginationParams,
  buildIsActiveClause,
>>>>>>> a84cda8 (created controller and status api)
} = require("../utils/pagination");

// Create Attendance Status
const createAttendenceStatus = async (req, res) => {
  try {
<<<<<<< HEAD
    const {
      status_name,
      created_by,
      background_color,
      font_color,
    } = req.body;
=======
    const { status_name, created_by } = req.body;
>>>>>>> a84cda8 (created controller and status api)

    if (!status_name || status_name.trim() === "") {
      return errorResponse(res, 400, "status_name is required", null);
    }

    const query = `
      INSERT INTO attendence_status
<<<<<<< HEAD
        (
          status_name,
          created_by,
          background_color,
          font_color,
          created_at,
          is_active
        )
      VALUES
        ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
=======
        (status_name, created_by, created_at, is_active)
      VALUES
        ($1, $2, CURRENT_TIMESTAMP, TRUE)
>>>>>>> a84cda8 (created controller and status api)
      RETURNING *
    `;

    const result = await db.query(query, [
      status_name.trim(),
      created_by || null,
<<<<<<< HEAD
      background_color || null,
      font_color || null,
=======
>>>>>>> a84cda8 (created controller and status api)
    ]);

    return successResponse(
      res,
      201,
      "Attendance status created successfully",
      result.rows[0]
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to create attendance status"
    );
  }
};


// Get All Attendance Statuses - Paginated
const getAllAttendenceStatuses = async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req);
<<<<<<< HEAD
=======

>>>>>>> a84cda8 (created controller and status api)
    const { search = "", is_active } = req.query;

    const values = [];
    let paramIndex = 1;

    let whereClause = "WHERE 1=1";

    // Search
    if (search && search.trim() !== "") {
      whereClause += ` AND status_name ILIKE $${paramIndex}`;
      values.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Active / Inactive filter
    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      values.push(is_active === "true");
      paramIndex++;
    }

    // Count
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM attendence_status
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, values);
    const total = countResult.rows[0].total;

    // Data
    const dataQuery = `
      SELECT
        id,
        status_name,
<<<<<<< HEAD
        background_color,
        font_color,
=======
>>>>>>> a84cda8 (created controller and status api)
        created_by,
        created_at,
        updated_by,
        updated_at,
        is_active
      FROM attendence_status
      ${whereClause}
      ORDER BY id DESC
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;

    const dataValues = [
      ...values,
      limit,
      offset,
    ];

    const result = await db.query(dataQuery, dataValues);

    return paginatedResponse(
      res,
      200,
      "Attendance statuses fetched successfully",
      result.rows,
      page,
      limit,
      total
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to fetch attendance statuses"
    );
  }
};


// Get Attendance Status By ID
const getAttendenceStatusById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
<<<<<<< HEAD
      return errorResponse(
        res,
        400,
        "Attendance status id is required",
        null
      );
=======
      return errorResponse(res, 400, "Attendance status id is required", null);
>>>>>>> a84cda8 (created controller and status api)
    }

    const query = `
      SELECT
        id,
        status_name,
<<<<<<< HEAD
        background_color,
        font_color,
=======
>>>>>>> a84cda8 (created controller and status api)
        created_by,
        created_at,
        updated_by,
        updated_at,
        is_active
      FROM attendence_status
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return errorResponse(
        res,
        404,
        "Attendance status not found",
        null
      );
    }

    return successResponse(
      res,
      200,
      "Attendance status fetched successfully",
      result.rows[0]
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to fetch attendance status"
    );
  }
};


// Update Attendance Status
const updateAttendenceStatus = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD

=======
>>>>>>> a84cda8 (created controller and status api)
    const {
      status_name,
      updated_by,
      is_active,
<<<<<<< HEAD
      background_color,
      font_color,
    } = req.body;

    if (!id) {
      return errorResponse(
        res,
        400,
        "Attendance status id is required",
        null
      );
    }

    // Validate status name
=======
    } = req.body;

    if (!id) {
      return errorResponse(res, 400, "Attendance status id is required", null);
    }

>>>>>>> a84cda8 (created controller and status api)
    if (
      status_name !== undefined &&
      (!status_name || status_name.trim() === "")
    ) {
<<<<<<< HEAD
      return errorResponse(
        res,
        400,
        "status_name cannot be empty",
        null
      );
=======
      return errorResponse(res, 400, "status_name cannot be empty", null);
>>>>>>> a84cda8 (created controller and status api)
    }

    // Check existing record
    const existingQuery = `
      SELECT *
      FROM attendence_status
      WHERE id = $1
    `;

    const existingResult = await db.query(existingQuery, [id]);

    if (existingResult.rows.length === 0) {
      return errorResponse(
        res,
        404,
        "Attendance status not found",
        null
      );
    }

    const fields = [];
    const values = [];
    let paramIndex = 1;

<<<<<<< HEAD
    // Status name
=======
>>>>>>> a84cda8 (created controller and status api)
    if (status_name !== undefined) {
      fields.push(`status_name = $${paramIndex}`);
      values.push(status_name.trim());
      paramIndex++;
    }

<<<<<<< HEAD
    // Background color
    if (background_color !== undefined) {
      fields.push(`background_color = $${paramIndex}`);
      values.push(background_color || null);
      paramIndex++;
    }

    // Font color
    if (font_color !== undefined) {
      fields.push(`font_color = $${paramIndex}`);
      values.push(font_color || null);
      paramIndex++;
    }

    // Updated by
=======
>>>>>>> a84cda8 (created controller and status api)
    if (updated_by !== undefined) {
      fields.push(`updated_by = $${paramIndex}`);
      values.push(updated_by || null);
      paramIndex++;
    }

<<<<<<< HEAD
    // Active status
=======
>>>>>>> a84cda8 (created controller and status api)
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1) {
      return errorResponse(
        res,
        400,
        "No fields provided for update",
        null
      );
    }

    values.push(id);

    const query = `
      UPDATE attendence_status
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    return successResponse(
      res,
      200,
      "Attendance status updated successfully",
      result.rows[0]
    );
  } catch (error) {
    return handleDbError(
      res,
      error,
      "Failed to update attendance status"
    );
  }
};


module.exports = {
  createAttendenceStatus,
  getAllAttendenceStatuses,
  getAttendenceStatusById,
  updateAttendenceStatus,
};
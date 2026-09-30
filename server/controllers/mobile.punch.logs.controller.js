const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Op } = require("sequelize");

const db = require("../models");

const {
  ActivityLogMobile,
  Organizations,
} = db;

const baseUploadDir = path.join(__dirname, "../IHRDocument");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const employeeId =
        req.params?.emp_id ||
        req.params?.employee_id ||
        req.user?.id ||
        req.body?.emp_id ||
        req.body?.employee_id;

      if (!employeeId) {
        return cb(new Error("Employee ID not found"));
      }
      

      const orgRow = await Organizations.findOne({
        where: { or_emp_id: employeeId },
        attributes: ["or_emp_id"],
        order: [["or_id", "DESC"]],
      });

      console.log("-------------------");
      console.log(orgRow);
      console.log(employeeId);
      console.log("-------------------");

      const employeeCode = orgRow?.or_emp_id;

      if (!employeeCode) {
        return cb(new Error("Employee code not found"));
      }

      const employeeDir = path.join(
        baseUploadDir,
        String(employeeCode)
      );

      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }

      cb(null, employeeDir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `profile_${Date.now()}${ext}`
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

exports.uploadActivityImage = upload.single("image_file");

exports.createActivityLog = async (req, res) => {
  try {
    const {
      emp_id,
      from_user_emp_id,
      punch_time,
      device_ip,
      device_sn,
      punch_type,
      latitude,
      longitude,
    } = req.body;

    if (!emp_id || !punch_time) {
      return res.status(400).json({
        success: false,
        message: "emp_id and punch_time are required",
      });
    }

    let imageFilePath = null;

    if (req.file) {
      imageFilePath = path
        .relative(
          path.join(__dirname, ".."),
          req.file.path
        )
        .replace(/\\/g, "/");
    }

    const activityLog = await ActivityLogMobile.create({
      emp_id,
      from_user_emp_id: from_user_emp_id ?? null,
      punch_time,
      device_ip: device_ip ?? null,
      device_sn: device_sn ?? null,
      punch_type: punch_type ?? null,
      image_file_path: imageFilePath,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Activity log created successfully",
      data: activityLog,
    });
  } catch (error) {
    console.error("createActivityLog error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const activityLog = await ActivityLogMobile.findByPk(id);

    if (!activityLog) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: activityLog,
    });
  } catch (error) {
    console.error("getActivityLogById error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getAllActivityLogs = async (req, res) => {
  try {
    const activityLogs = await ActivityLogMobile.findAll({
      order: [["id", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: activityLogs.length,
      data: activityLogs,
    });
  } catch (error) {
    console.error("getAllActivityLogs error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getPaginatedActivityLogs = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      emp_id,
      from_user_emp_id,
      punch_type,
      from_date,
      to_date,
      sort_by,
      sort_order,
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    if (isNaN(limit) || limit < 1) {
      limit = 10;
    }

    if (limit > 100) {
      limit = 100;
    }

    const offset = (page - 1) * limit;

    const allowedSortColumns = [
      "id",
      "emp_id",
      "from_user_emp_id",
      "punch_time",
      "created_at",
      "received_time",
    ];

    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : "id";

    const sortDirection =
      sort_order?.toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    const where = {};

    if (emp_id) {
      where.emp_id = emp_id;
    }

    if (from_user_emp_id) {
      where.from_user_emp_id = from_user_emp_id;
    }

    if (
      punch_type !== undefined &&
      punch_type !== ""
    ) {
      where.punch_type = punch_type;
    }

    if (from_date || to_date) {
      where.punch_time = {};

      if (from_date) {
        where.punch_time[Op.gte] = from_date;
      }

      if (to_date) {
        where.punch_time[Op.lte] = to_date;
      }
    }

    const {
      count,
      rows,
    } = await ActivityLogMobile.findAndCountAll({
      where,
      order: [[sortColumn, sortDirection]],
      limit,
      offset,
    });

    const totalPages =
      Math.ceil(count / limit) || 1;

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      "getPaginatedActivityLogs error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.updateActivityLog = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      emp_id,
      from_user_emp_id,
      punch_time,
      device_ip,
      device_sn,
      punch_type,
      latitude,
      longitude,
    } = req.body;

    const activityLog =
      await ActivityLogMobile.findByPk(id);

    if (!activityLog) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    const updateData = {};

    const fieldMap = {
      emp_id,
      from_user_emp_id,
      punch_time,
      device_ip,
      device_sn,
      punch_type,
      latitude,
      longitude,
    };

    Object.entries(fieldMap).forEach(
      ([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }
    );

    if (req.file) {
      updateData.image_file_path = path
        .relative(
          path.join(__dirname, ".."),
          req.file.path
        )
        .replace(/\\/g, "/");
    }

    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    await activityLog.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Activity log updated successfully",
      data: activityLog,
    });
  } catch (error) {
    console.error(
      "updateActivityLog error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteActivityLog = async (req, res) => {
  try {
    const { id } = req.params;

    const activityLog =
      await ActivityLogMobile.findByPk(id);

    if (!activityLog) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    if (activityLog.image_file_path) {
      const filePath = path.join(
        __dirname,
        "..",
        activityLog.image_file_path
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await activityLog.destroy();

    return res.status(200).json({
      success: true,
      message: "Activity log deleted successfully",
      data: activityLog,
    });
  } catch (error) {
    console.error(
      "deleteActivityLog error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
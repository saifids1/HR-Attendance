const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op, literal, fn, col, QueryTypes } = require("sequelize");

const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");

const {
  Personal,
  Organizations,
  UserRoleRelation,
  UsrRoleMaster,
  Login,
  UserImage,
} = db;

const {
  successResponse,
  errorResponse,
  handleDbError,
} = require("../utils/response");

const sendNotification = require("../services/notification.services");

/* ============================================================
   LOGIN
============================================================ */

const loginController = async (req, res) => {
  try {
    let { email: identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    identifier = String(identifier).trim().toLowerCase();
    password = String(password).trim();

    const user = await Personal.findOne({
      where: {
        [Op.or]: [
          sequelize.where(
            fn("LOWER", col("personal.pr_email")),
            identifier
          ),
          sequelize.where(
            fn("LOWER", col("organizations.or_emp_id")),
            identifier
          ),
          sequelize.where(
            fn("LOWER", col("organizations.or_official_email")),
            identifier
          ),
          sequelize.where(
            fn("LOWER", col("organizations.or_official_contact")),
            identifier
          ),
        ],
      },

      include: [
        {
          model: Login,
          as: "login",
          required: true,
          attributes: ["lg_id", "pr_id", "lg_password"],
        },
        {
          model: Organizations,
          as: "organizations",
          required: false,
        },
      ],

      attributes: [
        "pr_id",
        "pr_email",
        "pr_first_name",
        "pr_last_name",
        "pr_profile_image",
        "pr_is_active",
      ],

      subQuery: false,
      limit: 1,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.pr_is_active) {
      return res.status(401).json({
        message: "User account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.login.lg_password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const org = user.organizations?.[0] || {};

    const roleRows = await UserRoleRelation.findAll({
      where: { pr_id: user.pr_id },
      include: [
        {
          model: UsrRoleMaster,
          as: "role",
          required: true,
          attributes: ["rm_role_id", "rm_role_name"],
        },
      ],
      order: [
        [{ model: UsrRoleMaster, as: "role" }, "rm_role_id", "ASC"],
      ],
    });

    const roles = roleRows.map((r) => ({
      role_id: r.role.rm_role_id,
      role_name: r.role.rm_role_name,
    }));

    const token = jwt.sign(
      {
        id: user.pr_id,
        emp_id: org.or_emp_id,
        role: roles.map((r) => r.role_name),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const decoded = jwt.decode(token);

    return res.status(200).json({
      message: "Login successful",

      token,

      expiresAt: decoded.exp * 1000,

      user: {
        id: user.pr_id,
        name: `${user.pr_first_name || ""}`,
        first_name: user.pr_first_name,
        last_name: user.pr_last_name,
        email: user.pr_email,
        emp_id: org.or_emp_id,
        official_email: org.or_official_email,
        organization_email: org.or_organization_email,
        organization_name: org.or_organization_name,
        official_contact: org.or_official_contact,
        profile_image: user.pr_profile_image,
        role: roles.map((r) => r.role_name),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


/* ============================================================
   CHANGE MY PASSWORD
============================================================ */
const changeMyPassword = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const loginRow = await Login.findOne({
      where: { pr_id: employeeId },
      include: [
        {
          model: Personal,
          as: "personal",
          required: true,
          attributes: ["pr_emp_id", "pr_first_name", "pr_last_name"],
        },
      ],
    });

    if (!loginRow) {
      return res.status(404).json({
        success: false,
        message: "Employee login not found",
      });
    }

    const isMatch = await bcrypt.compare(
      String(currentPassword),
      loginRow.lg_password
    );
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const newHashedPassword = await bcrypt.hash(String(newPassword), 10);

    loginRow.lg_password = newHashedPassword;
    await loginRow.save();

    const p = loginRow.personal || {};
    await sendNotification(
      p.pr_emp_id,
      "Your password has been changed successfully.",
      `${p.pr_first_name || ""} ${p.pr_last_name || ""}`.trim()
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/* ============================================================
   GET ALL EMPLOYEES (legacy - no filters)
============================================================ */
const getAllEmployees = async (req, res) => {
  try {
    const rows = await Personal.findAll();
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   GET ALL EMPLOYEES PAGINATED
============================================================ */
const getAllEmployeesPaginated = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    const { search = "", department, designation, status } = req.query;
    const searchValue = search.trim();

    // -------- Build WHERE for Personal --------
    const personalWhere = {};
    if (searchValue) {
      personalWhere[Op.or] = [
        { pr_first_name: { [Op.iLike]: `%${searchValue}%` } },
        { pr_last_name: { [Op.iLike]: `%${searchValue}%` } },
        { pr_email: { [Op.iLike]: `%${searchValue}%` } },
      ];
    }
    if (status !== undefined && status !== "") {
      personalWhere.pr_is_active = status === "true";
    }

    // -------- Build WHERE for Organizations (include filter) --------
    const orgWhere = {};
    if (department !== undefined && department !== "") {
      orgWhere.or_department_id = department;
    }
    if (designation !== undefined && designation !== "") {
      orgWhere.or_designation_id = designation;
    }
    if (searchValue) {
      orgWhere[Op.or] = [
        { or_emp_id: { [Op.iLike]: `%${searchValue}%` } },
        { or_organization_email: { [Op.iLike]: `%${searchValue}%` } },
      ];
    }

    /* ============================================================
       TOTAL COUNT
    ============================================================ */
    const total = await Personal.count({
      where: personalWhere,
      include:
        Object.keys(orgWhere).length > 0
          ? [{ model: Organizations, as: "organizations", required: true, where: orgWhere }]
          : [{ model: Organizations, as: "organizations", required: false }],
      distinct: true,
      col: "pr_id",
    });

    /* ============================================================
       SUMMARY
    ============================================================ */
    const allActive = await Personal.count({
      where: { ...personalWhere, pr_is_active: true },
      include: [{ model: Organizations, as: "organizations", required: false, where: orgWhere }],
      distinct: true,
      col: "pr_id",
    });

    const allInactive = await Personal.count({
      where: { ...personalWhere, pr_is_active: false },
      include: [{ model: Organizations, as: "organizations", required: false, where: orgWhere }],
      distinct: true,
      col: "pr_id",
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

    const newJoiners = await Personal.count({
      where: personalWhere,
      include: [
        {
          model: Organizations,
          as: "organizations",
          required: true,
          where: {
            ...orgWhere,
            or_is_active: true,
            or_joining_date: {
              [Op.ne]: null,
              [Op.lte]: new Date(),
              [Op.gte]: new Date(sixMonthsAgoStr),
            },
          },
        },
      ],
      distinct: true,
      col: "pr_id",
    });

    const summary = {
      total_employees: total,
      active_employees: allActive,
      inactive_employees: allInactive,
      new_joiners: newJoiners,
    };

    /* ============================================================
       FETCH DATA
    ============================================================ */
    const employees = await Personal.findAll({
      where: personalWhere,
      include: [
        {
          model: Organizations,
          as: "organizations",
          required: false,
          where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
        },
        {
          model: UserRoleRelation,
          as: "userRoles",
          required: false,
          include: [
            {
              model: UsrRoleMaster,
              as: "role",
              required: false,
              attributes: ["rm_role_id", "rm_role_name"],
            },
          ],
        },
        {
          model: Login,
          as: "login",
          required: false,
          attributes: ["lg_id", "pr_id", "lg_password"],
        },
        {
          model: UserImage,
          as: "userImages",
          required: false,
          separate: true,
          limit: 1,
          order: [["ui_id", "DESC"]],
          attributes: ["ui_id", "ui_imagepath"],
        },
      ],
      order: [
        [literal(`"organizations"."or_is_active" DESC`)],
        [literal(`NULLIF("organizations"."or_emp_id", '')::BIGINT ASC NULLS LAST`)],
        ["pr_id", "ASC"],
      ],
      limit,
      offset,
      subQuery: false,
    });

    /* ============================================================
       MAP TO OLD RESPONSE SHAPE
    ============================================================ */
    const rows = employees.map((p) => {
      const org = p.organizations || {};
      const loginRow = p.login;
      const img = (p.userImages && p.userImages[0]) || null;

      return {
        id: p.pr_id,

        personal: {
          pr_id: p.pr_id,
          email: p.pr_email,
          first_name: p.pr_first_name,
          last_name: p.pr_last_name,
          full_name: `${p.pr_first_name || ""} ${p.pr_last_name || ""}`.trim(),
          dob: p.pr_dob ? String(p.pr_dob).slice(0, 10) : null,
          gender_id: p.pr_gender_id,
          blood_group_id: p.pr_blood_group_id,
          marital_status_id: p.pr_marital_status_id,
          nationality_id: p.pr_nationality_id,
          profile_image: p.pr_profile_image,
          is_active: p.pr_is_active,
          created_at: p.pr_created_at,
          updated_at: p.pr_updated_at,
          created_by: p.pr_created_by,
          updated_by: p.pr_updated_by,
        },

        organization: org.pr_id
          ? {
              or_id: org.or_id,
              pr_id: org.pr_id,
              organization_name: org.or_organization_name,
              organization_location: org.or_organization_location,
              employee_id: org.or_emp_id,
              is_active: org.or_is_active,
              employee_type_id: org.or_employee_type_id,
              reporting_location_id: org.or_reporting_location_id,
              organization_email: org.or_organization_email,
              official_email: org.or_official_email,
              official_contact: org.or_official_contact,
              reporting_to_id: org.or_reporting_to_id,
              department_id: org.or_department_id,
              designation_id: org.or_designation_id,
              joining_date: org.or_joining_date
                ? String(org.or_joining_date).slice(0, 10)
                : null,
              leaving_date: org.or_leaving_date
                ? String(org.or_leaving_date).slice(0, 10)
                : null,
              created_at: org.or_created_at,
              updated_at: org.or_updated_at,
              created_by: org.or_created_by,
              updated_by: org.or_updated_by,
            }
          : null,

        roles: (p.userRoles || [])
          .map((r) =>
            r.role
              ? { role_id: r.role.rm_role_id, role_name: r.role.rm_role_name }
              : null
          )
          .filter(Boolean),

        login: loginRow
          ? {
              login_id: loginRow.lg_id,
              has_password:
                loginRow.lg_password !== null &&
                loginRow.lg_password !== "",
            }
          : null,

        user_image: img
          ? { image_id: img.ui_id, image_path: img.ui_imagepath }
          : null,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      summary: {
        totalEmployees: summary.total_employees,
        activeEmployees: summary.active_employees,
        inactiveEmployees: summary.inactive_employees,
        newJoiners: summary.new_joiners,
      },
      pagination: {
        currentPage: page,
        limit,
        totalRecords: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        search: searchValue || null,
        department: department || null,
        designation: designation || null,
        status:
          status === undefined || status === ""
            ? null
            : status === "true",
      },
      employees: rows,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   GET COUNTS
============================================================ */
const getCountOfEmployees = async (req, res) => {
  try {
    const totalEmployees = await Personal.count();

    const totalActiveEmployees = await Personal.count({
      where: { pr_is_active: true },
    });

    const totalInactiveEmployees = await Personal.count({
      where: { pr_is_active: false },
    });

    const currentYear = new Date().getFullYear();
    const totalNewJoiners = await Organizations.count({
      where: literal(
        `EXTRACT(YEAR FROM "organizations"."or_joining_date") = ${currentYear}`
      ),
    });

    res.status(200).json({
      totalEmployees,
      totalActiveEmployees,
      totalInactiveEmployees,
      totalNewJoiners,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   UPDATE USER ACTIVE / INACTIVE
============================================================ */
const updateUserActiveOrInActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, "Valid User ID is required", null);
    }

    const existing = await Organizations.findOne({
      where: { pr_id: id },
    });

    if (!existing) {
      return errorResponse(res, 404, "User not found", null);
    }

    const { IsActive } = req.body;

    if (typeof IsActive !== "boolean") {
      return errorResponse(res, 400, "IsActive must be true or false", null);
    }

    const updatedBy = req.user?.id || null;

    existing.or_is_active = IsActive;
    existing.or_updated_by = updatedBy;
    existing.or_updated_at = new Date();
    await existing.save();

    return successResponse(
      res,
      200,
      `User ${IsActive ? "activated" : "deactivated"} successfully`,
      existing.toJSON()
    );
  } catch (error) {
    return handleDbError(res, error, "Failed to update user status");
  }
};

/* ============================================================
   RESET PASSWORD (placeholder)
============================================================ */
const resetPassword = async (req, res) => {};

module.exports = {
  updateUserActiveOrInActiveStatus,
  loginController,
  changeMyPassword,
  getAllEmployees,
  getAllEmployeesPaginated,
  getCountOfEmployees,
  resetPassword,
};
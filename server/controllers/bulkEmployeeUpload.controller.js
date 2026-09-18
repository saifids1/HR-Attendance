const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { literal } = require("sequelize");

const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");

const {
  Personal,
  Login,
  UserRoleRelation,
  Organizations,
} = db;

const toDateOnly = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const s = String(v).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p = new Date(s);
  if (isNaN(p.getTime())) return null;
  return p.toISOString().split("T")[0];
};

const normalizeKey = (key) =>
  String(key)
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const HEADER_MAP = {
  first_name: "first_name",
  last_name: "last_name",
  email: "email",
  password: "password",
  contact_number: "contact_number",
  employee_id: "employee_id",
  joining_date: "joining_date",
  official_email_id: "official_email",
  official_contact_no: "official_contact",
};

const REQUIRED_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "password",
  "contact_number",
  "employee_id",
  "joining_date",
  "official_email",
  "official_contact",
];

exports.downloadBulkEmployeeTemplate = async (req, res) => {
  try {
    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "templates",
      "BulkEmployeeTemplate.xlsx"
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "Template file not found on server",
      });
    }

    const stat = fs.statSync(filePath);
    const fileName = "BulkEmployeeTemplate.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", stat.size);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      console.error("Template stream error:", err);
      if (!res.headersSent) {
        res
          .status(500)
          .json({ success: false, message: "Failed to stream file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Download Template Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to download template",
        error: error.message,
      });
    }
    res.end();
  }
};

exports.bulkUploadEmployees = async (req, res) => {
  const createdBy = req.user?.id;
  if (!createdBy) {
    return res
      .status(401)
      .json({ success: false, message: "User ID not found in JWT token" });
  }
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Excel file is required (field name: file)" });
  }

  let workbook;
  try {
    workbook = XLSX.readFile(req.file.path);
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    return res
      .status(400)
      .json({ success: false, message: "Unable to read Excel file" });
  } finally {
    fs.unlink(req.file.path, () => {});
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return res
      .status(400)
      .json({ success: false, message: "Excel file has no sheets" });
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
    raw: false,
  });

  if (!rawRows.length) {
    return res
      .status(400)
      .json({ success: false, message: "Excel file is empty" });
  }

  const normalizedRows = rawRows.map((row) => {
    const out = {};
    for (const key of Object.keys(row)) {
      const mapped = HEADER_MAP[normalizeKey(key)];
      if (mapped) out[mapped] = row[key];
    }
    return out;
  });

  const errors = [];
  const validRows = [];

  normalizedRows.forEach((row, i) => {
    const rowNo = i + 2;
    const missing = REQUIRED_FIELDS.filter(
      (f) => row[f] === undefined || row[f] === null || String(row[f]).trim() === ""
    );

    if (missing.length) {
      errors.push({
        row: rowNo,
        email: row.email || null,
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
      return;
    }

    const email = String(row.email).trim().toLowerCase();
    const officialEmail = String(row.official_email).trim().toLowerCase();
    const password = String(row.password);

    if (password.length < 6) {
      errors.push({
        row: rowNo,
        email,
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.push({ row: rowNo, email, message: "Invalid email format" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(officialEmail)) {
      errors.push({ row: rowNo, email, message: "Invalid official email format" });
      return;
    }

    const joiningDate = toDateOnly(row.joining_date);
    if (!joiningDate) {
      errors.push({
        row: rowNo,
        email,
        message: "Invalid joining date. Use YYYY-MM-DD or DD-MM-YYYY",
      });
      return;
    }

    validRows.push({
      rowNo,
      first_name: String(row.first_name).trim(),
      last_name: String(row.last_name).trim(),
      email,
      password,
      contact_number: String(row.contact_number).trim(),
      employee_id: String(row.employee_id).trim(),
      joining_date: joiningDate,
      official_email: officialEmail,
      official_contact: String(row.official_contact).trim(),
    });
  });

  const seenEmails = new Set();
  const seenEmpIds = new Set();
  const deduped = [];

  for (const r of validRows) {
    if (seenEmails.has(r.email)) {
      errors.push({
        row: r.rowNo,
        email: r.email,
        message: "Duplicate email inside file",
      });
      continue;
    }
    if (seenEmpIds.has(r.employee_id)) {
      errors.push({
        row: r.rowNo,
        email: r.email,
        message: "Duplicate Employee Id inside file",
      });
      continue;
    }
    seenEmails.add(r.email);
    seenEmpIds.add(r.employee_id);
    deduped.push(r);
  }

  const finalRows = [];
  for (const r of deduped) {
    const existingEmail = await Personal.findOne({
      where: literal(
        `LOWER("personal"."pr_email") = LOWER(${sequelize.escape(r.email)})`
      ),
    });
    if (existingEmail) {
      errors.push({
        row: r.rowNo,
        email: r.email,
        message: "Email already exists in system",
      });
      continue;
    }

    const existingEmpId = await Organizations.findOne({
      where: { or_emp_id: r.employee_id },
    });
    if (existingEmpId) {
      errors.push({
        row: r.rowNo,
        email: r.email,
        message: "Employee Id already exists",
      });
      continue;
    }

    finalRows.push(r);
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Bulk upload rejected. ${errors.length} row(s) failed validation. No records were inserted.`,
      summary: {
        total: rawRows.length,
        inserted: 0,
        failed: errors.length,
      },
      errors,
    });
  }

  if (!finalRows.length) {
    return res.status(400).json({
      success: false,
      message: "No valid rows to insert",
      summary: {
        total: rawRows.length,
        inserted: 0,
        failed: 0,
      },
      errors,
    });
  }

  const t = await sequelize.transaction();
  const inserted = [];

  try {
    const maxRlRow = await UserRoleRelation.findOne({
      attributes: [[literal(`COALESCE(MAX("rl_id"), 0)`), "max_rl_id"]],
      raw: true,
      transaction: t,
    });
    let nextRlId = Number(maxRlRow?.max_rl_id || 0) + 1;

    for (const r of finalRows) {
      const [{ nextval }] = await sequelize.query(
        `SELECT nextval('personal_pr_id_seq'::regclass) AS nextval`,
        { type: sequelize.QueryTypes.SELECT, transaction: t }
      );
      const newEmployeeId = Number(nextval);

      await Personal.create(
        {
          pr_id: newEmployeeId,
          pr_email: r.email,
          pr_first_name: r.first_name,
          pr_last_name: r.last_name,
          pr_contact: r.contact_number || null,
          pr_is_active: true,
          pr_created_at: new Date(),
          pr_created_by: createdBy,
        },
        { transaction: t }
      );

      const hashedPassword = await bcrypt.hash(r.password, 10);
      await Login.create(
        {
          pr_id: newEmployeeId,
          lg_password: hashedPassword,
          lg_created_by: createdBy,
          lg_created_at: new Date(),
        },
        { transaction: t }
      );

      await UserRoleRelation.create(
        {
          rl_id: nextRlId,
          pr_id: newEmployeeId,
          rl_role_id: 3,
          rl_created_by: createdBy,
          rl_created_at: new Date(),
        },
        { transaction: t }
      );
      nextRlId += 1;

      await Organizations.create(
        {
          pr_id: newEmployeeId,
          or_emp_id: r.employee_id,
          or_joining_date: r.joining_date,
          or_official_email: r.official_email,
          or_official_contact: r.official_contact,
          or_organization_email: r.official_email,
          or_is_active: true,
          or_created_at: new Date(),
          or_created_by: createdBy,
        },
        { transaction: t }
      );

      inserted.push({
        row: r.rowNo,
        employee_id: newEmployeeId,
        emp_code: r.employee_id,
        email: r.email,
      });
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("Bulk upload insert error:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message:
          "Bulk upload failed. A duplicate record was detected at database level. All records were rolled back.",
        constraint: err.parent?.constraint || null,
        fields: err.fields || null,
        error: err.message,
        summary: {
          total: rawRows.length,
          inserted: 0,
          failed: rawRows.length,
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: "Bulk insert failed. All records were rolled back.",
      error: err.message,
      summary: {
        total: rawRows.length,
        inserted: 0,
        failed: rawRows.length,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: `Bulk upload completed. Inserted ${inserted.length} of ${rawRows.length} rows.`,
    summary: {
      total: rawRows.length,
      inserted: inserted.length,
      failed: 0,
    },
    inserted,
    errors: [],
  });
};
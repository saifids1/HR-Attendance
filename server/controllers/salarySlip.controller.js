// controllers/salarySlip.controller.js
const fs = require("fs");
const path = require("path");
const { db: pool } = require("../db/connectDB");

/* ------------------------------------------------------------------ */
/*   Self-contained base upload dir                                    */
/* ------------------------------------------------------------------ */

const baseUploadDir = path.join(__dirname, "..", "IHRDocument");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

/* ------------------------------------------------------------------ */
/*   Helper: write memory buffer to employee folder                    */
/*   Returns { filename, absolutePath, webPath, size }                 */
/* ------------------------------------------------------------------ */

const saveFileToEmployeeFolder = (file, companyEmployeeId) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `Slip_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

  const employeeDir = path.join(baseUploadDir, String(companyEmployeeId));

  if (!fs.existsSync(employeeDir)) {
    fs.mkdirSync(employeeDir, { recursive: true });
  }

  const absolutePath = path.join(employeeDir, filename);
  fs.writeFileSync(absolutePath, file.buffer);

  return {
    filename,
    absolutePath,
    webPath: `/IHRDocument/${companyEmployeeId}/${filename}`,
    size: file.size,
  };
};

/* ------------------------------------------------------------------ */
/*   Helper: convert web path -> absolute disk path                    */
/* ------------------------------------------------------------------ */

const webPathToDisk = (webPath) => {
  const clean = String(webPath).replace(/^\/+/, "");
  return path.join(__dirname, "..", clean);
};

/* ------------------------------------------------------------------ */
/*   GET /department/:or_department_id/employees                       */
/* ------------------------------------------------------------------ */

const getDepartmentEmployees = async (req, res) => {
  try {
    const { or_department_id } = req.params;

    const result = await pool.query(
      `
      SELECT
        og.or_emp_id AS emp_id,
        p.pr_id,
        p.pr_first_name AS first_name,
        p.pr_last_name AS last_name
      FROM organizations og
      INNER JOIN personal p ON p.pr_id = og.pr_id
      WHERE og.or_is_active = true
        AND og.or_department_id = $1
      ORDER BY p.pr_first_name ASC, p.pr_last_name ASC
      `,
      [or_department_id]
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Get department employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch department employees",
      error: error.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/*   POST /  — Create single salary slip                               */
/* ------------------------------------------------------------------ */

const createSalarySlip = async (req, res) => {
  const client = await pool.connect();
  let writtenFile = null;

  try {
    const {
      emp_id,
      month,
      year,
      salary_slip_no,
      payroll_date,
      salary_generated_date,
      created_by,
    } = req.body;

    /* ---------------- Validation ---------------- */

    if (!salary_slip_no) {
      return res.status(400).json({ success: false, message: "Salary slip number is required" });
    }
    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Month must be between 1 and 12" });
    }
    if (!year || year < 2000) {
      return res.status(400).json({ success: false, message: "Invalid year" });
    }
    if (!emp_id) {
      return res.status(400).json({ success: false, message: "emp_id is required" });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Salary slip PDF is required (field name "pdf")',
      });
    }

    await client.query("BEGIN");

    /* ---------------- Map emp_id (or_emp_id) -> pr_id + or_emp_id ---------------- */

    const empResult = await client.query(
      `
      SELECT p.pr_id, og.or_emp_id
      FROM personal p
      INNER JOIN organizations og ON og.pr_id = p.pr_id
      WHERE og.or_emp_id = $1
      LIMIT 1
      `,
      [emp_id]
    );

    if (empResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const { pr_id: employeeId, or_emp_id: companyEmployeeId } = empResult.rows[0];

    /* ---------------- Duplicate checks ---------------- */

    const dupNo = await client.query(
      `SELECT salary_slip_id FROM salary_slips WHERE salary_slip_no = $1 LIMIT 1`,
      [salary_slip_no]
    );
    if (dupNo.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Salary slip number already exists" });
    }

    const dupPeriod = await client.query(
      `
      SELECT salary_slip_id FROM salary_slips
      WHERE employee_id = $1 AND month = $2 AND year = $3
      LIMIT 1
      `,
      [employeeId, month, year]
    );
    if (dupPeriod.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Salary slip already exists for this employee, month and year",
      });
    }

    /* ---------------- Save file ---------------- */

    const saved = saveFileToEmployeeFolder(req.file, companyEmployeeId);
    writtenFile = saved.absolutePath;

    /* ---------------- Insert slip ---------------- */

    const slipResult = await client.query(
      `
      INSERT INTO salary_slips (
        employee_id, month, year, salary_slip_no,
        payroll_date, salary_generated_date,
        is_published, created_by, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        employeeId, month, year, salary_slip_no,
        payroll_date || null,
        salary_generated_date || null,
        created_by || null,
      ]
    );

    const salarySlip = slipResult.rows[0];

    /* ---------------- Insert file (WEB PATH) ---------------- */

    const fileResult = await client.query(
      `
      INSERT INTO salary_slip_files (
        salary_slip_id, file_path, file_size,
        created_by, created_at
      )
      VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [salarySlip.salary_slip_id, saved.webPath, saved.size, created_by || null]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Salary slip created successfully",
      data: { salarySlip, file: fileResult.rows[0] },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (e) { console.error("Rollback error:", e); }
    console.error("Create salary slip error:", error);

    if (writtenFile && fs.existsSync(writtenFile)) {
      try { fs.unlinkSync(writtenFile); } catch (e) { console.error(e); }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ */
/*   POST /bulk — Create multiple salary slips                         */
/* ------------------------------------------------------------------ */

const createMultipleSalarySlips = async (req, res) => {
  const client = await pool.connect();
  const writtenFiles = [];

  try {
    let salarySlips = req.body?.salary_slips;

    if (!salarySlips) {
      return res.status(400).json({ success: false, message: "salary_slips data is required" });
    }

    if (typeof salarySlips === "string") {
      try { salarySlips = JSON.parse(salarySlips); }
      catch {
        return res.status(400).json({ success: false, message: "Invalid salary_slips JSON format" });
      }
    }

    if (!Array.isArray(salarySlips) || salarySlips.length === 0) {
      return res.status(400).json({ success: false, message: "salary_slips must be a non-empty array" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Salary slip PDF files are required" });
    }

    if (req.files.length !== salarySlips.length) {
      return res.status(400).json({
        success: false,
        message: "Number of salary slip records and PDF files must be the same",
      });
    }

    await client.query("BEGIN");

    const created = [];

    for (let i = 0; i < salarySlips.length; i++) {
      const slip = salarySlips[i];
      const file = req.files[i];

      const {
        emp_id, month, year, salary_slip_no,
        payroll_date, salary_generated_date, created_by,
      } = slip;

      if (!emp_id) throw new Error(`Employee ID missing at index ${i + 1}`);
      if (!month || month < 1 || month > 12) throw new Error(`Invalid month at index ${i + 1}`);
      if (!year || year < 2000) throw new Error(`Invalid year at index ${i + 1}`);
      if (!salary_slip_no) throw new Error(`Salary slip number missing at index ${i + 1}`);

      const empResult = await client.query(
        `
        SELECT p.pr_id, og.or_emp_id
        FROM personal p
        INNER JOIN organizations og ON og.pr_id = p.pr_id
        WHERE og.or_emp_id = $1
        LIMIT 1
        `,
        [emp_id]
      );

      if (empResult.rows.length === 0) throw new Error(`Employee ${emp_id} not found`);

      const { pr_id: employeeId, or_emp_id: companyEmployeeId } = empResult.rows[0];

      const dupNo = await client.query(
        `SELECT salary_slip_id FROM salary_slips WHERE salary_slip_no = $1 LIMIT 1`,
        [salary_slip_no]
      );
      if (dupNo.rows.length > 0) throw new Error(`Salary slip number ${salary_slip_no} already exists`);

      const dupPeriod = await client.query(
        `
        SELECT salary_slip_id FROM salary_slips
        WHERE employee_id = $1 AND month = $2 AND year = $3
        LIMIT 1
        `,
        [employeeId, month, year]
      );
      if (dupPeriod.rows.length > 0) {
        throw new Error(`Salary slip already exists for employee ${emp_id} for ${month}/${year}`);
      }

      const saved = saveFileToEmployeeFolder(file, companyEmployeeId);
      writtenFiles.push(saved.absolutePath);

      const slipResult = await client.query(
        `
        INSERT INTO salary_slips (
          employee_id, month, year, salary_slip_no,
          payroll_date, salary_generated_date,
          is_published, created_by, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7,CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [
          employeeId, month, year, salary_slip_no,
          payroll_date || null,
          salary_generated_date || null,
          created_by || null,
        ]
      );

      const salarySlip = slipResult.rows[0];

      const fileResult = await client.query(
        `
        INSERT INTO salary_slip_files (
          salary_slip_id, file_path, file_size,
          created_by, created_at
        )
        VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [salarySlip.salary_slip_id, saved.webPath, saved.size, created_by || null]
      );

      created.push({ salarySlip, file: fileResult.rows[0] });
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: `${created.length} salary slips created successfully`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (rbErr) { console.error("Rollback error:", rbErr); }
    console.error("Create multiple salary slips error:", error);

    for (const p of writtenFiles) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { console.error("Failed to delete file:", p, e); }
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create salary slips",
    });
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ */
/*   GET /  — All salary slips                                         */
/* ------------------------------------------------------------------ */

const getSalarySlips = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ss.salary_slip_id,
        og.or_emp_id AS emp_id,
        ss.month, ss.year, ss.salary_slip_no,
        ss.payroll_date, ss.salary_generated_date,
        ss.is_published, ss.created_by, ss.created_at,
        ss.updated_by, ss.updated_at,
        CONCAT_WS(' ', p.pr_first_name, p.pr_last_name) AS employee_name,
        ssf.salary_slip_file_id, ssf.file_path, ssf.file_size
      FROM salary_slips ss
      LEFT JOIN personal p ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og ON og.pr_id = p.pr_id
      LEFT JOIN LATERAL (
        SELECT salary_slip_file_id, file_path, file_size
        FROM salary_slip_files
        WHERE salary_slip_id = ss.salary_slip_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ssf ON TRUE
      ORDER BY ss.year DESC, ss.month DESC, ss.salary_slip_id DESC
    `);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get salary slips error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary slips",
      error: error.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/*   GET /:id  — Single salary slip                                    */
/* ------------------------------------------------------------------ */

const getSalarySlipById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        ss.salary_slip_id,
        og.or_emp_id AS emp_id,
        ss.month, ss.year, ss.salary_slip_no,
        ss.payroll_date, ss.salary_generated_date,
        ss.is_published, ss.created_by, ss.created_at,
        ss.updated_by, ss.updated_at,
        CONCAT_WS(' ', p.pr_first_name, p.pr_last_name) AS employee_name,
        ssf.salary_slip_file_id, ssf.file_path, ssf.file_size
      FROM salary_slips ss
      LEFT JOIN personal p ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og ON og.pr_id = p.pr_id
      LEFT JOIN LATERAL (
        SELECT salary_slip_file_id, file_path, file_size
        FROM salary_slip_files
        WHERE salary_slip_id = ss.salary_slip_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ssf ON TRUE
      WHERE ss.salary_slip_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Salary slip not found" });
    }

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Get salary slip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary slip",
      error: error.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/*   PUT /:id  — Update salary slip                                    */
/* ------------------------------------------------------------------ */

const updateSalarySlip = async (req, res) => {
  const client = await pool.connect();
  let writtenFile = null;

  try {
    const { id } = req.params;
    const {
      emp_id, month, year, salary_slip_no,
      payroll_date, salary_generated_date, updated_by,
    } = req.body;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT * FROM salary_slips WHERE salary_slip_id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Salary slip not found" });
    }

    const existingSlip = existingResult.rows[0];

    /* ---------------- Resolve employee ---------------- */

    let resolvedEmployeeId = existingSlip.employee_id;

    if (emp_id) {
      const empResult = await client.query(
        `
        SELECT p.pr_id FROM personal p
        INNER JOIN organizations og ON og.pr_id = p.pr_id
        WHERE og.or_emp_id = $1
        LIMIT 1
        `,
        [emp_id]
      );
      if (empResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Employee not found" });
      }
      resolvedEmployeeId = empResult.rows[0].pr_id;
    }

    /* ---------------- Duplicate checks ---------------- */

    const finalSlipNo = salary_slip_no ?? existingSlip.salary_slip_no;
    const finalMonth = month ?? existingSlip.month;
    const finalYear = year ?? existingSlip.year;

    if (salary_slip_no) {
      const dupNo = await client.query(
        `
        SELECT salary_slip_id FROM salary_slips
        WHERE salary_slip_no = $1 AND salary_slip_id != $2
        LIMIT 1
        `,
        [salary_slip_no, id]
      );
      if (dupNo.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Salary slip number already exists" });
      }
    }

    if (emp_id && month && year) {
      const dupPeriod = await client.query(
        `
        SELECT salary_slip_id FROM salary_slips
        WHERE employee_id = $1 AND month = $2 AND year = $3
          AND salary_slip_id != $4
        LIMIT 1
        `,
        [resolvedEmployeeId, month, year, id]
      );
      if (dupPeriod.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Salary slip already exists for this employee, month and year",
        });
      }
    }

    /* ---------------- Update ---------------- */

    const updatedResult = await client.query(
      `
      UPDATE salary_slips
      SET
        employee_id = $1,
        month = $2,
        year = $3,
        salary_slip_no = $4,
        payroll_date = $5,
        salary_generated_date = $6,
        updated_by = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE salary_slip_id = $8
      RETURNING *
      `,
      [
        resolvedEmployeeId,
        finalMonth,
        finalYear,
        finalSlipNo,
        payroll_date ?? existingSlip.payroll_date,
        salary_generated_date ?? existingSlip.salary_generated_date,
        updated_by || null,
        id,
      ]
    );

    let updatedFile = null;

    /* ---------------- Replace PDF if uploaded ---------------- */

    if (req.file) {
      const empForFile = await client.query(
        `SELECT or_emp_id FROM organizations WHERE pr_id = $1 LIMIT 1`,
        [resolvedEmployeeId]
      );
      const companyEmployeeId = empForFile.rows[0].or_emp_id;

      const saved = saveFileToEmployeeFolder(req.file, companyEmployeeId);
      writtenFile = saved.absolutePath;

      const oldFileResult = await client.query(
        `
        SELECT * FROM salary_slip_files
        WHERE salary_slip_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [id]
      );

      const newFileResult = await client.query(
        `
        INSERT INTO salary_slip_files (
          salary_slip_id, file_path, file_size,
          created_by, created_at
        )
        VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [id, saved.webPath, saved.size, updated_by || null]
      );

      updatedFile = newFileResult.rows[0];

      if (oldFileResult.rows.length > 0) {
        const oldFile = oldFileResult.rows[0];

        await client.query(
          `DELETE FROM salary_slip_files WHERE salary_slip_file_id = $1`,
          [oldFile.salary_slip_file_id]
        );

        if (oldFile.file_path) {
          const disk = webPathToDisk(oldFile.file_path);
          if (fs.existsSync(disk)) {
            try { fs.unlinkSync(disk); } catch (e) { console.error("Failed to delete old PDF:", e); }
          }
        }
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Salary slip updated successfully",
      data: { salarySlip: updatedResult.rows[0], file: updatedFile },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (e) { console.error(e); }
    console.error("Update salary slip error:", error);

    if (writtenFile && fs.existsSync(writtenFile)) {
      try { fs.unlinkSync(writtenFile); } catch (e) { console.error(e); }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ */
/*   DELETE /:id  — Delete salary slip                                 */
/* ------------------------------------------------------------------ */

const deleteSalarySlip = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const fileResult = await client.query(
      `SELECT file_path FROM salary_slip_files WHERE salary_slip_id = $1`,
      [id]
    );

    const deleteResult = await client.query(
      `DELETE FROM salary_slips WHERE salary_slip_id = $1 RETURNING salary_slip_id`,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Salary slip not found" });
    }

    await client.query("COMMIT");

    for (const file of fileResult.rows) {
      if (file.file_path) {
        const disk = webPathToDisk(file.file_path);
        if (fs.existsSync(disk)) {
          try { fs.unlinkSync(disk); } catch (e) { console.error("Failed to delete PDF:", e); }
        }
      }
    }

    return res.status(200).json({ success: true, message: "Salary slip deleted successfully" });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (e) { console.error(e); }
    console.error("Delete salary slip error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/* ------------------------------------------------------------------ */
/*   GET /:id/file  — Stream PDF                                       */
/* ------------------------------------------------------------------ */

const getSalarySlipPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT ss.salary_slip_id, ss.salary_slip_no, ssf.file_path
      FROM salary_slips ss
      INNER JOIN salary_slip_files ssf ON ssf.salary_slip_id = ss.salary_slip_id
      WHERE ss.salary_slip_id = $1
      ORDER BY ssf.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Salary slip PDF not found" });
    }

    const filePath = result.rows[0].file_path;
    const absolutePath = webPathToDisk(filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: "PDF file does not exist on server" });
    }

    res.setHeader("Content-Type", "application/pdf");
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error("Get salary slip PDF error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load salary slip PDF",
      error: error.message,
    });
  }
};


const getSalarySlipsPaginated = async (req, res) => {
  try {
    /* ---------------- Parse & sanitize query ---------------- */

    let {
      page = 1,
      limit = 10,
      search,
      emp_id,
      month,
      year,
      is_published,
      sort_by = "created_at",
      sort_order = "DESC",
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 10000;

    const offset = (page - 1) * limit;

    /* ---------------- Whitelist sort columns (prevent SQL injection) ---------------- */

    const allowedSortColumns = [
      "created_at",
      "updated_at",
      "salary_slip_id",
      "month",
      "year",
      "salary_slip_no",
      "employee_name",
    ];

    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : "created_at";

    const sortDir = String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    /* ---------------- Build WHERE clauses dynamically ---------------- */

    const whereClauses = [];
    const whereValues = [];
    let paramIndex = 1;

    if (emp_id) {
      whereClauses.push(`og.or_emp_id = $${paramIndex++}`);
      whereValues.push(emp_id);
    }

    if (month) {
      whereClauses.push(`ss.month = $${paramIndex++}`);
      whereValues.push(parseInt(month, 10));
    }

    if (year) {
      whereClauses.push(`ss.year = $${paramIndex++}`);
      whereValues.push(parseInt(year, 10));
    }

    if (is_published !== undefined && is_published !== "") {
      whereClauses.push(`ss.is_published = $${paramIndex++}`);
      whereValues.push(is_published === "true" || is_published === true);
    }

    if (search && String(search).trim() !== "") {
      whereClauses.push(
        `(ss.salary_slip_no ILIKE $${paramIndex} OR
          CONCAT_WS(' ', p.pr_first_name, p.pr_last_name) ILIKE $${paramIndex})`
      );
      whereValues.push(`%${String(search).trim()}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    /* ---------------- Count total ---------------- */

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM salary_slips ss
      LEFT JOIN personal p ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og ON og.pr_id = p.pr_id
      ${whereSQL}
    `;

    const countResult = await pool.query(countQuery, whereValues);
    const total = countResult.rows[0].total;

    const totalPages = Math.ceil(total / limit) || 0;

    /* ---------------- Fetch page ---------------- */

    const dataValues = [...whereValues, limit, offset];

    // Handle sorting on employee_name (alias)
    let orderByClause;
    if (sortColumn === "employee_name") {
      orderByClause = `ORDER BY employee_name ${sortDir}`;
    } else {
      orderByClause = `ORDER BY ss.${sortColumn} ${sortDir}`;
    }

    const dataQuery = `
      SELECT
        ss.salary_slip_id,
        og.or_emp_id AS emp_id,
        ss.month,
        ss.year,
        ss.salary_slip_no,
        ss.payroll_date,
        ss.salary_generated_date,
        ss.is_published,
        ss.created_by,
        ss.created_at,
        ss.updated_by,
        ss.updated_at,
        CONCAT_WS(' ', p.pr_first_name, p.pr_last_name) AS employee_name,
        ssf.salary_slip_file_id,
        ssf.file_path,
        ssf.file_size
      FROM salary_slips ss
      LEFT JOIN personal p ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og ON og.pr_id = p.pr_id
      LEFT JOIN LATERAL (
        SELECT salary_slip_file_id, file_path, file_size
        FROM salary_slip_files
        WHERE salary_slip_id = ss.salary_slip_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ssf ON TRUE
      ${whereSQL}
      ${orderByClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataResult = await pool.query(dataQuery, dataValues);

    /* ---------------- Build response ---------------- */

    return res.status(200).json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
      },
      filters: {
        search: search || null,
        emp_id: emp_id || null,
        month: month ? parseInt(month, 10) : null,
        year: year ? parseInt(year, 10) : null,
        is_published:
          is_published !== undefined && is_published !== ""
            ? is_published === "true" || is_published === true
            : null,
        sort_by: sortColumn,
        sort_order: sortDir,
      },
    });
  } catch (error) {
    console.error("Get paginated salary slips error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch paginated salary slips",
      error: error.message,
    });
  }
};

/* ------------------------------------------------------------------ */
/*   Exports                                                           */
/* ------------------------------------------------------------------ */


module.exports = {
  getDepartmentEmployees,
  createSalarySlip,
  createMultipleSalarySlips,
  getSalarySlips,
  getSalarySlipById,
  updateSalarySlip,
  deleteSalarySlip,
  getSalarySlipsPaginated,
  getSalarySlipPdf,
};
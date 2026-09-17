const { Op, Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { db: pool } = require("../db/connectDB");
const {
  Personal,
  Organizations,
  SalarySlips,
  SalarySlipFiles,
} = require("../models");

const baseUploadDir = path.join(__dirname, "..", "IHRDocument");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

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

const webPathToDisk = (webPath) => {
  const clean = String(webPath).replace(/^\/+/, "");
  return path.join(__dirname, "..", clean);
};

const getDepartmentEmployees = async (req, res) => {
  try {
    const { or_department_id } = req.params;

    const employees = await Organizations.findAll({
      where: {
        or_is_active: true,
        or_department_id,
      },
      attributes: ["or_emp_id", "pr_id"],
      include: [
        {
          model: Personal,
          as: "personal",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
          ],
          required: true,
        },
      ],
      order: [
        [
          { model: Personal, as: "personal" },
          "pr_first_name",
          "ASC",
        ],
        [
          { model: Personal, as: "personal" },
          "pr_last_name",
          "ASC",
        ],
      ],
    });

    const data = employees.map((employee) => ({
      emp_id: employee.or_emp_id,
      pr_id: employee.pr_id,
      first_name: employee.personal?.pr_first_name || null,
      last_name: employee.personal?.pr_last_name || null,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get department employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch department employees",
      error: error.message,
    });
  }
};

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

    const saved = saveFileToEmployeeFolder(req.file, companyEmployeeId);
    writtenFile = saved.absolutePath;

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

const getSalarySlips = async (req, res) => {
  try {
    const salarySlips = await SalarySlips.findAll({
      include: [
        {
          model: Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
          ],
          include: [
            {
              model: Organizations,
              as: "organization",
              attributes: ["or_emp_id", "or_department_id"],
              required: false,
            },
          ],
        },
        {
          model: SalarySlipFiles,
          as: "files",
          attributes: [
            "salary_slip_file_id",
            "file_path",
            "file_size",
            "created_at",
          ],
          required: false,
          separate: true,
          order: [["created_at", "DESC"]],
          limit: 1,
        },
      ],
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
        ["salary_slip_id", "DESC"],
      ],
    });

    const data = salarySlips.map((slip) => {
      const employee = slip.employee;
      const organization = employee?.organization;
      const file = slip.files?.[0] || null;

      return {
        salary_slip_id: slip.salary_slip_id,
        emp_id: organization?.or_emp_id || null,
        department_id: organization?.or_department_id || null,
        month: slip.month,
        year: slip.year,
        salary_slip_no: slip.salary_slip_no,
        payroll_date: slip.payroll_date,
        salary_generated_date: slip.salary_generated_date,
        is_published: slip.is_published,
        created_by: slip.created_by,
        created_at: slip.created_at,
        updated_by: slip.updated_by,
        updated_at: slip.updated_at,
        employee_name: employee
          ? `${employee.pr_first_name || ""} ${employee.pr_last_name || ""}`.trim()
          : null,
        salary_slip_file_id: file?.salary_slip_file_id || null,
        file_path: file?.file_path || null,
        file_size: file?.file_size || null,
      };
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
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

const getSalarySlipById = async (req, res) => {
  try {
    const { id } = req.params;

    const salarySlip = await SalarySlips.findByPk(id, {
      include: [
        {
          model: Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
          ],
          include: [
            {
              model: Organizations,
              as: "organization",
              attributes: ["or_emp_id", "or_department_id"],
              required: false,
            },
          ],
        },
        {
          model: SalarySlipFiles,
          as: "files",
          attributes: [
            "salary_slip_file_id",
            "file_path",
            "file_size",
            "created_at",
          ],
          required: false,
          separate: true,
          order: [["created_at", "DESC"]],
          limit: 1,
        },
      ],
    });

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    const employee = salarySlip.employee;
    const organization = employee?.organization;
    const file = salarySlip.files?.[0] || null;

    const data = {
      salary_slip_id: salarySlip.salary_slip_id,
      emp_id: organization?.or_emp_id || null,
      department_id: organization?.or_department_id || null,
      month: salarySlip.month,
      year: salarySlip.year,
      salary_slip_no: salarySlip.salary_slip_no,
      payroll_date: salarySlip.payroll_date,
      salary_generated_date: salarySlip.salary_generated_date,
      is_published: salarySlip.is_published,
      created_by: salarySlip.created_by,
      created_at: salarySlip.created_at,
      updated_by: salarySlip.updated_by,
      updated_at: salarySlip.updated_at,
      employee_name: employee
        ? `${employee.pr_first_name || ""} ${employee.pr_last_name || ""}`.trim()
        : null,
      salary_slip_file_id: file?.salary_slip_file_id || null,
      file_path: file?.file_path || null,
      file_size: file?.file_size || null,
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get salary slip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary slip",
      error: error.message,
    });
  }
};

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

const getSalarySlipPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const salarySlip = await SalarySlips.findByPk(id, {
      attributes: [
        "salary_slip_id",
        "salary_slip_no",
      ],
      include: [
        {
          model: SalarySlipFiles,
          as: "files",
          attributes: [
            "salary_slip_file_id",
            "file_path",
          ],
          required: true,
          separate: true,
          order: [["created_at", "DESC"]],
          limit: 1,
        },
      ],
    });

    if (!salarySlip || !salarySlip.files?.length) {
      return res.status(404).json({
        success: false,
        message: "Salary slip PDF not found",
      });
    }

    const filePath = salarySlip.files[0].file_path;
    const absolutePath = webPathToDisk(filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "PDF file does not exist on server",
      });
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
    let {
      page = 1,
      limit = 10,
      search,
      emp_id,
      month,
      year,
      department,
      is_published,
      sort_by = "created_at",
      sort_order = "DESC",
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
      limit = 10000;
    }

    const offset = (page - 1) * limit;

    const where = {};

    if (month) {
      where.month = parseInt(month, 10);
    }

    if (year) {
      where.year = parseInt(year, 10);
    }

    if (is_published !== undefined && is_published !== "") {
      where.is_published =
        is_published === "true" || is_published === true;
    }

    const employeeWhere = {};

    if (search && String(search).trim() !== "") {
      employeeWhere[Op.or] = [
        {
          pr_first_name: {
            [Op.iLike]: `%${String(search).trim()}%`,
          },
        },
        {
          pr_last_name: {
            [Op.iLike]: `%${String(search).trim()}%`,
          },
        },
      ];
    }

    const organizationWhere = {};

    if (emp_id) {
      organizationWhere.or_emp_id = emp_id;
    }

    if (department) {
      organizationWhere.or_department_id = parseInt(
        department,
        10
      );
    }

    const allowedSortColumns = [
      "created_at",
      "updated_at",
      "salary_slip_id",
      "month",
      "year",
      "salary_slip_no",
    ];

    const sortColumn = allowedSortColumns.includes(sort_by)
      ? sort_by
      : "created_at";

    const sortDir =
      String(sort_order).toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const result = await SalarySlips.findAndCountAll({
      where,

      include: [
        {
          model: Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
          ],
          where:
            Object.keys(employeeWhere).length > 0
              ? employeeWhere
              : undefined,
          required:
            Object.keys(employeeWhere).length > 0 ||
            Object.keys(organizationWhere).length > 0,

          include: [
            {
              model: Organizations,
              as: "organization",
              attributes: [
                "or_emp_id",
                "or_department_id",
              ],
              where:
                Object.keys(organizationWhere).length > 0
                  ? organizationWhere
                  : undefined,
              required:
                Object.keys(organizationWhere).length > 0,
            },
          ],
        },
        {
          model: SalarySlipFiles,
          as: "files",
          attributes: [
            "salary_slip_file_id",
            "file_path",
            "file_size",
            "created_at",
          ],
          required: false,
          separate: true,
          order: [["created_at", "DESC"]],
          limit: 1,
        },
      ],

      distinct: true,

      order: [[sortColumn, sortDir]],

      limit,
      offset,
    });

    const data = result.rows.map((slip) => {
      const employee = slip.employee;
      const organization = employee?.organization;
      const file = slip.files?.[0] || null;

      return {
        salary_slip_id: slip.salary_slip_id,
        emp_id: organization?.or_emp_id || null,
        department_id:
          organization?.or_department_id || null,
        month: slip.month,
        year: slip.year,
        salary_slip_no: slip.salary_slip_no,
        payroll_date: slip.payroll_date,
        salary_generated_date:
          slip.salary_generated_date,
        is_published: slip.is_published,
        created_by: slip.created_by,
        created_at: slip.created_at,
        updated_by: slip.updated_by,
        updated_at: slip.updated_at,
        employee_name: employee
          ? `${employee.pr_first_name || ""} ${
              employee.pr_last_name || ""
            }`.trim()
          : null,
        salary_slip_file_id:
          file?.salary_slip_file_id || null,
        file_path: file?.file_path || null,
        file_size: file?.file_size || null,
      };
    });

    const total = result.count;
    const totalPages = Math.ceil(total / limit) || 0;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
        next_page:
          page < totalPages ? page + 1 : null,
        prev_page:
          page > 1 ? page - 1 : null,
      },
      filters: {
        search: search || null,
        emp_id: emp_id || null,
        month: month ? parseInt(month, 10) : null,
        year: year ? parseInt(year, 10) : null,
        department: department
          ? parseInt(department, 10)
          : null,
        is_published:
          is_published !== undefined &&
          is_published !== ""
            ? is_published === "true" ||
              is_published === true
            : null,
        sort_by: sortColumn,
        sort_order: sortDir,
      },
    });
  } catch (error) {
    console.error(
      "Get paginated salary slips error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch paginated salary slips",
      error: error.message,
    });
  }
};

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
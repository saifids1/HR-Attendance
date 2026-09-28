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

const getDepartmentEmployeesSalarySlipsV2 = async (req, res) => {
  try {
    let {
      or_department_id,
      month,
      year,
      page = 1,
      limit = 10,
      search,
      is_published,
      sort_order = "ASC",
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

    const organizationWhere = {
      or_is_active: true,
    };

    if (
      or_department_id !== undefined &&
      or_department_id !== null &&
      String(or_department_id).trim() !== ""
    ) {
      const departmentId = parseInt(or_department_id, 10);

      if (isNaN(departmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID",
        });
      }

      organizationWhere.or_department_id = departmentId;
    }

    if (search !== undefined && search !== null && String(search).trim() !== "") {
      const searchValue = String(search).trim();

      organizationWhere[Op.or] = [
        { or_emp_id: { [Op.iLike]: `%${searchValue}%` } },
        { "$personal.pr_first_name$": { [Op.iLike]: `%${searchValue}%` } },
        { "$personal.pr_last_name$": { [Op.iLike]: `%${searchValue}%` } },
        Sequelize.where(
          Sequelize.fn(
            "concat",
            Sequelize.col("personal.pr_first_name"),
            " ",
            Sequelize.col("personal.pr_last_name")
          ),
          { [Op.iLike]: `%${searchValue}%` }
        ),
      ];
    }

    const employeeResult = await Organizations.findAndCountAll({
      where: organizationWhere,
      attributes: ["or_emp_id", "pr_id", "or_department_id"],
      include: [
        {
          model: Personal,
          as: "personal",
          attributes: ["pr_id", "pr_first_name", "pr_last_name"],
          required: true,
        },
      ],
      order: [
        [{ model: Personal, as: "personal" }, "pr_first_name", String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC"],
        [{ model: Personal, as: "personal" }, "pr_last_name", String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC"],
      ],
      limit,
      offset,
      distinct: true,
      subQuery: false,
    });

    const employees = employeeResult.rows;

    const employeeIds = employees
      .map((employee) => employee.pr_id)
      .filter((id) => id !== null && id !== undefined);

    let salarySlips = [];

    if (employeeIds.length > 0) {
      const salaryWhere = {
        employee_id: {
          [Op.in]: employeeIds,
        },
      };

      if (month !== undefined && month !== null && String(month).trim() !== "") {
        const parsedMonth = parseInt(month, 10);

        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
          return res.status(400).json({
            success: false,
            message: "Month must be between 1 and 12",
          });
        }

        salaryWhere.month = parsedMonth;
      }

      if (year !== undefined && year !== null && String(year).trim() !== "") {
        const parsedYear = parseInt(year, 10);

        if (isNaN(parsedYear)) {
          return res.status(400).json({
            success: false,
            message: "Invalid year",
          });
        }

        salaryWhere.year = parsedYear;
      }

      if (is_published !== undefined && is_published !== null && String(is_published).trim() !== "") {
        const publishedValue = String(is_published).toLowerCase();

        if (publishedValue !== "true" && publishedValue !== "false") {
          return res.status(400).json({
            success: false,
            message: "is_published must be true or false",
          });
        }

        salaryWhere.is_published = publishedValue === "true";
      }

      salarySlips = await SalarySlips.findAll({
        where: salaryWhere,
        include: [
          {
            model: SalarySlipFiles,
            as: "files",
            attributes: ["salary_slip_file_id", "salary_slip_id", "file_path", "file_size", "created_by", "created_at", "updated_by", "updated_at"],
            required: false,
            separate: true,
            order: [["created_at", "DESC"]],
            limit: 1,
          },
        ],
        order: [["created_at", "DESC"]],
      });
    }

    const salarySlipMap = new Map();

    salarySlips.forEach((slip) => {
      if (!salarySlipMap.has(slip.employee_id)) {
        salarySlipMap.set(slip.employee_id, slip);
      }
    });

    const data = employees.map((employee) => {
      const personal = employee.personal;
      const salarySlip = salarySlipMap.get(employee.pr_id) || null;
      const file = salarySlip?.files?.[0] || null;

      return {
        emp_id: employee.or_emp_id || null,
        pr_id: employee.pr_id || null,
        department_id: employee.or_department_id || null,
        first_name: personal?.pr_first_name || null,
        last_name: personal?.pr_last_name || null,
        employee_name: personal
          ? `${personal.pr_first_name || ""} ${personal.pr_last_name || ""}`.trim()
          : null,
        salary_slip: salarySlip
          ? {
              salary_slip_id: salarySlip.salary_slip_id,
              employee_id: salarySlip.employee_id,
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
              file: file
                ? {
                    salary_slip_file_id: file.salary_slip_file_id,
                    salary_slip_id: file.salary_slip_id,
                    file_path: file.file_path,
                    file_size: file.file_size,
                    created_by: file.created_by,
                    created_at: file.created_at,
                    updated_by: file.updated_by,
                    updated_at: file.updated_at,
                  }
                : null,
            }
          : null,
      };
    });

    const total = employeeResult.count;
    const totalPages = Math.ceil(total / limit) || 0;

    return res.status(200).json({
      success: true,
      message: "Employees and salary slip details fetched successfully",
      data,
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
        department_id:
          or_department_id !== undefined && or_department_id !== null && String(or_department_id).trim() !== ""
            ? parseInt(or_department_id, 10)
            : null,
        month: month !== undefined && month !== null && String(month).trim() !== "" ? parseInt(month, 10) : null,
        year: year !== undefined && year !== null && String(year).trim() !== "" ? parseInt(year, 10) : null,
        search: search !== undefined && search !== null && String(search).trim() !== "" ? String(search).trim() : null,
        is_published:
          is_published !== undefined && is_published !== null && String(is_published).trim() !== ""
            ? String(is_published).toLowerCase() === "true"
            : null,
        sort_order: String(sort_order).toUpperCase() === "DESC" ? "DESC" : "ASC",
      },
    });
  } catch (error) {
    console.error("Get employees salary slips V2 error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees and salary slip details",
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
      return res.status(400).json({
        success: false,
        message: "Salary slip number is required",
      });
    }

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    if (!year || year < 2000) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    if (!emp_id) {
      return res.status(400).json({
        success: false,
        message: "emp_id is required",
      });
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

      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const {
      pr_id: employeeId,
      or_emp_id: companyEmployeeId,
    } = empResult.rows[0];

    const dupNo = await client.query(
      `
      SELECT salary_slip_id
      FROM salary_slips
      WHERE salary_slip_no = $1
      LIMIT 1
      `,
      [salary_slip_no]
    );

    if (dupNo.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Salary slip number already exists",
      });
    }

    const dupPeriod = await client.query(
      `
      SELECT salary_slip_id
      FROM salary_slips
      WHERE employee_id = $1
        AND month = $2
        AND year = $3
      LIMIT 1
      `,
      [employeeId, month, year]
    );

    if (dupPeriod.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "Salary slip already exists for this employee, month and year",
      });
    }

    const saved = saveFileToEmployeeFolder(
      req.file,
      companyEmployeeId
    );

    writtenFile = saved.absolutePath;

    const slipResult = await client.query(
      `
      INSERT INTO salary_slips (
        employee_id,
        month,
        year,
        salary_slip_no,
        payroll_date,
        salary_generated_date,
        is_published,
        created_by,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        FALSE,
        $7,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        employeeId,
        month,
        year,
        salary_slip_no,
        payroll_date || null,
        salary_generated_date || null,
        created_by || null,
      ]
    );

    const salarySlip = slipResult.rows[0];

    const fileResult = await client.query(
      `
      INSERT INTO salary_slip_files (
        salary_slip_id,
        file_path,
        file_size,
        created_by,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        salarySlip.salary_slip_id,
        saved.webPath,
        saved.size,
        created_by || null,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Salary slip created successfully",
      data: {
        salarySlip,
        file: fileResult.rows[0],
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Create salary slip error:", error);

    if (writtenFile && fs.existsSync(writtenFile)) {
      try {
        fs.unlinkSync(writtenFile);
      } catch (fileError) {
        console.error(fileError);
      }
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
      return res.status(400).json({
        success: false,
        message: "salary_slips data is required",
      });
    }

    if (typeof salarySlips === "string") {
      try {
        salarySlips = JSON.parse(salarySlips);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid salary_slips JSON format",
        });
      }
    }

    if (!Array.isArray(salarySlips) || salarySlips.length === 0) {
      return res.status(400).json({
        success: false,
        message: "salary_slips must be a non-empty array",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Salary slip PDF files are required",
      });
    }

    if (req.files.length !== salarySlips.length) {
      return res.status(400).json({
        success: false,
        message:
          "Number of salary slip records and PDF files must be the same",
      });
    }

    await client.query("BEGIN");

    const created = [];

    for (let i = 0; i < salarySlips.length; i++) {
      const slip = salarySlips[i];
      const file = req.files[i];

      const {
        emp_id,
        month,
        year,
        salary_slip_no,
        payroll_date,
        salary_generated_date,
        created_by,
      } = slip;

      if (!emp_id) {
        throw new Error(`Employee ID missing at index ${i + 1}`);
      }

      if (!month || month < 1 || month > 12) {
        throw new Error(`Invalid month at index ${i + 1}`);
      }

      if (!year || year < 2000) {
        throw new Error(`Invalid year at index ${i + 1}`);
      }

      if (!salary_slip_no) {
        throw new Error(
          `Salary slip number missing at index ${i + 1}`
        );
      }

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
        throw new Error(`Employee ${emp_id} not found`);
      }

      const {
        pr_id: employeeId,
        or_emp_id: companyEmployeeId,
      } = empResult.rows[0];

      const dupNo = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE salary_slip_no = $1
        LIMIT 1
        `,
        [salary_slip_no]
      );

      if (dupNo.rows.length > 0) {
        throw new Error(
          `Salary slip number ${salary_slip_no} already exists`
        );
      }

      const dupPeriod = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE employee_id = $1
          AND month = $2
          AND year = $3
        LIMIT 1
        `,
        [employeeId, month, year]
      );

      if (dupPeriod.rows.length > 0) {
        throw new Error(
          `Salary slip already exists for employee ${emp_id} for ${month}/${year}`
        );
      }

      const saved = saveFileToEmployeeFolder(
        file,
        companyEmployeeId
      );

      writtenFiles.push(saved.absolutePath);

      const slipResult = await client.query(
        `
        INSERT INTO salary_slips (
          employee_id,
          month,
          year,
          salary_slip_no,
          payroll_date,
          salary_generated_date,
          is_published,
          created_by,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          FALSE,
          $7,
          CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          employeeId,
          month,
          year,
          salary_slip_no,
          payroll_date || null,
          salary_generated_date || null,
          created_by || null,
        ]
      );

      const salarySlip = slipResult.rows[0];

      const fileResult = await client.query(
        `
        INSERT INTO salary_slip_files (
          salary_slip_id,
          file_path,
          file_size,
          created_by,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          salarySlip.salary_slip_id,
          saved.webPath,
          saved.size,
          created_by || null,
        ]
      );

      created.push({
        salarySlip,
        file: fileResult.rows[0],
      });
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: `${created.length} salary slips created successfully`,
      count: created.length,
      data: created,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Rollback error:",
        rollbackError
      );
    }

    console.error(
      "Create multiple salary slips error:",
      error
    );

    for (const filePath of writtenFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error(
          "Failed to delete file:",
          filePath,
          fileError
        );
      }
    }

    return res.status(400).json({
      success: false,
      message:
        error.message || "Failed to create salary slips",
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
              as: "organizations",
              attributes: [
                "or_emp_id",
                "or_department_id",
              ],
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
      const organization =
        employee?.organizations?.[0] || null;
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

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(
      "Get salary slips error:",
      error
    );

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

    let { page, limit } = req.query;

    page = page ? parseInt(page, 10) : 1;

    limit =
      limit !== undefined &&
      limit !== null &&
      limit !== ""
        ? parseInt(limit, 10)
        : null;

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    if (limit !== null && (isNaN(limit) || limit < 1)) {
      limit = null;
    }

    const where = {
      employee_id: id,
      is_published: true,
    };

    const queryOptions = {
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
          include: [
            {
              model: Organizations,
              as: "organizations",
              attributes: [
                "or_emp_id",
                "or_department_id",
              ],
              required: false,
            },
          ],
          required: false,
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
    };

    if (limit !== null) {
      const offset = (page - 1) * limit;

      queryOptions.limit = limit;
      queryOptions.offset = offset;

      const result = await SalarySlips.findAndCountAll({
        ...queryOptions,
        distinct: true,
      });

      const total = result.count;
      const totalPages = Math.ceil(total / limit) || 0;

      if (total === 0) {
        return res.status(404).json({
          success: false,
          message: "No published salary slips found for this employee",
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            total_pages: 0,
            has_next_page: false,
            has_prev_page: page > 1,
            next_page: null,
            prev_page: page > 1 ? page - 1 : null,
          },
        });
      }

      const data = result.rows.map((slip) => {
        const employee = slip.employee;
        const organization =
          employee?.organizations?.[0] || null;
        const file = slip.files?.[0] || null;

        return {
          salary_slip_id: slip.salary_slip_id,
          employee_id: slip.employee_id,

          emp_id: organization?.or_emp_id || null,
          department_id:
            organization?.or_department_id || null,

          employee_name: employee
            ? `${employee.pr_first_name || ""} ${
                employee.pr_last_name || ""
              }`.trim()
            : null,

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

          salary_slip_file_id:
            file?.salary_slip_file_id || null,
          file_path: file?.file_path || null,
          file_size: file?.file_size || null,
        };
      });

      return res.status(200).json({
        success: true,
        message: "Published salary slips fetched successfully",
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
      });
    }

    const salarySlips =
      await SalarySlips.findAll(queryOptions);

    if (!salarySlips || salarySlips.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No published salary slips found for this employee",
        data: [],
        pagination: null,
      });
    }

    const data = salarySlips.map((slip) => {
      const employee = slip.employee;
      const organization =
        employee?.organizations?.[0] || null;
      const file = slip.files?.[0] || null;

      return {
        salary_slip_id: slip.salary_slip_id,
        employee_id: slip.employee_id,

        emp_id: organization?.or_emp_id || null,
        department_id:
          organization?.or_department_id || null,

        employee_name: employee
          ? `${employee.pr_first_name || ""} ${
              employee.pr_last_name || ""
            }`.trim()
          : null,

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

        salary_slip_file_id:
          file?.salary_slip_file_id || null,
        file_path: file?.file_path || null,
        file_size: file?.file_size || null,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Published salary slips fetched successfully",
      data,
      pagination: null,
    });
  } catch (error) {
    console.error(
      "Error fetching salary slips:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch salary slips",
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
      emp_id,
      month,
      year,
      salary_slip_no,
      payroll_date,
      salary_generated_date,
      updated_by,
    } = req.body;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT *
      FROM salary_slips
      WHERE salary_slip_id = $1
      `,
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    const existingSlip = existingResult.rows[0];

    let resolvedEmployeeId =
      existingSlip.employee_id;

    if (emp_id) {
      const empResult = await client.query(
        `
        SELECT p.pr_id
        FROM personal p
        INNER JOIN organizations og
          ON og.pr_id = p.pr_id
        WHERE og.or_emp_id = $1
        LIMIT 1
        `,
        [emp_id]
      );

      if (empResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      resolvedEmployeeId =
        empResult.rows[0].pr_id;
    }

    const finalSlipNo =
      salary_slip_no ??
      existingSlip.salary_slip_no;

    const finalMonth =
      month ?? existingSlip.month;

    const finalYear =
      year ?? existingSlip.year;

    if (salary_slip_no) {
      const dupNo = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE salary_slip_no = $1
          AND salary_slip_id != $2
        LIMIT 1
        `,
        [salary_slip_no, id]
      );

      if (dupNo.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "Salary slip number already exists",
        });
      }
    }

    if (
      emp_id &&
      month &&
      year
    ) {
      const dupPeriod = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE employee_id = $1
          AND month = $2
          AND year = $3
          AND salary_slip_id != $4
        LIMIT 1
        `,
        [
          resolvedEmployeeId,
          month,
          year,
          id,
        ]
      );

      if (dupPeriod.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "Salary slip already exists for this employee, month and year",
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
        payroll_date ??
          existingSlip.payroll_date,
        salary_generated_date ??
          existingSlip.salary_generated_date,
        updated_by || null,
        id,
      ]
    );

    let updatedFile = null;

    if (req.file) {
      const empForFile =
        await client.query(
          `
          SELECT or_emp_id
          FROM organizations
          WHERE pr_id = $1
          LIMIT 1
          `,
          [resolvedEmployeeId]
        );

      if (empForFile.rows.length === 0) {
        throw new Error(
          "Organization record not found for employee"
        );
      }

      const companyEmployeeId =
        empForFile.rows[0].or_emp_id;

      const saved =
        saveFileToEmployeeFolder(
          req.file,
          companyEmployeeId
        );

      writtenFile =
        saved.absolutePath;

      const oldFileResult =
        await client.query(
          `
          SELECT *
          FROM salary_slip_files
          WHERE salary_slip_id = $1
          ORDER BY created_at DESC
          LIMIT 1
          `,
          [id]
        );

      const newFileResult =
        await client.query(
          `
          INSERT INTO salary_slip_files (
            salary_slip_id,
            file_path,
            file_size,
            created_by,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            CURRENT_TIMESTAMP
          )
          RETURNING *
          `,
          [
            id,
            saved.webPath,
            saved.size,
            updated_by || null,
          ]
        );

      updatedFile =
        newFileResult.rows[0];

      if (oldFileResult.rows.length > 0) {
        const oldFile =
          oldFileResult.rows[0];

        await client.query(
          `
          DELETE FROM salary_slip_files
          WHERE salary_slip_file_id = $1
          `,
          [oldFile.salary_slip_file_id]
        );

        if (oldFile.file_path) {
          const disk =
            webPathToDisk(
              oldFile.file_path
            );

          if (fs.existsSync(disk)) {
            try {
              fs.unlinkSync(disk);
            } catch (fileError) {
              console.error(
                "Failed to delete old PDF:",
                fileError
              );
            }
          }
        }
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Salary slip updated successfully",
      data: {
        salarySlip:
          updatedResult.rows[0],
        file: updatedFile,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        rollbackError
      );
    }

    console.error(
      "Update salary slip error:",
      error
    );

    if (
      writtenFile &&
      fs.existsSync(writtenFile)
    ) {
      try {
        fs.unlinkSync(writtenFile);
      } catch (fileError) {
        console.error(
          fileError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update salary slip",
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
      `
      SELECT file_path
      FROM salary_slip_files
      WHERE salary_slip_id = $1
      `,
      [id]
    );

    const deleteResult = await client.query(
      `
      DELETE FROM salary_slips
      WHERE salary_slip_id = $1
      RETURNING salary_slip_id
      `,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    await client.query("COMMIT");

    for (const file of fileResult.rows) {
      if (file.file_path) {
        const disk =
          webPathToDisk(file.file_path);

        if (fs.existsSync(disk)) {
          try {
            fs.unlinkSync(disk);
          } catch (fileError) {
            console.error(
              "Failed to delete PDF:",
              fileError
            );
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Salary slip deleted successfully",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        rollbackError
      );
    }

    console.error(
      "Delete salary slip error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

const getSalarySlipPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const salarySlip =
      await SalarySlips.findByPk(id, {
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
            order: [
              ["created_at", "DESC"],
            ],
            limit: 1,
          },
        ],
      });

    if (
      !salarySlip ||
      !salarySlip.files?.length
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Salary slip PDF not found",
      });
    }

    const filePath =
      salarySlip.files[0].file_path;

    const absolutePath =
      webPathToDisk(filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message:
          "PDF file does not exist on server",
      });
    }

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    return res.sendFile(
      absolutePath
    );
  } catch (error) {
    console.error(
      "Get salary slip PDF error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load salary slip PDF",
      error: error.message,
    });
  }
};

const getSalarySlipsPaginated = async (
  req,
  res
) => {
  try {
    let {
      page = 1,
      limit,
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

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    /*
     * limit behavior:
     * - limit not provided  -> fetch all
     * - limit = null        -> fetch all
     * - limit = ""          -> fetch all
     * - limit = "null"      -> fetch all
     * - valid number        -> pagination
     */
    const isFetchAll =
      limit === undefined ||
      limit === null ||
      limit === "" ||
      String(limit).toLowerCase() === "null";

    if (!isFetchAll) {
      limit = parseInt(limit, 10);

      if (isNaN(limit) || limit < 1) {
        limit = 10;
      }

      // Maximum limit
      if (limit > 100) {
        limit = 100;
      }
    } else {
      limit = null;
    }

    const offset = isFetchAll ? 0 : (page - 1) * limit;

    const allowedSortColumns = [
      "created_at",
      "updated_at",
      "salary_slip_id",
      "month",
      "year",
      "salary_slip_no",
    ];

    const sortColumn =
      allowedSortColumns.includes(
        sort_by
      )
        ? sort_by
        : "created_at";

    const sortDir =
      String(sort_order).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const whereClauses = [];
    const whereValues = [];
    let paramIndex = 1;

    /* -------------------------------------------------------------------------- */
    /*                                FILTERS                                     */
    /* -------------------------------------------------------------------------- */

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

    if (department) {
      whereClauses.push(`og.or_department_id = $${paramIndex++}`);
      whereValues.push(parseInt(department, 10));
    }

    if (is_published !== undefined && is_published !== "") {
      whereClauses.push(`ss.is_published = $${paramIndex++}`);

      whereValues.push(
        is_published === "true" || is_published === true
      );
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

    /* -------------------------------------------------------------------------- */
    /*                              COUNT QUERY                                   */
    /* -------------------------------------------------------------------------- */

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM salary_slips ss
      LEFT JOIN personal p 
        ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og 
        ON og.pr_id = p.pr_id
      ${whereSQL}
    `;

    const countResult = await pool.query(
      countQuery,
      whereValues
    );

    const total = countResult.rows[0].total;

    const totalPages = isFetchAll
      ? 1
      : Math.ceil(total / limit) || 0;

    /* -------------------------------------------------------------------------- */
    /*                              ORDER BY                                      */
    /* -------------------------------------------------------------------------- */

    let orderByClause;

    if (sortColumn === "employee_name") {
      orderByClause = `ORDER BY employee_name ${sortDir}`;
    } else {
      orderByClause = `ORDER BY ss.${sortColumn} ${sortDir}`;
    }

    /* -------------------------------------------------------------------------- */
    /*                              DATA QUERY                                    */
    /* -------------------------------------------------------------------------- */

    let dataQuery = `
      SELECT
        ss.salary_slip_id,
        og.or_emp_id AS emp_id,
        og.or_department_id AS department_id,
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
        CONCAT_WS(
          ' ',
          p.pr_first_name,
          p.pr_last_name
        ) AS employee_name,
        ssf.salary_slip_file_id,
        ssf.file_path,
        ssf.file_size
      FROM salary_slips ss
      LEFT JOIN personal p 
        ON p.pr_id = ss.employee_id
      LEFT JOIN organizations og 
        ON og.pr_id = p.pr_id
      LEFT JOIN LATERAL (
        SELECT
          salary_slip_file_id,
          file_path,
          file_size
        FROM salary_slip_files
        WHERE salary_slip_id = ss.salary_slip_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ssf ON TRUE
      ${whereSQL}
      ${orderByClause}
    `;

    let dataValues = [...whereValues];

    /* -------------------------------------------------------------------------- */
    /*                         ADD PAGINATION ONLY IF NEEDED                       */
    /* -------------------------------------------------------------------------- */

    if (!isFetchAll) {
      dataQuery += `
        LIMIT $${paramIndex++}
        OFFSET $${paramIndex++}
      `;

      dataValues.push(limit, offset);
    }

    const dataResult = await pool.query(
      dataQuery,
      dataValues
    );

    /* -------------------------------------------------------------------------- */
    /*                              RESPONSE                                      */
    /* -------------------------------------------------------------------------- */

    return res.status(200).json({
      success: true,
      data: dataResult.rows,

      pagination: {
        total,
        page: isFetchAll ? 1 : page,
        limit: isFetchAll ? null : limit,
        total_pages: totalPages,

        has_next_page: isFetchAll
          ? false
          : page < totalPages,

        has_prev_page: isFetchAll
          ? false
          : page > 1,

        next_page:
          !isFetchAll && page < totalPages
            ? page + 1
            : null,

        prev_page:
          !isFetchAll && page > 1
            ? page - 1
            : null,
      },

      filters: {
        search: search || null,
        emp_id: emp_id || null,

        month: month
          ? parseInt(month, 10)
          : null,

        year: year
          ? parseInt(year, 10)
          : null,

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
      message: "Failed to publish salary slips",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

const bulkPublishSalarySlips = async (req, res) => {
  const client = await pool.connect();

  try {
    let { salary_slip_ids, updated_by } = req.body;

    if (salary_slip_ids === undefined || salary_slip_ids === null) {
      return res.status(400).json({
        success: false,
        message: "salary_slip_ids is required",
      });
    }

    if (typeof salary_slip_ids === "string") {
      try {
        salary_slip_ids = JSON.parse(salary_slip_ids);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid salary_slip_ids JSON format",
        });
      }
    }

    if (!Array.isArray(salary_slip_ids) || salary_slip_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "salary_slip_ids must be a non-empty array",
      });
    }

    const ids = [
      ...new Set(
        salary_slip_ids
          .map((v) => Number(v))
          .filter((v) => Number.isInteger(v) && v > 0)
      ),
    ];

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "salary_slip_ids must contain valid numeric IDs",
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT salary_slip_id, is_published
      FROM salary_slips
      WHERE salary_slip_id = ANY($1::int[])
      `,
      [ids]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "No salary slips found for the provided IDs",
      });
    }

    const foundIds = existingResult.rows.map((row) => row.salary_slip_id);

    const missingIds = ids.filter((id) => !foundIds.includes(id));

    const alreadyPublishedIds = existingResult.rows
      .filter((row) => row.is_published === true)
      .map((row) => row.salary_slip_id);

    const idsToUpdate = existingResult.rows
      .filter((row) => row.is_published !== true)
      .map((row) => row.salary_slip_id);

    let updatedRows = [];

    if (idsToUpdate.length > 0) {
      const updateResult = await client.query(
        `
        UPDATE salary_slips
        SET
          is_published = TRUE,
          published_at = CURRENT_TIMESTAMP,
          published_by = $1,
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE salary_slip_id = ANY($2::int[])
        RETURNING
          salary_slip_id,
          employee_id,
          month,
          year,
          salary_slip_no,
          is_published,
          published_at,
          published_by,
          updated_by,
          updated_at
        `,
        [updated_by || null, idsToUpdate]
      );

      updatedRows = updateResult.rows;
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `${updatedRows.length} salary slip(s) published successfully`,
      summary: {
        requested: ids.length,
        updated: updatedRows.length,
        already_published: alreadyPublishedIds.length,
        not_found: missingIds.length,
      },
      data: {
        published: updatedRows,
        already_published_ids: alreadyPublishedIds,
        not_found_ids: missingIds,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError);
    }

    console.error("Bulk publish salary slips error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to publish salary slips",
      error: error.message,
    });
  } finally {
    client.release();
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
  getDepartmentEmployeesSalarySlipsV2,
  bulkPublishSalarySlips,
};
const fs = require("fs");
const path = require("path");
const { db: pool } = require("../db/connectDB");

/*
|--------------------------------------------------------------------------
| Get Employees
|--------------------------------------------------------------------------
*/
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
      INNER JOIN personal p
        ON p.pr_id = og.pr_id
      WHERE og.or_is_active = true
        AND og.or_department_id = $1
      ORDER BY p.pr_first_name ASC, p.pr_last_name ASC
      `,
      [or_department_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
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

/*
|--------------------------------------------------------------------------
| Create Salary Slip
|--------------------------------------------------------------------------
*/
const createSalarySlip = async (req, res) => {
  const client = await pool.connect();

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

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          'Salary slip PDF is required (send it as a multipart/form-data field named "pdf")',
      });
    }

    await client.query("BEGIN");

    /*
    |--------------------------------------------------------------------------
    | Check Employee
    |--------------------------------------------------------------------------
    */

    if (emp_id) {
      const employeeResult = await client.query(
        `
        SELECT pr_id
        FROM personal
        WHERE pr_id = $1
        `,
        [emp_id]
      );

      if (employeeResult.rows.length === 0) {
        await client.query("ROLLBACK");

        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Check Salary Slip Number
    |--------------------------------------------------------------------------
    */

    const slipNoResult = await client.query(
      `
      SELECT salary_slip_id
      FROM salary_slips
      WHERE salary_slip_no = $1
      `,
      [salary_slip_no]
    );

    if (slipNoResult.rows.length > 0) {
      await client.query("ROLLBACK");

      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(409).json({
        success: false,
        message: "Salary slip number already exists",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Employee + Month + Year
    |--------------------------------------------------------------------------
    */

    if (emp_id) {
      const duplicateResult = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE employee_id = $1
          AND month = $2
          AND year = $3
        `,
        [emp_id, month, year]
      );

      if (duplicateResult.rows.length > 0) {
        await client.query("ROLLBACK");

        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(409).json({
          success: false,
          message:
            "Salary slip already exists for this employee, month and year",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Insert Salary Slip
    |--------------------------------------------------------------------------
    */

    const salarySlipResult = await client.query(
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
        emp_id || null,
        month || null,
        year || null,
        salary_slip_no,
        payroll_date || null,
        salary_generated_date || null,
        created_by || null,
      ]
    );

    const salarySlip = salarySlipResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Insert PDF File
    |--------------------------------------------------------------------------
    */

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
        req.file.path,
        req.file.size,
        created_by || null,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Salary slip created successfully",
      data: {
        salarySlip,
        file: fileResult.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create salary slip error:", error);

    if (req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (fileError) {
        console.error("Failed to delete uploaded file:", fileError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to create salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| Create Salary Slip for multiple
|--------------------------------------------------------------------------
*/
const createMultipleSalarySlips = async (req, res) => {
  const client = await pool.connect();

  let uploadedFiles = [];

  try {
    /* -------------------------------------------------------------------------- */
    /*                         Get Salary Slip Data                              */
    /* -------------------------------------------------------------------------- */

    let salarySlips = req.body?.salary_slips;

    console.log("Salary Slips Raw Data:", salarySlips);
    console.log("Uploaded Files:", req.files);

    if (!salarySlips) {
      return res.status(400).json({
        success: false,
        message: "salary_slips data is required",
      });
    }

    /* -------------------------------------------------------------------------- */
    /*                              Parse JSON                                    */
    /* -------------------------------------------------------------------------- */

    if (typeof salarySlips === "string") {
      try {
        salarySlips = JSON.parse(salarySlips);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid salary_slips JSON format",
        });
      }
    }

    if (!Array.isArray(salarySlips)) {
      return res.status(400).json({
        success: false,
        message: "salary_slips must be an array",
      });
    }

    if (salarySlips.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one salary slip is required",
      });
    }

    /* -------------------------------------------------------------------------- */
    /*                         Check Uploaded Files                               */
    /* -------------------------------------------------------------------------- */

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Salary slip PDF files are required",
      });
    }

    uploadedFiles = req.files;

    /* -------------------------------------------------------------------------- */
    /*                            File Count Check                                */
    /* -------------------------------------------------------------------------- */

    if (req.files.length !== salarySlips.length) {
      return res.status(400).json({
        success: false,
        message:
          "Number of salary slip records and PDF files must be the same",
      });
    }

    /* -------------------------------------------------------------------------- */
    /*                              Start Transaction                             */
    /* -------------------------------------------------------------------------- */

    await client.query("BEGIN");

    const createdSalarySlips = [];

    /* -------------------------------------------------------------------------- */
    /*                         Process Each Salary Slip                           */
    /* -------------------------------------------------------------------------- */

    for (let i = 0; i < salarySlips.length; i++) {
      const slip = salarySlips[i];

      const {
        emp_id,
        month,
        year,
        salary_slip_no,
        payroll_date,
        salary_generated_date,
        created_by,
      } = slip;

      const file = req.files[i];

      /* ------------------------------------------------------------------------ */
      /*                              Validation                                  */
      /* ------------------------------------------------------------------------ */

      if (!emp_id) {
        throw new Error(
          `Employee ID is required for salary slip ${i + 1}`
        );
      }

      if (!month || month < 1 || month > 12) {
        throw new Error(
          `Invalid month for salary slip ${i + 1}`
        );
      }

      if (!year || year < 2000) {
        throw new Error(
          `Invalid year for salary slip ${i + 1}`
        );
      }

      if (!salary_slip_no) {
        throw new Error(
          `Salary slip number is required for salary slip ${i + 1}`
        );
      }

      if (!file) {
        throw new Error(
          `PDF file is required for salary slip ${i + 1}`
        );
      }

      /* ------------------------------------------------------------------------ */
      /*                     Check Employee Using Employee Code                   */
      /* ------------------------------------------------------------------------ */

      /*
        emp_id from Postman is actually organizations.or_emp_id.

        Example:

        or_emp_id   = 202000002
        pr_id       = 25

        salary_slips.employee_id should store 25.
      */

      const employeeResult = await client.query(
        `
        SELECT
          p.pr_id,
          og.or_emp_id
        FROM personal p
        INNER JOIN organizations og
          ON p.pr_id = og.pr_id
        WHERE og.or_emp_id = $1
        LIMIT 1
        `,
        [emp_id]
      );

      console.log(
        `Employee Result for ${emp_id}:`,
        employeeResult.rows
      );

      if (employeeResult.rows.length === 0) {
        throw new Error(
          `Employee ${emp_id} not found`
        );
      }

      const employeeId = employeeResult.rows[0].pr_id;

      console.log(
        `Employee ${emp_id} mapped to personal.pr_id: ${employeeId}`
      );

      /* ------------------------------------------------------------------------ */
      /*                    Check Salary Slip Number                              */
      /* ------------------------------------------------------------------------ */

      const slipNoResult = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE salary_slip_no = $1
        LIMIT 1
        `,
        [salary_slip_no]
      );

      if (slipNoResult.rows.length > 0) {
        throw new Error(
          `Salary slip number ${salary_slip_no} already exists`
        );
      }

      /* ------------------------------------------------------------------------ */
      /*                 Check Employee + Month + Year                            */
      /* ------------------------------------------------------------------------ */

      const duplicateResult = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE employee_id = $1
          AND month = $2
          AND year = $3
        LIMIT 1
        `,
        [
          employeeId,
          month,
          year,
        ]
      );

      if (duplicateResult.rows.length > 0) {
        throw new Error(
          `Salary slip already exists for employee ${emp_id} for ${month}/${year}`
        );
      }

      /* ------------------------------------------------------------------------ */
      /*                         Insert Salary Slip                               */
      /* ------------------------------------------------------------------------ */

      const salarySlipResult = await client.query(
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

      const salarySlip = salarySlipResult.rows[0];

      /* ------------------------------------------------------------------------ */
      /*                           Insert PDF File                                */
      /* ------------------------------------------------------------------------ */

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
          file.path,
          file.size,
          created_by || null,
        ]
      );

      /* ------------------------------------------------------------------------ */
      /*                         Add Created Data                                 */
      /* ------------------------------------------------------------------------ */

      createdSalarySlips.push({
        salarySlip,
        file: fileResult.rows[0],
      });
    }

    /* -------------------------------------------------------------------------- */
    /*                                Commit                                      */
    /* -------------------------------------------------------------------------- */

    await client.query("COMMIT");

    /* -------------------------------------------------------------------------- */
    /*                            Success Response                                */
    /* -------------------------------------------------------------------------- */

    return res.status(201).json({
      success: true,
      message: `${createdSalarySlips.length} salary slips created successfully`,
      count: createdSalarySlips.length,
      data: createdSalarySlips,
    });

  } catch (error) {

    /* -------------------------------------------------------------------------- */
    /*                              Rollback                                      */
    /* -------------------------------------------------------------------------- */

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

    /* -------------------------------------------------------------------------- */
    /*                         Delete Uploaded Files                              */
    /* -------------------------------------------------------------------------- */

    for (const file of uploadedFiles) {
      try {
        if (
          file.path &&
          fs.existsSync(file.path)
        ) {
          fs.unlinkSync(file.path);

          console.log(
            "Deleted uploaded file:",
            file.path
          );
        }
      } catch (fileError) {
        console.error(
          "Failed to delete uploaded file:",
          fileError
        );
      }
    }

    /* -------------------------------------------------------------------------- */
    /*                            Error Response                                  */
    /* -------------------------------------------------------------------------- */

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Failed to create salary slips",
    });

  } finally {

    /* -------------------------------------------------------------------------- */
    /*                           Release DB Client                                */
    /* -------------------------------------------------------------------------- */

    client.release();
  }
};
/*
|--------------------------------------------------------------------------
| Get All Salary Slips
|--------------------------------------------------------------------------
*/
const getSalarySlips = async (req, res) => {
  try {
    const result = await pool.query(`
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

      left join organizations og
      on og.pr_id = p.pr_id

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

      ORDER BY
        ss.year DESC,
        ss.month DESC,
        ss.salary_slip_id DESC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get salary slips error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch salary slips",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Salary Slip By ID
|--------------------------------------------------------------------------
*/
const getSalarySlipById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        ss.salary_slip_id,
        ss.employee_id AS emp_id,
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

      WHERE ss.salary_slip_id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get salary slip error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch salary slip",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Salary Slip
|--------------------------------------------------------------------------
*/
const updateSalarySlip = async (req, res) => {
  const client = await pool.connect();

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

    /*
    |--------------------------------------------------------------------------
    | Check Salary Slip
    |--------------------------------------------------------------------------
    */

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

      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    const existingSlip = existingResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Check Duplicate Salary Slip Number
    |--------------------------------------------------------------------------
    */

    if (salary_slip_no) {
      const duplicateSlipNo = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE salary_slip_no = $1
          AND salary_slip_id != $2
        `,
        [salary_slip_no, id]
      );

      if (duplicateSlipNo.rows.length > 0) {
        await client.query("ROLLBACK");

        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(409).json({
          success: false,
          message: "Salary slip number already exists",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Check Employee + Month + Year
    |--------------------------------------------------------------------------
    */

    if (emp_id && month && year) {
      const duplicatePeriod = await client.query(
        `
        SELECT salary_slip_id
        FROM salary_slips
        WHERE employee_id = $1
          AND month = $2
          AND year = $3
          AND salary_slip_id != $4
        `,
        [emp_id, month, year, id]
      );

      if (duplicatePeriod.rows.length > 0) {
        await client.query("ROLLBACK");

        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        return res.status(409).json({
          success: false,
          message:
            "Salary slip already exists for this employee, month and year",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Update Salary Slip
    |--------------------------------------------------------------------------
    */

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
        emp_id ?? existingSlip.employee_id,
        month ?? existingSlip.month,
        year ?? existingSlip.year,
        salary_slip_no ?? existingSlip.salary_slip_no,
        payroll_date ?? existingSlip.payroll_date,
        salary_generated_date ?? existingSlip.salary_generated_date,
        updated_by || null,
        id,
      ]
    );

    let updatedFile = null;

    /*
    |--------------------------------------------------------------------------
    | Replace PDF If New PDF Uploaded
    |--------------------------------------------------------------------------
    */

    if (req.file) {
      const oldFileResult = await client.query(
        `
        SELECT *
        FROM salary_slip_files
        WHERE salary_slip_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [id]
      );

      /*
      | Insert new file
      */

      const newFileResult = await client.query(
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
          req.file.path,
          req.file.size,
          updated_by || null,
        ]
      );

      updatedFile = newFileResult.rows[0];

      /*
      | Delete old DB record
      */

      if (oldFileResult.rows.length > 0) {
        const oldFile = oldFileResult.rows[0];

        await client.query(
          `
          DELETE FROM salary_slip_files
          WHERE salary_slip_file_id = $1
          `,
          [oldFile.salary_slip_file_id]
        );

        /*
        | Delete old physical PDF
        */

        if (oldFile.file_path && fs.existsSync(oldFile.file_path)) {
          try {
            fs.unlinkSync(oldFile.file_path);
          } catch (fileError) {
            console.error(
              "Failed to delete old salary slip PDF:",
              fileError
            );
          }
        }
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Salary slip updated successfully",
      data: {
        salarySlip: updatedResult.rows[0],
        file: updatedFile,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update salary slip error:", error);

    if (req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (fileError) {
        console.error("Failed to delete uploaded file:", fileError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to update salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| Delete Salary Slip
|--------------------------------------------------------------------------
*/
const deleteSalarySlip = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    /*
    |--------------------------------------------------------------------------
    | Get PDF Path Before Delete
    |--------------------------------------------------------------------------
    */

    const fileResult = await client.query(
      `
      SELECT file_path
      FROM salary_slip_files
      WHERE salary_slip_id = $1
      `,
      [id]
    );

    /*
    |--------------------------------------------------------------------------
    | Delete Salary Slip
    |--------------------------------------------------------------------------
    |
    | salary_slip_files will be deleted automatically
    | because of ON DELETE CASCADE.
    |
    */

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

    /*
    |--------------------------------------------------------------------------
    | Delete Physical PDF
    |--------------------------------------------------------------------------
    */

    for (const file of fileResult.rows) {
      if (file.file_path && fs.existsSync(file.file_path)) {
        try {
          fs.unlinkSync(file.file_path);
        } catch (fileError) {
          console.error(
            "Failed to delete salary slip PDF:",
            fileError
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Salary slip deleted successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Delete salary slip error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete salary slip",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

/*
|--------------------------------------------------------------------------
| Get Salary Slip PDF
|--------------------------------------------------------------------------
*/
const getSalarySlipPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        ss.salary_slip_id,
        ss.salary_slip_no,
        ssf.file_path
      FROM salary_slips ss
      INNER JOIN salary_slip_files ssf
        ON ssf.salary_slip_id = ss.salary_slip_id
      WHERE ss.salary_slip_id = $1
      ORDER BY ssf.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Salary slip PDF not found",
      });
    }

    const filePath = result.rows[0].file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "PDF file does not exist on server",
      });
    }

    res.setHeader("Content-Type", "application/pdf");

    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error("Get salary slip PDF error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load salary slip PDF",
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
  getSalarySlipPdf,
};
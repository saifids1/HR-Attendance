const fs = require("fs");
const multer = require("multer");
const path = require("path");
const auth = require("../middlewares/authMiddleware");
const { db } = require("../db/connectDB");
const sendEmail = require("../utils/mailer");
const sendNotification = require("../services/notification.services");
// Organization

/*

address
: 
"Patel Arcade 2,Juna Bazar,City Chowk Chh.Sambhaji Nagar"
city
: 
"Chh.Sambhaji Nagar (Aurangabad)"
country
: 
"india"
created_at
: 
"2026-01-14T11:54:45.187Z"
industry_type
: 
"Enterprise Software & Digital Transformation"
is_active
: 
null
organization_code
: 
"IDILIGENCE"
organization_name
: 
"Idiligence Solution"
state
: 
"Maharashtra"
*/

exports.addOrganizationInfo = async (req, res) => {
  const { emp_id } = req.params;
  const client = await db.connect();

  try {
    const {
      organization_name,
      organization_code,
      organization_location,
      industry_type,
      department,
      designation,
      joining_date,
      leaving_date,
      employee_type,     // ✅ FIXED (no camelCase mismatch)
      reportingTo,
      reportingLocation,
    } = req.body;

    if (!organization_name || !organization_code || !industry_type || !department) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    await client.query("BEGIN");

    // 1️⃣ Insert / Update Organization (Fixed ID = 1)
    const orgResult = await client.query(
      `INSERT INTO organizations 
        (id, organization_name, organization_code, organization_location, industry_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) 
       DO UPDATE SET 
         organization_name = EXCLUDED.organization_name,
         organization_code = EXCLUDED.organization_code,
         organization_location = EXCLUDED.organization_location,
         industry_type = EXCLUDED.industry_type
       RETURNING *`,
      [1, organization_name, organization_code, organization_location, industry_type]
    );

    // 2️⃣ Update Personal
   const personalResult = await client.query(
  `INSERT INTO personal 
  (emp_id, department, designation, joining_date, leaving_date, employee_type, reporting_location)
  VALUES ($1,$2,$3,$4,$5,$6,$7)

  ON CONFLICT (emp_id)
  DO UPDATE SET
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    joining_date = EXCLUDED.joining_date,
    leaving_date = EXCLUDED.leaving_date,
    employee_type = EXCLUDED.employee_type,
    reporting_location = EXCLUDED.reporting_location

  RETURNING *`,
  [
    emp_id,
    department,
    designation,
    joining_date,
    leaving_date || null,
    employee_type,
    reportingLocation
  ]
);
    if (personalResult.rowCount === 0) {
      throw new Error("Employee not found in personal table");
    }

    // 3️⃣ Update Active Status
    const isActive = leaving_date ? false : true;

    await client.query(
      `UPDATE users 
       SET is_active = $1
       WHERE emp_id = $2`,
      [isActive, emp_id]
    );

    // 4️⃣ Insert / Update Reporting
    const reportingResult = await client.query(
      `INSERT INTO employee_reporting (emp_id, reports_to)
       VALUES ($1, $2)
       ON CONFLICT (emp_id)
       DO UPDATE SET reports_to = EXCLUDED.reports_to
       RETURNING *`,
      [emp_id, reportingTo]
    );

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Information updated successfully",
      organizationData: orgResult.rows[0],
      personalData: personalResult.rows[0],
      reportingData: reportingResult.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

exports.getOrganizationInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const orgQuery = `SELECT * FROM organizations LIMIT 1`;
    const orgResult = await db.query(orgQuery);

    const personalQuery = `
      SELECT department, designation, employee_type,
             joining_date, leaving_date, reporting_location
      FROM personal
      WHERE emp_id = $1
    `;
    const personalResult = await db.query(personalQuery, [emp_id]);

    const reportingQuery = `
      SELECT reports_to
      FROM employee_reporting
      WHERE emp_id = $1
    `;
    const reportingResult = await db.query(reportingQuery, [emp_id]);

    res.status(200).json({
      success: true,
      organizationData: orgResult.rows[0] || {},
      personalData: personalResult.rows[0] || {},
      reportingData: reportingResult.rows[0] || {}
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateOrganizationInfo = async (req, res) => {
  const client = await db.connect();

  try {
    const {emp_id} = req.params

    // console.log("empId updateOrg",emp_id);
    const {
      organization_name,
      organization_code,
      organization_location,
      industry_type,
      department,
      designation,
      joining_date,
      leaving_date,
      employeeType,
      reportingTo,
      reportingLocation
    } = req.body;

    // console.log("req.body update",req.body)
    await client.query("BEGIN");


    // console.log("organization_name,organization_name,industry_type,department", organization_name,organization_name,industry_type,department)
    if (!organization_name || !organization_name || !industry_type || !department) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    //  Update Organization (ONLY UPDATE)
    const orgResult = await client.query(
      `UPDATE organizations
       SET organization_name = $1,
           organization_code = $2,
           organization_location = $3,
           industry_type = $4
       WHERE id = 1
       RETURNING *`,
      [
        organization_name,
      organization_code,
      organization_location,
         industry_type
      ]
    );

    if (orgResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Organization not found" });
    }

    //  Update Personal
    const personalResult = await client.query(
      `UPDATE personal
       SET department = $1,
           designation = $2,
           joining_date = $3,
           leaving_date = $4,
           employee_type = $5,
           reporting_location = $6
       WHERE emp_id = $7
       RETURNING *`,
      [
        department,
        designation,
        joining_date,
        leaving_date || null,
        employeeType,
        reportingLocation,
      emp_id
      ]
    );
    // Toggle is_active based on leavingDate
const isActive = leaving_date ? false : true;

await client.query(
  `UPDATE users
   SET is_active = $1
   WHERE emp_id = $2`,
  [isActive, emp_id]
);

// console.log("leavingDate updateOrg",leaving_date)
    // console.log("reportingTo",reportingTo)
    //  Update Reporting
    const reportingResult = await client.query(
  `
  INSERT INTO employee_reporting (emp_id, reports_to)
  VALUES ($1, $2)
  ON CONFLICT (emp_id)
  DO UPDATE SET reports_to = EXCLUDED.reports_to
  RETURNING *;
  `,
  [empId, reportingTo || null]
);
    // console.log("reportingResult",reportingResult)

    await client.query("COMMIT");

    res.status(200).json({
      message: "Organization updated successfully",
      organization: orgResult.rows[0],
      personal: personalResult.rows[0],
      reporting: reportingResult.rows[0]
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    client.release();
  }
};

// Personal
const parseDob = (dob) => {
  // Already correct format → YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return dob;
  }

  // Convert DD/MM/YYYY → YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    const [day, month, year] = dob.split("/");
    return `${year}-${month}-${day}`;
  }

  throw new Error("Invalid DOB format");
};

exports.addPersonInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const {
      gender,
      dob,
      bloodgroup,
      maritalstatus,
      nationality,
      address,
      aadharnumber,
      nominee,
      department,
      designation
    } = req.body;

    // console.log("addPersonal",req.body)

    // console.log("department",department);
    // ---------- Validation ----------
    if (
      !gender ||
      !dob ||
      !bloodgroup ||
      !maritalstatus ||
      !nationality ||
      !address ||
      !aadharnumber ||
      !department ||
      !designation
    ) {
      return res.status(400).json({
        message: "All required fields must be filled",
      });
    }

    const parseDob = (dateStr) => {
      if (!dateStr) return null;

      // Agar frontend se DD-MM-YYYY aa raha hai (e.g. 11-12-2000)
      const parts = dateStr.split("-");

      if (parts[0].length === 2) {
        // DD-MM-YYYY -> YYYY-MM-DD
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }

      return dateStr; // Agar pehle se YYYY-MM-DD hai
    };

    // Usage in Controller
    let formattedDob;
    try {
      formattedDob = parseDob(req.body.dob); // Ab ye SQL ke liye "2000-12-11" return karega
    } catch (err) {
      return res.status(400).json({ message: "Invalid DOB format" });
    }

    // ---------- Prevent Duplicate ----------
    const exists = await db.query(
      "SELECT 1 FROM personal WHERE emp_id = $1",
      [emp_id]
    );

    if (exists.rowCount > 0) {
      return res
        .status(409)
        .json({ message: "Personal details already exist" });
    }

    // ---------- Insert ----------
    const result = await db.query(
      `
      INSERT INTO personal (
        emp_id,
        gender,
        dob,
        bloodgroup,
        maritalstatus,
        nationality,
        address,
        aadharnumber,
        nominee,
        department,
        designation
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        emp_id,
        gender,
        formattedDob,
        bloodgroup,
        maritalstatus,
        nationality,
        address,
        aadharnumber,
        nominee || null,
        department,
        designation
      ]
    );

    res.status(201).json({
      message: "Personal details created successfully",
      personalDetails: result.rows[0],
    });
  } catch (error) {
    console.error("Personal POST error:", error);
    res.status(500).json({ message: "Server error" });
  }
}

exports.getPersonalInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const result = await db.query(
      `
      SELECT
        u.emp_id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.profile_image,
        u.shift_id,
        TO_CHAR(p.dob, 'DD-MM-YYYY') as dob,           -- Formats to DD-MM-YYYY
        p.gender,
        p.department,
        TO_CHAR(p.joining_date, 'DD-MM-YYYY') as joining_date, -- Formats to DD-MM-YYYY
        p.maritalstatus,
        p.leaving_date,
        p.nominee,
        p.aadharnumber,
        p.bloodgroup,
        p.nationality,
        p.designation,
        p.first_name,
        p.last_name,
        p.current_address,
        p.permanent_address,
        p.contact
      FROM users u
      LEFT JOIN personal p
        ON u.emp_id = p.emp_id
      WHERE u.emp_id = $1
      `,
      [emp_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Now returns: { "dob": "05-10-2000", "joining_date": "12-05-2026", ... }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

exports.updatePersonalInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const {
      first_name,
      last_name,
      email,
      contact,
      dob,
      gender,
      maritalstatus,
      nationality,
      bloodgroup,
      current_address,
      permanent_address
    } = req.body;

    //  Update users table (name + email)
    const fullName = `${first_name || ""} ${last_name || ""}`.trim();

    await db.query(
      `
      UPDATE users
      SET name = $1,
          email = $2
      WHERE emp_id = $3
      `,
      [fullName, email, emp_id]
    );

    //  Update personal table
    const result = await db.query(
      `
      UPDATE personal
      SET first_name = $1,
          last_name = $2,
          contact = $3,
          dob = $4,
          gender = $5,
          maritalstatus = $6,
          nationality = $7,
          bloodgroup = $8,
          current_address = $9,
          permanent_address = $10
      WHERE emp_id = $11
      RETURNING *
      `,
      [
        first_name,
        last_name,
        contact,
        dob || null,
        gender,
        maritalstatus,
        nationality,
        bloodgroup,
        current_address,
        permanent_address,
        emp_id
      ]
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// Education
exports.addEducationInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    // console.log("Education",req.body);
    
    // console.log("emp_id Add Education", emp_id)

    if(!emp_id){
      return res.status(400).json({message:"emp_id required"});
    }


    // console.log("req.user.emp_id,emp_id",req.user.emp_id,emp_id)

    if (req.user.role === "employee" && req.user.emp_id !== emp_id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    let educationArray = [];

    // --- FIX STARTS HERE ---
    if (typeof req.body.education === 'string') {
      // If it's a string (from FormData), parse it back into an array
      educationArray = JSON.parse(req.body.education);
    } else if (Array.isArray(req.body.education)) {
      educationArray = req.body.education;
    } else if (Array.isArray(req.body)) {
      educationArray = req.body;
    } else if (typeof req.body === "object" && Object.keys(req.body).length > 0) {
      educationArray = [req.body];
    }
    // --- FIX ENDS HERE ---

    if (!educationArray.length) {
      return res.status(400).json({ message: "Education data is required" });
    }

    const inserted = [];

    for (const edu of educationArray) {
      // Now 'edu' will be an object like { degree: "Degress", ... }
      const {
        degree,
        field_of_study,
        institution_name,
        university,
        passing_year,
        percentage_or_grade,
      } = edu;

      const { rows } = await db.query(
        `
        INSERT INTO education
          (emp_id, degree, field_of_study, institution_name, university, passing_year, percentage_or_grade)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          emp_id,
          degree || null,
          field_of_study || null,
          institution_name || null,
          university || null,
          passing_year || null,
          percentage_or_grade || null,
        ]
      );

      inserted.push(rows[0]);
    }

    res.status(201).json({
      message: "Education added successfully",
      education: inserted,
    });

  } catch (error) {
    console.error("[ERROR] /education POST:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getEducationInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;
    // console.log("Education GET Route Call ")

    const empIdInt = parseInt(emp_id);

    // console.log("empId getEducation",empIdInt);
    const { rows } = await db.query(
      `
        SELECT
            id,
          degree,
          field_of_study,
          institution_name,
          university,
          passing_year,
          percentage_or_grade
        FROM education
        WHERE emp_id = $1
        ORDER BY passing_year DESC
        `,
      [empIdInt]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No education records found" });
    }

    // console.log("empId",empIdInt,"Education",rows);
    res.status(200).json({
      total: rows.length,
      education: rows
    });

  } catch (error) {
    console.error("[ERROR] /education/:emp_id GET:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.updateEducationInfo = async (req, res) => {
  const client = await db.connect(); // Use a dedicated client for transaction
  try {
    const { emp_id } = req.params;

    // console.log("empId update",emp_id);
    const educationEntries = JSON.parse(req.body.education);

    await client.query('BEGIN');

    for (let i = 0; i < educationEntries.length; i++) {
      let edu = educationEntries[i];
      let finalPath = edu.marksheet_url;

      // Check for file upload for this specific row
      const file = req.files.find(f => f.fieldname === `file_${i}`);
      if (file) {
        finalPath = `/uploads/education/${file.filename}`;
      }

      // 1. UNIQUE CHECK: If no ID exists, check if this degree+year already exists for this user
      if (!edu.id) {
        const checkExist = await client.query(
          `SELECT id FROM education WHERE emp_id = $1 AND degree = $2 AND passing_year = $3`,
          [emp_id, edu.degree, edu.passing_year]
        );
        if (checkExist.rows.length > 0) {
          edu.id = checkExist.rows[0].id; // Treat as an update if record exists
        }
      }

      if (edu.id) {
        // 2. UPDATE existing record
        await client.query(
          `UPDATE education SET 
            degree=$1, field_of_study=$2, institution_name=$3, university=$4, 
            percentage_or_grade=$5, passing_year=$6, marksheet_url=COALESCE($7, marksheet_url), 
            updated_at=NOW() WHERE id=$8 AND emp_id=$9`,
          [edu.degree, edu.field_of_study, edu.institution_name, edu.university,
          edu.percentage_or_grade, edu.passing_year, finalPath, edu.id, emp_id]
        );
      } else {
        // 3. INSERT only if it's truly new
        await client.query(
          `INSERT INTO education (emp_id, degree, field_of_study, institution_name, university, percentage_or_grade, passing_year, marksheet_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [emp_id, edu.degree, edu.field_of_study, edu.institution_name, edu.university,
            edu.percentage_or_grade, edu.passing_year, finalPath]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: "Education information processed without duplicates!" });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Education Update Error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    client.release(); // Important: release the pool client
  }
};

exports.deleteEducationInfo = async (req, res) => {
  try {
    const { emp_id, id } = req.params;
    const educationId = Number(id);

    // 1. Validate ID is a number
    if (isNaN(educationId)) {
      return res.status(400).json({ message: "Invalid Education ID format" });
    }

    // 2. Authorization: Check if user has permission to delete this specific employee's data
    // Admin bypass is usually implied if role !== "employee"
    if (req.user.role === "employee" && req.user.emp_id !== emp_id) {
      return res.status(403).json({ message: "Access Denied: You cannot delete this record" });
    }

    // 3. Database Operation
    const { rowCount } = await db.query(
      `
      DELETE FROM education
      WHERE id = $1
        AND emp_id = $2
      RETURNING id; -- Optional: returns the ID of the deleted row
      `,
      [educationId, emp_id]
    );

    // 4. Handle Not Found
    if (rowCount === 0) {
      return res.status(404).json({
        message: "Record not found or already deleted",
      });
    }

    // 5. Success
    return res.status(200).json({
      message: "Education record deleted successfully",
    });

  } catch (error) {
    // Log with context for easier debugging
    console.error(`[ERROR] Delete Education (Emp: ${req.params.emp_id}, ID: ${req.params.id}):`, error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Experience

exports.addExperienceInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const {
      company_name,
      designation,
      start_date,
      end_date,
      total_years,
      location,
    } = req.body;

    // 1. Check for Missing Required Fields
    if (!company_name || !designation || !start_date || !end_date || !location) {
      return res.status(400).json({
        message: "All fields (Company, Designation, Dates, and Location) are required",
      });
    }

    // 2. Validate Date Formats
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format provided",
      });
    }

    // 3. Logical Validation: End Date cannot be before Start Date
    if (end < start) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date",
      });
    }

    // 4. Sanitize Inputs (Optional but recommended: prevent excessive string lengths)
    if (company_name.length > 255 || designation.length > 255) {
      return res.status(400).json({
        message: "Company name or designation is too long",
      });
    }

    // 5. Database Insertion
    const result = await db.query(
      `
      INSERT INTO experience 
        (emp_id, company_name, designation, start_date, end_date, total_years, location) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
      `,
      [emp_id, company_name.trim(), designation.trim(), start_date, end_date, total_years, location.trim()]
    );

    // Send Notification
    // sendNotification(emp_id, "New Experience Added", req.user.name);

    res.status(201).json({
      message: "Experience created successfully",
      experience: result.rows[0],
    });
  } catch (error) {
    console.error("Create experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getExperienceInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!emp_id) return
    const { rows } = await db.query(
      `
      SELECT
        id,
        emp_id,
        company_name,
        designation,
        start_date,
        end_date,
        total_years,
        location
      FROM experience
      WHERE emp_id = $1
      ORDER BY start_date DESC
      `,
      [emp_id]
    );

    // ALWAYS return 200
    res.status(200).json({
      total: rows.length,
      experience: rows, // [] if empty → frontend safe
    });

  } catch (error) {
    console.error("Get experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.updateExperienceInfo = async (req, res) => {
  try {
    const { emp_id, id } = req.params;
    const {
      company_name,
      designation,
      start_date,
      end_date,
      total_years,
      location,
    } = req.body;

    // 1. Check for Missing Required Fields
    if (!company_name || !designation || !start_date || !end_date || !location) {
      return res.status(400).json({
        message: "All fields are required for update",
      });
    }

    // 2. Validate Date Formats
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
      });
    }

    // 3. Chronological Validation
    if (end < start) {
      return res.status(400).json({
        message: "End date cannot be earlier than start date",
      });
    }

    // 4. Update Database
    const result = await db.query(
      `
      UPDATE experience
      SET company_name = $1,
          designation = $2,
          start_date = $3,
          end_date = $4,
          total_years = $5,
          location = $6
      WHERE id = $7 AND emp_id = $8
      RETURNING *
      `,
      [
        company_name.trim(),
        designation.trim(),
        start_date,
        end_date,
        total_years,
        location.trim(),
        id,
        emp_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Experience record not found",
      });
    }

    // Send Notification
    // sendNotification(emp_id, "Experience Updated", req.user.name);

    res.status(200).json({
      message: "Experience updated successfully",
      experience: result.rows[0],
    });
  } catch (error) {
    console.error("Update experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteExperienceInfo = async (req, res) => {
  try {
    const { emp_id, id } = req.params;

    const result = await db.query(
      `
      DELETE FROM experience
      WHERE id = $1 AND emp_id = $2
      RETURNING *
      `,
      [id, emp_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Experience not found",
      });
    }

    res.status(200).json({
      message: "Experience deleted successfully",
      deletedExperience: result.rows[0],
    });
  } catch (error) {
    console.error("Delete experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.getContactInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const result = await db.query(
      `SELECT * FROM contact WHERE emp_id = $1`,
      [emp_id]
    );

    // console.log("result.rows",result.rows);
    res.status(200).json({
      contacts: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
exports.addContactInfo = async (req, res) => {
  const { emp_id } = req.params;
  const newContact = req.body; // Expecting a single object: {contact_type: '...', phone: '...'}

  try {
    await db.query('BEGIN');

    // 1. Fetch current contacts to avoid losing them during the overwrite
    const currentContactsRes = await db.query(
      `SELECT contact_type, phone, email, relation, is_primary FROM contact WHERE emp_id = $1`,
      [emp_id]
    );

    const existingContacts = currentContactsRes.rows;

    // 2. Combine existing contacts with the new one
    // We treat the incoming body as a single object, but wrap it in an array
    const updatedList = [...existingContacts, ...(Array.isArray(newContact) ? newContact : [newContact])];

    // 3. Wipe existing
    await db.query(`DELETE FROM contact WHERE emp_id = $1`, [emp_id]);

    // 4. Perform Bulk Insert
    if (updatedList.length > 0) {
      const values = [];
      const placeholders = updatedList.map((contact, i) => {
        const offset = i * 6;
        values.push(
          emp_id,
          contact.contact_type || null,
          contact.phone || null,
          contact.email || null,
          contact.relation || null,
          contact.is_primary ?? false
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, NOW())`;
      }).join(",");

      const bulkInsertQuery = `
        INSERT INTO contact (emp_id, contact_type, phone, email, relation, is_primary, created_at)
        VALUES ${placeholders}
      `;

      await db.query(bulkInsertQuery, values);
    }

    await db.query('COMMIT');
    res.status(201).json({ message: "Contact added successfully" });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Add Contact Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
exports.updateContactInfo = async (req, res) => {
  const { emp_id } = req.params;
  const contacts = req.body; 

  if (!Array.isArray(contacts)) {
    return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
  }

  try {
    // --- 1. Single Primary Validation ---
    // Count how many contacts in the incoming array are marked as primary
    const primaryContacts = contacts.filter(c => c.is_primary === true).length;
    
    if (primaryContacts.length > 1) {
      return res.status(400).json({ 
        success: false, 
        message: "Only one contact can be marked as primary." 
      });
    }

    // --- 2. Internal Duplicate Check (Incoming array) ---
    const emailsInRequest = contacts.map(c => c.email?.toLowerCase()).filter(Boolean);
    const uniqueEmails = new Set(emailsInRequest);
    
    if (uniqueEmails.size !== emailsInRequest.length) {
      return res.status(400).json({ 
        success: false, 
        message: "Duplicate emails found in your contact list." 
      });
    }

    // --- 3. Global Unique Email Check (Other employees) ---
    if (emailsInRequest.length > 0) {
      const globalCheck = await db.query(
        `SELECT email FROM contact WHERE email = ANY($1) AND emp_id != $2`,
        [emailsInRequest, emp_id]
      );

      if (globalCheck.rowCount > 0) {
        return res.status(400).json({
          success: false,
          message: `The email ${globalCheck.rows[0].email} is already used by another employee.`
        });
      }
    }

    await db.query('BEGIN');

    // --- 4. Wipe existing contacts ---
    await db.query(`DELETE FROM contact WHERE emp_id = $1`, [emp_id]);

    // --- 5. Bulk Insert ---
    if (contacts.length > 0) {
      const values = [];
      const placeholders = contacts.map((contact, i) => {
        const offset = i * 6; 
        
        values.push(
          emp_id,
          contact.contact_type || null,
          contact.phone || null,
          contact.email?.toLowerCase() || null,
          contact.relation || null,
          contact.is_primary ?? false
        );

        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, NOW())`;
      }).join(",");

      const bulkInsertQuery = `
        INSERT INTO contact (emp_id, contact_type, phone, email, relation, is_primary, created_at)
        VALUES ${placeholders}
      `;

      await db.query(bulkInsertQuery, values);
    }

    await db.query('COMMIT');
    res.status(200).json({ success: true, message: "Contacts updated successfully" });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Bulk Contact Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.deleteContactInfo = async (req, res) => {
  // 1. Ensure these match your route definition: /contact/:emp_id/:id
  const { emp_id, id } = req.params;

  console.log("emp_id",emp_id);
  console.log("id",id);

  try {

    const checkQuery = `
        SELECT is_primary 
        FROM contact 
        WHERE id = $1 AND emp_id = $2
    `;

    const result = await db.query(checkQuery, [id, emp_id]);
    const rows = result.rows; // db.query returns an object with a rows array in pg

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contact not found for this employee."
      });
    }

    const isPrimary = rows[0].is_primary;

    // 3. Logic: If it's primary, check if it's the ONLY contact left
    if (isPrimary) {
      const countQuery = `SELECT COUNT(*) as total FROM contact WHERE emp_id = $1`;
      const countResult = await db.query(countQuery, [emp_id]);

      if (parseInt(countResult.rows[0].total) > 1) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete the Primary contact. Assign another contact as Primary first."
        });
      }
    }

    // 4. Execute the Delete (Fixed variable name from contact_id to id)
    const deleteQuery = `DELETE FROM contact WHERE id = $1 AND emp_id = $2`;
    await db.query(deleteQuery, [id, emp_id]);

    return res.status(200).json({
      success: true,
      message: "Contact deleted successfully."
    });

  } catch (error) {
    console.error("Database Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during deletion."
    });
  }
};


exports.getNomineeInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    // console.log("getNominee:", emp_id);

    //  Ensure integer (important if column type integer hai)
    const empIdInt = parseInt(emp_id);

    const query = `
      SELECT *
      FROM nominee
      WHERE emp_id = $1
      
    `;

    const result = await db.query(query, [empIdInt]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        nominee: null
      });
    }

    // console.log("Get Nominee",result.rows[0]);

    res.status(200).json({
      success: true,
      nominee: result.rows
    });

  } catch (error) {
    console.error("Get Nominee Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// exports.addNomineeInfo = async (req, res) => {
//   try {
//     const { nominee_name, nominee_relation, nominee_contact } = req.body;
//     const { emp_id } = req.params;

//     const empId = emp_id ? emp_id : req.user.emp_id;

//     // console.log("empId:", empId);
//     // console.log("Body:", req.body);

//     //  Validate input
//     if (!nominee_name || !nominee_relation || !nominee_contact) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     const query = `
//       INSERT INTO nominee 
//       (emp_id, nominee_name, nominee_relation, nominee_contact)
//       VALUES ($1, $2, $3, $4)
//       RETURNING *
//     `;

//     const result = await db.query(query, [
//       empId,
//       nominee_name,
//       nominee_relation,
//       nominee_contact,
//     ]);

//     return res.status(200).json({
//       success: true,
//       message: "Nominee added successfully",
//       data: result.rows[0],
//     });

//   } catch (error) {
//     console.error("Add Nominee Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//     });
//   }
// };
exports.addNomineeInfo = async (req, res) => {
  try {
    const { nominees } = req.body;
    const { emp_id } = req.params;
    const empId = emp_id || req.user.emp_id;

    // 1. Basic Validation
    if (!nominees || !Array.isArray(nominees) || nominees.length === 0) {
      return res.status(400).json({ success: false, message: "Nominees array is required" });
    }

    // 2. Fetch Existing Total Percentage from DB
    const percentageCheck = await db.query(
      `SELECT SUM(nominee_percentage) as total_pct FROM nominee WHERE emp_id = $1`,
      [empId]
    );
    const existingTotal = Number(percentageCheck.rows[0].total_pct || 0);

    if (existingTotal >= 100) {
      return res.status(400).json({
        success: false,
        message: `Total percentage is already 100%. Cannot add more nominees.`,
      });
    }

    // 3. Validate Each New Nominee & Calculate Incoming Total
    let incomingTotal = 0;
    for (const nominee of nominees) {
      const { nominee_name, nominee_relation, nominee_contact, nominee_percentage } = nominee;

      if (!nominee_name || !nominee_relation || !nominee_contact || nominee_percentage === undefined) {
        return res.status(400).json({ success: false, message: "All nominee fields are required" });
      }

      if (!/^[0-9]{10}$/.test(nominee_contact.toString())) {
        return res.status(400).json({ success: false, message: "Contact number must be 10 digits" });
      }

      const pct = Number(nominee_percentage);
      if (pct <= 0 || pct > 100) {
        return res.status(400).json({ success: false, message: "Percentage must be between 1 and 100" });
      }
      incomingTotal += pct;
    }

    // 4. Final Percentage Cap Check
    if (existingTotal + incomingTotal > 100) {
      return res.status(400).json({
        success: false,
        message: `Remaining allowed: ${100 - existingTotal}%`,
      });
    }

    // 5. Duplicate Contact Check
    const contacts = nominees.map(n => n.nominee_contact.toString());
    const existingContact = await db.query(
      `SELECT nominee_contact FROM nominee WHERE emp_id = $1 AND nominee_contact = ANY($2)`,
      [empId, contacts]
    );

    if (existingContact.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Nominee with this contact already exists" });
    }

    // 6. Bulk Insert
    const values = [];
    const placeholders = nominees.map((nominee, index) => {
      const base = index * 5;
      values.push(empId, nominee.nominee_name, nominee.nominee_relation, nominee.nominee_contact.toString(), nominee.nominee_percentage);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    });

    const query = `
      INSERT INTO nominee (emp_id, nominee_name, nominee_relation, nominee_contact, nominee_percentage)
      VALUES ${placeholders.join(", ")} RETURNING *`;

    const result = await db.query(query, values);

    return res.status(200).json({
      success: true,
      message: "Nominees added successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Add Nominee Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
// exports.updateNomineeInfo = async (req, res) => {
//   try {
//     const { nominee_name, nominee_relation, nominee_contact } = req.body;
//     const emp_id = req.user.emp_id;

//     if (!nominee_name || !nominee_relation || !nominee_contact) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const query = `
//       UPDATE nominee
//       SET 
//         nominee_name = $1,
//         nominee_relation = $2,
//         nominee_contact = $3
//       WHERE emp_id = $4
//       RETURNING *;
//     `;

//     const result = await db.query(query, [
//       nominee_name,
//       nominee_relation,
//       nominee_contact,
//       emp_id
//     ]);

//     if (result.rowCount === 0) {
//       return res.status(404).json({ message: "Nominee not found for this employee" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Nominee info updated successfully",
//       data: result.rows[0]
//     });

//   } catch (error) {
//     console.error("Update Nominee Error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };
exports.updateNomineeInfo = async (req, res) => {
  try {
    const { id } = req.params; 
    const { nominee_name, nominee_relation, nominee_contact, nominee_percentage } = req.body;
    const emp_id = req.user.emp_id;
    const newPercentage = Number(nominee_percentage);

    // 1. Basic Validation
    if (!nominee_name || !nominee_relation || !nominee_contact || nominee_percentage === undefined) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // 2. Contact Validation (10 digits)
    const contactStr = nominee_contact.toString();
    if (!/^[0-9]{10}$/.test(contactStr)) {
      return res.status(400).json({ success: false, message: "Contact number must be exactly 10 digits" });
    }

    // 3. Percentage Calculation Logic
    // We fetch all nominees for this employee EXCEPT the one we are currently updating
    const otherNominees = await db.query(
      `SELECT nominee_percentage FROM nominee WHERE emp_id = $1 AND id != $2`,
      [emp_id, id]
    );

    const existingTotal = otherNominees.rows.reduce(
      (sum, n) => sum + Number(n.nominee_percentage),
      0
    );

    const projectedTotal = existingTotal + newPercentage;

    if (projectedTotal > 100) {
      return res.status(400).json({
        success: false,
        message: `You only have ${100 - existingTotal}% remaining.`,
      });
    }

    // 4. Perform Update
    const query = `
      UPDATE nominee
      SET 
        nominee_name = $1,
        nominee_relation = $2,
        nominee_contact = $3,
        nominee_percentage = $4
      WHERE id = $5 AND emp_id = $6
      RETURNING *;
    `;

    const result = await db.query(query, [
      nominee_name,
      nominee_relation,
      contactStr, // Stored as string to avoid "Integer out of range"
      newPercentage,
      id,
      emp_id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Nominee not found or not authorized",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Nominee updated successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error("Update Nominee Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


exports.deleteNomineeInfo = async (req, res) => {
  try {

    console.log("req.params",req.params);

    const {emp_id,id } = req.params; 
    // const emp_id = req.user.emp_id; 

    console.log("Delete id",id);
    console.log("Delete emp_id",emp_id);

    const query = `
      DELETE FROM nominee
      WHERE id = $1 AND emp_id = $2
      RETURNING *;
    `;

    const result = await db.query(query, [id, emp_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Nominee not found or not authorized" });
    }

    res.status(200).json({
      message: "Nominee deleted successfully",
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error("Delete Nominee Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.addBankInfo = async (req, res) => {
  try {
    const emp_id = req.params.emp_id;
    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      branch_name,
      upi_id,
      account_type,
      is_active = true,
      pan_number,
    } = req.body;

    // console.log(req.body);


    if (!account_holder_name || !bank_name || !account_number || !ifsc_code || !branch_name) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    const result = await db.query(
      `
      INSERT INTO bank_accounts (
        employee_id, account_holder_name, bank_name, account_number, ifsc_code, branch_name, upi_id, account_type, pan_number, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (employee_id)
      DO UPDATE SET
        account_holder_name = EXCLUDED.account_holder_name,
        bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        ifsc_code = EXCLUDED.ifsc_code,
        branch_name = EXCLUDED.branch_name,
        upi_id = EXCLUDED.upi_id,
        account_type = EXCLUDED.account_type,
        pan_number = EXCLUDED.pan_number,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
      `,
      [
        emp_id,
        account_holder_name,
        bank_name,
        account_number,
        ifsc_code,
        branch_name,
        upi_id,
        account_type,
        pan_number,
        is_active
      ]
    );

    // console.log("result.rows[0]",result.rows[0])
    // sendNotification(emp_id, "Bank", req.user.name);
    res.status(201).json({
      message: "Bank details saved successfully",
      bankInfo: result.rows[0],
    });
  } catch (error) {
    console.error("Bank save error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.getBankInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const result = await db.query(
      `SELECT * FROM bank_accounts WHERE employee_id = $1`,
      [emp_id]
    );

    res.status(200).json({
      bankDetails: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.updateBankInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;
    // console.log("req.body bank update ",req.body);
    const {
      account_holder_name,
      bank_name,
      account_number,
      ifsc_code,
      branch_name,
      upi_id,
      account_type,
      pan_number,
      is_active
    } = req.body;

    if (
      !account_holder_name ||
      !bank_name ||
      !account_number ||
      !ifsc_code ||
      !account_type ||
      !pan_number
    ) {
      return res.status(400).json({
        message: "Required bank fields are missing"
      });
    }


const recordCheck = await db.query(
      `SELECT id FROM bank_accounts WHERE employee_id = $1`, 
      [emp_id]
    ); 

    if (recordCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No bank details found for this employee. Use the 'Add' feature instead of 'Update'."
      });
    }

    // Basic validation
    

    const result = await db.query(
      `
      UPDATE bank_accounts
      SET
        account_holder_name = $1,
        bank_name = $2,
        account_number = $3,
        ifsc_code = $4,
        branch_name = $5,
        upi_id = $6,
        account_type = $7,
        pan_number = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE employee_id = $10
      RETURNING *
      `,
      [
        account_holder_name,
        bank_name,
        account_number,
        ifsc_code,
        branch_name || null,
        upi_id || null,
        account_type,
        pan_number,
        is_active ?? true,
        emp_id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Bank details not found for this employee"
      });
    }

    // Mask sensitive data in response
    const responseData = {
      ...result.rows[0],
      account_number: `XXXXXX${result.rows[0].account_number.slice(-4)}`
    };

    // sendNotification(emp_id, "Bank", req.user.name);

    res.status(200).json({
      message: "Bank details updated successfully",
      data: responseData
    });

  } catch (error) {
    console.error("Update bank details error:", error);
    res.status(500).json({
      message: "Internal Server Error"
    });
  }
}


// exports.addBankDocInfo = async (req, res) => {
//   try {
//     const { emp_id } = req.params;
    
//     const {documentType,documentNumber} = req.body;


//     console.log("documentType,documentNumber",documentType,documentNumber)

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     const uploadedDocs = [];

//     for (const field in req.files) {
//       const file = req.files[field][0];

//       // 1. Get the old file path BEFORE updating the DB
//       const { rows: existing } = await db.query(
//         "SELECT file_path FROM bank_documents WHERE emp_id = $1 AND file_type = $2",
//         [emp_id, file.fieldname]
//       );

//       // 2. Perform the Upsert (Insert or Update)
//       const result = await db.query(
//         `
//         INSERT INTO bank_documents (
//           bank_account_id, 
//           file_type, 
//           file_name, 
//           file_path, 
//           file_size, 
//           created_at, 
//           updated_at
//         )
//         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
//         ON CONFLICT (bank_account_id, file_type) 
//         DO UPDATE SET 
//           file_name = EXCLUDED.file_name,
//           file_path = EXCLUDED.file_path,
//           file_size = EXCLUDED.file_size,
//           updated_at = NOW()
//         RETURNING *;
//         `,
//         [
//           emp_id,
//           file.fieldname,
//           file.originalname,
//           `/uploads/bank-docs/${file.filename}`,
//           file.size,
//         ]
//       );

//       // 3. Delete the old physical file from disk ONLY IF the DB update succeeded
//       if (existing.length > 0 && existing[0].file_path) {
//         // Adjust path resolution based on your folder structure
//         const oldFilePath = path.join(__dirname, "../../", existing[0].file_path);

//         if (fs.existsSync(oldFilePath)) {
//           fs.unlink(oldFilePath, (err) => {
//             if (err) console.error("Could not delete old file:", err);
//           });
//         }
//       }

//       uploadedDocs.push(result.rows[0]);
//     }

//     // sendNotification(emp_id, "Bank Documents", req.user?.name || "Employee");

//     return res.status(201).json({
//       message: "Bank documents uploaded successfully",
//       documents: uploadedDocs,
//     });

//   } catch (error) {
//     console.error("Database Error details:", error.hint || error.message);
//     if (!res.headersSent) {
//       res.status(500).json({
//         message: "Internal Server Error",
//         error: error.message
//       });
//     }
//   }
// }
exports.addBankDocInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const { documentType, documentNumber } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }

    //  Get old file BEFORE update
    const { rows: existing } = await db.query(
      "SELECT file_path FROM bank_documents WHERE emp_id = $1 AND document_type = $2",
      [emp_id, documentType]
    );

    //  Insert or Update
    const result = await db.query(
      `
      INSERT INTO bank_documents (
        emp_id,
        document_type,
        document_number,
        file_name,
        file_path,
        file_size,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (emp_id, document_type)
      DO UPDATE SET
        document_number = EXCLUDED.document_number,
        file_name = EXCLUDED.file_name,
        file_path = EXCLUDED.file_path,
        file_size = EXCLUDED.file_size,
        updated_at = NOW()
      RETURNING *;
      `,
      [
        emp_id,
        documentType,
        documentNumber,
        file.originalname,
        `/uploads/bank-docs/${file.filename}`,
        file.size,
      ]
    );

    // Delete old physical file if exists
    if (existing.length > 0 && existing[0].file_path) {
      const oldFilePath = path.join(
        __dirname,
        "..",
        "..",
        existing[0].file_path
      );

      if (fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error("Could not delete old file:", err);
        });
      }
    }

    return res.status(201).json({
      message: "Bank document saved successfully",
      document: result.rows[0],
    });

  } catch (error) {
    console.error("Database Error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
};


exports.deleteDocument = async (req, res) => {
  try {
    const { id, emp_id } = req.params;

    const queryDelete = `
      DELETE FROM bank_documents
      WHERE id = $1 AND emp_id = $2
    `;

    const result = await db.query(queryDelete, [id, emp_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json({ message: "Doc Deleted Successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.getAllBankDoc = async (req, res) => {
  try {
    const { emp_id } = req.params;

    // Fetch documents from DB
    const result = await db.query(
      `
      SELECT id,emp_id, document_type,document_number, file_name, file_path, file_size, created_at, updated_at
      FROM bank_documents
      WHERE emp_id = $1
      ORDER BY created_at ASC
      `,
      [emp_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.status(200).json({
      emp_id,
      documents: result.rows,
    });
  } catch (error) {
    console.error("Bank Documents GET Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.addProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const requestedEmpId = req.params.emp_id;   
    const loggedInEmpId = req.user.emp_id;    
    const userRole = req.user.role;

   
    if (userRole !== "admin" && requestedEmpId !== loggedInEmpId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const imagePath = `/uploads/profile-images/${req.file.filename}`;

    // Get old image
    const oldImageResult = await db.query(
      `SELECT profile_image FROM users WHERE emp_id = $1`,
      [requestedEmpId]
    );

    const oldImagePath = oldImageResult.rows[0]?.profile_image;

    // Delete old image
    if (oldImagePath) {
      const fullPath = path.join(__dirname, "..", oldImagePath);

      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) console.error("Failed to delete old profile image:", err);
        });
      }
    }

    // Update DB
    await db.query(
      `UPDATE users SET profile_image = $1 WHERE emp_id = $2`,
      [imagePath, requestedEmpId]
    );

    res.status(200).json({
      message: oldImagePath
        ? "Profile image updated successfully"
        : "Profile image added successfully",
      profile_image: imagePath,
    });

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getProfileImage = async (req, res) => {
  try {
    const requestedEmpId = req.params.emp_id;   
    const loggedInEmpId = req.user.emp_id;    
    const userRole = req.user.role;

    // If normal employee → only allow own image
    if (userRole !== "admin" && requestedEmpId !== loggedInEmpId) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const result = await db.query(
      `SELECT profile_image FROM users WHERE emp_id = $1`,
      [requestedEmpId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileImage = result.rows[0].profile_image;

    let formattedPath = profileImage;
    if (profileImage && !profileImage.startsWith("/")) {
      formattedPath = `/${profileImage}`;
    }

    const fullImageUrl = profileImage
      ? `${req.protocol}://${req.get("host")}${formattedPath}`
      : null;

    res.status(200).json({
      profile_image: fullImageUrl,
    });

  } catch (error) {
    console.error("Fetch profile image error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
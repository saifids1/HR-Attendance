const fs = require("fs");
const multer = require("multer");
const path = require("path");
const auth = require("../middlewares/authMiddleware");
const { db } = require("../db/connectDB");
const sendEmail = require("../utils/mailer");
const sendNotification = require("../services/notification.services");
// Organization

exports.addOrganizationInfo = async(req,res)=>{

    try {
     
            const {
              organizationName,
              organizationCode,
              industryType,
              address,
              city,
              state,
              country,
              isactive
            } = req.body;
        
            if (!organizationName || !organizationCode || !industryType || !address || !city || !state) {
              return res.status(400).json({ message: "All fields required" });
            }
        
            const { rows } = await db.query(
              `
              INSERT INTO organizations 
                (organization_name, organization_code, industry_type, address, city, state, country, is_active)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
              RETURNING organization_name, organization_code, industry_type, address, city, state, country, is_active
              `,
              [organizationName, organizationCode, industryType, address, city, state, country || null, isactive || true]
            );

            await sendEmail(req.user.email, "Profile Updated", "profile_update", {
              name: data.name
            });
        
        
            res.status(201).json({
              message: "Organization created successfully",
              organization: rows[0]
            });
        
         } catch (error) {
        console.log(error);
        req.status(500).json({message:"Internal Server Error"});
    }
}

exports.getOrganizationInfo = async (req, res) => {
  // Log this to see if Admin is reaching the controller
  // console.log("User from token:", req.user);
  try {

    // const {emp_id} = req.params;
    const result = await db.query(
      `
      SELECT * FROM organizations 
      `
    )

    res.status(200).json({ message: "Personal Data Fetched", organizationDetails: result.rows[0] });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.updateOrganizationInfo = async (req, res) => {
  try {
    // const { emp_id } = req.params;

    const {
      organization_name,
      organization_code,
      industry_type,
      address,
      city,
      state,
      country,
      is_Active,
    } = req.body;

    const result = await db.query(
      `
        UPDATE organizations
        SET
          organization_name = $1,
          organization_code = $2,
          industry_type = $3,
          address = $4,
          city = $5,
          state = $6,
          country = $7,
          is_active = $8
        RETURNING *
        `,
      [
        organization_name,
        organization_code,
        industry_type,
        address,
        city,
        state,
        country,
        is_Active,

      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({
      message: "Organization details updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Organization Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


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

exports.addPersonInfo =  async (req, res) => {
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
    } = req.body;

    console.log(dob)

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
      !department
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
        department
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
        p.nominee,
        p.aadharnumber,
        p.bloodgroup,
        p.nationality,
        p.address
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
      dob,
      joining_date,
      gender,
      department,
      bloodgroup,
      maritalstatus,
      nationality,
      nominee,
      aadharnumber,
      address
    } = req.body;

    const parseDate = (dateStr) => {
      if (!dateStr || dateStr === "") return null;
      const parts = dateStr.split("-");
      // Agar DD-MM-YYYY hai, toh YYYY-MM-DD banayein
      if (parts[0].length === 2) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      return dateStr; // Already YYYY-MM-DD
    };

    // 1. DOB format karein
    let formattedDob = parseDate(dob);
    
    // 2. Joining Date format karein (Yeh missing tha!)
    let formattedJoiningDate = parseDate(joining_date);

    // Update query
    const result = await db.query(
      `UPDATE personal 
       SET 
         dob = $1, 
         joining_date = $2, 
         gender = $3, 
         department = $4,
         bloodgroup = $5,
         maritalstatus = $6,
         nationality = $7,
         nominee = $8,
         aadharnumber = $9,
         address = $10
       WHERE emp_id = $11 
       RETURNING *`,
      [
        formattedDob,         // $1
        formattedJoiningDate, // $2 - Ab error nahi aayega
        gender,               // $3
        department,           // $4
        bloodgroup,           // $5
        maritalstatus,        // $6
        nationality,          // $7
        nominee,              // $8
        aadharnumber,         // $9
        address,              // $10
        emp_id                // $11
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
// Education
exports.addEducationInfo = async (req, res) => {
  try {
    const { emp_id } = req.params;

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
      [emp_id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "No education records found" });
    }

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
  try {
    
    const { emp_id } = req.params;
    // FormData se bhejte waqt hum data ko 'education' field mein stringify karke bhejenge
    console.log("req.body update Edu",req.body);
    const educationEntries = JSON.parse(req.body.education); 


    await db.query('BEGIN');

    for (let i = 0; i < educationEntries.length; i++) {
      let edu = educationEntries[i];
      let finalPath = edu.marksheet_url;

      // Check karein agar is specific row ke liye file upload hui hai
      const file = req.files.find(f => f.fieldname === `file_${i}`);
      if (file) {
        finalPath = `/uploads/education/${file.filename}`;
      }

      if (edu.id) {
        await db.query(
          `UPDATE education SET 
            degree=$1, field_of_study=$2, institution_name=$3, university=$4, 
            percentage_or_grade=$5, passing_year=$6, marksheet_url=COALESCE($7, marksheet_url), 
            updated_at=NOW() WHERE id=$8 AND emp_id=$9`,
          [edu.degree, edu.field_of_study, edu.institution_name, edu.university, 
           edu.percentage_or_grade, edu.passing_year, finalPath, edu.id, emp_id]
        );
      } else {
        await db.query(
          `INSERT INTO education (emp_id, degree, field_of_study, institution_name, university, percentage_or_grade, passing_year, marksheet_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [emp_id, edu.degree, edu.field_of_study, edu.institution_name, edu.university, 
           edu.percentage_or_grade, edu.passing_year, finalPath]
        );
      }
    }
    await db.query('COMMIT');
    res.status(200).json({ message: "Updated with files!" });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ message: error.message });
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

exports.addExperienceInfo =  async (req, res) => {
  try {
    const { emp_id } = req.params;

    // console.log(req.body);
    const {
      company_name,
      designation,
      start_date,
      end_date,
      total_years,
    } = req.body;

    // console.log( company_name,
    //   designation,
    //   start_date,
    //   end_date,
    //   total_years)

    if (!company_name || !designation) {
      return res.status(400).json({
        message: "Company name and designation are required",
      });
    }

    const result = await db.query(
      `
      INSERT INTO experience
        (emp_id, company_name, designation, start_date, end_date, total_years)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [emp_id, company_name, designation, start_date, end_date, total_years]
    );
    sendNotification(emp_id, "New Experience", req.user.name);

    res.status(201).json({
      message: "Experience created successfully",
      experience: result.rows[0],
    });
  } catch (error) {
    console.error("Create experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.getExperienceInfo =  async (req, res) => {
  try {
    const { emp_id } = req.params;

    if(!emp_id) return 
    const { rows } = await db.query(
      `
      SELECT
        id,
        emp_id,
        company_name,
        designation,
        start_date,
        end_date,
        total_years
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
    } = req.body;

    // console.log(req.body);

    if (!company_name || !designation) {
      return res.status(400).json({
        message: "Company name and designation are required",
      });
    }

    const result = await db.query(
      `
      UPDATE experience
      SET company_name = $1,
          designation = $2,
          start_date = $3,
          end_date = $4,
          total_years = $5
      WHERE id = $6 AND emp_id = $7
      RETURNING *
      `,
      [
        company_name,
        designation,
        start_date,
        end_date,
        total_years,
        id,
        emp_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Experience not found",
      });
    }

   
    sendNotification(emp_id, "Experience", req.user.name);

    res.status(200).json({
      message: "Experience updated successfully",
      experience: result.rows[0],
    });
  } catch (error) {
    console.error("Update experience error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

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

    res.status(200).json({
      contacts: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.updateContactInfo = async (req, res) => {
  const { emp_id } = req.params;
  const contacts = req.body; // Expecting an array []

  try {
    await db.query('BEGIN'); // Transaction start

    // 1. Pehle purane saare contacts delete karein is employee ke
    await db.query(`DELETE FROM contact WHERE emp_id = $1`, [emp_id]);

    // 2. Naye contacts loop karke insert karein
    if (Array.isArray(contacts) && contacts.length > 0) {
      for (const contact of contacts) {
        await db.query(
          `INSERT INTO contact (emp_id, contact_type, phone, email, relation, is_primary, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            emp_id,
            contact.contact_type || null,
            contact.phone || null,
            contact.email || null,
            contact.relation || null,
            contact.is_primary ?? false
          ]
        );
      }
    }

    await db.query('COMMIT');
    res.status(200).json({ message: "All contacts updated successfully" });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Bulk Contact Error:", err);
    res.status(500).json({ message: "Failed to update contacts" });
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

    console.log(req.body);


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

    console.log("result.rows[0]",result.rows[0])
    sendNotification(emp_id, "Bank", req.user.name);
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

exports.updateBankInfo =  async (req, res) => {
  try {
    const { emp_id } = req.params;
    console.log("req.body bank update ",req.body);
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


   

    // Basic validation
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

    // Authorization (employee can update own data, admin can update all)
    // if (req.user.emp_id !== emp_id) {
    //   return res.status(403).json({
    //     message: "Unauthorized access"
    //   });
    // }

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

    sendNotification(emp_id, "Bank", req.user.name);

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


exports.addBankDocInfo =  async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadedDocs = [];

    for (const field in req.files) {
      const file = req.files[field][0];

      // 1. Get the old file path BEFORE updating the DB
      const { rows: existing } = await db.query(
        "SELECT file_path FROM bank_documents WHERE bank_account_id = $1 AND file_type = $2",
        [emp_id, file.fieldname]
      );

      // 2. Perform the Upsert (Insert or Update)
      const result = await db.query(
        `
        INSERT INTO bank_documents (
          bank_account_id, 
          file_type, 
          file_name, 
          file_path, 
          file_size, 
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (bank_account_id, file_type) 
        DO UPDATE SET 
          file_name = EXCLUDED.file_name,
          file_path = EXCLUDED.file_path,
          file_size = EXCLUDED.file_size,
          updated_at = NOW()
        RETURNING *;
        `,
        [
          emp_id,
          file.fieldname,
          file.originalname,
          `/uploads/bank-docs/${file.filename}`,
          file.size,
        ]
      );

      // 3. Delete the old physical file from disk ONLY IF the DB update succeeded
      if (existing.length > 0 && existing[0].file_path) {
        // Adjust path resolution based on your folder structure
        const oldFilePath = path.join(__dirname, "../../", existing[0].file_path);
        
        if (fs.existsSync(oldFilePath)) {
          fs.unlink(oldFilePath, (err) => {
            if (err) console.error("Could not delete old file:", err);
          });
        }
      }

      uploadedDocs.push(result.rows[0]);
    }

    sendNotification(emp_id, "Bank Documents", req.user?.name || "Employee");

    return res.status(201).json({
      message: "Bank documents uploaded successfully",
      documents: uploadedDocs,
    });

  } catch (error) {
    console.error("Database Error details:", error.hint || error.message);
    if (!res.headersSent) {
      res.status(500).json({
        message: "Internal Server Error",
        error: error.message
      });
    }
  }
}

exports.getAllBankDoc = async (req, res) => {
  try {
    const { emp_id } = req.params;

    // Fetch documents from DB
    const result = await db.query(
      `
      SELECT bank_account_id, file_type, file_name, file_path, file_size, created_at, updated_at
      FROM bank_documents
      WHERE bank_account_id = $1
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

exports.addProfileImage =  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const emp_id = req.user.emp_id;
    const imagePath = `/uploads/profile-images/${req.file.filename}`;

    // Delete old image if exists
    const oldImageResult = await db.query(
      `SELECT profile_image FROM users WHERE emp_id = $1`,
      [emp_id]
    );
    const oldImagePath = oldImageResult.rows[0]?.profile_image;
    if (oldImagePath) {
      const fullPath = path.join(__dirname, "..", oldImagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, (err) => {
          if (err) console.error("Failed to delete old profile image:", err);
        });
      } else {
        console.log("Old profile image not found, skipping deletion");
      }
    }

    // Update DB
    await db.query(
      `UPDATE users SET profile_image = $1 WHERE emp_id = $2`,
      [imagePath, emp_id]
    );

    res.status(200).json({
      message: oldImagePath ? "Profile image updated successfully" : "Profile image added successfully",
      profile_image: imagePath,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

exports.getProfileImage = async (req, res) => {
  try {
    const emp_id = req.user.emp_id;

    const result = await db.query(
      `SELECT profile_image FROM users WHERE emp_id = $1`,
      [emp_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileImage = result.rows[0].profile_image;
    let formattedPath = profileImage;

    // Add leading slash if missing
    if (profileImage && !profileImage.startsWith('/')) {
      formattedPath = `/${profileImage}`;
    }

    const fullImageUrl = profileImage
      ? `${req.protocol}://${req.get("host")}${formattedPath}`
      : null;

    res.status(200).json({
      profile_image: fullImageUrl, // null if no image
    });
  } catch (error) {
    console.error("Fetch profile image error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db } = require("../db/connectDB");

const baseUploadDir = path.join(__dirname, "..", "IHRDocument");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({

  destination: async (req, file, cb) => {
    try {
      const employeeId = req.params.employee_id;

      if (!employeeId) {
        return cb(new Error("Employee ID is required"));
      }

      const result = await db.query(
        `
        SELECT or_emp_id
        FROM organizations
        WHERE pr_id = $1
        LIMIT 1
        `,
        [employeeId]
      );

      if (result.rows.length === 0) {
        return cb(new Error("Employee not found"));
      }

      const companyEmployeeId = result.rows[0].or_emp_id;

      if (!companyEmployeeId) {
        return cb(new Error("Employee ID not found in organization"));
      }

      const employeeDir = path.join(
        baseUploadDir,
        String(companyEmployeeId)
      );

      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, {
          recursive: true
        });
      }

      req.companyEmployeeId = companyEmployeeId;

      cb(null, employeeDir);

    } catch (error) {
      cb(error);
    }
  },

  filename: (req, file, cb) => {

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    const uniqueName = `Doc_${Date.now()}${ext}`;

    cb(null, uniqueName);
  }

});

const fileFilter = (req, file, cb) => {

  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg"
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error("Only PDF, PNG, JPG allowed")
    );
  }

  cb(null, true);
};

const uploadBankDoc = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter
}).single("document");

module.exports = uploadBankDoc;
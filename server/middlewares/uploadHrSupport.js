const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sequelize } = require("../db/SequelizeDB");
const { QueryTypes } = require("sequelize");


const SERVER_ROOT = path.join(__dirname, "..");

/* ============================================================
   BASE UPLOAD DIRECTORY (absolute, always created at boot)
   ============================================================ */
const baseUploadDir = path.join(
  __dirname,
  "..",
  "IHRDocument",
  "HR-Support"
);

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

/* ============================================================
   PATH HELPERS
   ============================================================ */


const toRelativePath = (absolutePath) => {
  if (!absolutePath) return null;

  try {
    const normalizedAbs = path.normalize(absolutePath);
    const normalizedRoot = path.normalize(SERVER_ROOT);

    // If the file is inside SERVER_ROOT, strip the root prefix.
    // Otherwise, just keep the basename chain from IHRDocument onward.
    let rel = normalizedAbs.startsWith(normalizedRoot)
      ? normalizedAbs.slice(normalizedRoot.length)
      : normalizedAbs;

    // Ensure exactly one leading separator, then normalise to "\"
    rel = rel.replace(/^[\\/]+/, "");
    rel = rel.split("/").join("\\");

    return "\\" + rel;
  } catch (err) {
    console.error("[HR-SUPPORT] toRelativePath error:", err);
    return absolutePath; // fail-safe: store as-is
  }
};


const toAbsolutePath = (relativePath) => {
  if (!relativePath) return null;

  // Already absolute? Return as-is (supports legacy rows)
  if (path.isAbsolute(relativePath)) return relativePath;

  // Strip leading separators, then join with SERVER_ROOT
  const cleaned = relativePath.replace(/^[\\/]+/, "");
  return path.join(SERVER_ROOT, cleaned);
};

/* ============================================================
   STORAGE
   ============================================================ */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const employeeId =
        req.user?.pr_id ||
        req.user?.Pr_Id ||
        req.user?.user_id ||
        req.user?.id;

      console.log("======================================");
      console.log("HR SUPPORT UPLOAD");
      console.log("Employee PR ID:", employeeId);

      if (!employeeId) {
        return cb(new Error("Employee ID is required"));
      }

      const result = await sequelize.query(
        `
        SELECT or_emp_id
        FROM organizations
        WHERE pr_id = :prId
        LIMIT 1
        `,
        {
          replacements: { prId: employeeId },
          type: QueryTypes.SELECT,
        }
      );

      console.log("Organization result:", result);

      if (!result || result.length === 0) {
        return cb(new Error("Employee not found in organizations"));
      }

      const companyEmployeeId = result[0].or_emp_id;

      if (!companyEmployeeId) {
        return cb(new Error("Employee ID not found in organization"));
      }

      const employeeDir = path.join(
        baseUploadDir,
        String(companyEmployeeId)
      );

      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }

      req.companyEmployeeId = companyEmployeeId;
      req.hrSupportPrId = employeeId;

      console.log("Upload directory:", employeeDir);
      console.log("======================================");

      cb(null, employeeDir);
    } catch (error) {
      console.error("HR Support upload destination error:", error);
      cb(error);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `Support_${Date.now()}_${Math.round(
      Math.random() * 100000
    )}${ext}`;
    cb(null, uniqueName);
  },
});

/* ============================================================
   FILE FILTER
   ============================================================ */
const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!allowed.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only PDF, PNG, JPG, DOC, DOCX, XLS and XLSX files are allowed"
      )
    );
  }

  cb(null, true);
};


const uploadHrSupport = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter,
});


module.exports = uploadHrSupport;
module.exports.toRelativePath = toRelativePath;
module.exports.toAbsolutePath = toAbsolutePath;
module.exports.SERVER_ROOT = SERVER_ROOT;
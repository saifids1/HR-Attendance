const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../models");
const { Organizations } = db;

const baseUploadDir = path.join(__dirname, "../IHRDocument");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const employeeId =
        req.params?.emp_id ||
        req.params?.employee_id ||
        req.user?.id ||
        req.body?.emp_id ||
        req.body?.employee_id;

      if (!employeeId) {
        return cb(new Error("Employee ID not found"));
      }

      const orgRow = await Organizations.findOne({
        where: { pr_id: employeeId },
        attributes: ["or_emp_id"],
        order: [["or_id", "DESC"]],
      });

      const employeeCode = orgRow?.or_emp_id;

      if (!employeeCode) {
        return cb(new Error("Employee code not found"));
      }

      const employeeDir = path.join(baseUploadDir, String(employeeCode));

      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }

      cb(null, employeeDir);
    } catch (err) {
      cb(err);
    }
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});
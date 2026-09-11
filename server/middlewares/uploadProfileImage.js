const multer = require("multer");
const path = require("path");
const fs = require("fs");

const baseUploadDir = path.join(
  __dirname,
  "../IHRDocument"
);

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empId = req.user?.emp_id;

    if (!empId) {
      return cb(new Error("Employee ID not found"));
    }

    const employeeDir = path.join(
      baseUploadDir,
      String(empId)
    );

    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true });
    }

    cb(null, employeeDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `profile_${Date.now()}${ext}`
    );
  }
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
    fileSize: 10 * 1024 * 1024
  }
});
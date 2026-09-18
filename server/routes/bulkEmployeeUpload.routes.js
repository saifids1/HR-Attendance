const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const auth = require("../middlewares/authMiddleware");
const bulkEmployeeUploadController = require("../controllers/bulkEmployeeUpload.controller");

const router = express.Router();

const uploadDir = path.join(__dirname, "..", "uploads", "bulk");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `bulk-${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only .xlsx / .xls files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get(
  "/download",
  auth,
  bulkEmployeeUploadController.downloadBulkEmployeeTemplate
);

router.post(
  "/bulk-upload",
  auth,
  upload.single("file"),
  bulkEmployeeUploadController.bulkUploadEmployees
);

module.exports = router;
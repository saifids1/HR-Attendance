const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
  __dirname,
  "../uploads/salary-slips"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      `salary-slip-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    file.mimetype !== "application/pdf" ||
    extension !== ".pdf"
  ) {
    return cb(
      new Error("Only PDF files are allowed"),
      false
    );
  }

  cb(null, true);
};

const uploadSalarySlip = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/*Salary Slip PDF Upload Middleware*/
const salarySlipPdfUpload = (req, res, next) => {
  uploadSalarySlip.any()(req, res, (err) => {
    if (err) {
      console.error("Salary Slip Upload Error:", err);

      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "File too large. Maximum allowed size is 10 MB"
              : err.message,
          code: err.code,
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Salary slip PDF upload failed",
      });
    }

    if (!req.file) {
      let uploadedFiles = [];

      if (Array.isArray(req.files)) {
        uploadedFiles = req.files;
      } else if (req.files && typeof req.files === "object") {
        uploadedFiles = Object.values(req.files).flat();
      }

      if (uploadedFiles.length > 0) {
        req.file = uploadedFiles[0];
      }
    }

    next();
  });
};

module.exports = {
  uploadSalarySlip,
  salarySlipPdfUpload,
};
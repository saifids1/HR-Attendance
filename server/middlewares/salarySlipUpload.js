// middlewares/salarySlipUpload.js
const multer = require("multer");

/* ------------------------------------------------------------------ */
/*   Use MEMORY storage for both single & bulk.                        */
/*   The controller will decide the folder + filename and write        */
/*   the buffer to disk. This avoids multer reading req.body too      */
/*   early (which is the cause of "undefined/undefined" paths).        */
/* ------------------------------------------------------------------ */

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/png", "image/jpeg"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only PDF, PNG, JPG allowed"));
  }
  cb(null, true);
};

// Single upload — field name "pdf" → req.file
const salarySlipPdfUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).single("pdf");

// Bulk upload — multiple "pdf" fields → req.files
const salarySlipPdfUploadMultiple = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).array("pdf", 100);

module.exports = {
  salarySlipPdfUpload,
  salarySlipPdfUploadMultiple,
};
const express = require("express");
const router = express.Router();

const {
  salarySlipPdfUpload,
  salarySlipPdfUploadMultiple,
} = require("../middlewares/salarySlipUpload");

const {
  getDepartmentEmployees,
  createSalarySlip,
  createMultipleSalarySlips,
  getSalarySlips,
  getSalarySlipsPaginated,
  getSalarySlipById,
  updateSalarySlip,
  deleteSalarySlip,
  getSalarySlipPdf,
} = require("../controllers/salarySlip.controller");

/* ---------------- STATIC / SPECIFIC ROUTES FIRST ---------------- */

// Employee dropdown
router.get("/department/:or_department_id/employees", getDepartmentEmployees);

// Create single
router.post("/", salarySlipPdfUpload, createSalarySlip);

// Create bulk
router.post("/bulk", salarySlipPdfUploadMultiple, createMultipleSalarySlips);

// Get all
router.get("/", getSalarySlips);

// ✅ Paginated MUST come BEFORE "/:id"
router.get("/paginated", getSalarySlipsPaginated);

/* ---------------- DYNAMIC ROUTES AFTER ---------------- */

// Get single
router.get("/:id", getSalarySlipById);

// Update
router.put("/:id", salarySlipPdfUpload, updateSalarySlip);

// Delete
router.delete("/:id", deleteSalarySlip);

// View PDF
router.get("/:id/file", getSalarySlipPdf);

module.exports = router;
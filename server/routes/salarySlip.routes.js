const express = require("express");

const router = express.Router();

const {
  salarySlipPdfUpload,
} = require("../middlewares/salarySlipUpload");

const {
  getDepartmentEmployees,
  createSalarySlip,
   createMultipleSalarySlips,
  getSalarySlips,
  getSalarySlipById,
  updateSalarySlip,
  deleteSalarySlip,
  getSalarySlipPdf,
} = require("../controllers/salarySlip.controller");


/*Employee Dropdown*/
router.get(
  "/department/:or_department_id/employees",
  getDepartmentEmployees
);
/*Create Salary Slip*/

router.post(
  "/",
  salarySlipPdfUpload,
  createSalarySlip
);
/*Create Salary Slip for multi record*/
router.post(
  "/bulk",
  salarySlipPdfUpload,
  createMultipleSalarySlips
);
/*Get All Salary Slips*/

router.get(
  "/",
  getSalarySlips
);
/*Get Salary Slip By ID*/

router.get(
  "/:id",
  getSalarySlipById
);
/*Update Salary Slip*/

router.put(
  "/:id",
  salarySlipPdfUpload,
  updateSalarySlip
);
/*Delete Salary Slip*/

router.delete(
  "/:id",
  deleteSalarySlip
);
/*View Salary Slip PDF*/

router.get(
  "/:id/file",
  getSalarySlipPdf
);


module.exports = router;
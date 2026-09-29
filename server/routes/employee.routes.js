const express = require("express");
const router = express.Router();

const employeeController = require("../controllers/employee.controller");
const authenticateToken = require("../middlewares/authMiddleware");

router.get(
  "/complete-details",
  authenticateToken,
  employeeController.getEmployeeCompleteDetails
);

module.exports = router;
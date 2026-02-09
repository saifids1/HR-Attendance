const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { db } = require("../db/connectDB");
const { getLeaves, getBalanceLeaves, applyLeaves, getMyLeaves, getSummaryLeaves, getPendingLeaves, updateApproveLeaves, getMyLeaveHistory } = require("../controllers/leaves.controller");
const router = express.Router();


// Get Leaves
router.get("/type", authMiddleware, getLeaves)



router.get("/balance/:emp_id", authMiddleware, getBalanceLeaves)


// Apply Leave

router.post("/apply", authMiddleware, applyLeaves);


// Get My Leaves

router.get("/my/:emp_id", authMiddleware, getMyLeaves)


router.get("/my-summary/:emp_id", authMiddleware, getSummaryLeaves);

// Manager/Admin/TL/PL

router.get("/pending-approvals/:manager_id", authMiddleware, getPendingLeaves);


router.put("/approve/:approval_id", authMiddleware, updateApproveLeaves);

router.get("/my-leave-history/:emp_id", authMiddleware, getMyLeaveHistory);



module.exports = router;


// HR defines leave types (once)
//       ↓
// Employee created
//       ↓
// Leave balances auto-generated
//       ↓
// Employee applies leave
//       ↓
// Manager approves
//       ↓
// Balance deducted

// Balance Leaves
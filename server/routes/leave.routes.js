
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

router.get("/my-history",authMiddleware,(req,res)=>{
    try {
        const empId = req.user.emp_id;

       const query  = `
SELECT 
    la.id AS approval_id,
    la.leave_request_id,
    la.approver_emp_id,
    la.approver_role,
    la.status AS approval_status,
    la.remarks,
    la.action_at,

    lr.emp_id,
    lr.leave_type_id,
    lt.name AS leave_type_name,
    lt.code AS leave_type_code,

    lr.start_date,
    lr.end_date,
    lr.total_days,
    lr.is_half_day,
    lr.half_day_type,
    lr.reason,
    lr.status AS leave_status,
    lr.applied_at,

    e.name AS employee_name,
    e.email

FROM leaves_approval la

JOIN leaves_request lr 
    ON la.leave_request_id = lr.id

JOIN leaves_type lt
    ON lr.leave_type_id = lt.id

JOIN users e 
    ON lr.emp_id = e.emp_id

WHERE la.approver_emp_id = $1

ORDER BY la.action_at DESC;
`;
        db.query(query,[empId],(err,result)=>{
            if(err){
                console.error("Error fetching leave history:", err);
                return res.status(500).json({ message: "Server error" });
            }
            res.json(result.rows);
        })

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
})

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
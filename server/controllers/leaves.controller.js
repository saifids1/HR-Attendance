const { db } = require("../db/connectDB");

exports.getLeaves = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM leaves_type WHERE is_active = true ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


// exports.getBalanceLeaves = async (req, res) => {
//   try {
//     const { emp_id } = req.params;
//     const year = new Date().getFullYear();

//     const balanceResult = await db.query(
//       `
//       SELECT 
//         lt.name AS leaves_type,
//         lb.leave_type_id,
//         lb.total,
//         lb.used,
//         lb.remaining
//       FROM leaves_balance lb
//       JOIN leaves_type lt 
//       ON lt.id = lb.leave_type_id
//       WHERE lb.emp_id = $1 
//       AND lb.year = $2
//       ORDER BY lt.name
//       `,
//       [emp_id, year]
//     );

//     const leaves = balanceResult.rows;

//     const summary = leaves.reduce(
//       (acc, leave) => {
//         acc.total += Number(leave.total);
//         acc.used += Number(leave.used);
//         acc.remaining += Number(leave.remaining);
//         return acc;
//       },
//       { total: 0, used: 0, remaining: 0, pending: 0 }
//     );

//     const pendingResult = await db.query(
//       `
//       SELECT COUNT(*) AS pending
//       FROM leaves_request
//       WHERE emp_id = $1
//       AND status = 'Pending'
//       AND EXTRACT(YEAR FROM start_date) = $2
//       `,
//       [emp_id, year]
//     );

//     summary.pending = Number(pendingResult.rows[0].pending);

//     res.status(200).json({
//       success: true,
//       summary,
//       leaves
//     });

//   } catch (error) {
//     console.error("Get Leave Balance Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch leave balance"
//     });
//   }
// };

exports.getBalanceLeaves = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const year = new Date().getFullYear();

    const balanceResult = await db.query(
      `
      SELECT 
        lt.name AS leaves_type,
        lb.id,
        lb.total,
        lb.used,
        lb.remaining
      FROM leaves_balance lb
      JOIN leaves_type lt 
      ON lt.id = lb.leave_type_id
      WHERE lb.emp_id = $1 
      AND lb.year = $2
      `,
      [emp_id, year]
    );

    const leaves = balanceResult.rows;

    for (const leave of leaves) {
      const correctRemaining = Number(leave.total) - Number(leave.used);

      if (Number(leave.remaining) !== correctRemaining) {
        await db.query(
          `
          UPDATE leaves_balance
          SET remaining = $1,
          last_updated = NOW()
          WHERE id = $2
          `,
          [correctRemaining, leave.id]
        );

        leave.remaining = correctRemaining;
      }
    }

    const summary = leaves.reduce(
      (acc, leave) => {
        acc.total += Number(leave.total);
        acc.used += Number(leave.used);
        acc.remaining += Number(leave.remaining);
        return acc;
      },
      { total: 0, used: 0, remaining: 0, pending: 0 }
    );

    const pendingResult = await db.query(
      `
      SELECT COUNT(*) AS pending
      FROM leaves_request
      WHERE emp_id = $1
      AND status = 'pending'
      AND EXTRACT(YEAR FROM start_date) = $2
      `,
      [emp_id, year]
    );

    summary.pending = Number(pendingResult.rows[0].pending);

    res.json({
      summary,
      leaves
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch leave balance" });
  }
};


// const calculateWorkDays = (start, end) => {
//   let count = 0;
//   let curDate = new Date(start);
//   const endDate = new Date(end);

//   while (curDate <= endDate) {
//     const dayOfWeek = curDate.getDay();
//     // 0 = Sunday, 6 = Saturday. Only count if it's 1-5 (Mon-Fri)
//     if (dayOfWeek !== 0 && dayOfWeek !== 6) {
//       count++;
//     }
//     curDate.setDate(curDate.getDate() + 1);
//   }
//   return count;
// };

const calculateWorkingdays = (start,end)=>{

  let count = 0;
  let currentdate = new Date(start);
  const endDate = new Date(end);

  while(currentdate <= endDate){
    const dayOfWeek = currentdate.getDay();

    // 0 - sun , 6 - sat

    if(dayOfWeek !== 0 && dayOfWeek !== 6){
        count++;
    }

    currentdate.setDate(currentdate.getDate()+1);
  }
  return count;
}

// console.log(calculateWorkingdays("2026-04-14","2026-04-18"));



exports.applyLeaves = async (req, res) => {
  const client = await db.connect();

const { emp_id, leave_type_id, start_date, end_date, reason } = req.body;
  
/*


*/

    


  try {
    const {
      emp_id,
      leave_type_id,
      start_date,
      end_date,
      // total_days,
      reason,
    } = req.body;

    
    //  Validation
    if (!emp_id || !leave_type_id || !start_date || !end_date ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
  

    const today = new Date().setHours(0,0,0,0);

    if(new Date(start_date) < today){
      return res.status(400).json({message:"Cannot Apply for Past days"});
    }


    await client.query("BEGIN");

    // console.log("leaveId",leaveId);
    // console.log("emp_id",emp_id);
    // console.log("currentYear",currentYear);

    const overlapRes = await client.query(
      `
      SELECT id FROM leaves_request
      WHERE emp_id = $1
      AND status IN ('pending','approved')
      AND (start_date <= $2 AND end_date >= $3)
      `,[emp_id,end_date,start_date]
    )

    if(overlapRes.rowCount > 0){
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:"You have already applied for leaves during this period"
      })
    }

    const actualTotalDays = calculateWorkingdays(start_date,end_date);

      if(actualTotalDays < 0){
        return res.status(400).json({
          message:"Selected date range contains no working days"
        })
      }
    const leaveId = Number(leave_type_id);
    const currentYear = new Date().getFullYear();


    console.log("actualTotalDays",actualTotalDays);
    //  Check balance
    const balanceRes = await client.query(
      `SELECT remaining FROM leaves_balance
       WHERE leave_type_id = $1 AND emp_id = $2 AND year = $3`,
      [leaveId, emp_id, currentYear]
    );
    

    console.log("balanceRes",balanceRes);

    if (balanceRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No leave balance found" });
    }

    const availableBalance = parseFloat(balanceRes.rows[0].remaining);

    if (availableBalance < parseFloat(actualTotalDays)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient balance" });
    }
  

    //  Insert leave request
    const leaveRes = await client.query(
      `INSERT INTO leaves_request
       (emp_id, leave_type_id, start_date, end_date, total_days, reason, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING id`,
      [emp_id, leaveId, start_date, end_date, actualTotalDays, reason]
    );

    const leaveRequestId = leaveRes.rows[0].id;

    //  Find manager
    const reportingRes = await client.query(
      `SELECT reports_to FROM employee_reporting WHERE emp_id = $1 LIMIT 1`,
      [emp_id]
    );

    if (reportingRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Manager not found" });
    }

    const approverId = reportingRes.rows[0].reports_to;

    //  Get manager details
    const approverDetails = await client.query(
      `SELECT name, role FROM users WHERE emp_id = $1`,
      [approverId]
    );

    const approverData = approverDetails.rows[0];
    const role =
      approverData?.role !== "employee"
        ? approverData.role
        : "Team/Project Lead";

    // Create approval entry
    await client.query(
      `INSERT INTO leaves_approval
       (leave_request_id, approver_emp_id, approver_role, approval_level, status)
       VALUES ($1,$2,$3,1,'pending')`,
      [leaveRequestId, approverId, role]
    );

    await client.query("COMMIT");

    // REAL-TIME NOTIFICATION
    req.io.to(approverId.toString()).emit("NEW_LEAVE_REQUEST", {
      message: `New leave request from ${approverData?.name || "Employee"}`,
      requestId: leaveRequestId,
      applicantId: emp_id,
    });

    console.log(` Sent to manager ${approverId}`);

    return res.status(201).json({
      message: "Leave applied successfully",
      leave_request_id: leaveRequestId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Leave application failed" });
  } finally {
    client.release();
  }
};

exports.getMyLeaves = async (req, res) => {
  try {

    const { emp_id } = req.params;

    const result = await db.query(
      `
      SELECT 
        lr.id,
        lt.name AS leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.status,
        lr.reason,
        lr.applied_at,

        la.approver_role,
        la.status AS approval_status,
        la.remarks,
        la.action_at

      FROM leaves_request lr

      JOIN leaves_type lt
      ON lt.id = lr.leave_type_id

      LEFT JOIN leaves_approval la
      ON la.leave_request_id = lr.id

      WHERE lr.emp_id = $1

      ORDER BY lr.applied_at DESC, la.approval_level
      `,
      [emp_id]
    );
    const DistinctLeaves = [];
    const leaveMap = new Map();
    for (const row of result.rows) {
      if (!leaveMap.has(row.id)) {
        leaveMap.set(row.id, {
          id: row.id,
          leaves_type: row.leave_type,
          start_date: row.start_date,
          end_date: row.end_date,
          total_days: row.total_days,
          status: row.status,
          reason: row.reason,
          applied_at: row.applied_at,
          approver_role: row.approver_role,
          approval_status: row.approval_status,
          approver_remarks: row.remarks,
          action_at: row.action_at

        });
        DistinctLeaves.push(leaveMap.get(row.id));
      }  
    }  
    res.json(DistinctLeaves);
  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch leaves",
    });

  }
};
exports.getSummaryLeaves = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const currentYear = new Date().getFullYear();

    const query = `
        SELECT 
          -- Yearly quota from leaves_balance
          COALESCE(SUM(total), 0) AS total_allowed,
          -- Total days already approved and deducted
          COALESCE(SUM(used), 0) AS total_taken,
          -- Days still available
          COALESCE(SUM(remaining), 0) AS total_remaining,
          -- Active requests waiting in leaves_request table
          (SELECT COUNT(*) FROM leaves_request 
           WHERE emp_id = $1 AND status = 'pending' 
           AND EXTRACT(YEAR FROM start_date) = $2) AS pending_requests
        FROM leaves_balance
        WHERE emp_id = $1 AND year = $2
      `;

    const result = await db.query(query, [emp_id, currentYear]);

    // Return the calculated totals
    res.json(result.rows[0]);
  } catch (error) {
    console.error("MY_SUMMARY_ERROR:", error.message);
    res.status(500).json({ message: "Failed to load summary" });
  }
}

exports.getPendingLeaves = async (req, res) => {
  try {
    const { manager_id } = req.params;

    // 1. Convert to Integer to match DB type
    const managerIdParsed = parseInt(manager_id, 10);

    if (isNaN(managerIdParsed)) {
      return res.status(400).json({ message: "Invalid Manager ID format" });
    }

    // 2. Fetching enriched data
    // We include approval_level so the manager knows if they are the 1st or 2nd approver
    const result = await db.query(
      `
        SELECT 
          la.id AS approval_id,
          la.approval_level,
          la.approver_role,
          la.approver_emp_id,
          la.status,
          lr.id AS request_id,
          e.name AS employee_name,
          e.emp_id AS employee_code,
          lt.name AS leave_type,
          TO_CHAR(lr.start_date, 'DD-MM-YYYY') AS start_date,
          TO_CHAR(lr.end_date, 'DD-MM-YYYY') AS end_date,
          lr.total_days,
          lr.reason,
          lr.applied_at
        FROM leaves_approval la
        JOIN leaves_request lr ON la.leave_request_id = lr.id
        LEFT JOIN users e ON lr.emp_id = e.emp_id  
        LEFT JOIN leaves_type lt ON lr.leave_type_id = lt.id
        WHERE la.status = 'pending' 
        AND la.approver_emp_id = $1
        ORDER BY lr.applied_at ASC
        `,
      [managerIdParsed]
    );

    // 3. Return results
    // Even if empty [], this is a success state for the UI
    res.json(result.rows);

  } catch (error) {
    console.error("FETCH_PENDING_ERROR:", error.message);
    res.status(500).json({ message: "Failed to fetch pending approvals" });
  }
}



exports.updateApproveLeaves = async (req, res) => {
  const client = await db.connect();

  try {
    const { approval_id } = req.params;
    const { status, remarks } = req.body;
    const approver_emp_id = req.user.emp_id;

    await client.query("BEGIN");

    //  Fetch approval + leave request
    const checkStatus = await client.query(
      `SELECT la.*, lr.emp_id AS applicant_id, lr.leave_type_id, lr.total_days
       FROM leaves_approval la
       JOIN leaves_request lr ON la.leave_request_id = lr.id
       WHERE la.id = $1
       FOR UPDATE`,
      [approval_id]
    );

    if (checkStatus.rowCount === 0) {
      throw new Error("Approval record not found.");
    }

    const currentApproval = checkStatus.rows[0];

    //  Ensure correct approver
    if (currentApproval.approver_emp_id !== approver_emp_id) {
      throw new Error("You are not authorized to approve this leave.");
    }

    // Already processed check
    if (currentApproval.status !== "pending") {
      throw new Error(`This request has already been ${currentApproval.status}.`);
    }

    //  Update current approval record
    await client.query(
      `UPDATE leaves_approval
       SET status = $1,
           remarks = $2,
           action_at = NOW()
       WHERE id = $3`,
      [status, remarks, approval_id]
    );


    // REJECT LOGIC
   
    if (status === "rejected") {
      await client.query(
        `UPDATE leaves_request
         SET status = 'rejected'
         WHERE id = $1`,
        [currentApproval.leave_request_id]
      );

      await client.query("COMMIT");

      // Notify employee
      const applicantSocketId = req.userSockets.get(currentApproval.applicant_id.toString());
      if (applicantSocketId) {
        req.io.to(applicantSocketId).emit("LEAVE_STATUS_UPDATE", {
          message: `Your leave request was rejected by ${currentApproval.approver_role}`,
          status: "rejected",
        });
      }

      return res.json({ message: "Leave request rejected." });
    }

    
    //  APPROVE LOGIC
 
    if (status === "approved") {
      // Check if current approver is Admin
      const isAdmin = currentApproval.approver_role.toLowerCase() === "admin";

      // Find next approver if not Admin
      let nextApproverId = null;
      if (!isAdmin) {
        const nextLevelRes = await client.query(
          `SELECT reports_to
           FROM employee_reporting
           WHERE emp_id = $1`,
          [approver_emp_id]
        );
        nextApproverId = nextLevelRes.rows[0]?.reports_to;
      }

      
      // FINAL APPROVAL
    
      if (!nextApproverId || isAdmin) {
        // Update leave request status to approved
        await client.query(
          `UPDATE leaves_request
           SET status = 'approved'
           WHERE id = $1`,
          [currentApproval.leave_request_id]
        );

        const year = new Date().getFullYear();

        // Deduct leave from balance
        await client.query(
          `UPDATE leaves_balance
           SET used = used + $1,
               remaining = remaining - $1
           WHERE emp_id = $2
           AND leave_type_id = $3
           AND year = $4`,
          [
            currentApproval.total_days,
            currentApproval.applicant_id,
            currentApproval.leave_type_id,
            year,
          ]
        );

        await client.query("COMMIT");

        // Notify employee
        const applicantSocketId = req.userSockets.get(currentApproval.applicant_id.toString());
        if (applicantSocketId) {
          req.io.to(applicantSocketId).emit("LEAVE_STATUS_UPDATE", {
            message: "Your leave request has been fully approved!",
            status: "approved",
          });
        }

        return res.json({
          message: "Final approval complete. Leave approved and balance updated.",
        });
      }

      // ===============================
      // ESCALATE TO NEXT APPROVER
      // ===============================
      const nextApproverDetails = await client.query(
        `SELECT role
         FROM users
         WHERE emp_id = $1`,
        [nextApproverId]
      );

      const nextRole = nextApproverDetails.rows[0]?.role || "Admin";

      await client.query(
        `INSERT INTO leaves_approval
         (leave_request_id, approver_emp_id, approver_role, approval_level, status)
         VALUES ($1,$2,$3,$4,'pending')`,
        [
          currentApproval.leave_request_id,
          nextApproverId,
          nextRole,
          currentApproval.approval_level + 1,
        ]
      );

      await client.query("COMMIT");

      // Notify next approver
      const nextApproverSocketId = req.userSockets.get(nextApproverId.toString());
      if (nextApproverSocketId) {
        req.io.to(nextApproverSocketId).emit("NEW_LEAVE_REQUEST", {
          message: "A leave request has been escalated to you.",
          requestId: currentApproval.leave_request_id,
        });
      }

      return res.json({
        message: `Approved and forwarded to ${nextRole}.`,
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};




exports.finalizeLeave = async (client, approval, approval_id, status, remarks) => {
  const year = new Date().getFullYear();
  const daysToDeduct = Math.round(Number(approval.total_days));

  // Update approval audit
  await client.query(
    `UPDATE leaves_approval
     SET status = $1,
         remarks = $2,
         action_at = NOW()
     WHERE id = $3`,
    [status, remarks, approval_id]
  );

  // Deduct leave balance
  const balanceUpdate = await client.query(
    `UPDATE leaves_balance
     SET used = used + $1,
         remaining = remaining - $1
     WHERE emp_id = $2
     AND leave_type_id = $3
     AND year = $4
     AND remaining >= $1
     RETURNING remaining`,
    [daysToDeduct, approval.applicant_id, approval.leave_type_id, year]
  );

  if (balanceUpdate.rowCount === 0) {
    throw new Error("Insufficient leave balance.");
  }

  // Final update in leave request
  await client.query(
    `UPDATE leaves_request
     SET status = 'approved',
         approved_at = NOW()
     WHERE id = $1`,
    [approval.leave_request_id]
  );

  return balanceUpdate.rows[0].remaining;
};
exports.getMyLeaveHistory = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const result = await db.query(
      `
        SELECT 
          lr.id AS request_id,
          lt.name AS leave_type,
          TO_CHAR(lr.start_date, 'DD-MM-YYYY') AS start_date,
          TO_CHAR(lr.end_date, 'DD-MM-YYYY') AS end_date,
          lr.status AS final_status,
          la.approver_role,
          la.status AS level_status,
          la.remarks AS approver_remarks,
          la.approval_level,
          u.name AS approver_name
        FROM leaves_request lr
        JOIN leaves_type lt ON lr.leave_type_id = lt.id
        LEFT JOIN leaves_approval la ON lr.id = la.leave_request_id
        LEFT JOIN users u ON la.approver_emp_id = u.emp_id
        WHERE lr.emp_id = $1
        ORDER BY lr.applied_at DESC, la.approval_level ASC
        `,
      [emp_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("HISTORY_FETCH_ERROR:", error.message);
    res.status(500).json({ message: "Failed to fetch history" });
  }
}
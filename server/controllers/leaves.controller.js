const {db} = require("../db/connectDB");

exports.getLeaves = async(req,res)=>{
    try {
        const result = await db.query(
            "SELECT * FROM leaves_type WHERE is_active = true ORDER BY name"
          );
          res.json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal Server Error"});
    }
}


exports.getBalanceLeaves = async(req,res)=>{
    try {
        const { emp_id } = req.params;
        const year = new Date().getFullYear();
    
        const result = await db.query(
          `
          SELECT 
            lt.name AS leaves_type,
            lb.total,
            lb.used,
            lb.remaining
          FROM leaves_balance lb
          JOIN leaves_type lt ON lt.id = lb.leave_type_id
          WHERE lb.emp_id = $1 AND lb.year = $2
          `,
          [emp_id, year]
        );
    
        res.json(result.rows);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch leave balance" });
      }
}

exports.applyLeaves =  async (req, res) => {
    const client = await db.connect();
    
    try {
      const {
        emp_id,         
        leave_type_id,  
        start_date,
        end_date,
        total_days,
        reason,
      } = req.body;
  
      const leaveId = Number(leave_type_id);
      const currentYear = new Date().getFullYear(); 
  
      console.log("emp_id,leave_type_id,start_date,end_date,total_days", emp_id,         
        leave_type_id,  
        start_date,
        end_date,
        total_days,
        reason);
  
        
      // 1. Validation
      if (!emp_id || !leave_type_id || !start_date || !end_date || !total_days) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      await client.query("BEGIN");
  
      // 2. Check Leave Balance
      const balanceRes = await client.query(
        `SELECT remaining FROM leaves_balance
         WHERE leave_type_id = $1::integer 
         AND emp_id = $2 
         AND year = $3::integer`,
        [leaveId, emp_id, currentYear]
      );
  
      if (balanceRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `No leave balance found.` });
      }
  
      const availableBalance = parseFloat(balanceRes.rows[0].remaining);
      if (availableBalance < parseFloat(total_days)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Insufficient leave balance" });
      }
  
      // 3. Insert the main Leave Request
      const leaveRes = await client.query(
        `INSERT INTO leaves_request
         (emp_id, leave_type_id, start_date, end_date, total_days, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [emp_id, leaveId, start_date, end_date, total_days, reason]
      );
  
      const leaveRequestId = leaveRes.rows[0].id;
  
      // 4. Identify the Immediate Supervisor
      const reportingRes = await client.query(
        `SELECT reports_to FROM employee_reporting WHERE emp_id = $1 LIMIT 1`,
        [emp_id]
      );
  
      if (reportingRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "Reporting supervisor not found." });
      }
  
      const approverId = reportingRes.rows[0].reports_to;
  
      // 5. Fetch Approver Details
      const approverDetails = await client.query(
        `SELECT name, role FROM users WHERE emp_id = $1`,
        [approverId]
      );
  
      const approverData = approverDetails.rows[0];
      let functionalRole = approverData?.role !== 'employee' ? approverData.role : 'Team/Project Lead';
  
      // 6. Create Level 1 Approval Entry
      await client.query(
        `INSERT INTO leaves_approval
         (leave_request_id, approver_emp_id, approver_role, approval_level, status)
         VALUES ($1, $2, $3, 1, 'pending')`,
        [leaveRequestId, approverId, functionalRole]
      );
  
      // 7. Commit Transaction
      await client.query("COMMIT");
  
      // --- WEB SOCKET NOTIFICATION ---
      // Look up the manager's socket ID using their emp_id
      const managerIdStr = approverId.toString();
      const managerSocketId = req.userSockets.get(managerIdStr);
  
      if (managerSocketId) {
        req.io.to(managerSocketId).emit("NEW_LEAVE_REQUEST", {
          message: `New leave request from ${approverData?.name || 'an employee'}`,
          requestId: leaveRequestId,
          applicantId: emp_id
        });
        console.log(`📡 Notification sent to Manager ${managerIdStr}`);
      }
      // --------------------------------
  
      return res.status(201).json({
        message: "Leave applied successfully",
        leave_request_id: leaveRequestId,
        assigned_to: approverData?.name || 'Supervisor'
      });
  
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      console.error("LEAVE_APPLY_ERROR:", error.message);
      res.status(500).json({ message: "Leave application failed" });
    } finally {
      client.release();
    }
}

exports.getMyLeaves = async(req,res)=>{
    try {
        const { emp_id } = req.params;
    
        const result = await db.query(
          `
          SELECT 
            lr.id,
            lt.name AS leaves_type,
            lr.start_date,
            lr.end_date,
            lr.total_days,
            lr.status,
            lr.reason,
            lr.applied_at
          FROM leaves_request lr
          JOIN leaves_type lt ON lt.id = lr.leave_type_id
          WHERE lr.emp_id = $1
          ORDER BY lr.applied_at DESC
          `,
          [emp_id]
        );
    
        res.json(result.rows);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch leaves" });
      }
}

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

exports.getPendingLeaves =  async (req, res) => {
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

exports.updateApproveLeaves =  async (req, res) => {
    const client = await db.connect();
    try {
      const { approval_id } = req.params;
      const { status, remarks } = req.body; 
      const approver_emp_id = req.user.emp_id;
  
      await client.query("BEGIN");
  
      // 1. Fetch current approval and request details
      const checkStatus = await client.query(
        `SELECT la.*, lr.emp_id AS applicant_id, lr.leave_type_id, lr.total_days 
         FROM leaves_approval la
         JOIN leaves_request lr ON la.leave_request_id = lr.id
         WHERE la.id = $1 FOR UPDATE`,
        [approval_id]
      );
  
      if (checkStatus.rowCount === 0) throw new Error("Approval record not found.");
      const currentApproval = checkStatus.rows[0];
  
      if (currentApproval.status !== 'pending') {
        throw new Error(`This request has already been ${currentApproval.status}.`);
      }
  
      // 2. Update CURRENT approval record
      await client.query(
        `UPDATE leaves_approval 
         SET status = $1, remarks = $2, action_at = NOW() 
         WHERE id = $3`,
        [status, remarks, approval_id]
      );
  
      // 3. LOGIC FOR REJECTION
      if (status === 'rejected') {
        await client.query(`UPDATE leaves_request SET status = 'rejected' WHERE id = $1`, [currentApproval.leave_request_id]);
        await client.query("COMMIT");
  
        // SOCKET: Notify Employee of Rejection
        const applicantSocketId = req.userSockets.get(currentApproval.applicant_id.toString());
        if (applicantSocketId) {
          req.io.to(applicantSocketId).emit("LEAVE_STATUS_UPDATE", {
            message: `Your leave request was rejected by ${currentApproval.approver_role}`,
            status: 'rejected'
          });
        }
  
        return res.json({ message: "Leave request rejected." });
      }
  
      // 4. LOGIC FOR APPROVAL
      if (status === 'approved') {
        const nextLevelRes = await client.query(
          `SELECT reports_to FROM employee_reporting WHERE emp_id = $1 LIMIT 1`,
          [approver_emp_id]
        );
  
        if (nextLevelRes.rowCount > 0) {
          // --- STEP A: Escalate to Admin/HR ---
          const nextApproverId = nextLevelRes.rows[0].reports_to;
          const nextApproverDetails = await client.query(`SELECT role FROM users WHERE emp_id = $1`, [nextApproverId]);
          const nextRole = nextApproverDetails.rows[0]?.role || 'Admin';
  
          await client.query(
            `INSERT INTO leaves_approval (leave_request_id, approver_emp_id, approver_role, approval_level, status)
             VALUES ($1, $2, $3, $4, 'pending')`,
            [currentApproval.leave_request_id, nextApproverId, nextRole, currentApproval.approval_level + 1]
          );
  
          await client.query("COMMIT");
  
          // SOCKET: Notify Admin of new pending request
          const adminSocketId = req.userSockets.get(nextApproverId.toString());
          if (adminSocketId) {
            req.io.to(adminSocketId).emit("NEW_LEAVE_REQUEST", {
              message: "A leave request has been escalated to you for final approval.",
              requestId: currentApproval.leave_request_id
            });
          }
  
          return res.json({ message: "Approved and escalated to Admin/HR." });
  
        } else {
          // --- STEP B: Final Approval ---
          await client.query(`UPDATE leaves_request SET status = 'approved' WHERE id = $1`, [currentApproval.leave_request_id]);
  
          const year = new Date().getFullYear();
          await client.query(
            `UPDATE leaves_balance SET used = used + $1, remaining = remaining - $1 
             WHERE emp_id = $2 AND leave_type_id = $3 AND year = $4`,
            [currentApproval.total_days, currentApproval.applicant_id, currentApproval.leave_type_id, year]
          );
  
          await client.query("COMMIT");
  
          // SOCKET: Notify Employee of Final Success
          const applicantSocketId = req.userSockets.get(currentApproval.applicant_id.toString());
          if (applicantSocketId) {
            req.io.to(applicantSocketId).emit("LEAVE_STATUS_UPDATE", {
              message: "Your leave request has been fully approved!",
              status: 'approved'
            });
          }
  
          return res.json({ message: "Final approval complete. Balance deducted." });
        }
      }
    } catch (error) {
      if (client) await client.query("ROLLBACK");
      res.status(400).json({ message: error.message });
    } finally {
      client.release();
    }
  }

exports.getMyLeaveHistory =  async (req, res) => {
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
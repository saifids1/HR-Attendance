const express = require("express");
const { db } = require("../db/connectDB"); 
const cron = require('node-cron');
const authMiddleware = require("../middlewares/authMiddleware");
const { runAttendanceTask } = require("../controllers/attendance.controller");

const router = express.Router();
const runningJobs = {};

const startAllSchedules = async () => {
    try {
       
        const res = await db.query('SELECT * FROM report_settings WHERE is_enabled = true');
        
        // Stop any existing jobs
        Object.keys(runningJobs).forEach(key => {
            runningJobs[key].stop();
            delete runningJobs[key];
        });

        res.rows.forEach(row => {
           
            runningJobs[row.slot_name] = cron.schedule(row.cron_pattern, async () => {
                console.log(`[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Executing ${row.slot_name}`);
                
                try {
                    await runAttendanceTask(); 
                    console.log(`Email sent for ${row.slot_name}`);
                } catch (emailErr) {
                    console.error(`Email failed for ${row.slot_name}:`, emailErr);
                }
            }, {
                scheduled: true,
                timezone: "Asia/Kolkata" 
            });
        });

        console.log("All report schedules synchronized and active.");
    } catch (err) {
        console.error("Error starting schedules:", err);
    }
};

// Initialize on server start



// startAllSchedules();

// console.log("REPORT ROUTER LOADED", process.pid);

router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT slot_name, cron_pattern FROM report_settings ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch schedules" });
    }
});

// router.post('/', authMiddleware, async (req, res) => {
//     const { slot_name, hour, minute, emails } = req.body;

//     console.log("req body",req.body)
//     const newPattern = `${parseInt(minute)} ${parseInt(hour)} * * *`;

//     try {
//         // await db.query(
//         //     `UPDATE report_settings 
//         //      SET cron_pattern = $1, emails = $2 
//         //      WHERE slot_name = $3`,
//         //     [newPattern, emails, slot_name]
//         // );

//         // await startAllSchedules();

//         res.json({
//             message: `${slot_name} schedule updated successfully!`,
//             pattern: newPattern,
//             emails
//         });

//     } catch (err) {
//         console.error("Update Error:", err);
//         res.status(500).json({ error: "DB Update Failed" });
//     }
// });

router.post('/', authMiddleware, async (req, res) => {
  const { slot_name, hour, minute, email } = req.body;

  const newPattern = `${parseInt(minute)} ${parseInt(hour)} * * *`;

  try {

    const type = process.env.NODE_ENV === "production"
      ? "production"
      : "local";

    console.log("type Cron", type);

    // update cron pattern
    await db.query(
      `UPDATE report_settings 
       SET cron_pattern = $1
       WHERE slot_name = $2`,
      [newPattern, slot_name]
    );

    // check if email already exists
    const existingEmail = await db.query(
      `SELECT * FROM "EmployeeEmail" WHERE email = $1`,
      [email]
    );

    if (existingEmail.rowCount > 0) {
      const row = existingEmail.rows[0];

      // email same but type different → update type
      if (row.type !== type) {
        await db.query(
          `UPDATE "EmployeeEmail"
           SET type = $1
           WHERE email = $2`,
          [type, email]
        );
      }

    } else {

      // email different → insert new row
      await db.query(
        `INSERT INTO "EmployeeEmail"(email, type)
         VALUES ($1, $2)`,
        [email, type]
      );
    }

    await startAllSchedules();

    res.json({
      message: `${slot_name} schedule updated successfully!`,
      pattern: newPattern,
      email: email
    });

  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ error: "DB Update Failed" });
  }
});

router.get('/emails', async (req, res) => {
  try {

// console.log("process.env.NODE_ENV raw:", JSON.stringify(process.env.NODE_ENV));

   

    const type = process.env.NODE_ENV.trim() === "production" ? "production" : "local";

    console.log("type Fetch Cron", type);

    const result = await db.query(
      `SELECT id,email 
       FROM "EmployeeEmail"
       WHERE type=$1
       ORDER BY id`,
      [type]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});


// Add Emails
router.post('/add-email', authMiddleware, async (req, res) => {
  const { email } = req.body;
    try {
        const type = process.env.NODE_ENV === "production"
            ? "production"
            : "local";

        await db.query(
            `INSERT INTO "EmployeeEmail"(email, type)
             VALUES ($1, $2)`,
            [email, type]
        );

        res.json({ message: "Email added successfully!" });
    } catch (err) {
        console.error("Add Email Error:", err);
        res.status(500).json({ error: "Failed to add email" });
    }
});


router.delete('/emails/:id', authMiddleware, async (req, res) => {
  const emailId = req.params.id;

  console.log("emailId",emailId)
    try {
        await db.query(
            `DELETE FROM "EmployeeEmail" WHERE id = $1`,
            [emailId]
        );
        res.json({ message: "Email deleted successfully!" });
    } catch (err) {
        console.error("Delete Error:", err);
        res.status(500).json({ error: "Failed to delete email" });
    }   
});
module.exports = router;
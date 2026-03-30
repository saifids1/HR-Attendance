const express = require("express");
const { db } = require("../db/connectDB"); 
const cron = require('node-cron');
const authMiddleware = require("../middlewares/authMiddleware");
const { runAttendanceTask } = require("../controllers/attendance.controller");

const router = express.Router();
const runningJobs = {};

const startAllSchedules = async () => {


    try {
        console.log("Synchronizing report schedules...");

        // 2. Stop and clear ALL existing jobs FIRST
        // This ensures a clean slate every time you call this function
        Object.keys(runningJobs).forEach(key => {
            if (runningJobs[key]) {
                runningJobs[key].stop();
                console.log(`Stopped existing job: ${key}`);
            }
            delete runningJobs[key];
        });

        // 3. Fetch only ENABLED jobs
        const res = await db.query('SELECT * FROM report_settings WHERE is_enabled = true');
        
        if (res.rows.length === 0) {
            console.log("No enabled schedules found in DB.");
            return;
        }

        res.rows.forEach(row => {
            console.log(`Scheduling ${row.slot_name} for pattern: ${row.cron_pattern}`);

            // 4. Create and store the job
            const task = cron.schedule(row.cron_pattern, async () => {
                const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
                console.log(`[${now}] Triggering task: ${row.slot_name}`);
                
                try {
                    await runAttendanceTask(); 
                    console.log(`Successfully executed task for ${row.slot_name}`);
                } catch (emailErr) {
                    console.error(`Task execution failed for ${row.slot_name}:`, emailErr);
                }
            }, {
                scheduled: true, // This starts it automatically
                timezone: "Asia/Kolkata" 
            });

            // 5. Explicitly call start() just to be safe
            task.start();
            
            // Save reference to global object
            runningJobs[row.slot_name] = task;
        });

        console.log(`Successfully activated ${res.rows.length} schedules.`);
    } catch (err) {
        console.error("CRITICAL: Error starting schedules:", err);
    }
};

// Initialize on server start



// startAllSchedules();

// console.log("REPORT ROUTER LOADED", process.pid);

router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT slot_name, cron_pattern,is_enabled,id FROM report_settings ORDER BY id');
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
  const { slot_name, hour, minute, email, status } = req.body;

  // Validation
  if (!slot_name || hour === undefined || minute === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newPattern = `${parseInt(minute)} ${parseInt(hour)} * * *`;
  const type = process.env.NODE_ENV === "production" ? "production" : "local";
  
  // Ensure we treat status as a proper boolean
  const isEnabled = status === true || status === 'true';

  try {
    await db.query('BEGIN');

    // 1. Check if the TIME is already taken by ANOTHER slot
    const timeConflict = await db.query(
      `SELECT slot_name FROM report_settings WHERE cron_pattern = $1 AND slot_name != $2`,
      [newPattern, slot_name]
    );

    if (timeConflict.rowCount > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Time conflict: ${hour}:${minute} is already used by "${timeConflict.rows[0].slot_name}"` 
      });
    }

    // 2. Upsert using cron_pattern as the unique anchor
    await db.query(
      `INSERT INTO report_settings (slot_name, cron_pattern, is_enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (cron_pattern) 
       DO UPDATE SET 
          slot_name = EXCLUDED.slot_name,
          is_enabled = EXCLUDED.is_enabled`,
      [slot_name, newPattern, isEnabled]
    );

    // 3. Email Logic
    if (email) {
      await db.query(
        `INSERT INTO "EmployeeEmail" (email, type)
         VALUES ($1, $2)
         ON CONFLICT (email) DO UPDATE SET type = EXCLUDED.type`,
        [email, type]
      );
    }

    await db.query('COMMIT');

    // --- CONDITION ADDED HERE ---
    // Only refresh the cron engine if the schedule is being enabled
    // Note: If you want to STOP a job when it's disabled, 
    // you should actually run startAllSchedules() regardless.
    if (isEnabled) {
      console.log(`Refreshing scheduler for active slot: ${slot_name}`);
      await startAllSchedules(); 
    }

    res.json({ 
      success: true, 
      message: `Schedule "${slot_name}" saved. Status: ${isEnabled ? 'Active' : 'Disabled'}` 
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error("Update Error:", err);
    res.status(500).json({ error: "Server Database Error" });
  }
});
router.delete('/:pattern', authMiddleware, async (req, res) => {
  const { pattern } = req.params;

  try {
    await db.query(
      `DELETE FROM report_settings WHERE cron_pattern = $1`,
      [pattern]
    );
    res.json({ message: "Slot deleted successfully!" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete slot" });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params; // Get name from URL
  const { slot_name, hour, minute, status } = req.body;
  const newPattern = `${parseInt(minute)} ${parseInt(hour)} * * *`;

  try {
    await db.query('BEGIN');

    // 1. Check if the NEW pattern is already used by a DIFFERENT slot
    const conflict = await db.query(
      `SELECT slot_name FROM report_settings WHERE cron_pattern = $1 AND id != $2`,
      [newPattern, id]
    );

    if (conflict.rowCount > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: `Time already used by ${conflict.rows[0].slot_name}` });
    }

    // 2. Perform Update
    const result = await db.query(
      `UPDATE report_settings 
       SET slot_name = $1, cron_pattern = $2, is_enabled = $3 
       WHERE id = $4`,
      [slot_name, newPattern, status, id]
    );

    if (result.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: "Slot not found" });
    }

    await db.query('COMMIT');
    await startAllSchedules(); // Refresh the cron engine

    res.json({ success: true, message: "Updated successfully" });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: "Update failed" });
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
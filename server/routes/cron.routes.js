const express = require("express");
const { db } = require("../db/connectDB"); // You are using 'db' here
const cron = require('node-cron');
const authMiddleware = require("../middlewares/authMiddleware");
const { runAttendanceTask } = require("../controllers/attendance.controller");

const router = express.Router();
const runningJobs = {};

const startAllSchedules = async () => {
    try {
        // FIX 1: Use 'db' (not pool) and check table name (report_settings)
        const res = await db.query('SELECT * FROM report_settings WHERE is_enabled = true');
        
        // Stop any existing jobs
        Object.keys(runningJobs).forEach(key => {
            runningJobs[key].stop();
            delete runningJobs[key];
        });

        res.rows.forEach(row => {
            // FIX 2: Added Timezone - Without this, cron uses UTC (5.5 hours behind India)
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
startAllSchedules();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT slot_name, cron_pattern FROM report_settings ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch schedules" });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { slot_name, hour, minute } = req.body;
    
    // Ensure minute/hour are formatted correctly (removes leading zeros if they cause issues)
    const newPattern = `${parseInt(minute)} ${parseInt(hour)} * * *`;

    try {
        await db.query(
            'UPDATE report_settings SET cron_pattern = $1 WHERE slot_name = $2', 
            [newPattern, slot_name]
        );

        // Refresh the jobs in memory
        await startAllSchedules();

        res.json({ message: `${slot_name} schedule updated successfully!`, pattern: newPattern });
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: "DB Update Failed" });
    }
});

module.exports = router;
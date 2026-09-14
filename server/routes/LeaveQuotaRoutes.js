const express = require("express");

const router = express.Router();

const {
    syncLeaveQuota,
    allocateSingleLeaveQuota
} = require("../controllers/LeaveQuotaController");



router.post(
    "/sync",
    syncLeaveQuota
);


router.post(
    "/allocate/:leaveTypeId",
    allocateSingleLeaveQuota
);

module.exports = router;
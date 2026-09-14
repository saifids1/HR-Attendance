const {
    syncEmployeeLeaveQuota
} = require("../services/LeaveQuotaService");

const {
    allocateLeaveQuotaByLeaveTypeId
} = require("../services/AlloacationQoutaBylt_leave_type_id");

exports.syncLeaveQuota = async (req, res) => {
    try {

        const result = await syncEmployeeLeaveQuota();

        return res.status(200).json({
            success: true,
            message: "Employee leave quota synchronized successfully",
            data: result
        });

    } catch (error) {

        console.error(
            "[LEAVE QUOTA API ERROR]",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to synchronize employee leave quota",
            error: error.message
        });
    }
};

exports.allocateSingleLeaveQuota = async (req, res) => {

    try {

        const { leaveTypeId } = req.params;

        if (!leaveTypeId) {

            return res.status(400).json({
                success: false,
                message: "Leave Type ID is required"
            });
        }

        const parsedLeaveTypeId =
            Number(leaveTypeId);

        if (
            !Number.isInteger(parsedLeaveTypeId) ||
            parsedLeaveTypeId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid Leave Type ID"
            });
        }

        const result =
            await allocateLeaveQuotaByLeaveTypeId(
                parsedLeaveTypeId
            );

        return res.status(200).json(result);

    } catch (error) {

        console.error(
            "Single Leave Quota Allocation Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message ||
                "Failed to allocate leave quota"
        });
    }
};
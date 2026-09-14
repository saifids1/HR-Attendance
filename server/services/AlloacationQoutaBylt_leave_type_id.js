const { db } = require("../db/connectDB");

const CARRY_FORWARD_PERCENTAGE = 0.50;
const JOINING_DATE_CUTOFF = 15;

function calculateAllocatedDays(
    annualQuota,
    joiningDate,
    currentYear,
    isPaid
) {
    if (!isPaid) {
        return 0;
    }

    annualQuota = Number(annualQuota) || 0;

    if (annualQuota <= 0) {
        return 0;
    }

    if (!joiningDate) {
        return annualQuota;
    }

    const joining = new Date(joiningDate);

    if (Number.isNaN(joining.getTime())) {
        return annualQuota;
    }

    const joiningYear = joining.getFullYear();
    const joiningMonth = joining.getMonth() + 1;
    const joiningDay = joining.getDate();

    if (joiningYear < currentYear) {
        return annualQuota;
    }

    if (joiningYear > currentYear) {
        return 0;
    }

    let startMonth;

    if (joiningDay <= JOINING_DATE_CUTOFF) {
        startMonth = joiningMonth;
    } else {
        startMonth = joiningMonth + 1;
    }

    if (startMonth > 12) {
        return 0;
    }

    const remainingMonths = 12 - startMonth + 1;

    return Math.floor(
        (annualQuota / 12) * remainingMonths
    );
}


/**
 * Allocate quota for ONE Leave Type ID
 *
 * Example:
 * allocateLeaveQuotaByLeaveTypeId(5)
 *
 * This will allocate only leave type ID = 5
 * for all eligible active employees.
 */
async function allocateLeaveQuotaByLeaveTypeId(leaveTypeId) {

    const client = await db.connect();

    try {

        await client.query("BEGIN");

        const currentYear = new Date().getFullYear();

        // ============================================================
        // 1. VALIDATE LEAVE TYPE
        // ============================================================

        const leaveTypeResult = await client.query(
            `
            SELECT
                lt.lt_leave_type_id,
                lt.lt_leave_type_code,
                lt.lt_leave_type_name,
                COALESCE(
                    lt.lt_total_days_per_year,
                    0
                ) AS lt_total_days_per_year,
                COALESCE(
                    lt.lt_is_paid,
                    FALSE
                ) AS lt_is_paid,
                lt.lt_emptype,
                lt.lt_is_active,
                lt.lt_from_date,
                lt.lt_to_date
            FROM public.leave_types lt
            WHERE lt.lt_leave_type_id = $1
            LIMIT 1
            `,
            [leaveTypeId]
        );

        if (leaveTypeResult.rows.length === 0) {

            throw new Error(
                `Leave Type ID ${leaveTypeId} not found`
            );
        }

        const leaveType = leaveTypeResult.rows[0];

        // ============================================================
        // 2. CHECK ACTIVE
        // ============================================================

        if (!leaveType.lt_is_active) {

            throw new Error(
                `Leave Type ID ${leaveTypeId} is inactive`
            );
        }

        // ============================================================
        // 3. CHECK DATE VALIDITY
        // ============================================================

        if (
            leaveType.lt_from_date &&
            new Date(leaveType.lt_from_date) >
                new Date(`${currentYear}-12-31`)
        ) {

            throw new Error(
                `Leave Type ID ${leaveTypeId} is not applicable for ${currentYear}`
            );
        }

        if (
            leaveType.lt_to_date &&
            new Date(leaveType.lt_to_date) <
                new Date(`${currentYear}-01-01`)
        ) {

            throw new Error(
                `Leave Type ID ${leaveTypeId} is not applicable for ${currentYear}`
            );
        }

        // ============================================================
        // 4. GET ALL ACTIVE EMPLOYEES
        // ============================================================

        const employeesResult = await client.query(
            `
            SELECT
                o.or_id,
                o.pr_id,
                o.or_employee_type_id,
                o.or_joining_date
            FROM public.organizations o
            WHERE o.or_is_active = TRUE
              AND o.pr_id IS NOT NULL
              AND o.or_employee_type_id IS NOT NULL
            `
        );

        let createdCount = 0;
        let skippedCount = 0;

        // ============================================================
        // 5. LOOP EMPLOYEES
        // ============================================================

        for (const employee of employeesResult.rows) {

            const prId = employee.pr_id;
            const employeeTypeId =
                employee.or_employee_type_id;

            const joiningDate =
                employee.or_joining_date;

            // ========================================================
            // 6. IMPORTANT:
            //    CHECK EMPLOYEE TYPE MATCH
            // ========================================================

            if (
                Number(employeeTypeId) !==
                Number(leaveType.lt_emptype)
            ) {
                skippedCount++;
                continue;
            }

            // ========================================================
            // 7. CHECK EXISTING CURRENT YEAR QUOTA
            // ========================================================

            const existingQuotaResult = await client.query(
                `
                SELECT
                    lq_id
                FROM public.leave_quota
                WHERE lq_pr_id = $1
                  AND lq_leave_type_id = $2
                  AND lq_leave_year = $3
                LIMIT 1
                `,
                [
                    prId,
                    leaveTypeId,
                    currentYear
                ]
            );

            if (existingQuotaResult.rows.length > 0) {

                skippedCount++;

                console.log(
                    `[LEAVE QUOTA SKIPPED] ` +
                    `Already exists ` +
                    `PR=${prId} ` +
                    `TYPE=${leaveTypeId} ` +
                    `YEAR=${currentYear}`
                );

                continue;
            }

            // ========================================================
            // 8. PAID / ANNUAL QUOTA
            // ========================================================

            const isPaid =
                Boolean(leaveType.lt_is_paid);

            const masterDays =
                Number(
                    leaveType.lt_total_days_per_year
                ) || 0;

            // ========================================================
            // 9. CALCULATE ALLOCATED DAYS
            // ========================================================

            const allocatedDays =
                calculateAllocatedDays(
                    masterDays,
                    joiningDate,
                    currentYear,
                    isPaid
                );

            // ========================================================
            // 10. CALCULATE CARRY FORWARD
            // ========================================================

            let carryForwardDays = 0;

            if (isPaid) {

                const previousYear =
                    currentYear - 1;

                const previousQuotaResult =
                    await client.query(
                        `
                        SELECT
                            COALESCE(
                                lq_allocated_days,
                                0
                            ) AS allocated_days,

                            COALESCE(
                                lq_carry_forward_days,
                                0
                            ) AS carry_forward_days,

                            COALESCE(
                                lq_used_days,
                                0
                            ) AS used_days,

                            COALESCE(
                                lq_pending_days,
                                0
                            ) AS pending_days

                        FROM public.leave_quota

                        WHERE lq_pr_id = $1
                          AND lq_leave_type_id = $2
                          AND lq_leave_year = $3

                        LIMIT 1
                        `,
                        [
                            prId,
                            leaveTypeId,
                            previousYear
                        ]
                    );

                if (
                    previousQuotaResult.rows.length > 0
                ) {

                    const previous =
                        previousQuotaResult.rows[0];

                    const previousAllocated =
                        Number(
                            previous.allocated_days
                        ) || 0;

                    const previousCarry =
                        Number(
                            previous.carry_forward_days
                        ) || 0;

                    const previousUsed =
                        Number(
                            previous.used_days
                        ) || 0;

                    const previousPending =
                        Number(
                            previous.pending_days
                        ) || 0;

                    const previousAvailable =
                        Math.max(
                            previousAllocated +
                            previousCarry -
                            previousUsed -
                            previousPending,
                            0
                        );

                    carryForwardDays =
                        Math.floor(
                            previousAvailable *
                            CARRY_FORWARD_PERCENTAGE
                        );
                }
            }

            // ========================================================
            // 11. INSERT QUOTA
            // ========================================================

            const insertResult = await client.query(
                `
                INSERT INTO public.leave_quota
                (
                    lq_pr_id,
                    lq_leave_type_id,
                    lq_emptype,
                    lq_leave_year,
                    lq_allocated_days,
                    lq_carry_forward_days,
                    lq_used_days,
                    lq_pending_days,
                    lq_created_at,
                    lq_created_by
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    0,
                    0,
                    CURRENT_TIMESTAMP,
                    $7
                )
                ON CONFLICT
                (
                    lq_pr_id,
                    lq_leave_type_id,
                    lq_leave_year
                )
                DO NOTHING
                RETURNING lq_id
                `,
                [
                    prId,
                    leaveTypeId,
                    employeeTypeId,
                    currentYear,
                    allocatedDays,
                    carryForwardDays,
                    prId
                ]
            );

            // ========================================================
            // 12. RESULT
            // ========================================================

            if (insertResult.rows.length > 0) {

                createdCount++;

                console.log(
                    `[LEAVE QUOTA CREATED] ` +
                    `PR=${prId} ` +
                    `TYPE=${leaveTypeId} ` +
                    `PAID=${isPaid} ` +
                    `ANNUAL=${masterDays} ` +
                    `ALLOCATED=${allocatedDays} ` +
                    `CARRY=${carryForwardDays} ` +
                    `JOINING_DATE=${joiningDate || "NULL"}`
                );

            } else {

                skippedCount++;
            }
        }

        // ============================================================
        // 13. COMMIT
        // ============================================================

        await client.query("COMMIT");

        console.log(
            `[SINGLE LEAVE QUOTA ALLOCATION] ` +
            `Completed ${new Date().toISOString()}`
        );

        return {
            success: true,
            year: currentYear,

            leaveTypeId: Number(leaveTypeId),

            leaveTypeCode:
                leaveType.lt_leave_type_code,

            leaveTypeName:
                leaveType.lt_leave_type_name,

            employeesProcessed:
                employeesResult.rows.length,

            quotasCreated:
                createdCount,

            quotasSkipped:
                skippedCount
        };

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "[SINGLE LEAVE QUOTA ALLOCATION ERROR]",
            error
        );

        throw error;

    } finally {

        client.release();
    }
}


module.exports = {
    allocateLeaveQuotaByLeaveTypeId
};
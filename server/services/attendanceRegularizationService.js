const db = require("../models");
const { Op } = require("sequelize");

async function resolveManagerPrId(employeePrId, transaction) {
  const empOrg = await db.Organizations.findOne({
    where: { pr_id: employeePrId },
    transaction,
  });

  if (!empOrg || !empOrg.or_reporting_to_id) {
    return null;
  }

  const managerOrg = await db.Organizations.findOne({
    where: { or_id: empOrg.or_reporting_to_id },
    transaction,
  });

  return managerOrg ? managerOrg.pr_id : null;
}

async function getEmployeeOrg(prId, transaction) {
  const empOrg = await db.Organizations.findOne({
    where: { pr_id: prId },
    transaction,
  });

  if (!empOrg) {
    throw new Error("Employee org record not found");
  }

  if (!empOrg.or_emp_id) {
    throw new Error("Employee code not found");
  }

  return empOrg;
}

async function validateItems(items, transaction) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item required");
  }

  const typeCodes = [
    ...new Set(
      items
        .map((item) => item.typeCode)
        .filter(Boolean)
    ),
  ];

  if (typeCodes.length === 0) {
    throw new Error("Valid regularization type is required");
  }

  const validTypes = await db.RegularizationType.findAll({
    where: {
      rt_code: {
        [Op.in]: typeCodes,
      },
    },
    transaction,
  });

  const validCodes = validTypes.map((row) => row.rt_code);

  for (const item of items) {
    if (!validCodes.includes(item.typeCode)) {
      throw new Error(`Invalid type code: ${item.typeCode}`);
    }

    if (
      item.typeCode === "PUNCH_IN" &&
      !item.punchTime
    ) {
      throw new Error("PUNCH_IN requires punch_time");
    }

    if (
      item.typeCode === "PUNCH_OUT" &&
      !item.punchTime
    ) {
      throw new Error("PUNCH_OUT requires punch_time");
    }
  }
}

function getDayRange(attendanceDate) {
  const date =
    typeof attendanceDate === "string"
      ? attendanceDate.substring(0, 10)
      : attendanceDate;

  return {
    start: `${date} 00:00:00`,
    end: `${date} 23:59:59.999`,
  };
}

function normalizePunchTime(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const seconds = String(value.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return String(value)
    .replace("T", " ")
    .replace("Z", "")
    .substring(0, 19);
}

async function syncActivityToAttendanceLogs(transaction) {
  await db.sequelize.query(
    `
    UPDATE public.attendance_logs alog
    SET
      is_active = al.is_active,
      regularization_id = al.regularization_id
    FROM public.activity_log al
    WHERE alog.emp_id = al.emp_id
      AND alog.punch_time = (
        al.punch_time AT TIME ZONE 'Asia/Kolkata'
      )
      AND (
        alog.is_active IS DISTINCT FROM al.is_active
        OR alog.regularization_id IS DISTINCT FROM al.regularization_id
      )
    `,
    {
      transaction,
    }
  );

  await db.sequelize.query(
    `
    INSERT INTO public.attendance_logs
    (
      emp_id,
      punch_time,
      device_ip,
      device_sn,
      created_at,
      raw_log,
      is_active,
      regularization_id
    )
    SELECT
      TRIM(al.emp_id),
      al.punch_time AT TIME ZONE 'Asia/Kolkata',
      al.device_ip,
      al.device_sn,
      CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      jsonb_build_object(
        'source', 'activity_log',
        'activity_log_id', al.id,
        'emp_id', al.emp_id,
        'punch_time', al.punch_time,
        'device_ip', al.device_ip,
        'device_sn', al.device_sn,
        'is_active', al.is_active,
        'regularization_id', al.regularization_id
      ),
      al.is_active,
      al.regularization_id
    FROM public.activity_log al
    WHERE al.emp_id IS NOT NULL
      AND TRIM(al.emp_id) <> ''
      AND al.punch_time IS NOT NULL
    ON CONFLICT (emp_id, punch_time)
    DO UPDATE SET
      is_active = EXCLUDED.is_active,
      regularization_id = EXCLUDED.regularization_id,
      device_ip = EXCLUDED.device_ip,
      device_sn = EXCLUDED.device_sn,
      raw_log = EXCLUDED.raw_log
    `,
    {
      transaction,
    }
  );
}

async function clearAttendanceRegularization(
  empCode,
  attendanceDate,
  transaction
) {
  await db.sequelize.query(
    `
    UPDATE public.daily_attendance
    SET
      is_regularized = FALSE,
      regularization_id = NULL,
      regularized_at = NULL,
      regularized_by = NULL,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
      },
      transaction,
    }
  );

  await db.sequelize.query(
    `
    UPDATE public.weekly_attendance
    SET
      is_regularized = FALSE,
      regularization_id = NULL,
      regularized_at = NULL,
      regularized_by = NULL,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
      },
      transaction,
    }
  );

  await db.sequelize.query(
    `
    UPDATE public.monthly_attendance
    SET
      is_regularized = FALSE,
      regularization_id = NULL,
      regularized_at = NULL,
      regularized_by = NULL,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
      },
      transaction,
    }
  );
}

async function markAttendanceRegularized(
  empCode,
  attendanceDate,
  arId,
  hrPrId,
  transaction
) {
  await db.sequelize.query(
    `
    UPDATE public.daily_attendance
    SET
      is_regularized = TRUE,
      regularization_id = :arId,
      regularized_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      regularized_by = :hrPrId,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
        arId,
        hrPrId,
      },
      transaction,
    }
  );

  await db.sequelize.query(
    `
    UPDATE public.weekly_attendance
    SET
      is_regularized = TRUE,
      regularization_id = :arId,
      regularized_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      regularized_by = :hrPrId,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
        arId,
        hrPrId,
      },
      transaction,
    }
  );

  await db.sequelize.query(
    `
    UPDATE public.monthly_attendance
    SET
      is_regularized = TRUE,
      regularization_id = :arId,
      regularized_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
      regularized_by = :hrPrId,
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
    WHERE emp_id = :empCode
      AND attendance_date = :attendanceDate
    `,
    {
      replacements: {
        empCode,
        attendanceDate,
        arId,
        hrPrId,
      },
      transaction,
    }
  );
}

async function recalculateAttendance(attendanceDate, transaction) {
  console.log(
    "---------------recalculateAttendance-----------------------------"
  );

  if (!transaction) {
    throw new Error(
      "Sequelize transaction is required for attendance recalculation"
    );
  }

  const {
    generateDailyAttendance,
    generateWeeklyAttendance,
    generateMonthlyAttendance,
  } = require("./attendanceGenerator");

  console.log(
    "---------------Daily Attendance-----------------------------"
  );

  await generateDailyAttendance(
    attendanceDate,
    transaction
  );

  console.log(
    "---------------Weekly Attendance-----------------------------"
  );

  await generateWeeklyAttendance(
    attendanceDate,
    transaction
  );

  console.log(
    "---------------Monthly Attendance-----------------------------"
  );

  await generateMonthlyAttendance(
    attendanceDate,
    transaction
  );

  console.log(
    "---------------recalculateAttendance completed-----------------------------"
  );
}

function toLocalTimestamp(value) {
  if (!value) {
    return null;
  }

  const valueString = String(value).trim();

  const match = valueString.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    throw new Error(
      `Invalid punchTime format: ${value}. Expected YYYY-MM-DD HH:mm:ss`
    );
  }

  return `${match[1]} ${match[2]}:${match[3] || "00"}`;
}

async function raiseRequest(payload, currentUser) {
  const t = await db.sequelize.transaction();

  try {
    const {
      prId,
      attendanceDate,
      reason,
      items,
    } = payload;

    if (!prId) {
      throw new Error("prId is required");
    }

    if (!attendanceDate) {
      throw new Error("attendanceDate is required");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one regularization item is required");
    }

    await validateItems(items, t);

    const existing =
      await db.AttendanceRegularization.findOne({
        where: {
          ar_pr_id: prId,
          ar_attendance_date: attendanceDate,
          ar_status: {
            [Op.in]: [
              "PENDING_MANAGER",
              "PENDING_HR",
              "APPROVED",
            ],
          },
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

    if (existing) {
      throw new Error(
        "Active regularization request already exists for this date"
      );
    }

    const managerPrId = await resolveManagerPrId(
      prId,
      t
    );

    const empOrg = await db.Organizations.findOne({
      where: {
        pr_id: prId,
      },
      transaction: t,
    });

    const request =
      await db.AttendanceRegularization.create(
        {
          ar_pr_id: prId,
          ar_attendance_date: attendanceDate,
          ar_reason: reason || null,
          ar_status: "PENDING_MANAGER",
          ar_manager_id: managerPrId,
          ar_company_id:
            empOrg?.or_company_id || null,
          ar_created_by:
            currentUser?.pr_id || prId,
        },
        {
          transaction: t,
        }
      );

    for (const item of items) {
      let punchTime = null;

      if (item.punchTime) {
        punchTime = toLocalTimestamp(item.punchTime);

        const punchDate = punchTime.substring(0, 10);

        if (punchDate !== attendanceDate) {
          throw new Error(
            `Punch time ${punchTime} does not belong to attendance date ${attendanceDate}`
          );
        }
      }

      await db.sequelize.query(
        `
        INSERT INTO attendance_regularization_items
        (
          ar_id,
          ari_type_code,
          ari_punch_time,
          ari_remarks
        )
        VALUES
        (
          :arId,
          :typeCode,
          CAST(:punchTime AS TIMESTAMP),
          :remarks
        )
        `,
        {
          replacements: {
            arId: request.ar_id,
            typeCode: item.typeCode,
            punchTime,
            remarks: item.remarks || null,
          },
          transaction: t,
        }
      );
    }

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: request.ar_id,
        action_by:
          currentUser?.pr_id || prId,
        action_role: "EMPLOYEE",
        action: "RAISED",
        remarks: reason || null,
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    return getRequestWithItems(
      request.ar_id
    );
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function managerAction(
  arId,
  managerPrId,
  action,
  remarks
) {
  const t = await db.sequelize.transaction();

  try {
    const req =
      await db.AttendanceRegularization.findByPk(
        arId,
        {
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

    if (!req) {
      throw new Error("Request not found");
    }

    if (req.ar_status !== "PENDING_MANAGER") {
      throw new Error(
        "Already processed at manager level"
      );
    }

    if (
      Number(req.ar_manager_id) !==
      Number(managerPrId)
    ) {
      throw new Error(
        "You are not the assigned reporting manager"
      );
    }

    if (
      !["APPROVED", "REJECTED"].includes(action)
    ) {
      throw new Error("Invalid action");
    }

    req.ar_status =
      action === "APPROVED"
        ? "PENDING_HR"
        : "REJECTED";

    req.ar_manager_action_at = new Date();
    req.ar_manager_remarks =
      remarks || null;
    req.ar_updated_by = managerPrId;
    req.ar_updated_at = new Date();

    await req.save({
      transaction: t,
    });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: managerPrId,
        action_role: "MANAGER",
        action,
        remarks: remarks || null,
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    return getRequestWithItems(arId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function hrAction(
  arId,
  hrPrId,
  action,
  remarks
) {
  const t = await db.sequelize.transaction();

  try {
    const req =
      await db.AttendanceRegularization.findByPk(
        arId,
        {
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

    if (!req) {
      throw new Error("Request not found");
    }

    if (req.ar_status !== "PENDING_HR") {
      throw new Error("Not pending with HR");
    }

    if (
      !["APPROVED", "REJECTED"].includes(action)
    ) {
      throw new Error("Invalid action");
    }

    const items =
      await db.AttendanceRegularizationItem.findAll(
        {
          where: {
            ar_id: arId,
          },
          transaction: t,
          raw: true,
        }
      );

    if (!items.length) {
      throw new Error(
        "No regularization items found"
      );
    }

    if (action === "REJECTED") {
      req.ar_status = "REJECTED";
      req.ar_hr_id = hrPrId;
      req.ar_hr_action_at = new Date();
      req.ar_hr_remarks =
        remarks || null;
      req.ar_updated_by = hrPrId;
      req.ar_updated_at = new Date();

      await req.save({
        transaction: t,
      });

      await db.AttendanceRegularizationLog.create(
        {
          ar_id: arId,
          action_by: hrPrId,
          action_role: "HR_ADMIN",
          action: "REJECTED",
          remarks: remarks || null,
        },
        {
          transaction: t,
        }
      );

      await t.commit();

      return getRequestWithItems(arId);
    }

    const empOrg =
      await getEmployeeOrg(
        req.ar_pr_id,
        t
      );

    const empCode = empOrg.or_emp_id;

    const attendanceDate =
      String(
        req.ar_attendance_date
      ).substring(0, 10);

    const {
      start,
      end,
    } = getDayRange(attendanceDate);

    const existingPunches =
      await db.sequelize.query(
        `
        SELECT
          id,
          emp_id,
          punch_time,
          device_ip,
          device_sn,
          is_active,
          regularization_id
        FROM public.activity_log
        WHERE emp_id = :empCode
          AND punch_time >= CAST(:dayStart AS TIMESTAMP WITHOUT TIME ZONE)
          AND punch_time <= CAST(:dayEnd AS TIMESTAMP WITHOUT TIME ZONE)
          AND is_active = TRUE
          AND regularization_id IS NULL
        ORDER BY punch_time ASC, id ASC
        `,
        {
          replacements: {
            empCode,
            dayStart: start,
            dayEnd: end,
          },
          transaction: t,
          type: db.sequelize.QueryTypes.SELECT,
        }
      );

    const sortedPunches = existingPunches;

    const firstPunch =
      sortedPunches.length > 0
        ? sortedPunches[0]
        : null;

    const lastPunch =
      sortedPunches.length > 0
        ? sortedPunches[
            sortedPunches.length - 1
          ]
        : null;

    const recordsToBackup = [];
    const idsToDeactivate = new Set();

    for (const item of items) {
      switch (item.ari_type_code) {
        case "PUNCH_IN":
          if (firstPunch) {
            recordsToBackup.push(firstPunch);
            idsToDeactivate.add(firstPunch.id);
          }
          break;

        case "PUNCH_OUT":
          if (lastPunch) {
            recordsToBackup.push(lastPunch);
            idsToDeactivate.add(lastPunch.id);
          }
          break;

        case "ON_DUTY":
          for (const punch of sortedPunches) {
            recordsToBackup.push(punch);
            idsToDeactivate.add(punch.id);
          }
          break;

        default:
          throw new Error(
            `Unknown item type: ${item.ari_type_code}`
          );
      }
    }

    const uniqueBackupRecords =
      Array.from(
        new Map(
          recordsToBackup.map(
            (row) => [
              row.id,
              row,
            ]
          )
        ).values()
      );

    const uniqueIdsToDeactivate =
      Array.from(idsToDeactivate);

    if (uniqueBackupRecords.length > 0) {
      await db.AttendanceRegularizationBackup.create(
        {
          ar_id: arId,
          emp_id: empCode,
          attendance_date:
            attendanceDate,
          snapshot_json:
            uniqueBackupRecords,
          created_by: hrPrId,
        },
        {
          transaction: t,
        }
      );
    }

    if (uniqueIdsToDeactivate.length > 0) {
      await db.sequelize.query(
        `
        UPDATE public.activity_log
        SET
          is_active = FALSE,
          regularization_id = :arId
        WHERE id IN (:ids)
          AND emp_id = :empCode
          AND is_active = TRUE
          AND regularization_id IS NULL
        `,
        {
          replacements: {
            arId,
            ids: uniqueIdsToDeactivate,
            empCode,
          },
          transaction: t,
        }
      );
    }

    const punches = [];

    for (const item of items) {
      switch (item.ari_type_code) {
        case "PUNCH_IN": {
          if (!item.ari_punch_time) {
            throw new Error(
              "PUNCH_IN requires punch_time"
            );
          }

          punches.push({
            punchTime:
              item.ari_punch_time,
          });

          break;
        }

        case "PUNCH_OUT": {
          if (!item.ari_punch_time) {
            throw new Error(
              "PUNCH_OUT requires punch_time"
            );
          }

          punches.push({
            punchTime:
              item.ari_punch_time,
          });

          break;
        }

        case "ON_DUTY": {
          if (item.ari_punch_time) {
            punches.push({
              punchTime:
                item.ari_punch_time,
            });

            break;
          }

          punches.push(
            {
              punchTime:
                `${attendanceDate} 00:00:00`,
            },
            {
              punchTime:
                `${attendanceDate} 23:59:59`,
            }
          );

          break;
        }

        default:
          throw new Error(
            `Unknown item type: ${item.ari_type_code}`
          );
      }
    }

    const insertedLogIds = [];

    for (const punch of punches) {
      const punchTime =
        normalizePunchTime(
          punch.punchTime
        );

      const [result] =
        await db.sequelize.query(
          `
          INSERT INTO public.activity_log
          (
            emp_id,
            punch_time,
            device_ip,
            device_sn,
            is_active,
            regularization_id
          )
          VALUES
          (
            :emp_id,
            CAST(
              :punch_time
              AS TIMESTAMP WITHOUT TIME ZONE
            ),
            :device_ip,
            :device_sn,
            TRUE,
            :regularization_id
          )
          RETURNING id
          `,
          {
            replacements: {
              emp_id: empCode,
              punch_time: punchTime,
              device_ip:
                "REGULARIZATION",
              device_sn:
                "REGULARIZATION",
              regularization_id:
                arId,
            },
            transaction: t,
          }
        );

      if (result?.[0]?.id) {
        insertedLogIds.push(
          result[0].id
        );
      }
    }

    if (insertedLogIds.length > 0) {
      await db.AttendanceRegularizationInserted.bulkCreate(
        insertedLogIds.map(
          (activityLogId) => ({
            ar_id: arId,
            activity_log_id:
              activityLogId,
          })
        ),
        {
          transaction: t,
        }
      );
    }

    await syncActivityToAttendanceLogs(t);

    await clearAttendanceRegularization(
      empCode,
      attendanceDate,
      t
    );

    await recalculateAttendance(
      attendanceDate, t
    );

    await markAttendanceRegularized(
      empCode,
      attendanceDate,
      arId,
      hrPrId,
      t
    );

    req.ar_status = "APPROVED";
    req.ar_hr_id = hrPrId;
    req.ar_hr_action_at =
      new Date();
    req.ar_hr_remarks =
      remarks || null;
    req.ar_updated_by =
      hrPrId;
    req.ar_updated_at =
      new Date();

    await req.save({
      transaction: t,
    });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR_ADMIN",
        action: "APPROVED",
        remarks:
          remarks || null,
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    return getRequestWithItems(
      arId
    );
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function cancelRequest(
  arId,
  empPrId
) {
  const t =
    await db.sequelize.transaction();

  try {
    const req =
      await db.AttendanceRegularization.findByPk(
        arId,
        {
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

    if (!req) {
      throw new Error(
        "Request not found"
      );
    }

    if (
      Number(req.ar_pr_id) !==
      Number(empPrId)
    ) {
      throw new Error(
        "Not your request"
      );
    }

    if (
      req.ar_status !==
      "PENDING_MANAGER"
    ) {
      throw new Error(
        "Only PENDING_MANAGER requests can be cancelled"
      );
    }

    req.ar_status =
      "CANCELLED";
    req.ar_updated_by =
      empPrId;
    req.ar_updated_at =
      new Date();

    await req.save({
      transaction: t,
    });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: empPrId,
        action_role: "EMPLOYEE",
        action: "CANCELLED",
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    return getRequestWithItems(
      arId
    );
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function revertRegularization(
  arId,
  hrPrId,
  remarks
) {
  const t =
    await db.sequelize.transaction();

  try {
    const req =
      await db.AttendanceRegularization.findByPk(
        arId,
        {
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

    if (!req) {
      throw new Error(
        "Regularization request not found"
      );
    }

    if (
      req.ar_status !==
      "APPROVED"
    ) {
      throw new Error(
        "Only approved regularization can be reverted"
      );
    }

    const empOrg =
      await getEmployeeOrg(
        req.ar_pr_id,
        t
      );

    const empCode =
      empOrg.or_emp_id;

    const attendanceDate =
      String(
        req.ar_attendance_date
      ).substring(0, 10);

    const inserted =
      await db.AttendanceRegularizationInserted.findAll(
        {
          where: {
            ar_id: arId,
          },
          transaction: t,
          raw: true,
        }
      );

    const insertedIds =
      inserted.map(
        (row) =>
          row.activity_log_id
      );

    if (insertedIds.length > 0) {
      await db.ActivityLog.update(
        {
          is_active: false,
          regularization_id:
            arId,
        },
        {
          where: {
            id: {
              [Op.in]:
                insertedIds,
            },
            regularization_id:
              arId,
          },
          transaction: t,
        }
      );
    }

    const backup =
      await db.AttendanceRegularizationBackup.findOne(
        {
          where: {
            ar_id: arId,
            restored_at: null,
          },
          order: [
            [
              "created_at",
              "DESC",
            ],
          ],
          transaction: t,
          lock: t.LOCK.UPDATE,
        }
      );

    if (!backup) {
      throw new Error(
        "Backup not found — cannot revert"
      );
    }

    const records =
      Array.isArray(
        backup.snapshot_json
      )
        ? backup.snapshot_json
        : [];

    let restoredCount = 0;

    for (const record of records) {
      if (!record.id) {
        continue;
      }

      const [affected] =
        await db.ActivityLog.update(
          {
            is_active: true,
            regularization_id:
              null,
          },
          {
            where: {
              id: record.id,
              emp_id:
                record.emp_id,
            },
            transaction: t,
          }
        );

      restoredCount +=
        affected || 0;
    }

    backup.restored_at =
      new Date();
    backup.restored_by =
      hrPrId;

    await backup.save({
      transaction: t,
    });

    await clearAttendanceRegularization(
      empCode,
      attendanceDate,
      t
    );

    await syncActivityToAttendanceLogs(
      t
    );

    await recalculateAttendance(
      attendanceDate,t
    );

    req.ar_status =
      "REVERTED";

    req.ar_updated_by =
      hrPrId;

    req.ar_updated_at =
      new Date();

    await req.save({
      transaction: t,
    });

    await db.AttendanceRegularizationLog.create(
      {
        ar_id: arId,
        action_by: hrPrId,
        action_role: "HR_ADMIN",
        action: "REVERTED",
        remarks:
          remarks || null,
      },
      {
        transaction: t,
      }
    );

    await t.commit();

    return getRequestWithItems(
      arId
    );
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function cancelHrAction(
  arId,
  hrPrId,
  remarks
) {
  return revertRegularization(
    arId,
    hrPrId,
    remarks
  );
}

async function getRequestWithItems(
  arId
) {
  return db.AttendanceRegularization.findByPk(
    arId,
    {
      include: [
        {
          model:
            db.AttendanceRegularizationItem,
          as: "items",
        },
        {
          model:
            db.AttendanceRegularizationLog,
          as: "logs",
        },
        {
          model: db.Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
        },
        {
          model: db.Personal,
          as: "manager",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
        },
        {
          model: db.Personal,
          as: "hr",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
        },
      ],
    }
  );
}

async function getPendingForManager(
  managerPrId,
  {
    limit,
    offset,
    status,
    fromDate,
    toDate,
  }
) {
  const where = {
    ar_manager_id: managerPrId,
  };

  if (status) {
    where.ar_status = status;
  }

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] =
        fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] =
        toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll(
    {
      where,
      include: [
        {
          model:
            db.AttendanceRegularizationItem,
          as: "items",
        },
        {
          model: db.Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
        },
      ],
      order: [
        [
          "ar_created_at",
          "DESC",
        ],
      ],
      limit,
      offset,
      distinct: true,
    }
  );
}

async function getPendingForHR({
  limit,
  offset,
  status,
  fromDate,
  toDate,
}) {
  const where = {};

  if (status) {
    where.ar_status = status;
  }

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] =
        fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] =
        toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll(
    {
      where,
      include: [
        {
          model:
            db.AttendanceRegularizationItem,
          as: "items",
        },
        {
          model: db.Personal,
          as: "employee",
        },
        {
          model: db.Personal,
          as: "manager",
        },
      ],
      order: [
        [
          "ar_created_at",
          "DESC",
        ],
      ],
      limit,
      offset,
      distinct: true,
    }
  );
}

async function getMyRequests(
  prId,
  {
    limit,
    offset,
    status,
    fromDate,
    toDate,
  }
) {
  const where = {
    ar_pr_id: prId,
  };

  if (status) {
    where.ar_status = status;
  }

  if (fromDate || toDate) {
    where.ar_attendance_date = {};

    if (fromDate) {
      where.ar_attendance_date[Op.gte] =
        fromDate;
    }

    if (toDate) {
      where.ar_attendance_date[Op.lte] =
        toDate;
    }
  }

  return db.AttendanceRegularization.findAndCountAll(
    {
      where,
      include: [
        {
          model:
            db.AttendanceRegularizationItem,
          as: "items",
        },
        {
          model: db.Personal,
          as: "manager",
        },
        {
          model: db.Personal,
          as: "hr",
        },
      ],
      order: [
        [
          "ar_created_at",
          "DESC",
        ],
      ],
      limit,
      offset,
      distinct: true,
    }
  );
}

async function getMasters() {
  const [
    types,
    statuses,
    punchTypes,
  ] = await Promise.all([
    db.RegularizationType.findAll({
      where: {
        rt_is_active: true,
      },
    }),

    db.ApprovalStatus.findAll({
      where: {
        as_is_active: true,
      },
    }),

    db.ActivityLogPunchType.findAll({
      where: {
        alpt_is_active: true,
      },
    }),
  ]);

  return {
    types,
    statuses,
    punchTypes,
  };
}

module.exports = {
  raiseRequest,
  managerAction,
  hrAction,
  cancelRequest,
  revertRegularization,
  cancelHrAction,
  getPendingForManager,
  getPendingForHR,
  getMyRequests,
  getRequestWithItems,
  getMasters,
  resolveManagerPrId,
};


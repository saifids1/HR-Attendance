const db = require("../models");

const {
  ShiftMaster,
  ShiftMasterDays,
  ShiftMasterBreaks,
  Personal,
  AttendanceStatus,
} = db;

const getUserId = (req) => {
  return req.user?.pr_id || req.user?.user_id || req.user?.id || null;
};

const getPagination = (req) => {
  const pageValue =
    req.query.page !== undefined
      ? req.query.page
      : req.query.Page;

  const perPageValue =
    req.query.perPage !== undefined
      ? req.query.perPage
      : req.query.per_page !== undefined
      ? req.query.per_page
      : req.query.pagePerRecords !== undefined
      ? req.query.pagePerRecords
      : req.query.page_per_records;

  if (
    pageValue === undefined ||
    pageValue === null ||
    pageValue === "" ||
    perPageValue === undefined ||
    perPageValue === null ||
    perPageValue === ""
  ) {
    return {
      isPaginated: false,
      page: null,
      perPage: null,
      offset: null,
      limit: null,
    };
  }

  const page = Math.max(parseInt(pageValue, 10) || 1, 1);
  const perPage = Math.max(parseInt(perPageValue, 10) || 10, 1);

  return {
    isPaginated: true,
    page,
    perPage,
    offset: (page - 1) * perPage,
    limit: perPage,
  };
};

const attachAuditDetails = async (records) => {
  const rows = Array.isArray(records) ? records : [records];

  if (!rows.length) {
    return Array.isArray(records) ? [] : records;
  }

  const userIds = [
    ...new Set(
      rows
        .flatMap((item) => [
          item.Sm_CreatedBy,
          item.Sm_UpdatedBy,
          item.Smd_CreatedBy,
          item.Smd_UpdatedBy,
          item.Smb_CreatedBy,
          item.Smb_UpdatedBy,
        ])
        .filter((id) => id !== null && id !== undefined)
    ),
  ];

  if (!userIds.length) {
    return Array.isArray(records)
      ? rows.map((item) => ({
          ...item,
          CreatedByDetails: null,
          UpdatedByDetails: null,
        }))
      : {
          ...rows[0],
          CreatedByDetails: null,
          UpdatedByDetails: null,
        };
  }

  const users = await Personal.findAll({
    where: {
      pr_id: userIds,
    },
    attributes: [
      "pr_id",
      "pr_first_name",
      "pr_last_name",
      "pr_email",
    ],
    raw: true,
  });

  const userMap = new Map(
    users.map((user) => [Number(user.pr_id), user])
  );

  const result = rows.map((item) => {
    const plain = item.toJSON ? item.toJSON() : item;

    const createdBy =
      plain.Sm_CreatedBy ??
      plain.Smd_CreatedBy ??
      plain.Smb_CreatedBy ??
      null;

    const updatedBy =
      plain.Sm_UpdatedBy ??
      plain.Smd_UpdatedBy ??
      plain.Smb_UpdatedBy ??
      null;

    return {
      ...plain,
      CreatedByDetails: createdBy
        ? userMap.get(Number(createdBy)) || null
        : null,
      UpdatedByDetails: updatedBy
        ? userMap.get(Number(updatedBy)) || null
        : null,
    };
  });

  return Array.isArray(records) ? result : result[0];
};

const buildPaginationResponse = (
  rows,
  count,
  pagination
) => {
  if (!pagination.isPaginated) {
    return {
      records: rows,
      totalRecords: count,
      page: null,
      perPage: null,
      totalPages: 1,
    };
  }

  return {
    records: rows,
    totalRecords: count,
    page: pagination.page,
    perPage: pagination.perPage,
    totalPages: Math.ceil(count / pagination.perPage),
  };
};

exports.createShift = async (req, res) => {
  try {
    const userId = getUserId(req);
console.log("---------------------------------------------");
console.log(userId);
console.log("----------------------------------------------");
    const {
      Sm_shift_code,
      Sm_shift_name,
      Sm_start_time,
      Sm_end_time,
      Sm_grace_in_minutes = 0,
      Sm_grace_out_minutes = 0,
      Sm_half_day_after_minutes = null,
      Sm_early_go_minutes = null,
      Sm_is_overnight = false,
      days = [],
      breaks = [],
    } = req.body;

    if (
      !Sm_shift_code ||
      !Sm_shift_name ||
      !Sm_start_time ||
      !Sm_end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sm_shift_code, Sm_shift_name, Sm_start_time and Sm_end_time are required.",
      });
    }

    const existingShift = await ShiftMaster.findOne({
      where: {
        Sm_shift_code,
      },
    });

    if (existingShift) {
      return res.status(409).json({
        success: false,
        message: "Shift code already exists.",
      });
    }

    const shift = await ShiftMaster.create({
      Sm_shift_code,
      Sm_shift_name,
      Sm_start_time,
      Sm_end_time,
      Sm_grace_in_minutes,
      Sm_grace_out_minutes,
      Sm_half_day_after_minutes,
      Sm_early_go_minutes,
      Sm_is_overnight,
      Sm_CreatedBy: userId,
      Sm_IsActive: true,
    });

    if (Array.isArray(days) && days.length) {
      const dayRecords = days.map((day) => ({
        Smd_shift_id: shift.Sm_shift_id,
        Smd_day_of_week: day.Smd_day_of_week,
        Smd_day_name: day.Smd_day_name,
        Smd_attendance_status_id:
          day.Smd_attendance_status_id,
        Smd_CreatedBy: userId,
        Smd_IsActive: true,
      }));

      await ShiftMasterDays.bulkCreate(dayRecords);
    }

    if (Array.isArray(breaks) && breaks.length) {
      const breakRecords = breaks.map((item) => ({
        Smb_shift_id: shift.Sm_shift_id,
        Smb_break_name: item.Smb_break_name,
        Smb_start_time: item.Smb_start_time,
        Smb_end_time: item.Smb_end_time,
        Smb_is_paid:
          item.Smb_is_paid === undefined
            ? true
            : item.Smb_is_paid,
        Smb_CreatedBy: userId,
        Smb_IsActive: true,
      }));

      await ShiftMasterBreaks.bulkCreate(breakRecords);
    }

    const createdShift = await ShiftMaster.findByPk(
      shift.Sm_shift_id
    );

    const result = await attachAuditDetails(createdShift);

    return res.status(201).json({
      success: true,
      message: "Shift created successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create shift.",
      error: error.message,
    });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const pagination = getPagination(req);

    const options = {
      where: {},
      order: [["Sm_shift_id", "DESC"]],
      distinct: true,
    };

    if (pagination.isPaginated) {
      options.limit = pagination.limit;
      options.offset = pagination.offset;
    }

    const result = await ShiftMaster.findAndCountAll(options);

    const records = await attachAuditDetails(result.rows);

    return res.status(200).json({
      success: true,
      ...buildPaginationResponse(
        records,
        result.count,
        pagination
      ),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shifts.",
      error: error.message,
    });
  }
};

exports.getShiftById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Shift ID is required.",
      });
    }

console.log("---------------------------------------------");
console.log(req);
    const shift = await ShiftMaster.findByPk(id);
    console.log(shift);

console.log("----------------------------------------------");

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    const days = await ShiftMasterDays.findAll({
      where: {
        Smd_shift_id: id,
      },
      include: [
        {
          model: AttendanceStatus,
          as: "attendanceStatus",
          required: false,
        },
      ],
      order: [["Smd_shift_day_id", "DESC"]],
    });

    const breaks = await ShiftMasterBreaks.findAll({
      where: {
        Smb_shift_id: id,
      },
      order: [["Smb_shift_break_id", "DESC"]],
    });

    const shiftDetails = await attachAuditDetails(shift);
    const dayDetails = await attachAuditDetails(days);
    const breakDetails = await attachAuditDetails(breaks);

    return res.status(200).json({
      success: true,
      data: {
        ...shiftDetails,
        days: dayDetails,
        breaks: breakDetails,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shift.",
      error: error.message,
    });
  }
};

exports.updateShift = async (req, res) => {
  const transaction = await ShiftMaster.sequelize.transaction();

  try {
    const userId = getUserId(req);
    const { shift_id } = req.params;

    if (!shift_id) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Shift ID is required.",
      });
    }

    const shift = await ShiftMaster.findByPk(shift_id, {
      transaction,
    });

    if (!shift) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    const {
      Sm_shift_code,
      Sm_shift_name,
      Sm_start_time,
      Sm_end_time,
      Sm_grace_in_minutes,
      Sm_grace_out_minutes,
      Sm_half_day_after_minutes,
      Sm_early_go_minutes,
      Sm_is_overnight,
      days,
      breaks,
    } = req.body;

    if (
      Sm_shift_code !== undefined &&
      Sm_shift_code !== shift.Sm_shift_code
    ) {
      const existingShift = await ShiftMaster.findOne({
        where: {
          Sm_shift_code,
        },
        transaction,
      });

      if (
        existingShift &&
        Number(existingShift.Sm_shift_id) !== Number(shift_id)
      ) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message: "Shift code already exists.",
        });
      }
    }

    const updateData = {};

    if (Sm_shift_code !== undefined) {
      updateData.Sm_shift_code = Sm_shift_code;
    }

    if (Sm_shift_name !== undefined) {
      updateData.Sm_shift_name = Sm_shift_name;
    }

    if (Sm_start_time !== undefined) {
      updateData.Sm_start_time = Sm_start_time;
    }

    if (Sm_end_time !== undefined) {
      updateData.Sm_end_time = Sm_end_time;
    }

    if (Sm_grace_in_minutes !== undefined) {
      updateData.Sm_grace_in_minutes = Sm_grace_in_minutes;
    }

    if (Sm_grace_out_minutes !== undefined) {
      updateData.Sm_grace_out_minutes = Sm_grace_out_minutes;
    }

    if (Sm_half_day_after_minutes !== undefined) {
      updateData.Sm_half_day_after_minutes =
        Sm_half_day_after_minutes;
    }

    if (Sm_early_go_minutes !== undefined) {
      updateData.Sm_early_go_minutes = Sm_early_go_minutes;
    }

    if (Sm_is_overnight !== undefined) {
      updateData.Sm_is_overnight = Sm_is_overnight;
    }

    updateData.Sm_UpdatedBy = userId;

    await shift.update(updateData, {
      transaction,
    });

    if (Array.isArray(days)) {
      await ShiftMasterDays.destroy({
        where: {
          Smd_shift_id: shift_id,
        },
        transaction,
      });

      if (days.length > 0) {
        const dayRecords = days.map((day) => ({
          Smd_shift_id: shift_id,
          Smd_day_of_week: day.Smd_day_of_week,
          Smd_day_name: day.Smd_day_name,
          Smd_attendance_status_id:
            day.Smd_attendance_status_id,
          Smd_CreatedBy: userId,
          Smd_IsActive:
            day.Smd_IsActive === undefined
              ? true
              : day.Smd_IsActive,
        }));

        await ShiftMasterDays.bulkCreate(dayRecords, {
          transaction,
        });
      }
    }

    if (Array.isArray(breaks)) {
      await ShiftMasterBreaks.destroy({
        where: {
          Smb_shift_id: shift_id,
        },
        transaction,
      });

      if (breaks.length > 0) {
        const breakRecords = breaks.map((item) => ({
          Smb_shift_id: shift_id,
          Smb_break_name: item.Smb_break_name,
          Smb_start_time: item.Smb_start_time,
          Smb_end_time: item.Smb_end_time,
          Smb_is_paid:
            item.Smb_is_paid === undefined
              ? true
              : item.Smb_is_paid,
          Smb_CreatedBy: userId,
          Smb_IsActive:
            item.Smb_IsActive === undefined
              ? true
              : item.Smb_IsActive,
        }));

        await ShiftMasterBreaks.bulkCreate(breakRecords, {
          transaction,
        });
      }
    }

    await transaction.commit();

    const updatedShift = await ShiftMaster.findByPk(shift_id);

    const updatedDays = await ShiftMasterDays.findAll({
      where: {
        Smd_shift_id: shift_id,
      },
      include: [
        {
          model: AttendanceStatus,
          as: "attendanceStatus",
          required: false,
        },
      ],
      order: [["Smd_shift_day_id", "DESC"]],
    });

    const updatedBreaks = await ShiftMasterBreaks.findAll({
      where: {
        Smb_shift_id: shift_id,
      },
      order: [["Smb_shift_break_id", "DESC"]],
    });

    const shiftPlain = updatedShift
      ? updatedShift.get({ plain: true })
      : null;

    const daysPlain = updatedDays.map((item) =>
      item.get({ plain: true })
    );

    const breaksPlain = updatedBreaks.map((item) =>
      item.get({ plain: true })
    );

    const shiftDetails = await attachAuditDetails(shiftPlain);
    const dayDetails = await attachAuditDetails(daysPlain);
    const breakDetails = await attachAuditDetails(breaksPlain);

    return res.status(200).json({
      success: true,
      message: "Shift updated successfully.",
      data: {
        ...shiftDetails,
        days: dayDetails,
        breaks: breakDetails,
      },
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {}

    console.error("updateShift error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shift.",
      error: error.message,
    });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { shift_id } = req.params;

    if (!shift_id) {
      return res.status(400).json({
        success: false,
        message: "Shift ID is required.",
      });
    }

    const shift = await ShiftMaster.findByPk(shift_id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    const newStatus = !shift.Sm_IsActive;

    await shift.update({
      Sm_IsActive: newStatus,
      Sm_UpdatedBy: userId,
    });

    return res.status(200).json({
      success: true,
      message: newStatus
        ? "Shift activated successfully."
        : "Shift deactivated successfully.",
      data: {
        Sm_shift_id: shift.Sm_shift_id,
        Sm_IsActive: newStatus,
      },
    });
  } catch (error) {
    console.error("deleteShift error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shift status.",
      error: error.message,
    });
  }
};

exports.getShiftDays = async (req, res) => {
  try {
    const { shift_id } = req.params;

    if (!shift_id) {
      return res.status(400).json({
        success: false,
        message: "Shift ID is required.",
      });
    }

    const pagination = getPagination(req);

    const where = {
      Smd_shift_id: shift_id,
    };

    const options = {
      where,
      order: [["Smd_shift_day_id", "DESC"]],
    };

    if (pagination.isPaginated) {
      options.limit = pagination.limit;
      options.offset = pagination.offset;
    }

    const result = await ShiftMasterDays.findAndCountAll(options);

    const records = await attachAuditDetails(result.rows);

    return res.status(200).json({
      success: true,
      ...buildPaginationResponse(
        records,
        result.count,
        pagination
      ),
    });
  } catch (error) {
    console.error("getShiftDays error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shift days.",
      error: error.message,
    });
  }
};

exports.updateShiftDays = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { shiftId } = req.params;
    const { days } = req.body;

    if (!Array.isArray(days)) {
      return res.status(400).json({
        success: false,
        message: "days must be an array.",
      });
    }

    const shift = await ShiftMaster.findByPk(shiftId);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    for (const day of days) {
      if (
        day.Smd_day_of_week === undefined ||
        day.Smd_day_of_week === null ||
        !day.Smd_day_name ||
        !day.Smd_attendance_status_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Smd_day_of_week, Smd_day_name and Smd_attendance_status_id are required.",
        });
      }

      const existing = await ShiftMasterDays.findOne({
        where: {
          Smd_shift_id: shiftId,
          Smd_day_of_week: day.Smd_day_of_week,
        },
      });

      if (existing) {
        await existing.update({
          Smd_day_name: day.Smd_day_name,
          Smd_attendance_status_id:
            day.Smd_attendance_status_id,
          Smd_UpdatedBy: userId,
          Smd_IsActive:
            day.Smd_IsActive === undefined
              ? true
              : day.Smd_IsActive,
        });
      } else {
        await ShiftMasterDays.create({
          Smd_shift_id: shiftId,
          Smd_day_of_week: day.Smd_day_of_week,
          Smd_day_name: day.Smd_day_name,
          Smd_attendance_status_id:
            day.Smd_attendance_status_id,
          Smd_CreatedBy: userId,
          Smd_IsActive:
            day.Smd_IsActive === undefined
              ? true
              : day.Smd_IsActive,
        });
      }
    }

    const updatedDays = await ShiftMasterDays.findAll({
      where: {
        Smd_shift_id: shiftId,
      },
      order: [["Smd_shift_day_id", "DESC"]],
    });

    const result = await attachAuditDetails(updatedDays);

    return res.status(200).json({
      success: true,
      message: "Shift days updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shift days.",
      error: error.message,
    });
  }
};

exports.createBreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { shiftId } = req.params;

    const {
      Smb_break_name,
      Smb_start_time,
      Smb_end_time,
      Smb_is_paid = true,
    } = req.body;

    const shift = await ShiftMaster.findByPk(shiftId);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found.",
      });
    }

    if (
      !Smb_break_name ||
      !Smb_start_time ||
      !Smb_end_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Smb_break_name, Smb_start_time and Smb_end_time are required.",
      });
    }

    const breakRecord = await ShiftMasterBreaks.create({
      Smb_shift_id: shiftId,
      Smb_break_name,
      Smb_start_time,
      Smb_end_time,
      Smb_is_paid,
      Smb_CreatedBy: userId,
      Smb_IsActive: true,
    });

    const result = await attachAuditDetails(breakRecord);

    return res.status(201).json({
      success: true,
      message: "Break created successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create break.",
      error: error.message,
    });
  }
};

exports.getBreaks = async (req, res) => {
  try {
    const { shiftId } = req.params;
    const pagination = getPagination(req);

    const options = {
      where: {
        Smb_shift_id: shiftId,
      },
      order: [["Smb_shift_break_id", "DESC"]],
    };

    if (pagination.isPaginated) {
      options.limit = pagination.limit;
      options.offset = pagination.offset;
    }

    const result = await ShiftMasterBreaks.findAndCountAll(
      options
    );

    const records = await attachAuditDetails(result.rows);

    return res.status(200).json({
      success: true,
      ...buildPaginationResponse(
        records,
        result.count,
        pagination
      ),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch breaks.",
      error: error.message,
    });
  }
};

exports.updateBreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const breakRecord =
      await ShiftMasterBreaks.findByPk(id);

    if (!breakRecord) {
      return res.status(404).json({
        success: false,
        message: "Break not found.",
      });
    }

    const {
      Smb_break_name,
      Smb_start_time,
      Smb_end_time,
      Smb_is_paid,
    } = req.body;

    const updateData = {};

    if (Smb_break_name !== undefined)
      updateData.Smb_break_name = Smb_break_name;

    if (Smb_start_time !== undefined)
      updateData.Smb_start_time = Smb_start_time;

    if (Smb_end_time !== undefined)
      updateData.Smb_end_time = Smb_end_time;

    if (Smb_is_paid !== undefined)
      updateData.Smb_is_paid = Smb_is_paid;

    updateData.Smb_UpdatedBy = userId;

    await breakRecord.update(updateData);

    const updatedBreak =
      await ShiftMasterBreaks.findByPk(id);

    const result = await attachAuditDetails(updatedBreak);

    return res.status(200).json({
      success: true,
      message: "Break updated successfully.",
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update break.",
      error: error.message,
    });
  }
};

exports.deleteBreak = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const breakRecord =
      await ShiftMasterBreaks.findByPk(id);

    if (!breakRecord) {
      return res.status(404).json({
        success: false,
        message: "Break not found.",
      });
    }

    await breakRecord.update({
      Smb_IsActive: false,
      Smb_UpdatedBy: userId,
    });

    return res.status(200).json({
      success: true,
      message: "Break deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete break.",
      error: error.message,
    });
  }
};
const db = require("../models");
const { Op, QueryTypes } = require("sequelize");

const {
  EmployeeShiftRoster,
  ShiftMaster,
  Personal,
} = db;

const getUserId = (req) => {
  return (
    req.user?.pr_id ||
    req.user?.user_id ||
    req.user?.id ||
    null
  );
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

  const page = Math.max(
    parseInt(pageValue, 10) || 1,
    1
  );

  const perPage = Math.max(
    parseInt(perPageValue, 10) || 10,
    1
  );

  return {
    isPaginated: true,
    page,
    perPage,
    offset: (page - 1) * perPage,
    limit: perPage,
  };
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
    totalPages:
      count === 0
        ? 0
        : Math.ceil(
            count / pagination.perPage
          ),
  };
};

const normalizeDate = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0];
};

const isValidDateString = (value) => {
  if (!value) {
    return false;
  }

  const normalized = normalizeDate(value);

  if (!normalized) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    normalized
  );
};

const getPreviousDate = (dateString) => {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  date.setDate(date.getDate() - 1);

  return date.toISOString().split("T")[0];
};

const getEmployeeDetails = async (records) => {
  const isArray = Array.isArray(records);

  const rows = isArray
    ? records
    : records
    ? [records]
    : [];

  if (!rows.length) {
    return isArray ? [] : null;
  }

  const plainRows = rows.map((item) =>
    item?.toJSON
      ? item.toJSON()
      : item
  );

  const employeeIds = [
    ...new Set(
      plainRows
        .map(
          (item) => item.Esr_pr_id
        )
        .filter(
          (id) =>
            id !== null &&
            id !== undefined
        )
    ),
  ];

  const shiftIds = [
    ...new Set(
      plainRows
        .map(
          (item) => item.Esr_shift_id
        )
        .filter(
          (id) =>
            id !== null &&
            id !== undefined
        )
    ),
  ];

  const employees =
    employeeIds.length
      ? await Personal.findAll({
          where: {
            pr_id: {
              [Op.in]: employeeIds,
            },
          },
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
          raw: true,
        })
      : [];

  const shifts =
    shiftIds.length
      ? await ShiftMaster.findAll({
          where: {
            Sm_shift_id: {
              [Op.in]: shiftIds,
            },
          },
          attributes: [
            "Sm_shift_id",
            "Sm_shift_code",
            "Sm_shift_name",
            "Sm_start_time",
            "Sm_end_time",
            "Sm_grace_in_minutes",
            "Sm_grace_out_minutes",
            "Sm_half_day_after_minutes",
            "Sm_early_go_minutes",
            "Sm_is_overnight",
            "Sm_IsActive",
          ],
          raw: true,
        })
      : [];

  const employeeMap = new Map(
    employees.map((employee) => [
      Number(employee.pr_id),
      employee,
    ])
  );

  const shiftMap = new Map(
    shifts.map((shift) => [
      Number(shift.Sm_shift_id),
      shift,
    ])
  );

  const result = plainRows.map(
    (plain) => ({
      ...plain,
      EmployeeDetails:
        employeeMap.get(
          Number(plain.Esr_pr_id)
        ) || null,
      ShiftDetails:
        plain.Esr_shift_id !==
          null &&
        plain.Esr_shift_id !==
          undefined
          ? shiftMap.get(
              Number(
                plain.Esr_shift_id
              )
            ) || null
          : null,
    })
  );

  return isArray
    ? result
    : result[0];
};

const getShiftBreaks = async (
  shiftId,
  transaction = null
) => {
  const options = {
    replacements: {
      shiftId,
    },
    type: QueryTypes.SELECT,
  };

  if (transaction) {
    options.transaction =
      transaction;
  }

  return await db.sequelize.query(
    `
      SELECT
        smb_shift_break_id,
        smb_shift_id,
        smb_break_name,
        smb_start_time,
        smb_end_time,
        smb_is_paid,
        smb_createdat,
        smb_createdby,
        smb_updatedat,
        smb_updatedby,
        smb_isactive
      FROM shift_master_breaks
      WHERE smb_shift_id = :shiftId
        AND smb_isactive = true
      ORDER BY smb_start_time ASC
    `,
    options
  );
};

exports.assignShift = async (
  req,
  res
) => {
  const transaction =
    await db.sequelize.transaction();

  try {
    const userId = getUserId(req);

    const {
      Esr_pr_id,
      Esr_shift_id,
      Esr_from_date,
      Esr_to_date = null,
      Esr_assignment_type = "MASTER",
    } = req.body;

    if (
      !Esr_pr_id ||
      !Esr_shift_id ||
      !Esr_from_date
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Esr_pr_id, Esr_shift_id and Esr_from_date are required.",
      });
    }

    if (
      !isValidDateString(
        Esr_from_date
      )
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Invalid Esr_from_date. Use YYYY-MM-DD.",
      });
    }

    const fromDate =
      normalizeDate(
        Esr_from_date
      );

    let toDate = null;

    if (
      Esr_to_date !== null &&
      Esr_to_date !== undefined &&
      Esr_to_date !== ""
    ) {
      if (
        !isValidDateString(
          Esr_to_date
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Invalid Esr_to_date. Use YYYY-MM-DD.",
        });
      }

      toDate =
        normalizeDate(
          Esr_to_date
        );

      if (toDate < fromDate) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Esr_to_date cannot be earlier than Esr_from_date.",
        });
      }
    }

    if (
      !["MASTER", "MANUAL"].includes(
        Esr_assignment_type
      )
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Esr_assignment_type must be MASTER or MANUAL.",
      });
    }

    const employee =
      await Personal.findByPk(
        Esr_pr_id,
        {
          transaction,
        }
      );

    if (!employee) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Employee not found.",
      });
    }

    const shift =
      await ShiftMaster.findOne({
        where: {
          Sm_shift_id:
            Esr_shift_id,
          Sm_IsActive: true,
        },
        transaction,
      });

    if (!shift) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Active shift not found.",
      });
    }

    const activeRosters =
      await EmployeeShiftRoster.findAll(
        {
          where: {
            Esr_pr_id,
            Esr_IsActive: true,
          },
          order: [
            [
              "Esr_roster_id",
              "DESC",
            ],
          ],
          transaction,
        }
      );

    const hasOverlap =
      activeRosters.some(
        (roster) => {
          const existingFrom =
            normalizeDate(
              roster.Esr_from_date
            );

          const existingTo =
            roster.Esr_to_date
              ? normalizeDate(
                  roster.Esr_to_date
                )
              : null;

          if (!existingFrom) {
            return false;
          }

          const newStartsBeforeExistingEnds =
            !existingTo ||
            fromDate <= existingTo;

          const newEndsAfterExistingStarts =
            !toDate ||
            toDate >= existingFrom;

          return (
            newStartsBeforeExistingEnds &&
            newEndsAfterExistingStarts
          );
        }
      );

    if (hasOverlap) {
      await transaction.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Employee already has an active shift roster for the selected date range.",
      });
    }

    const roster =
      await EmployeeShiftRoster.create(
        {
          Esr_pr_id,
          Esr_shift_id,
          Esr_from_date:
            fromDate,
          Esr_to_date: toDate,
          Esr_assignment_type,
          Esr_CreatedBy:
            userId,
          Esr_IsActive: true,
        },
        {
          transaction,
        }
      );

    const createdRoster =
      await EmployeeShiftRoster.findByPk(
        roster.Esr_roster_id,
        {
          transaction,
        }
      );

    if (!createdRoster) {
      await transaction.rollback();

      return res.status(500).json({
        success: false,
        message:
          "Failed to retrieve created shift roster.",
      });
    }

    const breaks =
      await getShiftBreaks(
        Esr_shift_id,
        transaction
      );

    await transaction.commit();

    const result =
      await getEmployeeDetails(
        createdRoster
      );

    return res.status(201).json({
      success: true,
      message:
        "Shift assigned successfully.",
      data: {
        ...result,
        Breaks: breaks,
      },
    });
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    console.error(
      "assignShift Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to assign shift.",
      error: error.message,
    });
  }
};

exports.getRosterList = async (
  req,
  res
) => {
  try {
    const pagination =
      getPagination(req);

    const {
      pr_id,
      shift_id,
      assignment_type,
      is_active,
      from_date,
      to_date,
    } = req.query;

    const where = {};

    if (pr_id) {
      where.Esr_pr_id = pr_id;
    }

    if (shift_id) {
      where.Esr_shift_id =
        shift_id;
    }

    if (assignment_type) {
      where.Esr_assignment_type =
        assignment_type;
    }

    if (
      is_active !== undefined &&
      is_active !== ""
    ) {
      where.Esr_IsActive =
        is_active === "true" ||
        is_active === "1";
    }

    if (from_date) {
      if (
        !isValidDateString(
          from_date
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid from_date. Use YYYY-MM-DD.",
        });
      }

      where.Esr_from_date = {
        [Op.gte]:
          normalizeDate(
            from_date
          ),
      };
    }

    if (to_date) {
      if (
        !isValidDateString(
          to_date
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid to_date. Use YYYY-MM-DD.",
        });
      }

      where.Esr_to_date = {
        [Op.lte]:
          normalizeDate(to_date),
      };
    }

    const options = {
      where,
      order: [
        [
          "Esr_roster_id",
          "DESC",
        ],
      ],
    };

    if (pagination.isPaginated) {
      options.limit =
        pagination.limit;

      options.offset =
        pagination.offset;
    }

    const result =
      await EmployeeShiftRoster.findAndCountAll(
        options
      );

    const records =
      await getEmployeeDetails(
        result.rows
      );

    return res.status(200).json({
      success: true,
      ...buildPaginationResponse(
        records,
        result.count,
        pagination
      ),
    });
  } catch (error) {
    console.error(
      "getRosterList Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch roster.",
      error: error.message,
    });
  }
};

exports.getEmployeeShiftHistory =
  async (req, res) => {
    try {
      const { pr_id } =
        req.params;

      if (!pr_id) {
        return res.status(400).json({
          success: false,
          message:
            "pr_id is required.",
        });
      }

      const pagination =
        getPagination(req);

      const options = {
        where: {
          Esr_pr_id: pr_id,
        },
        order: [
          [
            "Esr_roster_id",
            "DESC",
          ],
        ],
      };

      if (pagination.isPaginated) {
        options.limit =
          pagination.limit;

        options.offset =
          pagination.offset;
      }

      const result =
        await EmployeeShiftRoster.findAndCountAll(
          options
        );

      const records =
        await getEmployeeDetails(
          result.rows
        );

      return res.status(200).json({
        success: true,
        ...buildPaginationResponse(
          records,
          result.count,
          pagination
        ),
      });
    } catch (error) {
      console.error(
        "getEmployeeShiftHistory Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee shift history.",
        error: error.message,
      });
    }
  };

exports.getCurrentEmployeeShift =
  async (req, res) => {
    try {
      const { pr_id } =
        req.params;

      if (!pr_id) {
        return res.status(400).json({
          success: false,
          message:
            "pr_id is required.",
        });
      }

      const today =
        new Date()
          .toISOString()
          .split("T")[0];

      const roster =
        await EmployeeShiftRoster.findOne(
          {
            where: {
              Esr_pr_id: pr_id,
              Esr_IsActive: true,
              Esr_from_date: {
                [Op.lte]: today,
              },
              [Op.or]: [
                {
                  Esr_to_date: null,
                },
                {
                  Esr_to_date: {
                    [Op.gte]:
                      today,
                  },
                },
              ],
            },
            order: [
              [
                "Esr_roster_id",
                "DESC",
              ],
            ],
          }
        );

      if (!roster) {
        return res.status(404).json({
          success: false,
          message:
            "No current shift found for employee.",
        });
      }

      const result =
        await getEmployeeDetails(
          roster
        );

      const breaks =
        await getShiftBreaks(
          roster.Esr_shift_id
        );

      return res.status(200).json({
        success: true,
        data: {
          ...result,
          Breaks: breaks,
        },
      });
    } catch (error) {
      console.error(
        "getCurrentEmployeeShift Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch current employee shift.",
        error: error.message,
      });
    }
  };

exports.getEmployeeShiftByDate =
  async (req, res) => {
    try {
      const {
        pr_id,
        date,
      } = req.params;

      if (!pr_id || !date) {
        return res.status(400).json({
          success: false,
          message:
            "pr_id and date are required.",
        });
      }

      if (
        !isValidDateString(date)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid date. Use YYYY-MM-DD.",
        });
      }

      const selectedDate =
        normalizeDate(date);

      const roster =
        await EmployeeShiftRoster.findOne(
          {
            where: {
              Esr_pr_id: pr_id,
              Esr_IsActive: true,
              Esr_from_date: {
                [Op.lte]:
                  selectedDate,
              },
              [Op.or]: [
                {
                  Esr_to_date: null,
                },
                {
                  Esr_to_date: {
                    [Op.gte]:
                      selectedDate,
                  },
                },
              ],
            },
            order: [
              [
                "Esr_roster_id",
                "DESC",
              ],
            ],
          }
        );

      if (!roster) {
        return res.status(404).json({
          success: false,
          message:
            "No shift assigned to employee for selected date.",
        });
      }

      const result =
        await getEmployeeDetails(
          roster
        );

      const breaks =
        await getShiftBreaks(
          roster.Esr_shift_id
        );

      return res.status(200).json({
        success: true,
        data: {
          ...result,
          Breaks: breaks,
        },
      });
    } catch (error) {
      console.error(
        "getEmployeeShiftByDate Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee shift for date.",
        error: error.message,
      });
    }
  };

exports.changeEmployeeShift =
  async (req, res) => {
    const transaction =
      await db.sequelize.transaction();

    try {
      const userId = getUserId(req);

      const { roster_id } =
        req.params;

      const {
        Esr_shift_id,
        Esr_from_date,
        Esr_to_date = null,
        Esr_assignment_type =
          "MANUAL",
      } = req.body;

      if (
        !Esr_shift_id ||
        !Esr_from_date
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Esr_shift_id and Esr_from_date are required.",
        });
      }

      if (
        !isValidDateString(
          Esr_from_date
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Invalid Esr_from_date. Use YYYY-MM-DD.",
        });
      }

      const newFromDate =
        normalizeDate(
          Esr_from_date
        );

      let newToDate = null;

      if (
        Esr_to_date !== null &&
        Esr_to_date !== undefined &&
        Esr_to_date !== ""
      ) {
        if (
          !isValidDateString(
            Esr_to_date
          )
        ) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message:
              "Invalid Esr_to_date. Use YYYY-MM-DD.",
          });
        }

        newToDate =
          normalizeDate(
            Esr_to_date
          );

        if (
          newToDate < newFromDate
        ) {
          await transaction.rollback();

          return res.status(400).json({
            success: false,
            message:
              "Esr_to_date cannot be earlier than Esr_from_date.",
          });
        }
      }

      if (
        !["MASTER", "MANUAL"].includes(
          Esr_assignment_type
        )
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Esr_assignment_type must be MASTER or MANUAL.",
        });
      }

      const oldRoster =
        await EmployeeShiftRoster.findByPk(
          roster_id,
          {
            transaction,
          }
        );

      if (!oldRoster) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message:
            "Roster record not found.",
        });
      }

      const shift =
        await ShiftMaster.findOne({
          where: {
            Sm_shift_id:
              Esr_shift_id,
            Sm_IsActive: true,
          },
          transaction,
        });

      if (!shift) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message:
            "New active shift not found.",
        });
      }

      const oldFromDate =
        normalizeDate(
          oldRoster.Esr_from_date
        );

      if (
        oldFromDate &&
        newFromDate <= oldFromDate
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "New shift effective date must be after the existing roster start date.",
        });
      }

      const previousDate =
        getPreviousDate(
          newFromDate
        );

      if (
        oldFromDate &&
        previousDate < oldFromDate
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "New shift effective date is invalid for changing this roster.",
        });
      }

      const otherActiveRosters =
        await EmployeeShiftRoster.findAll(
          {
            where: {
              Esr_pr_id:
                oldRoster.Esr_pr_id,
              Esr_IsActive: true,
              Esr_roster_id: {
                [Op.ne]:
                  roster_id,
              },
            },
            transaction,
          }
        );

      const hasOverlap =
        otherActiveRosters.some(
          (roster) => {
            const existingFrom =
              normalizeDate(
                roster.Esr_from_date
              );

            const existingTo =
              roster.Esr_to_date
                ? normalizeDate(
                    roster.Esr_to_date
                  )
                : null;

            if (!existingFrom) {
              return false;
            }

            return (
              (!existingTo ||
                newFromDate <=
                  existingTo) &&
              (!newToDate ||
                newToDate >=
                  existingFrom)
            );
          }
        );

      if (hasOverlap) {
        await transaction.rollback();

        return res.status(409).json({
          success: false,
          message:
            "Employee already has another active shift roster for the selected date range.",
        });
      }

      await oldRoster.update(
        {
          Esr_to_date:
            previousDate,
          Esr_IsActive: false,
          Esr_UpdatedBy:
            userId,
        },
        {
          transaction,
        }
      );

      const newRoster =
        await EmployeeShiftRoster.create(
          {
            Esr_pr_id:
              oldRoster.Esr_pr_id,
            Esr_shift_id,
            Esr_from_date:
              newFromDate,
            Esr_to_date:
              newToDate,
            Esr_assignment_type,
            Esr_CreatedBy:
              userId,
            Esr_IsActive: true,
          },
          {
            transaction,
          }
        );

      const breaks =
        await getShiftBreaks(
          Esr_shift_id,
          transaction
        );

      await transaction.commit();

      const result =
        await getEmployeeDetails(
          newRoster
        );

      return res.status(200).json({
        success: true,
        message:
          "Employee shift changed successfully.",
        data: {
          ...result,
          Breaks: breaks,
        },
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      console.error(
        "changeEmployeeShift Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to change employee shift.",
        error: error.message,
      });
    }
  };

exports.closeEmployeeShift =
  async (req, res) => {
    const transaction =
      await db.sequelize.transaction();

    try {
      const userId = getUserId(req);

      const { roster_id } =
        req.params;

      const {
        Esr_to_date,
      } = req.body;

      const roster =
        await EmployeeShiftRoster.findByPk(
          roster_id,
          {
            transaction,
          }
        );

      if (!roster) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message:
            "Roster record not found.",
        });
      }

      if (!roster.Esr_IsActive) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Roster is already closed.",
        });
      }

      const closeDate =
        Esr_to_date
          ? normalizeDate(
              Esr_to_date
            )
          : new Date()
              .toISOString()
              .split("T")[0];

      if (!closeDate) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Invalid Esr_to_date. Use YYYY-MM-DD.",
        });
      }

      const rosterFromDate =
        normalizeDate(
          roster.Esr_from_date
        );

      if (
        rosterFromDate &&
        closeDate < rosterFromDate
      ) {
        await transaction.rollback();

        return res.status(400).json({
          success: false,
          message:
            "Esr_to_date cannot be earlier than Esr_from_date.",
        });
      }

      await roster.update(
        {
          Esr_to_date:
            closeDate,
          Esr_IsActive: false,
          Esr_UpdatedBy:
            userId,
        },
        {
          transaction,
        }
      );

      const updatedRoster =
        await EmployeeShiftRoster.findByPk(
          roster_id,
          {
            transaction,
          }
        );

      await transaction.commit();

      const result =
        await getEmployeeDetails(
          updatedRoster
        );

      const breaks =
        await getShiftBreaks(
          updatedRoster.Esr_shift_id
        );

      return res.status(200).json({
        success: true,
        message:
          "Employee shift closed successfully.",
        data: {
          ...result,
          Breaks: breaks,
        },
      });
    } catch (error) {
      if (
        !transaction.finished
      ) {
        await transaction.rollback();
      }

      console.error(
        "closeEmployeeShift Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to close employee shift.",
        error: error.message,
      });
    }
  };


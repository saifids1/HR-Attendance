const service = require("../services/attendanceRegularizationService");
const db = require("../models");
const { Op } = require("sequelize");

const ok = (res, data, message = "Success") =>
  res.status(200).json({
    success: true,
    message,
    data,
  });

const created = (res, data, message = "Created") =>
  res.status(201).json({
    success: true,
    message,
    data,
  });

const bad = (
  res,
  message = "Bad request",
  code = 400
) =>
  res.status(code).json({
    success: false,
    message,
  });

const fail = (res, err) => {
  console.error("[Regularization]", err);

  return res.status(
    err.statusCode || 500
  ).json({
    success: false,
    message:
      err.message ||
      "Internal server error",
  });
};

/* ============================================================
   Logged-in employee
   ============================================================ */

function getLoggedInPrId(req) {
  const prId =
    req.user?.pr_id ??
    req.user?.Pr_Id ??
    req.user?.user_id ??
    req.user?.id;

  if (!prId) {
    const error = new Error(
      "Employee information not found in JWT token."
    );

    error.statusCode = 401;

    throw error;
  }

  const parsedPrId = Number(prId);

  if (
    !Number.isInteger(parsedPrId) ||
    parsedPrId <= 0
  ) {
    const error = new Error(
      "Invalid employee information in JWT token."
    );

    error.statusCode = 401;

    throw error;
  }

  return parsedPrId;
}

/* ============================================================
   Pagination
   ============================================================ */

const getPagination = (req) => {
  const page = Math.max(
    1,
    parseInt(req.query.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      parseInt(req.query.limit, 10) || 10
    )
  );

  const offset =
    (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

/* ============================================================
   Masters
   ============================================================ */

exports.getMasters = async (
  req,
  res
) => {
  try {
    const data =
      await service.getMasters();

    return ok(
      res,
      data,
      "Masters fetched"
    );
  } catch (err) {
    return fail(res, err);
  }
};

/* ============================================================
   Raise request
   ============================================================ */

exports.raiseRequest = async (
  req,
  res
) => {
  try {
    const loggedInPrId =
      getLoggedInPrId(req);

    const payload = {
      ...req.body,
      prId: loggedInPrId,
    };

    const data =
      await service.raiseRequest(
        payload,
        req.user
      );

    return created(
      res,
      data,
      "Regularization request raised"
    );
  } catch (err) {
    return bad(
      res,
      err.message
    );
  }
};

/* ============================================================
   My requests
   ============================================================ */

exports.myRequests = async (
  req,
  res
) => {
  try {
    const {
      page,
      limit,
      offset,
    } = getPagination(req);

    const empPrId =
      getLoggedInPrId(req);

    const {
      rows,
      count,
    } =
      await service.getMyRequests(
        empPrId,
        {
          limit,
          offset,
          status:
            req.query.status ||
            null,
          fromDate:
            req.query.fromDate ||
            null,
          toDate:
            req.query.toDate ||
            null,
        }
      );

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages:
            count === 0
              ? 0
              : Math.ceil(
                  count / limit
                ),
        },
      },
      "My requests fetched"
    );
  } catch (err) {
    return fail(res, err);
  }
};

/* ============================================================
   Cancel employee request
   ============================================================ */

exports.cancelRequest = async (
  req,
  res
) => {
  try {
    const loggedInPrId =
      getLoggedInPrId(req);

    const data =
      await service.cancelRequest(
        Number(req.params.id),
        loggedInPrId
      );

    return ok(
      res,
      data,
      "Request cancelled"
    );
  } catch (err) {
    return bad(
      res,
      err.message
    );
  }
};

/* ============================================================
   Get by ID
   ============================================================ */

exports.getById = async (
  req,
  res
) => {
  try {
    const arId =
      Number(req.params.id);

    if (
      !Number.isInteger(arId) ||
      arId <= 0
    ) {
      return bad(
        res,
        "Invalid request ID"
      );
    }

    const data =
      await service.getRequestWithItems(
        arId
      );

    if (!data) {
      return bad(
        res,
        "Request not found",
        404
      );
    }

    return ok(
      res,
      data,
      "Request fetched"
    );
  } catch (err) {
    return fail(res, err);
  }
};

/* ============================================================
   Manager pending
   ============================================================ */

exports.managerPending = async (
  req,
  res
) => {
  try {
    const {
      page,
      limit,
      offset,
    } = getPagination(req);

    const managerPrId =
      getLoggedInPrId(req);

    const {
      rows,
      count,
    } =
      await service.getPendingForManager(
        managerPrId,
        {
          limit,
          offset,
          status:
            req.query.status ||
            "PENDING_MANAGER",
          fromDate:
            req.query.fromDate ||
            null,
          toDate:
            req.query.toDate ||
            null,
        }
      );

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages:
            count === 0
              ? 0
              : Math.ceil(
                  count / limit
                ),
        },
      },
      "Pending requests for manager"
    );
  } catch (err) {
    return fail(res, err);
  }
};

/* ============================================================
   Manager action
   ============================================================ */

exports.managerAction = async (
  req,
  res
) => {
  try {
    const {
      action,
      remarks,
    } = req.body;

    const managerPrId =
      getLoggedInPrId(req);

    const arId =
      Number(req.params.id);

    if (
      !Number.isInteger(arId) ||
      arId <= 0
    ) {
      return bad(
        res,
        "Invalid request ID"
      );
    }

    if (
      !["APPROVED", "REJECTED"].includes(
        action
      )
    ) {
      return bad(
        res,
        "Invalid manager action"
      );
    }

    const data =
      await service.managerAction(
        arId,
        managerPrId,
        action,
        remarks
      );

    return ok(
      res,
      data,
      `Manager ${action.toLowerCase()}`
    );
  } catch (err) {
    return bad(
      res,
      err.message
    );
  }
};

/* ============================================================
   HR pending
   ============================================================ */

exports.hrPending = async (
  req,
  res
) => {
  try {
    const {
      page,
      limit,
      offset,
    } = getPagination(req);

    const status =
      req.query.status ||
      "PENDING_HR";

    const result =
      await service.getPendingForHR({
        limit,
        offset,
        status,
        fromDate:
          req.query.fromDate ||
          null,
        toDate:
          req.query.toDate ||
          null,
      });

    const {
      rows,
      count,
    } = result;

    return ok(
      res,
      {
        records: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages:
            count === 0
              ? 0
              : Math.ceil(
                  count / limit
                ),
        },
      },
      "Pending requests for HR"
    );
  } catch (err) {
    return fail(res, err);
  }
};

/* ============================================================
   HR action
   ============================================================ */

exports.hrAction = async (
  req,
  res
) => {
  try {
    const {
      action,
      remarks,
    } = req.body;

    const hrPrId =
      getLoggedInPrId(req);

    const arId =
      Number(req.params.id);

    if (
      !Number.isInteger(arId) ||
      arId <= 0
    ) {
      return bad(
        res,
        "Invalid request ID"
      );
    }

    if (
      !["APPROVED", "REJECTED"].includes(
        action
      )
    ) {
      return bad(
        res,
        "Invalid HR action"
      );
    }

    const data =
      await service.hrAction(
        arId,
        hrPrId,
        action,
        remarks
      );

    return ok(
      res,
      data,
      `HR ${action.toLowerCase()}`
    );
  } catch (err) {
    return bad(
      res,
      err.message
    );
  }
};

/* ============================================================
   HR revert approved regularization
   ============================================================ */

exports.cancelHrAction = async (
  req,
  res
) => {
  try {
    const arId =
      Number(req.params.arId);

    if (
      !Number.isInteger(arId) ||
      arId <= 0
    ) {
      return bad(
        res,
        "Invalid regularization ID"
      );
    }

    const {
      remarks,
    } = req.body || {};

    const hrPrId =
      getLoggedInPrId(req);

    const data =
      await service.revertRegularization(
        arId,
        hrPrId,
        remarks
      );

    return ok(
      res,
      data,
      "Regularization reverted and attendance restored"
    );
  } catch (err) {
    return bad(
      res,
      err.message
    );
  }
};

/* ============================================================
   Activity Log by employee + date

   GET:
   /activity-log/by-emp-date
   ?emp_id=202000005
   &punch_time=2026-09-08
   ============================================================ */

exports.getActivityLogByEmpDate =
  async (req, res) => {
    try {
      const {
        emp_id,
        punch_time,
      } = req.query;

      if (!emp_id) {
        return bad(
          res,
          "emp_id is required"
        );
      }

      if (!punch_time) {
        return bad(
          res,
          "punch_time (YYYY-MM-DD) is required"
        );
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          punch_time
        )
      ) {
        return bad(
          res,
          "Invalid punch_time format. Use YYYY-MM-DD"
        );
      }

      const startOfDay =
        `${punch_time} 00:00:00`;

      const endOfDay =
        `${punch_time} 23:59:59.999`;

      const rows =
        await db.ActivityLog.findAll({
          where: {
            emp_id: String(
              emp_id
            ).trim(),

            punch_time: {
              [Op.between]: [
                startOfDay,
                endOfDay,
              ],
            },
          },

          order: [
            [
              "punch_time",
              "ASC",
            ],
          ],
        });

      return ok(
        res,
        {
          emp_id:
            String(emp_id).trim(),
          date: punch_time,
          total: rows.length,
          records: rows,
        },
        "Activity log fetched"
      );
    } catch (err) {
      return fail(res, err);
    }
  };

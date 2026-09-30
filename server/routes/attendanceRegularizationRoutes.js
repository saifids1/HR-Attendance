const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  authorizeRole,
  isAdmin,
} = require("../middlewares/roleMiddleware");

const controller = require("../controllers/attendanceRegularizationController");

router.get(
  "/masters",
  authMiddleware,
  controller.getMasters
);

router.get(
  "/me",
  authMiddleware,
  controller.myRequests
);

router.get(
  "/:id",
  authMiddleware,
  controller.getById
);

router.post(
  "/:id/cancel",
  authMiddleware,
  controller.cancelRequest
);

router.get(
  "/manager/pending",
  authMiddleware,
  controller.managerPending
);

router.post(
  "/manager/:id/action",
  authMiddleware,
  controller.managerAction
);

router.get(
  "/hr/pending",
  authMiddleware,
  controller.hrPending
);

router.post(
  "/hr/:id/action",
  authMiddleware,
  isAdmin,
  controller.hrAction
);

/* ============================================================
   HR REVERT APPROVED REGULARIZATION
   ============================================================ */

router.post(
  "/hr/:arId/revert",
  authMiddleware,
  isAdmin,
  controller.cancelHrAction
);

/* ============================================================
   EMPLOYEE CANCEL REQUEST
   ============================================================ */

router.post(
  "/:id/cancel",
  authMiddleware,
  controller.cancelRequest
);

router.get(
  "/activity-log/by-emp-date",
  controller.getActivityLogByEmpDate
);

module.exports = router;


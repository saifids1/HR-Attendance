const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRole, isAdmin } = require("../middlewares/roleMiddleware");
const controller = require("../controllers/attendanceRegularizationController");

router.get("/masters", authMiddleware, controller.getMasters);

router.get(
  "/me",
  authMiddleware,
  authorizeRole("EMPLOYEE"),
  controller.myRequests
);

router.get(
  "/manager/pending",
  authMiddleware,
  controller.managerPending
);

router.get(
  "/hr/pending",
  authMiddleware,
  controller.hrPending
);

router.get(
  "/activity-log/by-emp-date",
  authMiddleware,
  isAdmin,
  controller.getActivityLogByEmpDate
);

router.post(
  "/raise",
  authMiddleware,
  controller.raiseRequest
);

router.post(
  "/manager/:id/action",
  authMiddleware,
  controller.managerAction
);

router.post(
  "/hr/:id/action",
  authMiddleware,
  isAdmin,
  controller.hrAction
);

router.post(
  "/:arId/cancel",
  authMiddleware,
  controller.cancelHrAction
);

router.post(
  "/:id/cancel",
  controller.cancelRequest
);

router.get(
  "/:id",
  authMiddleware,
  controller.getById
);

module.exports = router;
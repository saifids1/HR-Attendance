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

router.post(
  "/raise",
  authMiddleware,
  controller.raiseRequest
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

router.post(
  "/hr/:id/cancel",
  authMiddleware,
  isAdmin,
  controller.cancelHrAction
);

router.get(
  "/activity-log/by-emp-date",
  authMiddleware,
  isAdmin,
  controller.getActivityLogByEmpDate
);

module.exports = router;
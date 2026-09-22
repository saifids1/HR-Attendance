const express = require("express");
<<<<<<< HEAD

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
=======
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { authorizeRole, isAdmin } = require("../middlewares/roleMiddleware");
const controller = require("../controllers/attendanceRegularizationController");

router.get("/masters", authMiddleware, controller.getMasters);
>>>>>>> 8676c1d (Changes For Attendence Regulaization)

router.get(
  "/me",
  authMiddleware,
<<<<<<< HEAD
=======
  authorizeRole("EMPLOYEE"),
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
  controller.myRequests
);

router.get(
<<<<<<< HEAD
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
=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
  "/manager/pending",
  authMiddleware,
  controller.managerPending
);

<<<<<<< HEAD
router.post(
  "/manager/:id/action",
  authMiddleware,
  controller.managerAction
);

=======
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
router.get(
  "/hr/pending",
  authMiddleware,
  controller.hrPending
);

<<<<<<< HEAD
=======
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

>>>>>>> 8676c1d (Changes For Attendence Regulaization)
router.post(
  "/hr/:id/action",
  authMiddleware,
  isAdmin,
  controller.hrAction
);

router.post(
<<<<<<< HEAD
  "/hr/:id/cancel",
  authMiddleware,
  isAdmin,
  controller.cancelHrAction
);

router.get(
  "/activity-log/by-emp-date",
  controller.getActivityLogByEmpDate
=======
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
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
);

module.exports = router;
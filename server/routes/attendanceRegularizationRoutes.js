const express = require("express");
<<<<<<< HEAD
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
=======

>>>>>>> 6aef60d (Change for Attendance Regulaization)
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  authorizeRole,
  isAdmin,
} = require("../middlewares/roleMiddleware");

const controller = require("../controllers/attendanceRegularizationController");

<<<<<<< HEAD
router.get("/masters", authMiddleware, controller.getMasters);
>>>>>>> 8676c1d (Changes For Attendence Regulaization)

=======
>>>>>>> 6aef60d (Change for Attendance Regulaization)
router.get(
  "/masters",
  authMiddleware,
<<<<<<< HEAD
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
=======
  controller.getMasters
>>>>>>> 6aef60d (Change for Attendance Regulaization)
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

<<<<<<< HEAD
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
router.get(
  "/hr/pending",
  authMiddleware,
  controller.hrPending
);

>>>>>>> 6aef60d (Change for Attendance Regulaization)
router.post(
  "/hr/:id/action",
  authMiddleware,
  isAdmin,
  controller.hrAction
);

router.post(
<<<<<<< HEAD
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
=======
  "/hr/:id/cancel",
>>>>>>> 6aef60d (Change for Attendance Regulaization)
  authMiddleware,
  isAdmin,
  controller.cancelHrAction
);

router.get(
  "/activity-log/by-emp-date",
  authMiddleware,
<<<<<<< HEAD
  controller.getById
>>>>>>> 8676c1d (Changes For Attendence Regulaization)
=======
  isAdmin,
  controller.getActivityLogByEmpDate
>>>>>>> 6aef60d (Change for Attendance Regulaization)
);

module.exports = router;
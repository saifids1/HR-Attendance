const express = require("express");

const router = express.Router();

const controller = require("../controllers/shiftRosterController");

router.post(
  "/",
  controller.assignShift
);

router.get(
  "/",
  controller.getRosterList
);

router.get(
  "/employee/:pr_id",
  controller.getEmployeeShiftHistory
);

router.get(
  "/employee/:pr_id/current",
  controller.getCurrentEmployeeShift
);

router.get(
  "/employee/:pr_id/date/:date",
  controller.getEmployeeShiftByDate
);

router.put(
  "/:roster_id/change",
  controller.changeEmployeeShift
);

router.put(
  "/:roster_id/close",
  controller.closeEmployeeShift
);

module.exports = router;
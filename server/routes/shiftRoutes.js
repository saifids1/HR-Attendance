const express = require("express");

const router =
  express.Router();

const shiftController =
  require("../controllers/shiftController");

router.post(
  "/",
  shiftController.createShift
);

router.get(
  "/",
  shiftController.getShifts
);

router.get(
  "/:shift_id",
  shiftController.getShiftById
);

router.put(
  "/:shift_id",
  shiftController.updateShift
);

router.delete(
  "/:shift_id",
  shiftController.deleteShift
);

router.get(
  "/:shift_id/days",
  shiftController.getShiftDays
);

router.put(
  "/:shift_id/days",
  shiftController.updateShiftDays
);

router.post(
  "/:shift_id/breaks",
  shiftController.createBreak
);

router.get(
  "/:shift_id/breaks",
  shiftController.getBreaks
);

router.put(
  "/:shift_id/breaks/:shift_break_id",
  shiftController.updateBreak
);

router.delete(
  "/:shift_id/breaks/:shift_break_id",
  shiftController.deleteBreak
);

module.exports = router;
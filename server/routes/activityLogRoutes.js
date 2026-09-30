const express = require("express");
const router = express.Router();

const activityLogController = require("../controllers/mobile.punch.logs.controller");

router.post(
  "/",
  activityLogController.uploadActivityImage,
  activityLogController.createActivityLog
);

router.get(
  "/",
  activityLogController.getPaginatedActivityLogs
);

router.get(
  "/all",
  activityLogController.getAllActivityLogs
);

router.get(
  "/:id",
  activityLogController.getActivityLogById
);

router.put(
  "/:id",
  activityLogController.uploadActivityImage,
  activityLogController.updateActivityLog
);

router.delete(
  "/:id",
  activityLogController.deleteActivityLog
);

module.exports = router;
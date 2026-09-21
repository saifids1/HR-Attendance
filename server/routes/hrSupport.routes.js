const express = require("express");
const router = express.Router();

const hrSupportController = require("../controllers/hrSupport.controller");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadHrSupport = require("../middlewares/uploadHrSupport");

/* ============================================================
   EMPLOYEE ROUTES
   ============================================================ */

// Create request (Employee)
router.post(
  "/requests",
  authMiddleware,
  uploadHrSupport.single("attachment"),
  hrSupportController.createSupportRequest
);

// List my requests (Employee)
router.get(
  "/requests/my",
  authMiddleware,
  hrSupportController.getEmployeeSupportRequests
);

/* ============================================================
   HR-SUPPORT ROUTES
   ============================================================ */

// List all requests (HR-SUPPORT only)
router.get(
  "/requests",
  authMiddleware,
  hrSupportController.getHrSupportRequests
);

// Update status (HR-SUPPORT only)
router.put(
  "/requests/:id/status",
  authMiddleware,
  hrSupportController.updateSupportStatus
);

/* ============================================================
   BOTH (Employee + HR-SUPPORT)
   ============================================================ */

// Get single request
router.get(
  "/requests/:id",
  authMiddleware,
  hrSupportController.getSupportRequestById
);

// Get messages
router.get(
  "/requests/:id/messages",
  authMiddleware,
  hrSupportController.getSupportMessages
);

// Reply (with optional attachment and status for HR)
router.post(
  "/requests/:id/reply",
  authMiddleware,
  uploadHrSupport.single("attachment"),
  hrSupportController.replyToSupportRequest
);

// Mark message as read
router.put(
  "/messages/:message_id/read",
  authMiddleware,
  hrSupportController.markMessageAsRead
);

// Mark all messages in request as read
router.put(
  "/requests/:id/read-all",
  authMiddleware,
  hrSupportController.markAllMessagesAsRead
);

// Unread count
router.get(
  "/unread-count",
  authMiddleware,
  hrSupportController.getUnreadMessageCount
);

// Close request
router.put(
  "/requests/:id/close",
  authMiddleware,
  hrSupportController.closeSupportRequest
);

// Activity log
router.get(
  "/requests/:id/activity",
  authMiddleware,
  hrSupportController.getSupportActivity
);

/* ============================================================
   LOOKUPS
   ============================================================ */
router.get(
  "/request-types",
  authMiddleware,
  hrSupportController.getRequestTypes
);

router.get(
  "/statuses",
  authMiddleware,
  hrSupportController.getSupportStatuses
);

/* ============================================================
   ATTACHMENT DOWNLOAD
   ============================================================ */
router.get(
  "/attachments/:id",
  authMiddleware,
  hrSupportController.getAttachment
);

module.exports = router;
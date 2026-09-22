const path = require("path");
const fs = require("fs");

const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");

const {
  HrSupportRequest,
  HrSupportRequestType,
  HrSupportStatus,
  HrSupportMessage,
  HrSupportMessageRead,
  HrSupportAttachment,
  HrSupportActivity,
  Personal,
  Organizations,
} = db;

const UserRoleRelation = db.UserRoleRelation || null;
const UsrRoleMaster = db.UsrRoleMaster || null;

const sendEmail = require("../utils/mailer");
const uploadHrSupport = require("../middlewares/uploadHrSupport");

const { toRelativePath, toAbsolutePath } = uploadHrSupport;

const LOG_PREFIX = "[HR-SUPPORT]";
const HR_SUPPORT_ROLE_NAMES = ["HR-SUPPORT"];

const log = (label, data) => {
  console.log(
    `${LOG_PREFIX} [${new Date().toISOString()}] ${label}`,
    data !== undefined ? data : ""
  );
};

const logError = (label, error) => {
  console.error(
    `${LOG_PREFIX} [${new Date().toISOString()}] [ERROR] ${label}`,
    error?.message || error,
    error?.stack || ""
  );
};

const getLoggedInPrId = (req) =>
  req.user?.pr_id ||
  req.user?.Pr_Id ||
  req.user?.user_id ||
  req.user?.id ||
  null;

const getEmployee = async (prId, transaction = null) => {
  const employee = await Personal.findOne({
    where: { pr_id: prId },
    transaction,
  });

  if (!employee) {
    log("getEmployee - NOT FOUND", { prId });
    return null;
  }

  const organization = await Organizations.findOne({
    where: { pr_id: prId },
    transaction,
  });

  const email =
    organization?.or_organization_email ||
    organization?.or_official_email ||
    employee?.pr_email ||
    null;

  const employeeName = employee?.pr_first_name
    ? `${employee.pr_first_name} ${employee.pr_last_name || ""}`.trim()
    : employee?.pr_first_name || "";

  return { employee, organization, email, employeeName };
};

const getHrEmailsFromEnv = () => {
  const raw = process.env.HR_SUPPORT_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
};

const isHrSupportUser = async (prId, transaction = null) => {
  try {
    if (!UserRoleRelation || !UsrRoleMaster) {
      log("isHrSupportUser - Models not loaded");
      return false;
    }

    const roles = await UsrRoleMaster.findAll({
      where: { rm_role_name: HR_SUPPORT_ROLE_NAMES },
      attributes: ["rm_role_id"],
      transaction,
    });

    if (!roles.length) {
      log("isHrSupportUser - No HR-SUPPORT role found");
      return false;
    }

    const roleIds = roles.map((r) => r.rm_role_id);

    const relation = await UserRoleRelation.findOne({
      where: { pr_id: prId, rl_role_id: roleIds },
      transaction,
    });

    const isHr = !!relation;
    log("isHrSupportUser", { prId, isHr });
    return isHr;
  } catch (error) {
    logError("isHrSupportUser failed", error);
    return false;
  }
};

const getHrSupportPrIds = async (transaction = null) => {
  try {
    if (!UserRoleRelation || !UsrRoleMaster) return [];

    const roles = await UsrRoleMaster.findAll({
      where: { rm_role_name: HR_SUPPORT_ROLE_NAMES },
      attributes: ["rm_role_id"],
      transaction,
    });

    if (!roles.length) return [];

    const roleIds = roles.map((r) => r.rm_role_id);

    const relations = await UserRoleRelation.findAll({
      where: { rl_role_id: roleIds },
      attributes: ["pr_id"],
      transaction,
    });

    return [...new Set(relations.map((r) => r.pr_id).filter(Boolean))];
  } catch (error) {
    logError("getHrSupportPrIds failed", error);
    return [];
  }
};

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    const abs = path.isAbsolute(filePath) ? filePath : toAbsolutePath(filePath);
    await fs.promises.unlink(abs);
  } catch (err) {
    if (err.code !== "ENOENT") {
      logError("File cleanup error", err);
    }
  }
};

const sendSupportEmails = async ({
  request,
  employeeEmail,
  hrEmails,
  templateForEmployee,
  templateForHr,
  subjectForEmployee,
  subjectForHr,
  emailData,
  skipEmployeeEmail = false,
  skipHrEmails = false,
}) => {
  const result = {
    hrSent: [],
    hrFailed: [],
    employeeSent: false,
    employeeFailed: null,
  };

  const resolvedHrEmails = hrEmails?.length ? hrEmails : getHrEmailsFromEnv();

  if (!skipHrEmails) {
    for (const hrEmail of resolvedHrEmails) {
      try {
        await sendEmail(hrEmail, subjectForHr, templateForHr, emailData);
        result.hrSent.push(hrEmail);
        log(`Email sent to ${hrEmail} with subject: ${subjectForHr}`);
      } catch (error) {
        result.hrFailed.push({ email: hrEmail, error: error.message });
        logError(`HR email failed for ${hrEmail}`, error);
      }
    }
  }

  if (employeeEmail && !skipEmployeeEmail) {
    try {
      await sendEmail(
        employeeEmail,
        subjectForEmployee,
        templateForEmployee,
        emailData
      );
      result.employeeSent = true;
      log(`Email sent to ${employeeEmail} with subject: ${subjectForEmployee}`);
    } catch (error) {
      result.employeeFailed = { email: employeeEmail, error: error.message };
      logError(`Employee email failed for ${employeeEmail}`, error);
    }
  }

  return result;
};

const generateRequestNumber = async (transaction) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const lastRequest = await HrSupportRequest.findOne({
    order: [["hsr_id", "DESC"]],
    transaction,
  });

  const nextNumber = lastRequest ? Number(lastRequest.hsr_id) + 1 : 1;
  return `HSR-${year}${month}-${String(nextNumber).padStart(6, "0")}`;
};

const createSupportRequest = async (req, res) => {
  log("createSupportRequest - START", {
    body: req.body,
    file: req.file?.originalname,
    filePath: req.file?.path,
  });

  const transaction = await sequelize.transaction();

  try {
    const prId = getLoggedInPrId(req);

    if (!prId) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(401)
        .json({ success: false, message: "Employee ID not found" });
    }

    const { request_type_id, subject, description } = req.body;

    if (!request_type_id) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(400)
        .json({ success: false, message: "Request type is required" });
    }

    const requestType = await HrSupportRequestType.findOne({
      where: { rst_id: request_type_id, rst_is_active: true },
      transaction,
    });

    if (!requestType) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(400)
        .json({ success: false, message: "Invalid or inactive request type" });
    }

    const pendingStatus = await HrSupportStatus.findOne({
      where: { hss_name: "Pending", hss_is_active: true },
      transaction,
    });

    if (!pendingStatus) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(500)
        .json({ success: false, message: "Pending status is not configured" });
    }

    const employeeData = await getEmployee(prId, transaction);
    if (!employeeData) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const now = new Date();
    const requestNo = await generateRequestNumber(transaction);

    const supportRequest = await HrSupportRequest.create(
      {
        hsr_request_no: requestNo,
        hsr_pr_id: prId,
        hsr_request_type_id: request_type_id,
        hsr_subject: subject?.trim() || null,
        hsr_description: description?.trim() || null,
        hsr_status_id: pendingStatus.hss_id,
        hsr_assigned_to: null,
        hsr_created_by: prId,
        hsr_created_at: now,
        hsr_updated_by: prId,
        hsr_updated_at: now,
        hsr_last_activity_at: now,
        hsr_closed_by: null,
        hsr_closed_at: null,
        hsr_is_deleted: false,
      },
      { transaction }
    );

    let message = null;
    if (description?.trim()) {
      message = await HrSupportMessage.create(
        {
          hsm_request_id: supportRequest.hsr_id,
          hsm_sender_pr_id: prId,
          hsm_sender_type: "EMPLOYEE",
          hsm_message: description.trim(),
          hsm_created_at: now,
          hsm_updated_at: now,
        },
        { transaction }
      );
    }

    let attachment = null;
    if (req.file) {
      attachment = await HrSupportAttachment.create(
        {
          hsa_request_id: supportRequest.hsr_id,
          hsa_message_id: message?.hsm_id || null,
          hsa_file_name: req.file.originalname,
          hsa_file_path: toRelativePath(req.file.path),
          hsa_file_extension: path.extname(req.file.originalname),
          hsa_file_size: req.file.size,
          hsa_uploaded_by: prId,
          hsa_created_at: now,
          hsa_is_deleted: false,
        },
        { transaction }
      );
    }

    await HrSupportActivity.create(
      {
        hsa_request_id: supportRequest.hsr_id,
        hsa_activity_type: "REQUEST_CREATED",
        hsa_description: `Employee created support request ${requestNo}`,
        hsa_performed_by: prId,
        hsa_created_at: now,
      },
      { transaction }
    );

    await transaction.commit();

    const hrEmails = getHrEmailsFromEnv();

    const emailData = {
      request_no: requestNo,
      request_id: supportRequest.hsr_id,
      request_type: requestType.rst_name,
      subject: subject?.trim() || "(No subject)",
      description: description?.trim() || "(No description)",
      status: pendingStatus.hss_name,
      employee_name: employeeData.employeeName,
      employee_id: prId,
      hr_name: "HR Support Team",
      updated_by: employeeData.employeeName,
      message: description?.trim() || "(No description)",
    };

    const emailResult = await sendSupportEmails({
      request: supportRequest,
      employeeEmail: employeeData.email,
      hrEmails,
      templateForEmployee: "hr_support_request_employee",
      templateForHr: "hr_support_request",
      subjectForEmployee: `HR Support Request Submitted - ${requestNo}`,
      subjectForHr: `New HR Support Request - ${requestNo}`,
      emailData,
    });

    return res.status(201).json({
      success: true,
      message: "HR support request created successfully",
      data: {
        request_id: supportRequest.hsr_id,
        request_no: requestNo,
        request_type: requestType.rst_name,
        status: pendingStatus.hss_name,
        attachment: attachment
          ? { id: attachment.hsa_id, file_name: attachment.hsa_file_name }
          : null,
      },
      email_status: emailResult,
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logError("Rollback error", rollbackError);
    }

    await safeUnlink(req.file?.path);

    logError("createSupportRequest failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create HR support request",
      error: error.message,
    });
  }
};

const getEmployeeSupportRequests = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "Employee ID not found" });
    }

    let {
      page = 1,
      limit = 10,
      search = "",
      status_id,
      request_type_id,
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;
    const { Op } = require("sequelize");

    const where = { hsr_pr_id: prId, hsr_is_deleted: false };
    if (status_id) where.hsr_status_id = status_id;
    if (request_type_id) where.hsr_request_type_id = request_type_id;

    if (search && search.trim()) {
      where[Op.or] = [
        { hsr_request_no: { [Op.iLike]: `%${search.trim()}%` } },
        { hsr_subject: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await HrSupportRequest.findAndCountAll({
      where,
      include: [
        {
          model: HrSupportRequestType,
          as: "requestType",
          attributes: ["rst_id", "rst_name"],
        },
        {
          model: HrSupportStatus,
          as: "status",
          attributes: ["hss_id", "hss_name", "hss_is_closed"],
        },
      ],
      order: [["hsr_last_activity_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: "Employee support requests fetched successfully",
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logError("getEmployeeSupportRequests failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support requests",
      error: error.message,
    });
  }
};

const getHrSupportRequests = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const isHr = await isHrSupportUser(prId);
    if (!isHr) {
      return res.status(403).json({
        success: false,
        message: "Only HR-SUPPORT users can access this",
      });
    }

    let {
      page = 1,
      limit = 10,
      search = "",
      status_id,
      request_type_id,
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;
    const { Op } = require("sequelize");

    const where = { hsr_is_deleted: false };
    if (status_id) where.hsr_status_id = status_id;
    if (request_type_id) where.hsr_request_type_id = request_type_id;

    if (search && search.trim()) {
      where[Op.or] = [
        { hsr_request_no: { [Op.iLike]: `%${search.trim()}%` } },
        { hsr_subject: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows } = await HrSupportRequest.findAndCountAll({
      where,
      include: [
        {
          model: HrSupportRequestType,
          as: "requestType",
          attributes: ["rst_id", "rst_name"],
        },
        {
          model: HrSupportStatus,
          as: "status",
          attributes: ["hss_id", "hss_name", "hss_is_closed"],
        },
        {
          model: Personal,
          as: "employee",
          attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
          required: false,
        },
      ],
      order: [["hsr_last_activity_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: "HR support requests fetched successfully",
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logError("getHrSupportRequests failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support requests",
      error: error.message,
    });
  }
};

const getSupportRequestById = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const request = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
      include: [
        {
          model: HrSupportRequestType,
          as: "requestType",
          attributes: ["rst_id", "rst_name"],
        },
        {
          model: HrSupportStatus,
          as: "status",
          attributes: ["hss_id", "hss_name", "hss_is_closed"],
        },
        {
          model: Personal,
          as: "employee",
          attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
          required: false,
        },
      ],
    });

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const isRequester = Number(request.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId);

    if (!isRequester && !isHr) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view this request",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Support request fetched successfully",
      data: request,
    });
  } catch (error) {
    logError("getSupportRequestById failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support request",
      error: error.message,
    });
  }
};

const getSupportMessages = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const request = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
      include: [
        {
          model: HrSupportRequestType,
          as: "requestType",
          attributes: ["rst_id", "rst_name", "rst_is_active"],
        },
        {
          model: HrSupportStatus,
          as: "status",
          attributes: ["hss_id", "hss_name", "hss_is_closed", "hss_is_active"],
        },
        {
          model: Personal,
          as: "employee",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
          required: false,
        },
      ],
    });

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const isRequester = Number(request.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId);

    if (!isRequester && !isHr) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view messages",
      });
    }

    const messages = await HrSupportMessage.findAll({
      where: { hsm_request_id: id },
      include: [
        {
          model: Personal,
          as: "sender",
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
          ],
          required: false,
        },
        {
          model: HrSupportMessageRead,
          as: "readRecords",
          required: false,
          include: [
            {
              model: Personal,
              as: "user",
              attributes: ["pr_id", "pr_first_name", "pr_last_name"],
              required: false,
            },
          ],
        },
        {
          model: HrSupportAttachment,
          as: "attachments",
          required: false,
          where: { hsa_is_deleted: false },
        },
      ],
      order: [["hsm_created_at", "DESC"]],
    });

    const enriched = messages.map((m) => {
      const plain = m.toJSON();

      const readRecords = plain.readRecords || [];
      const isReadByMe = readRecords.some(
        (r) => Number(r.hsmr_user_id) === Number(prId)
      );

      const attachments = (plain.attachments || []).map((a) => ({
        hsa_id: a.hsa_id,
        hsa_request_id: a.hsa_request_id,
        hsa_message_id: a.hsa_message_id,
        hsa_file_name: a.hsa_file_name,
        hsa_file_path: a.hsa_file_path,
        hsa_file_extension: a.hsa_file_extension,
        hsa_file_size: a.hsa_file_size,
        hsa_uploaded_by: a.hsa_uploaded_by,
        hsa_created_at: a.hsa_created_at,
        hsa_is_deleted: a.hsa_is_deleted,
      }));

      const sender = plain.sender
        ? {
            pr_id: plain.sender.pr_id,
            pr_first_name: plain.sender.pr_first_name,
            pr_last_name: plain.sender.pr_last_name,
            pr_email: plain.sender.pr_email,
            full_name: plain.sender.pr_first_name
              ? `${plain.sender.pr_first_name} ${
                  plain.sender.pr_last_name || ""
                }`.trim()
              : plain.sender.full_name || "",
          }
        : null;

      return {
        hsm_id: plain.hsm_id,
        hsm_request_id: plain.hsm_request_id,
        hsm_sender_pr_id: plain.hsm_sender_pr_id,
        hsm_sender_type: plain.hsm_sender_type,
        hsm_message: plain.hsm_message,
        hsm_created_at: plain.hsm_created_at,
        hsm_updated_at: plain.hsm_updated_at,

        sender,
        attachments,
        readRecords: readRecords.map((r) => ({
          hsmr_id: r.hsmr_id,
          hsmr_message_id: r.hsmr_message_id,
          hsmr_user_id: r.hsmr_user_id,
          hsmr_read_at: r.hsmr_read_at,
          user: r.user
            ? {
                pr_id: r.user.pr_id,
                pr_first_name: r.user.pr_first_name,
                pr_last_name: r.user.pr_last_name,
                full_name: r.user.pr_first_name
                  ? `${r.user.pr_first_name} ${
                      r.user.pr_last_name || ""
                    }`.trim()
                  : "",
              }
            : null,
        })),

        is_read_by_me: isReadByMe,
        read_count: readRecords.length,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Support messages fetched successfully",
      data: {
        request: {
          hsr_id: request.hsr_id,
          hsr_request_no: request.hsr_request_no,
          hsr_pr_id: request.hsr_pr_id,
          hsr_request_type_id: request.hsr_request_type_id,
          hsr_subject: request.hsr_subject,
          hsr_description: request.hsr_description,
          hsr_status_id: request.hsr_status_id,
          hsr_assigned_to: request.hsr_assigned_to,
          hsr_created_by: request.hsr_created_by,
          hsr_created_at: request.hsr_created_at,
          hsr_updated_by: request.hsr_updated_by,
          hsr_updated_at: request.hsr_updated_at,
          hsr_last_activity_at: request.hsr_last_activity_at,
          hsr_closed_by: request.hsr_closed_by,
          hsr_closed_at: request.hsr_closed_at,
          hsr_is_deleted: request.hsr_is_deleted,

          requestType: request.requestType
            ? {
                rst_id: request.requestType.rst_id,
                rst_name: request.requestType.rst_name,
                rst_is_active: request.requestType.rst_is_active,
              }
            : null,

          status: request.status
            ? {
                hss_id: request.status.hss_id,
                hss_name: request.status.hss_name,
                hss_is_closed: request.status.hss_is_closed,
                hss_is_active: request.status.hss_is_active,
              }
            : null,

          employee: request.employee
            ? {
                pr_id: request.employee.pr_id,
                pr_first_name: request.employee.pr_first_name,
                pr_last_name: request.employee.pr_last_name,
                pr_email: request.employee.pr_email,
                full_name: request.employee.pr_first_name
                  ? `${request.employee.pr_first_name} ${
                      request.employee.pr_last_name || ""
                    }`.trim()
                  : request.employee.full_name || "",
              }
            : null,
        },
        messages: enriched,
        total_messages: enriched.length,
      },
    });
  } catch (error) {
    logError("getSupportMessages failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support messages",
      error: error.message,
    });
  }
};

const replyToSupportRequest = async (req, res) => {
  log("replyToSupportRequest - START", {
    params: req.params,
    file: req.file?.originalname,
    filePath: req.file?.path,
    body: req.body,
  });

  const transaction = await sequelize.transaction();

  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const { message, status_id } = req.body;

    if (!message || !message.trim()) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const supportRequest = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
      include: [
        { model: HrSupportRequestType, as: "requestType" },
        { model: HrSupportStatus, as: "status" },
      ],
      transaction,
    });

    if (!supportRequest) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    if (supportRequest.status?.hss_is_closed) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res.status(400).json({
        success: false,
        message: "This support request is already closed",
      });
    }

    const isRequester = Number(supportRequest.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId, transaction);

    if (!isRequester && !isHr) {
      await transaction.rollback();
      await safeUnlink(req.file?.path);
      return res.status(403).json({
        success: false,
        message: "You are not allowed to reply to this request",
      });
    }

    const senderType = isHr ? "HR" : "EMPLOYEE";

    const employeeData = await getEmployee(
      supportRequest.hsr_pr_id,
      transaction
    );
    const now = new Date();

    const newMessage = await HrSupportMessage.create(
      {
        hsm_request_id: supportRequest.hsr_id,
        hsm_sender_pr_id: prId,
        hsm_sender_type: senderType,
        hsm_message: message.trim(),
        hsm_created_at: now,
        hsm_updated_at: now,
      },
      { transaction }
    );

    let attachment = null;
    if (req.file) {
      attachment = await HrSupportAttachment.create(
        {
          hsa_request_id: supportRequest.hsr_id,
          hsa_message_id: newMessage.hsm_id,
          hsa_file_name: req.file.originalname,
          hsa_file_path: toRelativePath(req.file.path),
          hsa_file_extension: path.extname(req.file.originalname),
          hsa_file_size: req.file.size,
          hsa_uploaded_by: prId,
          hsa_created_at: now,
          hsa_is_deleted: false,
        },
        { transaction }
      );
    }

    const updateData = {
      hsr_updated_by: prId,
      hsr_updated_at: now,
      hsr_last_activity_at: now,
    };

    let newStatus = null;
    if (isHr && status_id) {
      newStatus = await HrSupportStatus.findOne({
        where: { hss_id: status_id, hss_is_active: true },
        transaction,
      });

      if (newStatus) {
        updateData.hsr_status_id = newStatus.hss_id;

        if (newStatus.hss_is_closed) {
          updateData.hsr_closed_by = prId;
          updateData.hsr_closed_at = now;
        } else {
          updateData.hsr_closed_by = null;
          updateData.hsr_closed_at = null;
        }

        await HrSupportActivity.create(
          {
            hsa_request_id: supportRequest.hsr_id,
            hsa_activity_type: "STATUS_CHANGED",
            hsa_description: `Status changed from ${supportRequest.status?.hss_name} to ${newStatus.hss_name}`,
            hsa_performed_by: prId,
            hsa_created_at: now,
          },
          { transaction }
        );
      }
    }

    await HrSupportRequest.update(updateData, {
      where: { hsr_id: supportRequest.hsr_id },
      transaction,
    });

    await HrSupportActivity.create(
      {
        hsa_request_id: supportRequest.hsr_id,
        hsa_activity_type: isHr ? "HR_REPLIED" : "EMPLOYEE_REPLIED",
        hsa_description: isHr
          ? "HR replied to support request"
          : "Employee replied to support request",
        hsa_performed_by: prId,
        hsa_created_at: now,
      },
      { transaction }
    );

    await transaction.commit();

    const hrEmails = getHrEmailsFromEnv();
    const responderData = await getEmployee(prId);

    const emailData = {
      request_no: supportRequest.hsr_request_no,
      request_id: supportRequest.hsr_id,
      request_type: supportRequest.requestType?.rst_name,
      subject: supportRequest.hsr_subject,
      description: supportRequest.hsr_description,
      message: message.trim(),
      reply_message: message.trim(),
      status: newStatus?.hss_name || supportRequest.status?.hss_name,
      employee_name: employeeData?.employeeName,
      employee_id: supportRequest.hsr_pr_id,
      hr_name: responderData?.employeeName || "HR Support Team",
      replied_by: responderData?.employeeName || "HR Support Team",
      sender_type: senderType,
    };

    const responderEmail = (responderData?.email || "").toLowerCase();
    const employeeEmailNorm = (employeeData?.email || "").toLowerCase();
    const filteredHrEmails = hrEmails.filter(
      (e) => e.toLowerCase() !== responderEmail
    );

    let emailResult = null;

    if (isHr) {
      emailResult = await sendSupportEmails({
        request: supportRequest,
        employeeEmail: employeeData?.email,
        hrEmails: filteredHrEmails,
        templateForEmployee: "hr_support_reply_employee",
        templateForHr: "hr_support_reply",
        subjectForEmployee: `HR Replied to Your Support Request - ${supportRequest.hsr_request_no}`,
        subjectForHr: `HR Replied - ${supportRequest.hsr_request_no}`,
        emailData,
        skipEmployeeEmail: responderEmail === employeeEmailNorm,
      });
    } else {
      emailResult = await sendSupportEmails({
        request: supportRequest,
        employeeEmail: employeeData?.email,
        hrEmails,
        templateForEmployee: "hr_support_reply_employee_ack",
        templateForHr: "hr_support_reply",
        subjectForEmployee: `Your Reply Was Recorded - ${supportRequest.hsr_request_no}`,
        subjectForHr: `Employee Replied - ${supportRequest.hsr_request_no}`,
        emailData,
        skipEmployeeEmail: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: {
        message_id: newMessage.hsm_id,
        request_id: supportRequest.hsr_id,
        request_no: supportRequest.hsr_request_no,
        status: newStatus?.hss_name || supportRequest.status?.hss_name,
        attachment: attachment
          ? { id: attachment.hsa_id, file_name: attachment.hsa_file_name }
          : null,
      },
      email_status: emailResult,
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logError("Rollback error", rollbackError);
    }

    await safeUnlink(req.file?.path);

    logError("replyToSupportRequest failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reply to support request",
      error: error.message,
    });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { message_id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const message = await HrSupportMessage.findOne({
      where: { hsm_id: message_id },
      include: [
        {
          model: HrSupportRequest,
          as: "request",
          where: { hsr_is_deleted: false },
        },
      ],
    });

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    const request = message.request;
    const isRequester = Number(request.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId);

    if (!isRequester && !isHr) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to read this message",
      });
    }

    const [readRecord, created] = await HrSupportMessageRead.findOrCreate({
      where: { hsmr_message_id: message_id, hsmr_user_id: prId },
      defaults: { hsmr_read_at: new Date() },
    });

    if (!created) {
      await readRecord.update({ hsmr_read_at: new Date() });
    }

    return res
      .status(200)
      .json({ success: true, message: "Message marked as read" });
  } catch (error) {
    logError("markMessageAsRead failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark message as read",
      error: error.message,
    });
  }
};

const markAllMessagesAsRead = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const request = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
    });

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const messages = await HrSupportMessage.findAll({
      where: { hsm_request_id: id },
      attributes: ["hsm_id", "hsm_sender_pr_id"],
    });

    const now = new Date();
    let markedCount = 0;

    for (const msg of messages) {
      if (Number(msg.hsm_sender_pr_id) === Number(prId)) continue;

      const [, created] = await HrSupportMessageRead.findOrCreate({
        where: { hsmr_message_id: msg.hsm_id, hsmr_user_id: prId },
        defaults: { hsmr_read_at: now },
      });

      if (created) markedCount++;
    }

    return res.status(200).json({
      success: true,
      message: "All messages marked as read",
      data: { marked_count: markedCount },
    });
  } catch (error) {
    logError("markAllMessagesAsRead failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

const getUnreadMessageCount = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const { Op } = require("sequelize");
    const isHr = await isHrSupportUser(prId);

    let requestWhere = { hsr_is_deleted: false };

    if (!isHr) {
      requestWhere.hsr_pr_id = prId;
    }

    const count = await HrSupportMessage.count({
      include: [
        {
          model: HrSupportRequest,
          as: "request",
          where: requestWhere,
          required: true,
        },
        {
          model: HrSupportMessageRead,
          as: "readRecords",
          where: { hsmr_user_id: prId },
          required: false,
        },
      ],
      where: {
        hsm_sender_pr_id: { [Op.ne]: prId },
        "$readRecords.hsmr_id$": null,
      },
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: { unread_count: count },
    });
  } catch (error) {
    logError("getUnreadMessageCount failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread message count",
      error: error.message,
    });
  }
};

const updateSupportStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;
    const { status_id } = req.body;

    if (!prId) {
      await transaction.rollback();
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const isHr = await isHrSupportUser(prId, transaction);
    if (!isHr) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Only HR-SUPPORT users can update status",
      });
    }

    if (!status_id) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Status ID is required" });
    }

    const supportRequest = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
      include: [{ model: HrSupportStatus, as: "status" }],
      transaction,
    });

    if (!supportRequest) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const newStatus = await HrSupportStatus.findOne({
      where: { hss_id: status_id, hss_is_active: true },
      transaction,
    });

    if (!newStatus) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid or inactive status" });
    }

    const oldStatus = supportRequest.status?.hss_name || "";
    const now = new Date();

    const updateData = {
      hsr_status_id: newStatus.hss_id,
      hsr_updated_by: prId,
      hsr_updated_at: now,
      hsr_last_activity_at: now,
    };

    if (newStatus.hss_is_closed) {
      updateData.hsr_closed_by = prId;
      updateData.hsr_closed_at = now;
    } else {
      updateData.hsr_closed_by = null;
      updateData.hsr_closed_at = null;
    }

    await HrSupportRequest.update(updateData, {
      where: { hsr_id: supportRequest.hsr_id },
      transaction,
    });

    await HrSupportActivity.create(
      {
        hsa_request_id: supportRequest.hsr_id,
        hsa_activity_type: "STATUS_CHANGED",
        hsa_description: `Status changed from ${oldStatus} to ${newStatus.hss_name}`,
        hsa_performed_by: prId,
        hsa_created_at: now,
      },
      { transaction }
    );

    await transaction.commit();

    const employeeData = await getEmployee(supportRequest.hsr_pr_id);
    const hrEmails = getHrEmailsFromEnv();

    const emailData = {
      request_no: supportRequest.hsr_request_no,
      request_id: supportRequest.hsr_id,
      old_status: oldStatus,
      status: newStatus.hss_name,
      employee_name: employeeData?.employeeName,
      employee_id: supportRequest.hsr_pr_id,
      updated_by: "HR Support Team",
    };

    const emailResult = await sendSupportEmails({
      request: supportRequest,
      employeeEmail: employeeData?.email,
      hrEmails,
      templateForEmployee: "hr_support_status_employee",
      templateForHr: "hr_support_status",
      subjectForEmployee: `HR Support Status Updated - ${supportRequest.hsr_request_no}`,
      subjectForHr: `HR Support Status Updated - ${supportRequest.hsr_request_no}`,
      emailData,
    });

    return res.status(200).json({
      success: true,
      message: "Support request status updated successfully",
      data: {
        request_id: supportRequest.hsr_id,
        request_no: supportRequest.hsr_request_no,
        old_status: oldStatus,
        status: newStatus.hss_name,
      },
      email_status: emailResult,
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logError("Rollback error", rollbackError);
    }
    logError("updateSupportStatus failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update support status",
      error: error.message,
    });
  }
};

const closeSupportRequest = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      await transaction.rollback();
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const closedStatus = await HrSupportStatus.findOne({
      where: { hss_is_closed: true, hss_is_active: true, hss_name: "Closed" },
      transaction,
    });

    if (!closedStatus) {
      await transaction.rollback();
      return res
        .status(500)
        .json({ success: false, message: "Closed status is not configured" });
    }

    const supportRequest = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
      include: [{ model: HrSupportRequestType, as: "requestType" }],
      transaction,
    });

    if (!supportRequest) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const isRequester = Number(supportRequest.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId, transaction);

    if (!isRequester && !isHr) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "You are not allowed to close this request",
      });
    }

    const now = new Date();

    await HrSupportRequest.update(
      {
        hsr_status_id: closedStatus.hss_id,
        hsr_closed_by: prId,
        hsr_closed_at: now,
        hsr_updated_by: prId,
        hsr_updated_at: now,
        hsr_last_activity_at: now,
      },
      { where: { hsr_id: supportRequest.hsr_id }, transaction }
    );

    await HrSupportActivity.create(
      {
        hsa_request_id: supportRequest.hsr_id,
        hsa_activity_type: "REQUEST_CLOSED",
        hsa_description: `Support request closed by ${
          isRequester ? "Employee" : "HR"
        }`,
        hsa_performed_by: prId,
        hsa_created_at: now,
      },
      { transaction }
    );

    await transaction.commit();

    const employeeData = await getEmployee(supportRequest.hsr_pr_id);
    const closedByData = await getEmployee(prId);
    const hrEmails = getHrEmailsFromEnv();

    const emailData = {
      request_no: supportRequest.hsr_request_no,
      request_id: supportRequest.hsr_id,
      request_type: supportRequest.requestType?.rst_name,
      subject: supportRequest.hsr_subject,
      description: supportRequest.hsr_description,
      status: closedStatus.hss_name,
      employee_name: employeeData?.employeeName,
      employee_id: supportRequest.hsr_pr_id,
      closed_by: closedByData?.employeeName || "HR Support Team",
      closed_at: now,
    };

    const emailResult = await sendSupportEmails({
      request: supportRequest,
      employeeEmail: employeeData?.email,
      hrEmails,
      templateForEmployee: "hr_support_closed_employee",
      templateForHr: "hr_support_closed",
      subjectForEmployee: `HR Support Request Closed - ${supportRequest.hsr_request_no}`,
      subjectForHr: `HR Support Request Closed - ${supportRequest.hsr_request_no}`,
      emailData,
    });

    return res.status(200).json({
      success: true,
      message: "Support request closed successfully",
      data: {
        request_id: supportRequest.hsr_id,
        request_no: supportRequest.hsr_request_no,
        status: closedStatus.hss_name,
        closed_at: now,
      },
      email_status: emailResult,
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logError("Rollback error", rollbackError);
    }
    logError("closeSupportRequest failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close support request",
      error: error.message,
    });
  }
};

const getSupportActivity = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const request = await HrSupportRequest.findOne({
      where: { hsr_id: id, hsr_is_deleted: false },
    });

    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Support request not found" });
    }

    const isRequester = Number(request.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId);

    if (!isRequester && !isHr) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to view activity",
      });
    }

    const activities = await HrSupportActivity.findAll({
      where: { hsa_request_id: id },
      include: [
        {
          model: Personal,
          as: "performedBy",
          attributes: ["pr_id", "pr_first_name", "pr_last_name"],
        },
      ],
      order: [["hsa_created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Support activities fetched successfully",
      data: activities,
    });
  } catch (error) {
    logError("getSupportActivity failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support activities",
      error: error.message,
    });
  }
};

const getRequestTypes = async (req, res) => {
  try {
    const requestTypes = await HrSupportRequestType.findAll({
      where: { rst_is_active: true },
      attributes: ["rst_id", "rst_name"],
      order: [["rst_name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Request types fetched successfully",
      data: requestTypes,
    });
  } catch (error) {
    logError("getRequestTypes failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch request types",
      error: error.message,
    });
  }
};

const getSupportStatuses = async (req, res) => {
  try {
    const statuses = await HrSupportStatus.findAll({
      where: { hss_is_active: true },
      attributes: ["hss_id", "hss_name", "hss_is_closed"],
      order: [["hss_name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Support statuses fetched successfully",
      data: statuses,
    });
  } catch (error) {
    logError("getSupportStatuses failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch support statuses",
      error: error.message,
    });
  }
};

const getAttachment = async (req, res) => {
  try {
    const prId = getLoggedInPrId(req);
    const { id } = req.params;

    if (!prId) {
      return res
        .status(401)
        .json({ success: false, message: "User ID not found" });
    }

    const attachment = await HrSupportAttachment.findOne({
      where: { hsa_id: id, hsa_is_deleted: false },
      include: [
        {
          model: HrSupportRequest,
          as: "request",
          where: { hsr_is_deleted: false },
        },
      ],
    });

    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    const request = attachment.request;
    const isRequester = Number(request.hsr_pr_id) === Number(prId);
    const isHr = await isHrSupportUser(prId);

    if (!isRequester && !isHr) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this attachment",
      });
    }

    const absoluteFilePath = toAbsolutePath(attachment.hsa_file_path);

    if (!absoluteFilePath || !fs.existsSync(absoluteFilePath)) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment file not found" });
    }

    return res.download(absoluteFilePath, attachment.hsa_file_name);
  } catch (error) {
    logError("getAttachment failed", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download attachment",
      error: error.message,
    });
  }
};

const auditEmailTemplates = () => {
  const REQUIRED = [
    "hr_support_request",
    "hr_support_request_employee",
    "hr_support_reply",
    "hr_support_reply_employee",
    "hr_support_reply_employee_ack",
    "hr_support_status",
    "hr_support_status_employee",
    "hr_support_closed",
    "hr_support_closed_employee",
  ];
  const dir = path.join(__dirname, "..", "email_templates");
  const exts = [".html", ".ejs", ".hbs"];
  const missing = [];
  for (const name of REQUIRED) {
    const found = exts.some((ext) => fs.existsSync(path.join(dir, name + ext)));
    if (!found) missing.push(name);
  }
  if (missing.length) {
    console.warn(
      `[HR-SUPPORT] Missing email templates in ${dir}: ${missing.join(", ")}`
    );
  } else {
    console.log("[HR-SUPPORT] Email template audit passed.");
  }
};

module.exports = {
  createSupportRequest,
  getEmployeeSupportRequests,
  getHrSupportRequests,
  updateSupportStatus,
  getSupportRequestById,
  getSupportMessages,
  replyToSupportRequest,
  markMessageAsRead,
  markAllMessagesAsRead,
  getUnreadMessageCount,
  closeSupportRequest,
  getSupportActivity,
  getRequestTypes,
  getSupportStatuses,
  getAttachment,
  auditEmailTemplates,
  sendSupportEmails,
};
const { DataTypes } = require("sequelize");
const { sequelize, connectDB } = require("../db/SequelizeDB");

const db = {};

db.sequelize = sequelize;
db.Sequelize = require("sequelize").Sequelize;

/* ---------- Load Models ---------- */
db.CompaniesMaster    = require("./companiesMaster")(sequelize, DataTypes);
db.EmployeeTypeMaster = require("./employeeTypeMaster")(sequelize, DataTypes);
db.LeaveQuota         = require("./leaveQuota")(sequelize, DataTypes);
db.LeaveRequests      = require("./leaveRequests")(sequelize, DataTypes);
db.LeaveStatus        = require("./leaveStatus")(sequelize, DataTypes);
db.LeaveTypes         = require("./leaveTypes")(sequelize, DataTypes);
db.Organizations      = require("./organizations")(sequelize, DataTypes);
db.Personal           = require("./personal")(sequelize, DataTypes);
db.UserRoleRelation   = require("./userRoleRelation")(sequelize, DataTypes);
db.UsrRoleMaster      = require("./usrRoleMaster")(sequelize, DataTypes);
db.Login             = require("./login")(sequelize, DataTypes);
db.UserImage         = require("./userImage")(sequelize, DataTypes);
db.Address           = require("./address")(sequelize, DataTypes);
db.BankAccount       = require("./bankAccount")(sequelize, DataTypes);
db.Contact           = require("./contact")(sequelize, DataTypes);
db.DepartmentMaster  = require("./departmentMaster")(sequelize, DataTypes);
db.DesignationMaster = require("./designationMaster")(sequelize, DataTypes);
db.Document          = require("./document")(sequelize, DataTypes);
db.Education         = require("./education")(sequelize, DataTypes);
db.Experience        = require("./experience")(sequelize, DataTypes);
db.Nominee           = require("./nominee")(sequelize, DataTypes);
db.VendorMaster      = require("./vendorMaster")(sequelize, DataTypes);

/* ---------- Attendance & Holiday Models ---------- */
db.ActivityLog       = require("./activityLog")(sequelize, DataTypes);
db.AttendanceLog     = require("./attendanceLog")(sequelize, DataTypes);
db.AttendanceStatus  = require("./attendenceStatus")(sequelize, DataTypes);
db.DailyAttendance   = require("./dailyAttendance")(sequelize, DataTypes);
db.Holiday           = require("./holiday")(sequelize, DataTypes);
db.HolidayTypeMaster = require("./holidayTypeMaster")(sequelize, DataTypes);
db.EmployeeEmail     = require("./employeeEmail")(sequelize, DataTypes);
db.SalarySlips = require("./salarySlips")(sequelize, DataTypes);
db.SalarySlipFiles = require("./salarySlipFiles")(sequelize, DataTypes);

/* ---------- Associations ---------- */

// Personal <-> Organizations
db.Personal.hasMany(db.Organizations, { foreignKey: "pr_id", as: "organizations" });
db.Organizations.belongsTo(db.Personal, { foreignKey: "pr_id", as: "personal" });

// Personal <-> LeaveRequests (requester)
db.Personal.hasMany(db.LeaveRequests, { foreignKey: "lr_pr_id", as: "leaveRequests" });
db.LeaveRequests.belongsTo(db.Personal, { foreignKey: "lr_pr_id", as: "personal" });

// Personal <-> LeaveQuota
db.Personal.hasMany(db.LeaveQuota, { foreignKey: "lq_pr_id", as: "leaveQuotas" });
db.LeaveQuota.belongsTo(db.Personal, { foreignKey: "lq_pr_id", as: "personal" });

// Personal <-> UserRoleRelation
db.Personal.hasMany(db.UserRoleRelation, { foreignKey: "pr_id", as: "userRoles" });
db.UserRoleRelation.belongsTo(db.Personal, { foreignKey: "pr_id", as: "personal" });

// Role Master <-> UserRoleRelation
db.UsrRoleMaster.hasMany(db.UserRoleRelation, { foreignKey: "rl_role_id", as: "userRoles" });
db.UserRoleRelation.belongsTo(db.UsrRoleMaster, { foreignKey: "rl_role_id", as: "role" });

// LeaveRequests <-> LeaveTypes
db.LeaveTypes.hasMany(db.LeaveRequests, { foreignKey: "lr_leave_type_id", as: "requests" });
db.LeaveRequests.belongsTo(db.LeaveTypes, { foreignKey: "lr_leave_type_id", as: "leaveType" });

// LeaveRequests <-> LeaveStatus
db.LeaveStatus.hasMany(db.LeaveRequests, { foreignKey: "lr_status_id", as: "requests" });
db.LeaveRequests.belongsTo(db.LeaveStatus, { foreignKey: "lr_status_id", as: "status" });

// LeaveQuota <-> LeaveTypes
db.LeaveTypes.hasMany(db.LeaveQuota, { foreignKey: "lq_leave_type_id", as: "quotas" });
db.LeaveQuota.belongsTo(db.LeaveTypes, { foreignKey: "lq_leave_type_id", as: "leaveType" });

// LeaveQuota <-> EmployeeTypeMaster
db.EmployeeTypeMaster.hasMany(db.LeaveQuota, { foreignKey: "lq_emptype", as: "quotas" });
db.LeaveQuota.belongsTo(db.EmployeeTypeMaster, { foreignKey: "lq_emptype", as: "employeeType" });

// LeaveTypes <-> EmployeeTypeMaster
db.EmployeeTypeMaster.hasMany(db.LeaveTypes, { foreignKey: "lt_emptype", as: "leaveTypes" });
db.LeaveTypes.belongsTo(db.EmployeeTypeMaster, { foreignKey: "lt_emptype", as: "employeeType" });

// Organizations <-> CompaniesMaster
db.CompaniesMaster.hasMany(db.Organizations, { foreignKey: "or_company_id", as: "employees" });
db.Organizations.belongsTo(db.CompaniesMaster, { foreignKey: "or_company_id", as: "company" });

// Organizations <-> EmployeeTypeMaster
db.EmployeeTypeMaster.hasMany(db.Organizations, { foreignKey: "or_employee_type_id", as: "employees" });
db.Organizations.belongsTo(db.EmployeeTypeMaster, { foreignKey: "or_employee_type_id", as: "employeeType" });

// Organizations self-reference (reporting manager)
db.Organizations.belongsTo(db.Organizations, { foreignKey: "or_reporting_to_id", as: "reportingTo" });
db.Organizations.hasMany(db.Organizations, { foreignKey: "or_reporting_to_id", as: "reportees" });

// LeaveRequests <-> Approver (Personal)
db.Personal.hasMany(db.LeaveRequests, { foreignKey: "lr_approver_by", as: "approvedRequests" });
db.LeaveRequests.belongsTo(db.Personal, { foreignKey: "lr_approver_by", as: "approver" });

// LeaveRequests <-> ReportingTo (Personal)
db.Personal.hasMany(db.LeaveRequests, { foreignKey: "lr_reporting_to", as: "reportedRequests" });
db.LeaveRequests.belongsTo(db.Personal, { foreignKey: "lr_reporting_to", as: "reportingTo" });

/* ---------- Login <-> Personal ---------- */
db.Personal.hasOne(db.Login, { foreignKey: "pr_id",  as: "login",});
db.Login.belongsTo(db.Personal, {  foreignKey: "pr_id",  as: "personal",});

/* ---------- UserImage <-> Personal ---------- */
db.Personal.hasMany(db.UserImage, {  foreignKey: "pr_id",  as: "userImages",});
db.UserImage.belongsTo(db.Personal, {  foreignKey: "pr_id",  as: "personal",});

/* ---------- Personal → Profile tables ---------- */
db.Personal.hasMany(db.Address,      { foreignKey: "pr_id", as: "addresses" });
db.Address.belongsTo(db.Personal,    { foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.BankAccount,  { foreignKey: "pr_id", as: "bankAccounts" });
db.BankAccount.belongsTo(db.Personal,{ foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.Contact,      { foreignKey: "pr_id", as: "contacts" });
db.Contact.belongsTo(db.Personal,    { foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.Document,     { foreignKey: "pr_id", as: "documents" });
db.Document.belongsTo(db.Personal,   { foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.Education,    { foreignKey: "pr_id", as: "educations" });
db.Education.belongsTo(db.Personal,  { foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.Experience,   { foreignKey: "pr_id", as: "experiences" });
db.Experience.belongsTo(db.Personal, { foreignKey: "pr_id", as: "personal" });

db.Personal.hasMany(db.Nominee,      { foreignKey: "pr_id", as: "nominees" });
db.Nominee.belongsTo(db.Personal,    { foreignKey: "pr_id", as: "personal" });

/* ---------- Organizations → Master data ---------- */
//db.Organizations.belongsTo(db.CompaniesMaster,    { foreignKey: "or_company_id",      as: "company" });
db.Organizations.belongsTo(db.VendorMaster,       { foreignKey: "or_vendor_id",       as: "vendor" });
db.Organizations.belongsTo(db.DepartmentMaster,   { foreignKey: "or_department_id",   as: "department" });
db.Organizations.belongsTo(db.DesignationMaster,  { foreignKey: "or_designation_id",  as: "designation" });
//db.Organizations.belongsTo(db.EmployeeTypeMaster, { foreignKey: "or_employee_type_id",as: "employeeType" });

db.DepartmentMaster.hasMany(db.Organizations, {
  foreignKey: "or_department_id",
  sourceKey: "DepartmentId",
  as: "employees",
});

// Attendance
db.DailyAttendance.belongsTo(db.AttendanceStatus, {  foreignKey: "status_id", as: "status",});
db.AttendanceStatus.hasMany(db.DailyAttendance, {foreignKey: "status_id", as: "attendanceRecords",});
// Holidays
db.Holiday.belongsTo(db.HolidayTypeMaster, { foreignKey: "holiday_id", targetKey: "holiday_type_id", as: "holidayType",});
// Employee ↔ Attendance
db.Organizations.hasMany(db.DailyAttendance, { foreignKey: "emp_id", sourceKey: "or_emp_id", as: "attendance",});

db.SalarySlips.belongsTo(db.Personal, {
  foreignKey: "employee_id",
  targetKey: "pr_id",
  as: "employee",
});

db.Personal.hasMany(db.SalarySlips, {
  foreignKey: "employee_id",
  sourceKey: "pr_id",
  as: "salarySlips",
});

db.SalarySlips.hasMany(db.SalarySlipFiles, {
  foreignKey: "salary_slip_id",
  sourceKey: "salary_slip_id",
  as: "files",
});

db.SalarySlipFiles.belongsTo(db.SalarySlips, {
  foreignKey: "salary_slip_id",
  targetKey: "salary_slip_id",
  as: "salarySlip",
});

/* ---------- HR Support Models ---------- */

db.HrSupportRequest = require("./hrSupportRequest")(sequelize, DataTypes);

db.HrSupportRequestType = require("./hrSupportRequestType")(
  sequelize,
  DataTypes
);

db.HrSupportStatus = require("./hrSupportStatus")(
  sequelize,
  DataTypes
);

db.HrSupportMessage = require("./hrSupportMessage")(
  sequelize,
  DataTypes
);

db.HrSupportMessageRead = require("./hrSupportMessageRead")(
  sequelize,
  DataTypes
);

db.HrSupportAttachment = require("./hrSupportAttachment")(
  sequelize,
  DataTypes
);

db.HrSupportActivity = require("./hrSupportActivity")(
  sequelize,
  DataTypes
);



/* ---------- HR Support Associations ---------- */

// Request -> Employee
db.HrSupportRequest.belongsTo(db.Personal, {
  foreignKey: "hsr_pr_id",
  as: "employee",
});

// Request -> Request Type
db.HrSupportRequest.belongsTo(db.HrSupportRequestType, {
  foreignKey: "hsr_request_type_id",
  as: "requestType",
});

// Request -> Status
db.HrSupportRequest.belongsTo(db.HrSupportStatus, {
  foreignKey: "hsr_status_id",
  as: "status",
});

// Request -> Assigned HR/User
db.HrSupportRequest.belongsTo(db.Personal, {
  foreignKey: "hsr_assigned_to",
  as: "assignedTo",
});

// Request -> Created By
db.HrSupportRequest.belongsTo(db.Personal, {
  foreignKey: "hsr_created_by",
  as: "createdBy",
});

// Request -> Updated By
db.HrSupportRequest.belongsTo(db.Personal, {
  foreignKey: "hsr_updated_by",
  as: "updatedBy",
});

// Request -> Closed By
db.HrSupportRequest.belongsTo(db.Personal, {
  foreignKey: "hsr_closed_by",
  as: "closedBy",
});

// Request Type -> Created By
db.HrSupportRequestType.belongsTo(db.Personal, {
  foreignKey: "rst_created_by",
  as: "createdBy",
});

// Request Type -> Updated By
db.HrSupportRequestType.belongsTo(db.Personal, {
  foreignKey: "rst_updated_by",
  as: "updatedBy",
});

// Status -> Created By
db.HrSupportStatus.belongsTo(db.Personal, {
  foreignKey: "hss_created_by",
  as: "createdBy",
});

// Status -> Updated By
db.HrSupportStatus.belongsTo(db.Personal, {
  foreignKey: "hss_updated_by",
  as: "updatedBy",
});

// Message -> Request
db.HrSupportMessage.belongsTo(db.HrSupportRequest, {
  foreignKey: "hsm_request_id",
  as: "request",
});

// Message -> Sender
db.HrSupportMessage.belongsTo(db.Personal, {
  foreignKey: "hsm_sender_pr_id",
  as: "sender",
});

// Message Read -> Message
db.HrSupportMessageRead.belongsTo(db.HrSupportMessage, {
  foreignKey: "hsmr_message_id",
  as: "message",
});

// Message Read -> User
db.HrSupportMessageRead.belongsTo(db.Personal, {
  foreignKey: "hsmr_user_id",
  as: "user",
});

// Attachment -> Request
db.HrSupportAttachment.belongsTo(db.HrSupportRequest, {
  foreignKey: "hsa_request_id",
  as: "request",
});

// Attachment -> Message
db.HrSupportAttachment.belongsTo(db.HrSupportMessage, {
  foreignKey: "hsa_message_id",
  as: "message",
});

// Attachment -> Uploaded By
db.HrSupportAttachment.belongsTo(db.Personal, {
  foreignKey: "hsa_uploaded_by",
  as: "uploadedBy",
});

// Activity -> Request
db.HrSupportActivity.belongsTo(db.HrSupportRequest, {
  foreignKey: "hsa_request_id",
  as: "request",
});

// Activity -> Performed By
db.HrSupportActivity.belongsTo(db.Personal, {
  foreignKey: "hsa_performed_by",
  as: "performedBy",
});

// Message -> Read Records
db.HrSupportMessage.hasMany(db.HrSupportMessageRead, {
  foreignKey: "hsmr_message_id",
  as: "readRecords",
});

db.HrSupportMessage.hasMany(db.HrSupportAttachment, {
  foreignKey: "hsa_message_id",
  as: "attachments",
});

module.exports = db;
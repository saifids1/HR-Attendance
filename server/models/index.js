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

module.exports = db;
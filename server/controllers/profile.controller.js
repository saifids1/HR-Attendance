const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { Op, literal, Transaction } = require("sequelize");

const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");

const {
  Personal,
  Organizations,
  Login,
  UserRoleRelation,
  CompaniesMaster,
  VendorMaster,
  DepartmentMaster,
  DesignationMaster,
  EmployeeTypeMaster,
  Education,
  Experience,
  Contact,
  Nominee,
  BankAccount,
  Document,
  Address,
  UserImage,
} = db;

const sendEmail = require("../utils/mailer");
const sendNotification = require("../services/notification.services");
const { syncEmployeeLeaveQuota } = require("../services/LeaveQuotaService");

/* ============================================================
   HELPERS
============================================================ */
const parseDob = (value) => {
  if (!value) return null;
  const v = String(value).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [d, m, y] = v.split("-");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const parsed = new Date(v);
  if (isNaN(parsed.getTime())) throw new Error("Invalid DOB format");
  return parsed.toISOString().split("T")[0];
};

const toDateOnly = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const s = String(v).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split("-");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const p = new Date(s);
  if (isNaN(p.getTime())) return null;
  return p.toISOString().split("T")[0];
};

/* ============================================================
   ORGANIZATION — ADD
============================================================ */
exports.addOrganizationInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const {
      organization_name, organization_location, emp_id, is_active,
      employee_type_id, reporting_location_id, organization_email,
      official_email, official_contact, reporting_to_id,
      department_id, designation_id, joining_date, leaving_date,
      or_company_id, or_vendor_id,
    } = req.body;

    const createdBy = req.user?.id;
    if (!createdBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }
    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    if (or_company_id) {
      const c = await CompaniesMaster.findOne({ where: { cpt_id: or_company_id } });
      if (!c) {
        return res.status(404).json({
          success: false,
          message: `Company with ID ${or_company_id} not found`,
        });
      }
    }

    const personal = await Personal.findOne({
      where: { pr_id: employee_id },
      attributes: ["pr_id", "pr_first_name", "pr_last_name", "pr_email"],
    });
    if (!personal) {
      return res.status(404).json({
        success: false,
        message: `Employee with Pr_Id ${employee_id} not found in personal table`,
      });
    }

    const existingOrg = await Organizations.findOne({
      where: { pr_id: employee_id },
      attributes: ["or_id"],
    });
    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: `Organization information already exists for employee Pr_Id ${employee_id}`,
      });
    }

    if (or_vendor_id) {
      const v = await VendorMaster.findOne({
        where: { id: or_vendor_id, is_active: true },
      });
      if (!v) {
        return res.status(404).json({
          success: false,
          message: `Active vendor with ID ${or_vendor_id} not found`,
        });
      }
    }

    if (emp_id) {
      const dup = await Organizations.findOne({
        where: { or_emp_id: emp_id },
        attributes: ["or_id"],
      });
      if (dup) {
        return res.status(409).json({
          success: false,
          message: `Employee organization ID ${emp_id} already exists`,
        });
      }
    }

    const activeStatus = is_active !== undefined ? is_active : !leaving_date;

    const orgRow = await Organizations.create({
      pr_id: employee_id,
      or_organization_name: organization_name || null,
      or_organization_location: organization_location || null,
      or_emp_id: emp_id || null,
      or_is_active: activeStatus,
      or_created_at: new Date(),
      or_employee_type_id: employee_type_id || null,
      or_reporting_location_id: reporting_location_id || null,
      or_organization_email: organization_email || null,
      or_official_email: official_email || null,
      or_official_contact: official_contact || null,
      or_reporting_to_id: reporting_to_id || null,
      or_department_id: department_id || null,
      or_designation_id: designation_id || null,
      or_joining_date: joining_date || null,
      or_leaving_date: leaving_date || null,
      or_created_by: createdBy,
      or_company_id: or_company_id || null,
      or_vendor_id: or_vendor_id || null,
    });

    syncEmployeeLeaveQuota()
      .then((r) => {
        console.log(`[LEAVE QUOTA ASYNC SYNC] Employee organization created for PR=${employee_id}`);
        console.log(`[LEAVE QUOTA ASYNC SYNC] Created=${r.quotasCreated}, Skipped=${r.quotasSkipped}`);
      })
      .catch((e) => console.error(`[LEAVE QUOTA ASYNC SYNC ERROR] PR=${employee_id}`, e));

    return res.status(201).json({
      success: true,
      message: "Organization information created successfully",
      data: orgRow.toJSON(),
    });
  } catch (error) {
    console.error("Organization POST error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      const isEmpIdDup = (error.fields || {}).or_emp_id;
      return res.status(409).json({
        success: false,
        message: isEmpIdDup
          ? "Organization employee ID already exists"
          : "Organization record already exists",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid related employee or master record",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while creating organization information",
      error: error.message,
    });
  }
};

/* ============================================================
   ORGANIZATION — GET
============================================================ */
exports.getOrganizationInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const org = await Organizations.findOne({
      where: { pr_id: employee_id },
      include: [
        { model: Personal, as: "personal", attributes: ["pr_first_name", "pr_last_name", "pr_email"] },
        { model: CompaniesMaster, as: "company" },
        { model: VendorMaster, as: "vendor" },
        { model: DepartmentMaster, as: "department" },
        { model: DesignationMaster, as: "designation" },
        { model: EmployeeTypeMaster, as: "employeeType" },
      ],
    });

    if (!org) {
      return res.status(404).json({
        success: false,
        message: `Organization information not found for employee Pr_Id ${employee_id}`,
      });
    }

    let reportingOrg = null;
    let reportingPerson = null;
    if (org.or_reporting_to_id) {
      reportingOrg = await Organizations.findOne({
        where: { or_id: org.or_reporting_to_id },
      });
      if (reportingOrg) {
        reportingPerson = await Personal.findOne({
          where: { pr_id: reportingOrg.pr_id },
          attributes: ["pr_first_name", "pr_last_name", "pr_email"],
        });
      }
    }

    const companyData = org.company
      ? {
          id: org.company.cpt_id,
          name: org.company.cpt_name,
          email: org.company.cpt_email,
          contact_number: org.company.cpt_contact_number,
          website: org.company.cpt_website,
          logo_path: org.company.cpt_logopath,
          city_id: org.company.cpt_city_id,
          state_id: org.company.cpt_state_id,
          country_id: org.company.cpt_country_id,
          is_active: org.company.cpt_is_active,
          created_at: org.company.cpt_created_at,
          updated_at: org.company.cpt_updated_at,
        }
      : null;

    const vendorData = org.vendor
      ? {
          id: org.vendor.id,
          vendor_code: org.vendor.vendor_code,
          vendor_name: org.vendor.vendor_name,
          description: org.vendor.description,
          is_active: org.vendor.is_active,
          vendor_email: org.vendor.vendor_email,
          vendor_number: org.vendor.vendor_number,
          created_by: org.vendor.created_by,
          created_at: org.vendor.created_at,
          updated_by: org.vendor.updated_by,
          updated_at: org.vendor.updated_at,
        }
      : null;

    const p = org.personal || {};

    return res.status(200).json({
      success: true,
      organizationData: {
        or_id: org.or_id,
        pr_id: org.pr_id,
        organization_name: org.or_organization_name,
        organization_location: org.or_organization_location,
        emp_id: org.or_emp_id,
        is_active: org.or_is_active,
        employee_type_id: org.or_employee_type_id,
        reporting_location_id: org.or_reporting_location_id,
        organization_email: org.or_organization_email,
        official_email: org.or_official_email,
        official_contact: org.or_official_contact,
        reporting_to_id: org.or_reporting_to_id,
        department_id: org.or_department_id,
        designation_id: org.or_designation_id,
        joining_date: org.or_joining_date,
        leaving_date: org.or_leaving_date,
        created_at: org.or_created_at,
        updated_at: org.or_updated_at,
        created_by: org.or_created_by,
        updated_by: org.or_updated_by,
        or_company_id: org.or_company_id,
        company: companyData,
        or_vendor_id: org.or_vendor_id,
        vendor: vendorData,
        employee: {
          first_name: p.pr_first_name,
          last_name: p.pr_last_name,
          email: p.pr_email,
        },
        reporting_to: org.or_reporting_to_id
          ? {
              or_id: reportingOrg?.or_id ?? null,
              pr_id: reportingOrg?.pr_id ?? null,
              emp_id: reportingOrg?.or_emp_id ?? null,
              first_name: reportingPerson?.pr_first_name ?? null,
              last_name: reportingPerson?.pr_last_name ?? null,
              email: reportingPerson?.pr_email ?? null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get Organization Info error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching organization information",
      error: error.message,
    });
  }
};

/* ============================================================
   ORGANIZATION — UPDATE (upsert)
============================================================ */
exports.updateOrganizationInfo = async (req, res) => {
  const { employee_id } = req.params;
  const t = await sequelize.transaction();
  try {
    const {
      organization_name, organization_location, emp_id, is_active,
      employee_type_id, reporting_location_id, organization_email,
      official_email, official_contact, reporting_to_id,
      department_id, designation_id, joining_date, leaving_date,
      or_company_id, or_vendor_id,
    } = req.body;

    const updatedBy = req.user?.id;
    if (!updatedBy) {
      await t.rollback();
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }
    if (!employee_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }
    const employeeId = parseInt(employee_id, 10);
    if (isNaN(employeeId)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Invalid Employee ID" });
    }

    if (or_company_id) {
      const c = await CompaniesMaster.findOne({ where: { cpt_id: or_company_id }, transaction: t });
      if (!c) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `Company with ID ${or_company_id} not found`,
        });
      }
    }

    if (or_vendor_id) {
      const v = await VendorMaster.findOne({
        where: { id: or_vendor_id, is_active: true },
        transaction: t,
      });
      if (!v) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `Active vendor with ID ${or_vendor_id} not found`,
        });
      }
    }

    const personal = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
      transaction: t,
    });
    if (!personal) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: `Employee with Pr_Id ${employeeId} not found`,
      });
    }

    const finalIsActive =
      is_active !== undefined ? is_active : leaving_date ? false : true;

    const existing = await Organizations.findOne({
      where: { pr_id: employeeId },
      transaction: t,
    });

    let orgRow;
    let message;
    let operation;

    if (existing) {
      await existing.update(
        {
          or_organization_name: organization_name,
          or_organization_location: organization_location,
          or_emp_id: emp_id,
          or_is_active: finalIsActive,
          or_employee_type_id: employee_type_id || null,
          or_reporting_location_id: reporting_location_id || null,
          or_organization_email: organization_email,
          or_official_email: official_email,
          or_official_contact: official_contact,
          or_reporting_to_id: reporting_to_id || null,
          or_department_id: department_id || null,
          or_designation_id: designation_id || null,
          or_joining_date: joining_date || null,
          or_leaving_date: leaving_date || null,
          or_updated_at: new Date(),
          or_updated_by: updatedBy,
          or_company_id: or_company_id || null,
          or_vendor_id: or_vendor_id || null,
        },
        { transaction: t }
      );
      orgRow = existing;
      message = "Organization information updated successfully";
      operation = "updated";
    } else {
      orgRow = await Organizations.create(
        {
          pr_id: employeeId,
          or_organization_name: organization_name,
          or_organization_location: organization_location,
          or_emp_id: emp_id,
          or_is_active: finalIsActive,
          or_employee_type_id: employee_type_id || null,
          or_reporting_location_id: reporting_location_id || null,
          or_organization_email: organization_email,
          or_official_email: official_email,
          or_official_contact: official_contact,
          or_reporting_to_id: reporting_to_id || null,
          or_department_id: department_id || null,
          or_designation_id: designation_id || null,
          or_joining_date: joining_date || null,
          or_leaving_date: leaving_date || null,
          or_created_at: new Date(),
          or_created_by: updatedBy,
          or_updated_at: new Date(),
          or_updated_by: updatedBy,
          or_company_id: or_company_id || null,
          or_vendor_id: or_vendor_id || null,
        },
        { transaction: t }
      );
      message = "Organization information created successfully";
      operation = "created";
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message,
      operation,
      organizationData: orgRow.toJSON(),
    });
  } catch (error) {
    await t.rollback();
    console.error("Upsert Organization Error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      const isEmpIdDup = (error.fields || {}).or_emp_id;
      return res.status(409).json({
        success: false,
        message: isEmpIdDup
          ? "Employee organization ID already exists"
          : "Duplicate value already exists",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference value provided",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   PERSONAL — ADD
============================================================ */
exports.addPersonInfo = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      employee_id, dob, first_name, last_name, email, contact,
      nationality_id, gender_id, marital_status_id, blood_group_id, password,
    } = req.body;

    const createdBy = req.user?.id;
    if (!createdBy) {
      await t.rollback();
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }
    if (!first_name || !last_name || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required fields",
      });
    }
    if (String(password).length < 6) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    let formattedDob;
    try {
      formattedDob = parseDob(dob);
    } catch {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid DOB format. Use YYYY-MM-DD or DD-MM-YYYY",
      });
    }

    const emailExists = await Personal.findOne({
      where: literal(
        `LOWER("personal"."pr_email") = LOWER(${sequelize.escape(email.trim())})`
      ),
      transaction: t,
    });
    if (emailExists) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Email already exists in the system",
      });
    }

    let newEmployeeId;
    if (employee_id) {
      const exists = await Personal.findOne({
        where: { pr_id: employee_id },
        transaction: t,
      });
      if (exists) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: `Employee ID ${employee_id} already exists`,
        });
      }
      newEmployeeId = Number(employee_id);

      await sequelize.query(
        `SELECT setval('personal_pr_id_seq'::regclass,
          GREATEST((SELECT COALESCE(MAX(pr_id), 0) FROM personal), :val))`,
        { replacements: { val: newEmployeeId }, transaction: t }
      );
    } else {
      const [{ nextval }] = await sequelize.query(
        `SELECT nextval('personal_pr_id_seq'::regclass) AS nextval`,
        { type: sequelize.QueryTypes.SELECT, transaction: t }
      );
      newEmployeeId = Number(nextval);
    }

    const personalRow = await Personal.create(
      {
        pr_id: newEmployeeId,
        pr_email: email.trim().toLowerCase(),
        pr_first_name: first_name.trim(),
        pr_last_name: last_name.trim(),
        pr_dob: formattedDob,
        pr_contact: contact ? String(contact).trim() : null,
        pr_gender_id: gender_id || null,
        pr_blood_group_id: blood_group_id || null,
        pr_marital_status_id: marital_status_id || null,
        pr_nationality_id: nationality_id || null,
        pr_is_active: true,
        pr_created_at: new Date(),
        pr_created_by: createdBy,
      },
      { transaction: t }
    );

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const loginRow = await Login.create(
      {
        pr_id: newEmployeeId,
        lg_password: hashedPassword,
        lg_created_by: createdBy,
        lg_created_at: new Date(),
      },
      { transaction: t }
    );

    const maxRlRow = await UserRoleRelation.findOne({
      attributes: [[literal(`COALESCE(MAX("rl_id"), 0) + 1`), "next_rl_id"]],
      raw: true,
      transaction: t,
    });
    const nextRlId = Number(maxRlRow?.next_rl_id || 1);

    const roleRow = await UserRoleRelation.create(
      {
        rl_id: nextRlId,
        pr_id: newEmployeeId,
        rl_role_id: 3,
        rl_created_by: createdBy,
        rl_created_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    const personalJson = personalRow.toJSON();
    return res.status(201).json({
      success: true,
      message: "Personal details, login credentials, and role assigned successfully",
      employee_id: newEmployeeId,
      created_by: createdBy,
      personalDetails: {
        pr_id: personalJson.pr_id,
        pr_email: personalJson.pr_email,
        pr_first_name: personalJson.pr_first_name,
        pr_last_name: personalJson.pr_last_name,
        pr_dob: personalJson.pr_dob,
        pr_contact: personalJson.pr_contact,
        pr_gender_id: personalJson.pr_gender_id,
        pr_blood_group_id: personalJson.pr_blood_group_id,
        pr_marital_status_id: personalJson.pr_marital_status_id,
        pr_nationality_id: personalJson.pr_nationality_id,
        pr_is_active: personalJson.pr_is_active,
        pr_created_at: personalJson.pr_created_at,
        pr_created_by: personalJson.pr_created_by,
      },
      loginDetails: {
        login_id: loginRow.lg_id,
        employee_id: loginRow.pr_id,
        created_at: loginRow.lg_created_at,
      },
      roleDetails: {
        role_relation_id: roleRow.rl_id,
        employee_id: roleRow.pr_id,
        role_id: roleRow.rl_role_id,
        created_by: roleRow.rl_created_by,
        created_at: roleRow.rl_created_at,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Personal POST error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      const f = error.fields || {};
      if (f.pr_id) return res.status(409).json({ success: false, message: "Employee ID already exists", error: error.message });
      if (f.pr_email) return res.status(409).json({ success: false, message: "Email already exists in the system", error: error.message });
      if (f.lg_id) return res.status(409).json({ success: false, message: "Login ID already exists", error: error.message });
      return res.status(409).json({ success: false, message: "A record with this value already exists", error: error.message });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({ success: false, message: "Invalid related record", error: error.message });
    }
    if (error.name === "SequelizeDatabaseError" && error.parent?.code === "22007") {
      return res.status(400).json({
        success: false,
        message: "Invalid DOB format. Use YYYY-MM-DD or DD-MM-YYYY",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while creating personal details",
      error: error.message,
    });
  }
};

/* ============================================================
   PERSONAL — GET
============================================================ */
exports.getPersonalInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    if (!employee_id) {
      return res.status(400).json({ message: "Employee ID is required" });
    }

    const p = await Personal.findOne({
      where: { pr_id: employee_id },
      include: [
        {
          model: Login,
          as: "login",
          required: false,
          attributes: ["lg_id", "lg_created_by", "lg_updated_by", "lg_created_at", "lg_updated_at"],
        },
      ],
    });

    if (!p) {
      return res.status(404).json({
        message: `Employee with ID ${employee_id} not found`,
      });
    }

    const employeeData = {
      employee_id: p.pr_id,
      email: p.pr_email,
      first_name: p.pr_first_name,
      last_name: p.pr_last_name,
      date_of_birth: p.pr_dob ? String(p.pr_dob).slice(0, 10) : null,
      gender_id: p.pr_gender_id,
      blood_group_id: p.pr_blood_group_id,
      marital_status_id: p.pr_marital_status_id,
      nationality_id: p.pr_nationality_id,
      is_active: p.pr_is_active,
      contact: p.pr_contact,
      created_at: p.pr_created_at,
      created_by: p.pr_created_by,
      updated_at: p.pr_updated_at,
      updated_by: p.pr_updated_by,
      login: p.login
        ? {
            login_id: p.login.lg_id,
            login_created_at: p.login.lg_created_at,
            login_updated_at: p.login.lg_updated_at,
            login_created_by: p.login.lg_created_by,
            login_updated_by: p.login.lg_updated_by,
          }
        : null,
    };

    return res.status(200).json({ success: true, data: employeeData });
  } catch (error) {
    console.error("Get Personal Info error:", error);

    if (error.name === "SequelizeDatabaseError" && error.parent?.code === "22P02") {
      return res.status(400).json({
        message: "Invalid employee ID format",
        error: error.message,
      });
    }

    return res.status(500).json({
      message: "Server error while fetching personal details",
      error: error.message,
    });
  }
};

/* ============================================================
   PERSONAL — UPDATE
============================================================ */
exports.updatePersonalInfo = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { employee_id } = req.params;
    const {
      first_name, last_name, email, dob, contact,
      gender_id, marital_status_id, nationality_id,
      blood_group_id, password, is_active,
    } = req.body;

    if (!employee_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }
    if (!first_name || !last_name || !email) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "First name, last name and email are required",
      });
    }

    const updatedBy = req.user?.id;
    if (!updatedBy) {
      await t.rollback();
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const formattedDob = toDateOnly(dob);

    const p = await Personal.findOne({
      where: { pr_id: employee_id },
      transaction: t,
    });
    if (!p) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employee_id} not found`,
      });
    }

    const emailDup = await Personal.findOne({
      where: literal(
        `LOWER("personal"."pr_email") = LOWER(${sequelize.escape(
          email.trim()
        )}) AND "personal"."pr_id" <> ${Number(employee_id)}`
      ),
      transaction: t,
    });
    if (emailDup) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Email already exists in the system",
      });
    }

    p.pr_first_name = first_name.trim();
    p.pr_last_name = last_name.trim();
    p.pr_email = email.trim().toLowerCase();
    if (formattedDob !== null) p.pr_dob = formattedDob;
    if (contact !== undefined && contact !== null) p.pr_contact = String(contact).trim();
    if (gender_id) p.pr_gender_id = gender_id;
    if (marital_status_id) p.pr_marital_status_id = marital_status_id;
    if (nationality_id) p.pr_nationality_id = nationality_id;
    if (blood_group_id) p.pr_blood_group_id = blood_group_id;
    if (is_active !== undefined && is_active !== null) p.pr_is_active = is_active;
    p.pr_updated_at = new Date();
    p.pr_updated_by = updatedBy;
    await p.save({ transaction: t });

    let passwordUpdated = false;
    let loginData = null;

    if (password !== undefined && password !== null && String(password).trim() !== "") {
      if (String(password).length < 6) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const hashedPassword = await bcrypt.hash(String(password), 10);

      const existingLogin = await Login.findOne({
        where: { pr_id: employee_id },
        transaction: t,
      });

      if (existingLogin) {
        existingLogin.lg_password = hashedPassword;
        existingLogin.lg_updated_by = updatedBy;
        existingLogin.lg_updated_at = new Date();
        await existingLogin.save({ transaction: t });
        loginData = existingLogin;
      } else {
        loginData = await Login.create(
          {
            pr_id: employee_id,
            lg_password: hashedPassword,
            lg_created_by: updatedBy,
            lg_updated_by: updatedBy,
            lg_created_at: new Date(),
            lg_updated_at: new Date(),
          },
          { transaction: t }
        );
      }
      passwordUpdated = true;
    }

    await t.commit();

    const response = {
      success: true,
      message: "Personal details updated successfully",
      data: {
        employee_id: p.pr_id,
        email: p.pr_email,
        first_name: p.pr_first_name,
        last_name: p.pr_last_name,
        date_of_birth: p.pr_dob ? String(p.pr_dob).slice(0, 10) : null,
        contact: p.pr_contact,
        gender_id: p.pr_gender_id,
        blood_group_id: p.pr_blood_group_id,
        marital_status_id: p.pr_marital_status_id,
        nationality_id: p.pr_nationality_id,
        profile_image: p.pr_profile_image,
        is_active: p.pr_is_active,
        created_at: p.pr_created_at,
        updated_at: p.pr_updated_at,
        created_by: p.pr_created_by,
        updated_by: p.pr_updated_by,
      },
      password_updated: passwordUpdated,
      updated_by: updatedBy,
    };

    if (passwordUpdated && loginData) {
      response.login = {
        login_id: loginData.lg_id,
        employee_id: loginData.pr_id,
        updated_at: loginData.lg_updated_at,
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    await t.rollback();
    console.error("Update Personal Info Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Email already exists in the system",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid related record",
        error: error.message,
      });
    }
    if (error.name === "SequelizeDatabaseError" && error.parent?.code === "22007") {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth format. Use YYYY-MM-DD or DD-MM-YYYY",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while updating personal details",
      error: error.message,
    });
  }
};

/* ============================================================
   EDUCATION — ADD
============================================================ */
exports.addEducationInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const createdBy = req.user?.id;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }
    if (!createdBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employee_id },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employee_id} not found`,
      });
    }

    let educationArray = [];

    if (typeof req.body.education === "string") {
      try {
        educationArray = JSON.parse(req.body.education);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid education JSON format" });
      }
    } else if (Array.isArray(req.body.education)) {
      educationArray = req.body.education;
    } else if (Array.isArray(req.body)) {
      educationArray = req.body;
    } else if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      educationArray = [req.body];
    }

    if (!educationArray.length) {
      return res.status(400).json({ success: false, message: "Education data is required" });
    }

    const inserted = [];
    for (const edu of educationArray) {
      const row = await Education.create({
        pr_id: employee_id,
        ed_field_of_study: edu.field_of_study || null,
        ed_institution_name: edu.institution_name || null,
        ed_university: edu.university || null,
        ed_percentage_or_grade: edu.percentage_or_grade || null,
        ed_passing_year: edu.passing_year || null,
        ed_degree_id: edu.degree_id || null,
        ed_created_by: createdBy,
        ed_created_at: new Date(),
      });
      inserted.push(row.toJSON());
    }

    return res.status(201).json({
      success: true,
      message: "Education added successfully",
      employee_id: Number(employee_id),
      created_by: createdBy,
      education: inserted,
    });
  } catch (error) {
    console.error("Add Education Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding education",
      error: error.message,
    });
  }
};

/* ============================================================
   EDUCATION — GET
============================================================ */
exports.getEducationInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const empIdInt = parseInt(employee_id, 10);

    if (isNaN(empIdInt)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: empIdInt },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${empIdInt} not found`,
      });
    }

    const rows = await Education.findAll({
      where: { pr_id: empIdInt },
      order: [
        [literal(`"education"."ed_passing_year" DESC NULLS LAST`)],
        ["ed_id", "DESC"],
      ],
    });

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "No education records found",
        employee_id: empIdInt,
        education: [],
      });
    }

    return res.status(200).json({
      success: true,
      employee_id: empIdInt,
      total: rows.length,
      education: rows.map((r) => ({
        id: r.ed_id,
        employee_id: r.pr_id,
        field_of_study: r.ed_field_of_study,
        institution_name: r.ed_institution_name,
        university: r.ed_university,
        percentage_or_grade: r.ed_percentage_or_grade,
        passing_year: r.ed_passing_year,
        degree_id: r.ed_degree_id,
        created_by: r.ed_created_by,
        updated_by: r.ed_updated_by,
        created_at: r.ed_created_at,
        updated_at: r.ed_updated_at,
      })),
    });
  } catch (error) {
    console.error("Get Education Info Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching education information",
      error: error.message,
    });
  }
};

/* ============================================================
   EDUCATION — UPDATE / UPSERT
============================================================ */
exports.updateEducationInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    let educationEntries;
    if (typeof req.body.education === "string") {
      try {
        educationEntries = JSON.parse(req.body.education);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid education JSON format" });
      }
    } else if (Array.isArray(req.body.education)) {
      educationEntries = req.body.education;
    } else if (Array.isArray(req.body)) {
      educationEntries = req.body;
    } else {
      return res.status(400).json({ success: false, message: "Education data is required" });
    }

    if (!Array.isArray(educationEntries) || educationEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Education data must contain at least one record",
      });
    }

    const processedEducation = [];

    for (let i = 0; i < educationEntries.length; i++) {
      const edu = educationEntries[i];

      if (!edu || typeof edu !== "object") {
        return res.status(400).json({
          success: false,
          message: `Invalid education data at row ${i + 1}`,
        });
      }

      const {
        Ed_Id, id, degree_id, field_of_study,
        institution_name, university, percentage_or_grade, passing_year,
      } = edu;

      if (!degree_id) {
        return res.status(400).json({
          success: false,
          message: `Degree ID is required for education row ${i + 1}`,
        });
      }

      let educationId = null;
      if (Ed_Id || id) {
        educationId = parseInt(Ed_Id || id, 10);
        if (isNaN(educationId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid education ID at row ${i + 1}`,
          });
        }
      }

      if (!educationId) {
        const existing = await Education.findOne({
          where: {
            pr_id: employeeId,
            ed_degree_id: degree_id,
            [Op.and]: literal(
              `"education"."ed_passing_year" IS NOT DISTINCT FROM ${
                passing_year === undefined || passing_year === null || passing_year === ""
                  ? "NULL"
                  : Number(passing_year)
              }`
            ),
          },
          order: [["ed_id", "DESC"]],
        });
        if (existing) educationId = existing.ed_id;
      }

      if (educationId) {
        const existing = await Education.findOne({
          where: { ed_id: educationId, pr_id: employeeId },
        });

        if (!existing) {
          return res.status(404).json({
            success: false,
            message: `Education record with ID ${educationId} was not found for employee ${employeeId}`,
          });
        }

        await existing.update({
          ed_degree_id: degree_id,
          ed_field_of_study: field_of_study || null,
          ed_institution_name: institution_name || null,
          ed_university: university || null,
          ed_percentage_or_grade: percentage_or_grade || null,
          ed_passing_year: passing_year || null,
          ed_updated_by: updatedBy,
          ed_updated_at: new Date(),
        });

        processedEducation.push({ action: "updated", data: existing.toJSON() });
      } else {
        const created = await Education.create({
          pr_id: employeeId,
          ed_field_of_study: field_of_study || null,
          ed_institution_name: institution_name || null,
          ed_university: university || null,
          ed_percentage_or_grade: percentage_or_grade || null,
          ed_passing_year: passing_year || null,
          ed_degree_id: degree_id,
          ed_created_by: updatedBy,
          ed_created_at: new Date(),
        });

        processedEducation.push({ action: "created", data: created.toJSON() });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Education information processed successfully",
      employee_id: employeeId,
      updated_by: updatedBy,
      education: processedEducation,
    });
  } catch (error) {
    console.error("Education Upsert Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid reference value. Please check employee or degree ID.",
        error: error.message,
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate education record.",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while processing education information",
      error: error.message,
    });
  }
};

/* ============================================================
   EDUCATION — DELETE
============================================================ */
exports.deleteEducationInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const educationId = Number(id);

    if (isNaN(educationId)) {
      return res.status(400).json({ message: "Invalid Education ID format" });
    }

    const deleted = await Education.destroy({
      where: { ed_id: educationId, pr_id: employee_id },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: "Record not found or already deleted" });
    }

    return res.status(200).json({
      success: true,
      message: "Education record deleted successfully",
    });
  } catch (error) {
    console.error(
      `[ERROR] Delete Education (Emp: ${req.params.employee_id}, ID: ${req.params.id}):`,
      error
    );
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   EXPERIENCE — ADD
============================================================ */
exports.addExperienceInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const {
      company_name, start_date, end_date, total_years, location, designation_id,
    } = req.body;

    const createdBy = req.user?.id;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }
    if (!createdBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    if (start_date) {
      const s = new Date(start_date);
      if (isNaN(s.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid start date format" });
      }
    }
    if (end_date) {
      const e = new Date(end_date);
      if (isNaN(e.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid end date format" });
      }
    }
    if (start_date && end_date) {
      if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be earlier than start date",
        });
      }
    }

    const row = await Experience.create({
      pr_id: employeeId,
      ex_company_name: company_name?.trim() || null,
      ex_start_date: start_date || null,
      ex_end_date: end_date || null,
      ex_total_years: total_years || null,
      ex_location: location?.trim() || null,
      ex_designation_id: designation_id || null,
      ex_created_by: createdBy,
      ex_created_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Experience created successfully",
      employee_id: employeeId,
      created_by: createdBy,
      experience: row.toJSON(),
    });
  } catch (error) {
    console.error("Create Experience Error:", error);
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or designation reference",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while creating experience",
      error: error.message,
    });
  }
};

/* ============================================================
   EXPERIENCE — GET
============================================================ */
exports.getExperienceInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const rows = await Experience.findAll({
      where: { pr_id: employeeId },
      order: [
        [literal(`"experience"."ex_start_date" DESC NULLS LAST`)],
        ["ex_id", "DESC"],
      ],
    });

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      total: rows.length,
      experience: rows.map((r) => ({
        experience_id: r.ex_id,
        employee_id: r.pr_id,
        company_name: r.ex_company_name,
        start_date: r.ex_start_date,
        end_date: r.ex_end_date,
        total_years: r.ex_total_years,
        location: r.ex_location,
        designation_id: r.ex_designation_id,
        created_by: r.ex_created_by,
        updated_by: r.ex_updated_by,
        created_at: r.ex_created_at,
        updated_at: r.ex_updated_at,
      })),
    });
  } catch (error) {
    console.error("Get Experience Info Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching experience information",
      error: error.message,
    });
  }
};

/* ============================================================
   EXPERIENCE — UPDATE / UPSERT
============================================================ */
exports.updateExperienceInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const experienceId = id ? parseInt(id, 10) : null;
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }
    if (id && isNaN(experienceId)) {
      return res.status(400).json({ success: false, message: "Invalid Experience ID" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const {
      company_name, designation_id, start_date, end_date, total_years, location,
    } = req.body;

    if (start_date && end_date) {
      const s = new Date(start_date);
      const e = new Date(end_date);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid date format" });
      }
      if (e < s) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be earlier than start date",
        });
      }
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    if (experienceId) {
      const existing = await Experience.findOne({
        where: { ex_id: experienceId, pr_id: employeeId },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Experience record with ID ${experienceId} was not found for employee ${employeeId}`,
        });
      }

      await existing.update({
        ex_company_name: company_name ? company_name.trim() : null,
        ex_designation_id: designation_id || null,
        ex_start_date: start_date || null,
        ex_end_date: end_date || null,
        ex_total_years: total_years || null,
        ex_location: location ? location.trim() : null,
        ex_updated_by: updatedBy,
        ex_updated_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Experience updated successfully",
        employee_id: employeeId,
        experience_id: experienceId,
        updated_by: updatedBy,
        action: "updated",
        experience: existing.toJSON(),
      });
    }

    const created = await Experience.create({
      pr_id: employeeId,
      ex_company_name: company_name ? company_name.trim() : null,
      ex_designation_id: designation_id || null,
      ex_start_date: start_date || null,
      ex_end_date: end_date || null,
      ex_total_years: total_years || null,
      ex_location: location ? location.trim() : null,
      ex_created_by: updatedBy,
      ex_created_at: new Date(),
      ex_updated_by: updatedBy,
      ex_updated_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Experience created successfully",
      employee_id: employeeId,
      experience_id: created.ex_id,
      updated_by: updatedBy,
      action: "created",
      experience: created.toJSON(),
    });
  } catch (error) {
    console.error("Experience Upsert Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or designation reference",
        error: error.message,
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Duplicate experience record",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while processing experience",
      error: error.message,
    });
  }
};

/* ============================================================
   EXPERIENCE — DELETE
============================================================ */
exports.deleteExperienceInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const experienceId = Number(id);

    if (isNaN(experienceId)) {
      return res.status(400).json({ message: "Invalid Experience ID" });
    }

    const existing = await Experience.findOne({
      where: { ex_id: experienceId, pr_id: employee_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Experience not found" });
    }

    const deletedJson = existing.toJSON();
    await existing.destroy();

    return res.status(200).json({
      success: true,
      message: "Experience deleted successfully",
      deletedExperience: deletedJson,
    });
  } catch (error) {
    console.error("Delete experience error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   CONTACT — GET
============================================================ */
exports.getContactInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const rows = await Contact.findAll({
      where: { pr_id: employeeId },
      order: [
        [literal(`"contact"."ct_is_primary" DESC NULLS LAST`)],
        ["ct_id", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      total: rows.length,
      contacts: rows.map((r) => ({
        contact_id: r.ct_id,
        employee_id: r.pr_id,
        phone: r.ct_phone,
        email: r.ct_email,
        relation: r.ct_relation,
        is_primary: r.ct_is_primary,
        contact_type_id: r.ct_contact_type_id,
        created_by: r.ct_created_by,
        updated_by: r.ct_updated_by,
        created_at: r.ct_created_at,
        updated_at: r.ct_updated_at,
      })),
    });
  } catch (error) {
    console.error("Get Contact Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching contact information",
      error: error.message,
    });
  }
};

/* ============================================================
   CONTACT — ADD (replace-all in transaction)
============================================================ */
exports.addContactInfo = async (req, res) => {
  const { employee_id } = req.params;
  const createdBy = req.user?.id;
  const t = await sequelize.transaction();

  try {
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }
    if (!createdBy) {
      await t.rollback();
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
      transaction: t,
    });
    if (!employeeCheck) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const incomingContacts = Array.isArray(req.body) ? req.body : [req.body];
    if (!incomingContacts.length) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Contact data is required" });
    }

    const existingContacts = await Contact.findAll({
      where: { pr_id: employeeId },
      attributes: ["ct_phone", "ct_email", "ct_relation", "ct_is_primary", "ct_contact_type_id"],
      raw: true,
      transaction: t,
    });

    const updatedList = [...existingContacts, ...incomingContacts];

    const primaryContacts = updatedList.filter(
      (c) => c.Ct_Is_Primary === true || c.ct_is_primary === true || c.is_primary === true
    );
    if (primaryContacts.length > 1) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Only one contact can be marked as primary.",
      });
    }

    const emails = updatedList
      .map((c) => (c.Ct_Email || c.ct_email || c.email || "").trim().toLowerCase())
      .filter(Boolean);
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Duplicate emails found in contact list.",
      });
    }

    await Contact.destroy({ where: { pr_id: employeeId }, transaction: t });

    for (const c of updatedList) {
      const phone = c.Ct_Phone || c.ct_phone || c.phone || null;
      const email = (c.Ct_Email || c.ct_email || c.email || "").trim().toLowerCase() || null;
      const relation = c.Ct_Relation || c.ct_relation || c.relation || null;
      const isPrimary = c.Ct_Is_Primary ?? c.ct_is_primary ?? c.is_primary ?? false;
      const contactTypeId = c.Ct_Contact_Type_Id || c.ct_contact_type_id || c.contact_type_id || null;

      await Contact.create(
        {
          pr_id: employeeId,
          ct_phone: phone,
          ct_email: email,
          ct_relation: relation,
          ct_is_primary: isPrimary,
          ct_contact_type_id: contactTypeId,
          ct_created_by: createdBy,
          ct_created_at: new Date(),
        },
        { transaction: t }
      );
    }

    await t.commit();

    const rows = await Contact.findAll({
      where: { pr_id: employeeId },
      order: [
        [literal(`"contact"."ct_is_primary" DESC`)],
        ["ct_id", "ASC"],
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Contact added successfully",
      employee_id: employeeId,
      created_by: createdBy,
      contacts: rows.map((r) => ({
        id: r.ct_id,
        employee_id: r.pr_id,
        phone: r.ct_phone,
        email: r.ct_email,
        relation: r.ct_relation,
        is_primary: r.ct_is_primary,
        contact_type_id: r.ct_contact_type_id,
        created_by: r.ct_created_by,
        created_at: r.ct_created_at,
      })),
    });
  } catch (error) {
    await t.rollback();
    console.error("Add Contact Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Email already exists in contact records.",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID or contact type ID.",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   CONTACT — UPDATE / UPSERT (per-row)
============================================================ */
exports.updateContactInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid Employee ID is required" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const contacts = Array.isArray(req.body) ? req.body : [req.body];

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const results = [];

    for (const contact of contacts) {
      const { ct_id, phone, email, relation, is_primary, contact_type_id } = contact;

      const contactId = ct_id ? parseInt(ct_id, 10) : null;
      if (ct_id && isNaN(contactId)) {
        return res.status(400).json({ success: false, message: "Invalid Contact ID" });
      }

      const phoneValue = phone !== undefined && phone !== null ? String(phone).trim() : null;
      const emailValue =
        email !== undefined && email !== null ? String(email).trim().toLowerCase() : null;
      const relationValue =
        relation !== undefined && relation !== null ? String(relation).trim() : null;
      const isPrimaryValue = is_primary ?? false;
      const contactTypeValue = contact_type_id || null;

      if (contactId) {
        const existing = await Contact.findOne({
          where: { ct_id: contactId, pr_id: employeeId },
        });

        if (!existing) {
          return res.status(404).json({
            success: false,
            message: `Contact record with ID ${contactId} was not found for employee ${employeeId}`,
          });
        }

        await existing.update({
          ct_phone: phoneValue,
          ct_email: emailValue,
          ct_relation: relationValue,
          ct_is_primary: isPrimaryValue,
          ct_contact_type_id: contactTypeValue,
          ct_updated_by: updatedBy,
          ct_updated_at: new Date(),
        });

        results.push({
          action: "updated",
          contact_id: contactId,
          contact: existing.toJSON(),
        });
      } else {
        const created = await Contact.create({
          pr_id: employeeId,
          ct_phone: phoneValue,
          ct_email: emailValue,
          ct_relation: relationValue,
          ct_is_primary: isPrimaryValue,
          ct_contact_type_id: contactTypeValue,
          ct_created_by: updatedBy,
          ct_created_at: new Date(),
          ct_updated_by: updatedBy,
          ct_updated_at: new Date(),
        });

        results.push({
          action: "created",
          contact_id: created.ct_id,
          contact: created.toJSON(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Contact information processed successfully",
      employee_id: employeeId,
      updated_by: updatedBy,
      results,
    });
  } catch (error) {
    console.error("Contact Upsert Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Contact email already exists",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or contact type reference",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while processing contact information",
      error: error.message,
    });
  }
};

/* ============================================================
   CONTACT — DELETE
============================================================ */
exports.deleteContactInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const contactId = Number(id);

    if (isNaN(contactId)) {
      return res.status(400).json({ message: "Invalid Contact ID" });
    }

    const existing = await Contact.findOne({
      where: { ct_id: contactId, pr_id: employee_id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Contact not found" });
    }

    const deletedJson = existing.toJSON();
    await existing.destroy();

    return res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
      deletedExperience: deletedJson,
    });
  } catch (error) {
    console.error("Delete Contact error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
/* ============================================================
   NOMINEE — GET
============================================================ */
exports.getNomineeInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    const rows = await Nominee.findAll({
      where: { pr_id: employeeId },
      order: [["nm_id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      total: rows.length,
      nominee: rows.map((r) => ({
        id: r.nm_id,
        employee_id: r.pr_id,
        nominee_name: r.nm_nominee_name,
        nominee_relation: r.nm_nominee_relation,
        nominee_contact: r.nm_nominee_contact,
        nominee_percentage: r.nm_nominee_percentage,
        created_by: r.nm_created_by,
        updated_by: r.nm_updated_by,
        created_at: r.nm_created_at,
        updated_at: r.nm_updated_at,
      })),
    });
  } catch (error) {
    console.error("Get Nominee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   NOMINEE — ADD (bulk with validation)
============================================================ */
exports.addNomineeInfo = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const createdBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (!createdBy) {
      await t.rollback();
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
      transaction: t,
    });
    if (!employeeCheck) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const { nominees } = req.body;
    if (!Array.isArray(nominees) || nominees.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Nominees array is required" });
    }

    // Existing total
    const existingSum = await Nominee.sum("nm_nominee_percentage", {
      where: { pr_id: employeeId },
      transaction: t,
    });
    const existingTotal = Number(existingSum || 0);

    let incomingTotal = 0;

    // Validate percentages & contact
    for (const nominee of nominees) {
      const contact = nominee.nominee_contact;
      if (contact !== undefined && contact !== null && String(contact).trim() !== "") {
        const contactStr = String(contact).trim();
        if (!/^[0-9]{10}$/.test(contactStr)) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Nominee contact must be exactly 10 digits",
          });
        }
      }

      const pct = nominee.nominee_percentage;
      if (pct !== undefined && pct !== null && String(pct).trim() !== "") {
        const percentage = Number(pct);
        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Nominee percentage must be between 1 and 100",
          });
        }
        incomingTotal += percentage;
      }
    }

    if (existingTotal + incomingTotal > 100) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Only ${100 - existingTotal}% percentage is remaining`,
      });
    }

    // Duplicate contact check
    for (const nominee of nominees) {
      const contact = nominee.nominee_contact;
      if (contact !== undefined && contact !== null && String(contact).trim() !== "") {
        const contactStr = String(contact).trim();
        const dup = await Nominee.findOne({
          where: { pr_id: employeeId, nm_nominee_contact: contactStr },
          transaction: t,
        });
        if (dup) {
          await t.rollback();
          return res.status(409).json({
            success: false,
            message: `Nominee with contact ${contactStr} already exists`,
          });
        }
      }
    }

    const inserted = [];
    for (const nominee of nominees) {
      const nomineeName =
        nominee.nominee_name !== undefined &&
        nominee.nominee_name !== null &&
        String(nominee.nominee_name).trim() !== ""
          ? String(nominee.nominee_name).trim()
          : null;

      const nomineeRelation =
        nominee.nominee_relation !== undefined &&
        nominee.nominee_relation !== null &&
        String(nominee.nominee_relation).trim() !== ""
          ? String(nominee.nominee_relation).trim()
          : null;

      const nomineeContact =
        nominee.nominee_contact !== undefined &&
        nominee.nominee_contact !== null &&
        String(nominee.nominee_contact).trim() !== ""
          ? String(nominee.nominee_contact).trim()
          : null;

      const nomineePercentage =
        nominee.nominee_percentage !== undefined &&
        nominee.nominee_percentage !== null &&
        String(nominee.nominee_percentage).trim() !== ""
          ? Number(nominee.nominee_percentage)
          : null;

      const row = await Nominee.create(
        {
          pr_id: employeeId,
          nm_nominee_name: nomineeName,
          nm_nominee_relation: nomineeRelation,
          nm_nominee_contact: nomineeContact,
          nm_nominee_percentage: nomineePercentage,
          nm_created_by: createdBy,
          nm_created_at: new Date(),
        },
        { transaction: t }
      );

      inserted.push(row.toJSON());
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Nominees added successfully",
      employee_id: employeeId,
      created_by: createdBy,
      data: inserted,
    });
  } catch (error) {
    await t.rollback();
    console.error("Add Nominee Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   NOMINEE — UPDATE / UPSERT (single)
============================================================ */
exports.updateNomineeInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const nomineeId = id ? parseInt(id, 10) : null;
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (id && isNaN(nomineeId)) {
      return res.status(400).json({ success: false, message: "Invalid nominee ID" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const { nominee_name, nominee_relation, nominee_contact, nominee_percentage } = req.body;

    if (
      !nominee_name ||
      !nominee_relation ||
      nominee_contact === undefined ||
      nominee_percentage === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All nominee fields are required",
      });
    }

    const nomineeName = String(nominee_name).trim();
    const nomineeRelation = String(nominee_relation).trim();
    const contactStr = String(nominee_contact).trim();

    if (!nomineeName) {
      return res.status(400).json({ success: false, message: "Nominee name is required" });
    }
    if (!nomineeRelation) {
      return res.status(400).json({ success: false, message: "Nominee relation is required" });
    }
    if (!/^[0-9]{10}$/.test(contactStr)) {
      return res.status(400).json({
        success: false,
        message: "Nominee contact must be exactly 10 digits",
      });
    }

    const newPercentage = Number(nominee_percentage);
    if (isNaN(newPercentage) || newPercentage <= 0 || newPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: "Nominee percentage must be between 1 and 100",
      });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    if (nomineeId) {
      const existing = await Nominee.findOne({
        where: { nm_id: nomineeId, pr_id: employeeId },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Nominee ${nomineeId} not found for employee ${employeeId}`,
        });
      }

      const dupContact = await Nominee.findOne({
        where: {
          pr_id: employeeId,
          nm_nominee_contact: contactStr,
          nm_id: { [Op.ne]: nomineeId },
        },
      });
      if (dupContact) {
        return res.status(409).json({
          success: false,
          message: "Another nominee with this contact already exists",
        });
      }

      const sumOther = await Nominee.sum("nm_nominee_percentage", {
        where: { pr_id: employeeId, nm_id: { [Op.ne]: nomineeId } },
      });
      const existingTotal = Number(sumOther || 0);
      if (existingTotal + newPercentage > 100) {
        return res.status(400).json({
          success: false,
          message: `Only ${100 - existingTotal}% percentage is remaining`,
        });
      }

      await existing.update({
        nm_nominee_name: nomineeName,
        nm_nominee_relation: nomineeRelation,
        nm_nominee_contact: contactStr,
        nm_nominee_percentage: newPercentage,
        nm_updated_by: updatedBy,
        nm_updated_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Nominee updated successfully",
        employee_id: employeeId,
        nominee_id: nomineeId,
        updated_by: updatedBy,
        action: "updated",
        data: existing.toJSON(),
      });
    }

    // No id → insert
    const dupContact = await Nominee.findOne({
      where: { pr_id: employeeId, nm_nominee_contact: contactStr },
    });
    if (dupContact) {
      return res.status(409).json({
        success: false,
        message: "Nominee with this contact already exists",
      });
    }

    const sumAll = await Nominee.sum("nm_nominee_percentage", {
      where: { pr_id: employeeId },
    });
    const existingTotal = Number(sumAll || 0);
    if (existingTotal + newPercentage > 100) {
      return res.status(400).json({
        success: false,
        message: `Only ${100 - existingTotal}% percentage is remaining`,
      });
    }

    const created = await Nominee.create({
      pr_id: employeeId,
      nm_nominee_name: nomineeName,
      nm_nominee_relation: nomineeRelation,
      nm_nominee_contact: contactStr,
      nm_nominee_percentage: newPercentage,
      nm_created_by: updatedBy,
      nm_created_at: new Date(),
      nm_updated_by: updatedBy,
      nm_updated_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Nominee created successfully",
      employee_id: employeeId,
      nominee_id: created.nm_id,
      updated_by: updatedBy,
      action: "created",
      data: created.toJSON(),
    });
  } catch (error) {
    console.error("Nominee Upsert Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Nominee contact already exists",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee reference",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   NOMINEE — DELETE
============================================================ */
exports.deleteNomineeInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;

    console.log("req.params", req.params);
    console.log("Delete id", id);
    console.log("Delete employee_id", employee_id);

    const existing = await Nominee.findOne({
      where: { nm_id: id, pr_id: employee_id },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Nominee not found or not authorized",
      });
    }

    const deletedJson = existing.toJSON();
    await existing.destroy();

    return res.status(200).json({
      message: "Nominee deleted successfully",
      data: deletedJson,
    });
  } catch (error) {
    console.error("Delete Nominee Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   BANK — ADD
============================================================ */
exports.addBankInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const {
      account_holder_name, bank_name, account_number, ifsc_code,
      branch_name, is_active = true, account_type_id,
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const row = await BankAccount.create({
      pr_id: employee_id,
      ba_account_holder_name: account_holder_name || null,
      ba_bank_name: bank_name || null,
      ba_account_number: account_number || null,
      ba_ifsc_code: ifsc_code || null,
      ba_branch_name: branch_name || null,
      ba_is_active: is_active,
      ba_account_type_id: account_type_id || null,
      ba_created_at: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Bank details saved successfully",
      bankInfo: row.toJSON(),
    });
  } catch (error) {
    console.error("Bank save error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   BANK — GET
============================================================ */
exports.getBankInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    const rows = await BankAccount.findAll({
      where: { pr_id: employeeId },
      order: [["ba_id", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      total: rows.length,
      bankDetails: rows.map((r) => ({
        id: r.ba_id,
        employee_id: r.pr_id,
        account_holder_name: r.ba_account_holder_name,
        bank_name: r.ba_bank_name,
        account_number: r.ba_account_number,
        ifsc_code: r.ba_ifsc_code,
        branch_name: r.ba_branch_name,
        is_active: r.ba_is_active,
        created_at: r.ba_created_at,
        updated_at: r.ba_updated_at,
        account_type_id: r.ba_account_type_id,
        created_by: r.ba_created_by,
        updated_by: r.ba_updated_by,
      })),
    });
  } catch (error) {
    console.error("Get Bank Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   BANK — UPDATE / UPSERT
============================================================ */
exports.updateBankInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const {
      account_holder_name, bank_name, account_number, ifsc_code,
      branch_name, account_type_id, is_active,
    } = req.body;

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const latest = await BankAccount.findOne({
      where: { pr_id: employeeId },
      order: [["ba_id", "DESC"]],
    });

    if (latest) {
      await latest.update({
        ba_account_holder_name: account_holder_name || null,
        ba_bank_name: bank_name || null,
        ba_account_number: account_number || null,
        ba_ifsc_code: ifsc_code || null,
        ba_branch_name: branch_name || null,
        ba_is_active: is_active ?? true,
        ba_account_type_id: account_type_id || null,
        ba_updated_by: updatedBy,
        ba_updated_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Bank details updated successfully",
        employee_id: employeeId,
        bank_id: latest.ba_id,
        updated_by: updatedBy,
        action: "updated",
        data: latest.toJSON(),
      });
    }

    const created = await BankAccount.create({
      pr_id: employeeId,
      ba_account_holder_name: account_holder_name || null,
      ba_bank_name: bank_name || null,
      ba_account_number: account_number || null,
      ba_ifsc_code: ifsc_code || null,
      ba_branch_name: branch_name || null,
      ba_is_active: is_active ?? true,
      ba_account_type_id: account_type_id || null,
      ba_created_by: updatedBy,
      ba_created_at: new Date(),
      ba_updated_by: updatedBy,
      ba_updated_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Bank details created successfully",
      employee_id: employeeId,
      bank_id: created.ba_id,
      updated_by: updatedBy,
      action: "created",
      data: created.toJSON(),
    });
  } catch (error) {
    console.error("Bank Upsert Error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Bank account details already exist",
        error: error.message,
      });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or account type reference",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   BANK DOCUMENTS — ADD
============================================================ */
exports.addBankDocInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { documentNumber, documentTypeId } = req.body;

    const employeeId = parseInt(employee_id, 10);
    const createdBy = req.user?.id || null;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "document is required" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    if (!req.companyEmployeeId) {
      return res.status(400).json({
        success: false,
        message: "Company employee ID not found",
      });
    }

    const filePath = `/IHRDocument/${req.companyEmployeeId}/${req.file.filename}`;

    const row = await Document.create({
      pr_id: employeeId,
      dc_file_name: req.file.filename,
      dc_file_path: filePath,
      dc_file_size: req.file.size,
      dc_created_at: new Date(),
      dc_document_number: documentNumber || null,
      dc_document_type_id: documentTypeId ? parseInt(documentTypeId, 10) : null,
      dc_created_by: createdBy,
    });

    return res.status(201).json({
      success: true,
      message: "document uploaded successfully",
      employee_id: employeeId,
      document: {
        id: row.dc_id,
        file_name: row.dc_file_name,
        file_path: row.dc_file_path,
        file_size: row.dc_file_size,
        document_number: row.dc_document_number,
        document_type_id: row.dc_document_type_id,
        created_by: row.dc_created_by,
        created_at: row.dc_created_at,
      },
    });
  } catch (error) {
    console.error("Add Bank Document Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or document type reference",
        error: error.message,
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Document already exists",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   BANK DOCUMENTS — GET ALL
============================================================ */
exports.getAllBankDoc = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    const rows = await Document.findAll({
      where: { pr_id: employeeId },
      order: [["dc_id", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      total: rows.length,
      documents: rows.map((r) => ({
        id: r.dc_id,
        employee_id: r.pr_id,
        file_name: r.dc_file_name,
        file_path: r.dc_file_path,
        file_size: r.dc_file_size,
        created_at: r.dc_created_at,
        updated_at: r.dc_updated_at,
        document_number: r.dc_document_number,
        document_type_id: r.dc_document_type_id,
        created_by: r.dc_created_by,
        updated_by: r.dc_updated_by,
      })),
    });
  } catch (error) {
    console.error("Bank Documents GET Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   BANK DOCUMENTS — UPDATE / UPSERT
============================================================ */
exports.updateBankDocInfo = async (req, res) => {
  try {
    const { employee_id, id } = req.params;
    const employeeId = parseInt(employee_id, 10);
    const documentId = id ? parseInt(id, 10) : null;
    const updatedBy = req.user?.id || null;

    const { documentTypeId, documentNumber } = req.body;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (id && isNaN(documentId)) {
      return res.status(400).json({ success: false, message: "Invalid document ID" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    if (!documentTypeId) {
      return res.status(400).json({ success: false, message: "Document type is required" });
    }

    const parsedDocumentTypeId = parseInt(documentTypeId, 10);
    if (isNaN(parsedDocumentTypeId)) {
      return res.status(400).json({ success: false, message: "Invalid document type ID" });
    }

    if (documentId) {
      const existing = await Document.findOne({
        where: { dc_id: documentId, pr_id: employeeId },
      });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: `Document with ID ${documentId} was not found for employee ${employeeId}`,
        });
      }

      let fileName = existing.dc_file_name;
      let filePath = existing.dc_file_path;
      let fileSize = existing.dc_file_size;

      if (req.file) {
        fileName = req.file.filename;
        filePath = `/IHRDocument/${req.companyEmployeeId}/${req.file.filename}`;
        fileSize = req.file.size;
      }

      await existing.update({
        dc_file_name: fileName,
        dc_file_path: filePath,
        dc_file_size: fileSize,
        dc_document_number:
          documentNumber !== undefined ? documentNumber : existing.dc_document_number,
        dc_document_type_id: parsedDocumentTypeId,
        dc_updated_by: updatedBy,
        dc_updated_at: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Bank document updated successfully",
        employee_id: employeeId,
        document_id: documentId,
        updated_by: updatedBy,
        action: "updated",
        document: existing.toJSON(),
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    const created = await Document.create({
      pr_id: employeeId,
      dc_file_name: req.file.filename,
      dc_file_path: `/IHRDocument/${req.companyEmployeeId}/${req.file.filename}`,
      dc_file_size: req.file.size,
      dc_document_number: documentNumber || null,
      dc_document_type_id: parsedDocumentTypeId,
      dc_created_by: updatedBy,
      dc_created_at: new Date(),
      dc_updated_by: updatedBy,
      dc_updated_at: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Bank document created successfully",
      employee_id: employeeId,
      document_id: created.dc_id,
      updated_by: updatedBy,
      action: "created",
      document: created.toJSON(),
    });
  } catch (error) {
    console.error("Bank Document Upsert Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee or document type reference",
        error: error.message,
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Document already exists",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   DOCUMENT — DELETE
============================================================ */
exports.deleteDocument = async (req, res) => {
  try {
    const { id, employee_id } = req.params;

    const deleted = await Document.destroy({
      where: { dc_id: id, pr_id: employee_id },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    res.status(200).json({ message: "Doc Deleted Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ============================================================
   PROFILE IMAGE — ADD / UPDATE
============================================================ */
exports.addProfileImage = async (req, res) => {
  try {
    const { emp_id } = req.params;

    const employeeId = parseInt(emp_id, 10);
    const createdBy = req.user?.id || null;
    const employeeCode = req.user?.emp_id;

    if (!emp_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }
    if (!employeeCode) {
      return res.status(400).json({ success: false, message: "Employee code not found" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Profile image is required" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const imagePath = `/IHRDocument/${employeeCode}/${req.file.filename}`;

    const oldImage = await UserImage.findOne({
      where: { pr_id: employeeId },
      order: [["ui_id", "DESC"]],
    });

    const newImage = await UserImage.create({
      pr_id: employeeId,
      ui_imagepath: imagePath,
      ui_created_by: createdBy,
      ui_created_at: new Date(),
    });

    // Delete old image file + row
    if (oldImage?.ui_imagepath) {
      const oldRelativePath = oldImage.ui_imagepath.replace(/^\/+/, "");
      const oldFilePath = path.join(__dirname, "..", oldRelativePath);

      if (fs.existsSync(oldFilePath)) {
        fs.unlink(oldFilePath, (err) => {
          if (err) console.error("Failed to delete old profile image:", err);
        });
      }
    }

    if (oldImage?.ui_id) {
      await UserImage.destroy({ where: { ui_id: oldImage.ui_id } });
    }

    return res.status(200).json({
      success: true,
      message: oldImage
        ? "Profile image updated successfully"
        : "Profile image added successfully",
      employee_id: employeeId,
      employee_code: employeeCode,
      profile_image: imagePath,
      data: newImage.toJSON(),
    });
  } catch (error) {
    console.error("Add Profile Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   PROFILE IMAGE — GET
============================================================ */
exports.getProfileImage = async (req, res) => {
  try {
    const { emp_id } = req.params;
    const employeeId = parseInt(emp_id, 10);

    if (!emp_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    const image = await UserImage.findOne({
      where: { pr_id: employeeId },
      order: [["ui_id", "DESC"]],
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Profile image not found",
      });
    }

    const rawPath = image.ui_imagepath
      ? image.ui_imagepath.startsWith("/")
        ? image.ui_imagepath
        : `/${image.ui_imagepath}`
      : null;

    const fullImageUrl = rawPath
      ? `${req.protocol}://${req.get("host")}${rawPath}`
      : null;

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      profile_image: fullImageUrl,
      data: {
        id: image.ui_id,
        employee_id: image.pr_id,
        image_path: fullImageUrl,
        created_by: image.ui_created_by,
        updated_by: image.ui_updated_by,
        created_at: image.ui_created_at,
        updated_at: image.ui_updated_at,
      },
    });
  } catch (error) {
    console.error("Get Profile Image Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   ADDRESS — ADD
============================================================ */
exports.addAddressInfo = async (req, res) => {
  try {
    const { employee_id, permanent_address, current_address } = req.body;
    const createdBy = req.user?.id;

    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee_id is required" });
    }
    if (!createdBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const row = await Address.create({
      pr_id: employeeId,
      ad_perment_address: permanent_address || null,
      ad_current_address: current_address || null,
      ad_is_active: true,
      ad_created_at: new Date(),
      ad_created_by: createdBy,
    });

    return res.status(201).json({
      success: true,
      message: "Address info added successfully",
      employee_id: employeeId,
      created_by: createdBy,
      data: row.toJSON(),
    });
  } catch (error) {
    console.error("Add Address Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ============================================================
   ADDRESS — UPDATE / UPSERT
============================================================ */
exports.updateAddressInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { permanent_address, current_address, is_active } = req.body;

    const employeeId = parseInt(employee_id, 10);
    const updatedBy = req.user?.id;

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee_id is required" });
    }
    if (!updatedBy) {
      return res.status(401).json({ success: false, message: "User ID not found in JWT token" });
    }

    const employeeCheck = await Personal.findOne({
      where: { pr_id: employeeId },
      attributes: ["pr_id"],
    });
    if (!employeeCheck) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${employeeId} not found`,
      });
    }

    const latest = await Address.findOne({
      where: { pr_id: employeeId },
      order: [["ad_id", "DESC"]],
    });

    if (latest) {
      await latest.update({
        ad_perment_address: permanent_address || null,
        ad_current_address: current_address || null,
        ad_is_active: is_active ?? true,
        ad_updated_by: updatedBy,
        ad_updated_at: new Date(),
      });

      const j = latest.toJSON();
      return res.status(200).json({
        success: true,
        message: "Address information updated successfully",
        employee_id: employeeId,
        address_id: latest.ad_id,
        action: "updated",
        updated_by: updatedBy,
        address: {
          id: j.ad_id,
          employee_id: j.pr_id,
          permanent_address: j.ad_perment_address,
          current_address: j.ad_current_address,
          is_active: j.ad_is_active,
          created_at: j.ad_created_at,
          created_by: j.ad_created_by,
          updated_by: j.ad_updated_by,
          updated_at: j.ad_updated_at,
        },
      });
    }

    const created = await Address.create({
      pr_id: employeeId,
      ad_perment_address: permanent_address || null,
      ad_current_address: current_address || null,
      ad_is_active: is_active ?? true,
      ad_created_by: updatedBy,
      ad_created_at: new Date(),
      ad_updated_by: updatedBy,
      ad_updated_at: new Date(),
    });

    const j = created.toJSON();
    return res.status(200).json({
      success: true,
      message: "Address information created successfully",
      employee_id: employeeId,
      address_id: j.ad_id,
      action: "created",
      updated_by: updatedBy,
      address: {
        id: j.ad_id,
        employee_id: j.pr_id,
        permanent_address: j.ad_perment_address,
        current_address: j.ad_current_address,
        is_active: j.ad_is_active,
        created_at: j.ad_created_at,
        created_by: j.ad_created_by,
        updated_by: j.ad_updated_by,
        updated_at: j.ad_updated_at,
      },
    });
  } catch (error) {
    console.error("Address Upsert Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Invalid employee reference",
        error: error.message,
      });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Address information already exists",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server error while processing address information",
      error: error.message,
    });
  }
};

/* ============================================================
   ADDRESS — GET
============================================================ */
exports.getAddressInfo = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const employeeId = parseInt(employee_id, 10);

    if (!employee_id || isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee_id is required" });
    }

    const row = await Address.findOne({
      where: { pr_id: employeeId },
      order: [["ad_id", "DESC"]],
    });

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Address info not found",
      });
    }

    return res.status(200).json({
      success: true,
      employee_id: employeeId,
      address: {
        id: row.ad_id,
        employee_id: row.pr_id,
        permanent_address: row.ad_perment_address,
        current_address: row.ad_current_address,
        is_active: row.ad_is_active,
        created_at: row.ad_created_at,
        created_by: row.ad_created_by,
        updated_by: row.ad_updated_by,
        updated_at: row.ad_updated_at,
      },
    });
  } catch (error) {
    console.error("Get Address Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
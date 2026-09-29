const { Op } = require("sequelize");
const db = require("../models");

const {
  Personal,
  Organizations,
  Login,
  CompaniesMaster,
  VendorMaster,
  DepartmentMaster,
  DesignationMaster,
  EmployeeTypeMaster,
  BranchMaster,
} = db;

exports.getEmployeeCompleteDetails = async (req, res) => {
  try {
    const params = {
      ...(req.query || {}),
      ...(req.body || {}),
    };

    const { emp_id, official_email, official_contact } = params;

    const searchParams = [
      { key: "emp_id", value: emp_id },
      { key: "official_email", value: official_email },
      { key: "official_contact", value: official_contact },
    ].filter(
      (item) =>
        item.value !== undefined &&
        item.value !== null &&
        String(item.value).trim() !== ""
    );

    if (searchParams.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide emp_id, official_email, or official_contact",
      });
    }

    if (searchParams.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Please provide only one search parameter",
      });
    }

    const search = searchParams[0];
    const searchValue = String(search.value).trim();

    let organizationWhere = {};

    if (search.key === "emp_id") {
      organizationWhere.or_emp_id = searchValue;
    } else if (search.key === "official_email") {
      organizationWhere.or_official_email = {
        [Op.iLike]: searchValue,
      };
    } else if (search.key === "official_contact") {
      organizationWhere.or_official_contact = searchValue;
    }

    const organization = await Organizations.findOne({
      where: organizationWhere,
      include: [
        {
          model: CompaniesMaster,
          as: "company",
          required: false,
        },
        {
          model: VendorMaster,
          as: "vendor",
          required: false,
        },
        {
          model: DepartmentMaster,
          as: "department",
          required: false,
        },
        {
          model: DesignationMaster,
          as: "designation",
          required: false,
        },
        {
          model: EmployeeTypeMaster,
          as: "employeeType",
          required: false,
        },
        {
          model: BranchMaster,
          as: "reportingLocation",
          required: false,
          attributes: [
            "branch_id",
            "branch_company_id",
            "branch_name",
            "branch_code",
            "address_line_1",
            "address_line_2",
            "country_id",
            "state_id",
            "city_id",
            "postal_code",
            "longitude",
            "latitude",
            "center_of_radius",
            "created_by",
            "created_at",
            "updated_by",
            "updated_at",
            "is_active",
          ],
        },
      ],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Employee organization details not found",
      });
    }

    const personal = await Personal.findOne({
      where: {
        pr_id: organization.pr_id,
      },
      include: [
        {
          model: Login,
          as: "login",
          required: false,
          attributes: [
            "lg_id",
            "lg_created_by",
            "lg_updated_by",
            "lg_created_at",
            "lg_updated_at",
          ],
        },
      ],
    });

    if (!personal) {
      return res.status(404).json({
        success: false,
        message: "Employee personal details not found",
      });
    }

    let reportingTo = null;

    if (organization.or_reporting_to_id) {
      const reportingOrganization = await Organizations.findOne({
        where: {
          or_id: organization.or_reporting_to_id,
        },
      });

      if (reportingOrganization) {
        const reportingPersonal = await Personal.findOne({
          where: {
            pr_id: reportingOrganization.pr_id,
          },
          attributes: [
            "pr_id",
            "pr_first_name",
            "pr_last_name",
            "pr_email",
            "pr_contact",
          ],
        });

        reportingTo = {
          organization: reportingOrganization.toJSON(),
          personal: reportingPersonal
            ? reportingPersonal.toJSON()
            : null,
        };
      }
    }

    return res.status(200).json({
      success: true,
      message: "Complete employee details fetched successfully",
      search_parameter: search.key,
      data: {
        employee_id: personal.pr_id,
        personalDetails: personal.toJSON(),
        organizationDetails: {
          ...organization.toJSON(),
          reporting_to: reportingTo,
        },
      },
    });
  } catch (error) {
    console.error("Get Employee Complete Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching employee details",
      error: error.message,
    });
  }
};

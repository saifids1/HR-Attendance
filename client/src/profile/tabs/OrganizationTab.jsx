import React, { useContext, useEffect, useState } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import {
  getOrganization,
  getUserForReporting,
  updateOrganization,
  addOrganizationInfo,
} from "../../../api/profile"; // Ensure updateOrganization is imported
import { EmployContext } from "../../context/EmployContextProvider";
import { AuthContext } from "../../context/AuthContextProvider";
import { toast } from "react-hot-toast";
import {
  emptyOrganization,
  employeeTypeOptions,
  reportingToOptions,
  reportingLocationOptions,
  designationOptions,
  departmentOptions,
} from "../../constants/emptyData";

const OrganizationTab = ({
  organizationData,
  isEditing,
  cancelEdit,
  empId,
  addNewEmployee,
}) => {
  // console.log("emptyOrganization",emptyOrganization)
  const [org, setOrg] = useState(emptyOrganization);

  // console.log("organizationData",organizationData)

  const [personalObj, setPersonalObj] = useState({
    joining_date: "",
    leaving_date: "",
    employee_type: "",
  });
  const [reporting, setReporting] = useState({
    reporting_to: "",
  });
  const [reportingOptions, setReportingOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const { setOrgAddress } = useContext(EmployContext);
  const { token } = useContext(AuthContext);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const formatDateToIST = (dateStr) => {
    if (!dateStr) return "";

    const date = new Date(dateStr);

    return date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
  };

  // const newEmployee = {};

  useEffect(() => {
    if (addNewEmployee) {
      setOrg({
        organization_name: "",
        organization_code: "",
        industry_type: "",
        organization_location: "",

        department: "",
        designation: "",
        employee_type: "",
        joining_date: "",
        leaving_date: "",

        reportingTo: "",
        reportingLocation: "",
      });
      return;
    }
    if (!empId) {
      // ADD MODE → keep default emptyOrganization values
      setOrg(emptyOrganization);
      return;
    }

    const getOrganizationData = async () => {
      try {
        const resp = await getOrganization(empId);

        const { organizationData, personalData, reportingData } = resp.data;

        setOrg({
          organization_name: organizationData?.organization_name || "",
          organization_code: organizationData?.organization_code || "",
          industry_type: organizationData?.industry_type || "",
          organization_location: organizationData?.organization_location || "",

          department: personalData?.department || "",
          designation: personalData?.designation || "",
          employee_type: personalData?.employee_type || "",
          joining_date: personalData?.joining_date
            ? formatDateToIST(personalData.joining_date)
            : "",
          leaving_date: personalData?.leaving_date
            ? formatDateToIST(personalData.leaving_date)
            : "",

          reportingTo: reportingData?.reports_to || "",
          reportingLocation: personalData?.reporting_location || "",
        });

        setOrgAddress(organizationData);
      } catch (error) {
        console.log(error);
      }
    };

    getOrganizationData();
  }, [empId, addNewEmployee]);

  useEffect(() => {
    const getUserForReport = async () => {
      try {
        const resp = await getUserForReporting();

        console.log("Resp Reporting users", resp.data.employees);
        setReportingOptions(resp.data.employees);
      } catch (error) {
        console.log(error);
      }
    };

    getUserForReport();
  }, []);

  //  useEffect(()=>{

  //   console.log("emptyOrganization",emptyOrganization);
  //   },[emptyOrganization])

  const handleChange = (key, value) => {
    setOrg((prev) => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const newErrors = {};

    Object.keys(org).forEach((key) => {
      if (
        key === "is_active" ||
        key === "leaving_date" ||
        key === "reportingTo"
      )
        return; // skip this field

      if (!org[key] || org[key].toString().trim() === "") {
        newErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      console.log("newErrors", newErrors);
      setErrors(newErrors);
      toast.error("Please fix the errors below");
      return;
    }

    try {
      if (org.id) {
        await updateOrganization(empId, org);
        toast.success("Organization updated successfully");
      } else {
        await addOrganizationInfo(empId, org);
        toast.success("Organization added successfully");
      }

      if (cancelEdit) cancelEdit();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };
  const renderError = (field) =>
    errors[field] && (
      <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
    );

  return (
    <>
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSave}>
          <div className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* Organization Name */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={org.organization_name}
                  onChange={(e) =>
                    handleChange("organization_name", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {errors.organization_name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.organization_name}
                  </p>
                )}
              </div>

              {/* Organization Code */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Organization Code
                </label>
                <input
                  type="text"
                  placeholder="Organization Location"
                  value={org.organization_code}
                  onChange={(e) =>
                    handleChange("organization_code", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {errors.organization_code && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.organization_code}
                  </p>
                )}
              </div>
              {/* Organization Location */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Organization Location
                </label>
                <input
                  type="text"
                  value={org.organization_location}
                  placeholder="Organization Location"
                  onChange={(e) =>
                    handleChange("organization_location", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {errors.organization_location && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.organization_location}
                  </p>
                )}
              </div>

              {/* Industry Type */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Industry Type
                </label>
                <input
                  type="text"
                  value={org.industry_type}
                  placeholder="Industry Type"
                  onChange={(e) =>
                    handleChange("industry_type", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {errors.industry_type && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.industry_type}
                  </p>
                )}
              </div>

              {/* Department */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 font-medium">
                  Department
                </label>
                <select
                  value={org.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Department</option>
                  {departmentOptions.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {renderError("department")}
              </div>

              {/* Designation */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 font-medium">
                  Designation
                </label>
                <select
                  value={org.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Designation</option>
                  {designationOptions.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {renderError("designation")}
              </div>

              {/* Joining Date */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Joining Date
                </label>
                <input
                  type="date"
                  
                  value={org.joining_date}
                  onChange={(e) => handleChange("joining_date", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {errors.joining_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.joining_date}
                  </p>
                )}
              </div>
              {/* Leaving Date */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Leaving Date
                </label>
                <input
                  type="date"
                  value={org.leaving_date}
                  onChange={(e) => handleChange("leaving_date", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
                {/* {errors.leaving_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.leaving_date}
                  </p>
                )} */}
              </div>

              {/* Employee Type */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600  font-medium">
                  Employee Type
                </label>
                <select
                  value={org.employee_type}
                  onChange={(e) =>
                    handleChange("employee_type", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Employee Type</option>
                  {employeeTypeOptions.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {renderError("employee_type")}
              </div>

              {/* Reporting To */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Reporting To
                </label>
                <select
                  value={org.reportingTo}
                  onChange={(e) => handleChange("reportingTo", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Reporting To</option>
                  {reportingOptions
                    ?.filter((emp) => emp.emp_id != "2020")
                    .map((person, index) => (
                      <option key={index} value={person.emp_id}>
                        {person.name} ({person.emp_id})
                      </option>
                    ))}
                </select>
                {/* {renderError("reportingTo")} */}
              </div>

              {/* Reporting Location */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Reporting Location
                </label>
                <select
                  value={org.reportingLocation}
                  onChange={(e) =>
                    handleChange("reportingLocation", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Reporting Location</option>
                  {reportingLocationOptions.map((loc, index) => (
                    <option key={index} value={loc} className="bg-white">
                      {loc.replace("_", " ")}
                    </option>
                  ))}
                </select>
                {renderError("reportingLocation")}
              </div>
            </div>
          </div>

          {isAdmin && isEditing && (
            <>
              {/* <div className="flex justify-start mb-4">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm"
              >
                + Add Nominee
              </button>
            </div> */}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  // onClick={handleCancel}
                  className="px-6 py-2 bg-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-[#222F7D] text-white rounded-lg text-sm"
                >
                  Save Changes
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </>
  );
};

export default OrganizationTab;

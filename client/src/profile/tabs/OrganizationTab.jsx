import React, { useContext, useState } from "react";
import { EmployContext } from "../../context/EmployContextProvider";
import { AuthContext } from "../../context/AuthContextProvider";
import { toast } from "react-hot-toast";
import {
  emptyOrganization,
  employeeTypeOptions,
  reportingToOptions,
  reportingLocationOptions,
} from "../../constants/emptyData";

const OrganizationTab = ({ isEditing, cancelEdit }) => {
  const [org, setOrg] = useState(emptyOrganization);
  const [errors, setErrors] = useState({});
  const { setOrgAddress } = useContext(EmployContext);
  const { token } = useContext(AuthContext);

  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role?.toLowerCase() === "admin";

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

  const handleSave = (e) => {
    e.preventDefault();
    console.log("Organization Form Data:", org);

    const newErrors = {};
    Object.keys(org).forEach((key) => {
      if (!org[key] || org[key].toString().trim() === "") {
        newErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors below");
      return;
    }

    toast.success("Form data logged in console ✅");

    if (cancelEdit) cancelEdit();
  };

  return (
    <>
      <div className="bg-white shadow p-1 rounded-lg">
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
                  value={org.organizationName}
                  onChange={(e) =>
                    handleChange("organizationName", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              {/* Organization Code */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Organization Code
                </label>
                <input
                  type="text"
                  value={org.organizationCode}
                  onChange={(e) =>
                    handleChange("organizationCode", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>
              {/* Organization Location */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Organization Location
                </label>
                <input
                  type="text"
                  value={org.organizationLocation}
                  onChange={(e) =>
                    handleChange("organizationLocation", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              {/* Industry Type */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Industry Type
                </label>
                <input
                  type="text"
                  value={org.industryType}
                  onChange={(e) => handleChange("industryType", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>
              {/* Department */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Department
                </label>
                <input
                  type="text"
                  value={org.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              {/* Designation */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Designation
                </label>
                <input
                  type="text"
                  value={org.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
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
              </div>

              {/* Employee Type */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Employee Type
                </label>
                <select
                  value={org.employeeType}
                  onChange={(e) => handleChange("employeeType", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                >
                  <option value="">Select</option>
                  {employeeTypeOptions.map((type, index) => (
                    <option key={index} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
                  <option value="">Select</option>
                  {reportingToOptions.map((person, index) => (
                    <option key={index} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
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
                  <option value="">Select</option>
                  {reportingLocationOptions.map((loc, index) => (
                    <option key={index} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isAdmin && isEditing && (
            <div className="flex justify-end gap-3 mt-2 p-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={cancelEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#222F7D] text-white rounded"
              >
                Save Organization
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default OrganizationTab;

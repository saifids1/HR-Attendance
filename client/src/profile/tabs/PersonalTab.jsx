import React, { useEffect, useState } from "react";
import {
  emptyPersonal,
  genderOptions as gender,
  maritalstatusOptions as maritalstatus,
  bloodGroupOptions as bloodGroup,
} from "../../constants/emptyData";
import { toast } from "react-hot-toast";

const PersonalTab = ({ personalData, isEditing, setIsEditing, onSave }) => {
  const [draft, setDraft] = useState({ ...emptyPersonal });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      setDraft({ ...emptyPersonal, ...personalData });
    }
  }, [personalData]);

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));

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
    console.log("Personal Form Data:", draft);

    const newErrors = {};
    Object.keys(emptyPersonal).forEach((key) => {
      if (!draft[key] || draft[key].toString().trim() === "") {
        newErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors below");
      return;
    }

    toast.success("Personal data logged in console ✅");

    if (onSave) onSave(draft);
    else setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...emptyPersonal, ...personalData });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <>
      <div className="bg-white shadow p-1 rounded-lg">
        <form onSubmit={handleSave}>
          <div className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* First Name */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  First Name
                </label>
                <input
                  type="text"
                  value={draft.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.firstName && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Last Name
                </label>
                <input
                  type="text"
                  value={draft.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.lastName && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.lastName}
                  </p>
                )}
              </div>
              {/* Contact No */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Contact No
                </label>
                <input
                  type="text"
                  value={draft.contactNo}
                  onChange={(e) => handleChange("contactNo", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.contactNo && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.contactNo}
                  </p>
                )}
              </div>
              {/* Email */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Email
                </label>
                <input
                  type="text"
                  value={draft.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.email && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.email}
                  </p>
                )}
              </div>
                {/* Date of Birth */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={draft.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.dateOfBirth && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.dateOfBirth}
                  </p>
                )}
              </div>

                {/* Nationality */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Nationality
                </label>
                <input
                  type="text"
                  value={draft.nationality}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.nationality && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.nationality}
                  </p>
                )}
              </div>

              {/* Gender */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Gender
                </label>
                <select
                  value={draft.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Select</option>
                  {gender.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marital Status */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Marital Status
                </label>
                <select
                  value={draft.maritalstatus}
                  onChange={(e) =>
                    handleChange("maritalstatus", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Select</option>
                  {maritalstatus.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Blood Group */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Blood Group
                </label>
                <select
                  value={draft.bloodGroup}
                  onChange={(e) => handleChange("bloodGroup", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Select</option>
                  {bloodGroup.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid mt-4 grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Address */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Current Address
                </label>
                <input
                  type="text"
                  value={draft.currentAddress}
                  onChange={(e) => handleChange("currentAddress", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.currentAddress && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.currentAddress}
                  </p>
                )}
              </div>
                {/* permanent Address */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Permanent Address
                </label>
                <input
                  type="text"
                  value={draft.permanentAddress}
                  onChange={(e) => handleChange("permanentAddress", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.permanentAddress && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.permanentAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 mt-2 p-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-[#222F7D] text-white rounded"
              >
                Save Personal
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default PersonalTab;

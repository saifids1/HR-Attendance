import React, { useContext, useEffect, useState } from "react";
import {
  emptyPersonal,
  genderOptions as gender,
  maritalstatusOptions as maritalstatus,
  bloodGroupOptions as bloodGroup,
} from "../../constants/emptyData";
import { toast } from "react-hot-toast";
import { addPersonal, getPersonal, updatePersonal } from "../../../api/profile";
import { EmployContext } from "../../context/EmployContextProvider";

const PersonalTab = ({
  personalData,
  isEditing,
  setIsEditing,
  onSave,
  empId,
  addNewEmployee,
}) => {
  const [draft, setDraft] = useState(emptyPersonal);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { setPersonalAddress } = useContext(EmployContext);

  /* =========================
     ADD NEW EMPLOYEE MODE
  ==========================*/
  useEffect(() => {
    if (addNewEmployee) {
      setDraft({
        first_name: "",
        last_name: "",
        contact: "",
        email: "",
        dob: "",
        gender: "",
        maritalstatus: "",
        nationality: "",
        bloodgroup: "",
        current_address: "",
        permanent_address: "",
      });
      return;
    }

    if (personalData) {
      setDraft(emptyPersonal);
    }
  }, [addNewEmployee]);

  /* =========================
     FETCH PERSONAL DATA
  ==========================*/
  useEffect(() => {
    if (!empId || addNewEmployee) return; // 🚀 prevent override in add mode

    const fetchPersonal = async () => {
      try {
        const resp = await getPersonal(empId);
        if (!resp?.data) return;

        const formattedDob = formatDOB(resp.data.dob);

        setDraft((prev) => ({
          ...prev,
          ...resp.data,
          dob: formattedDob,
        }));

        setPersonalAddress(resp.data);
      } catch (error) {
        console.error("Personal fetch error:", error);
      }
    };

    fetchPersonal();
  }, [empId, addNewEmployee, setPersonalAddress]);

  useEffect(() => {
    if (!addNewEmployee && personalData) {
      setDraft({ ...emptyPersonal, ...personalData });
    }
  }, [personalData, addNewEmployee]);
  /* =========================
     HELPERS
  ==========================*/
  const formatDOB = (dateStr) => {
    if (!dateStr) return "";
    if (!dateStr.includes("-")) return dateStr;
    const [day, month, year] = dateStr.split("-");
    return `${year}-${month}-${day}`;
  };

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

  /* =========================
     SAVE
  ==========================*/
  const handleSave = async (e) => {
    e.preventDefault();

    const newErrors = {};

    Object.keys(emptyPersonal).forEach((key) => {
      if (!draft[key]?.toString().trim()) {
        newErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
      }
    });

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      toast.error("Please fix required fields");
      return;
    }

    try {
      setIsLoading(true);

      if (empId && !addNewEmployee) {
        await updatePersonal(empId, draft);
        toast.success("Personal updated successfully");
      } else {
        await addPersonal(empId, draft);
        toast.success("Personal added successfully");
      }

      onSave?.(draft);
      setIsEditing(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (addNewEmployee) {
      setDraft({
        first_name: "",
        last_name: "",
        contact: "",
        email: "",
        dob: "",
        gender: "",
        maritalstatus: "",
        nationality: "",
        bloodgroup: "",
        current_address: "",
        permanent_address: "",
      });
    } else {
      setDraft({ ...emptyPersonal, ...personalData });
    }

    setErrors({});
    setIsEditing(false);
  };

  /* =========================
     UI
  ==========================*/

  return (
    <>
      <div className="bg-white shadow rounded-lg">
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
                  value={draft.first_name || ""}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  disabled={!isEditing}
                  placeholder="First Name"
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.first_name && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.first_name}
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
                  value={draft.last_name || ""}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Last Name"
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.last_name && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.last_name}
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
                  placeholder="Contact No"
                  value={draft.contact || ""}
                  onChange={(e) => handleChange("contact", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.contact && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.contact}
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
                  value={draft.email || ""}
                  placeholder="Email"
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.email && (
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
                  // placeholder={draft.dob}
                  value={draft?.dob || " "}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.dob && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.dob}
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
                  placeholder="Nationality"
                  value={draft.nationality || ""}
                  onChange={(e) => handleChange("nationality", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.nationality && (
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
                  value={draft.gender || ""}
                  onChange={(e) => handleChange("gender", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Gender</option>
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
                  value={draft.maritalstatus || ""}
                  onChange={(e) =>
                    handleChange("maritalstatus", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Marital Status</option>
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
                  value={draft.bloodgroup || ""}
                  onChange={(e) => handleChange("bloodgroup", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                >
                  <option value="">Blood Group</option>
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
                  value={draft.current_address || ""}
                  placeholder="Current Address"
                  onChange={(e) =>
                    handleChange("current_address", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.current_address && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.current_address}
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
                  placeholder="Permanent Address"
                  value={draft.permanent_address || ""}
                  onChange={(e) =>
                    handleChange("permanent_address", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {errors.permanent_address && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.permanent_address}
                  </p>
                )}
              </div>
            </div>
          </div>
          {isEditing && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#222F7D] text-white rounded-lg text-sm"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  );
};

export default PersonalTab;

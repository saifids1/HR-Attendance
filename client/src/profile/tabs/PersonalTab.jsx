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
import Loader from "../../components/Loader";
import { set } from "date-fns";

const PersonalTab = ({ personalData, isEditing, setIsEditing, onSave,empId }) => {
  const [draft, setDraft] = useState({ });
  const [errors, setErrors] = useState({});
const [isLoading, setIsLoading] = useState(true);
 const {setPersonalAddress} =  useContext(EmployContext);

 
  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      setDraft({  ...personalData });
    }
  }, [personalData]);
  
const formatDOB = (dateStr) => {
  if (!dateStr) return "";

  // Convert DD-MM-YYYY to YYYY-MM-DD
  const [day, month, year] = dateStr.split("-");
  return `${year}-${month}-${day}`;
};
  // console.log("personalData",personalData)

 useEffect(() => {
  const getPersonalData = async () => {
    // Start loading when the effect runs (especially if empId changes)
    setIsLoading(true); 
    try {
      const resp = await getPersonal(empId);
      const formattedDob = formatDOB(resp.data.dob);

      setDraft((prevData) => ({
        ...prevData,
        ...resp.data,
        dob: formattedDob,
      }));

      setPersonalAddress(resp.data);
    } catch (error) {
      console.error("Error fetching personal data:", error);
    } finally {
      // finally blocks run whether the try succeeds or fails
      setIsLoading(false);
    }
  };

  if (empId) {
    getPersonalData();
  }
}, [empId]);

  // console.log(draft.dob);

  const handleChange = (key, value) => {
  // --- 10-Digit Validation Logic ---
  if (key === "contact") {
    // Only allow numbers and limit length to 10
    if (!/^\d*$/.test(value) || value.length > 10) {
      return; // Stop the function here so the state never updates
    }
  }

  // Update the draft state
  setDraft((prev) => ({ ...prev, [key]: value }));

  // Clear errors when the user starts typing again
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

  // 1. Check for empty required fields first
  Object.keys(emptyPersonal).forEach((key) => {
    // Check if value exists and isn't just whitespace
    if (!draft[key] || draft[key].toString().trim() === "") {
      newErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
    }
  });

  // 2. Specific Validation: Contact Number
  // Only check length/format if the field isn't already marked as empty
  if (!newErrors.contact) {
    const contactStr = draft.contact?.toString() || "";
    if (contactStr.length !== 10) {
      newErrors.contact = "CONTACT NUMBER MUST BE EXACTLY 10 DIGITS";
    } else if (!/^\d+$/.test(contactStr)) {
      newErrors.contact = "CONTACT NUMBER MUST CONTAIN ONLY DIGITS";
    }
  }

  // 3. If any errors exist, stop and show toast
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    toast.error("Please fix the errors below");
    console.log("Validation Errors:", newErrors);
    return;
  }

  // 4. API Call Logic
  try {
    if (draft.emp_id) {
      await updatePersonal(empId, draft);
      toast.success("Personal details updated successfully");
    } else {
      await addPersonal(empId, draft);
      toast.success("Personal details added successfully");
    }

    if (onSave) onSave(draft);
    setIsEditing(false);
    setErrors({}); // Clear errors on success
  } catch (error) {
    console.error("API Error:", error);
    toast.error(error.response?.data?.message || "Failed to save personal details");
  }
};

  const handleCancel = () => {
    setDraft({ ...emptyPersonal, ...personalData });
    setErrors({});
    setIsEditing(false);
  };
  useEffect(()=>{

    console.log("draft",draft)
  },[draft])

  if(isLoading){
       <div className="py-20 flex flex-col items-center justify-center gap-4">
      <Loader />
      <p className="text-gray-400 animate-pulse text-sm">Retrieving Personal Data...</p>
    </div>
  }

  return (
    <>
      <div className="bg-white shadow p-1 rounded-lg">
        <form onSubmit={handleSave}>
          <div className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* First Name */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium" placeholder={draft.first_name}>
                  First Name  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter First Name"
                 value={draft.first_name || ""}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.first_name && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.first_name}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Last Name  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={draft.last_name || ""}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.last_name && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.last_name}
                  </p>
                )}
              </div>
              {/* Contact No */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Contact No  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Contact Number"
                  value={draft.contact || ""}
                  onChange={(e) => handleChange("contact", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.contact && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.contact}
                  </p>
                )}
              </div>
              {/* Email */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Email  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.email || ""}
                  placeholder="Enter Email Address"
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
                  Date of Birth  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  // placeholder={draft.dob}
                  value={draft?.dob || ""}
                  onChange={(e) => handleChange("dob", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.dob && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.dob}
                  </p>
                )}
              </div>

                {/* Nationality */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Nationality  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Nationality"
                  value={draft.nationality || ""}
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
                  Gender  <span className="text-red-500">*</span>
                </label>
                <select
                  value={draft.gender ?? emptyPersonal.gender}
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
                  Marital Status  <span className="text-red-500">*</span>
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
                  Blood Group  <span className="text-red-500">*</span>
                </label>
                <select
                  value={draft.bloodgroup ?? emptyPersonal.bloodgroup}
                  onChange={(e) => handleChange("bloodgroup", e.target.value)}
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
                  Current Address  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Current Address"
                  value={draft.current_address || ""}
                  onChange={(e) => handleChange("current_address", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.current_address && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.current_address}
                  </p>
                )}
              </div>
                {/* permanent Address */}
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Permanent Address  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Permanent Address"
                  value={draft.permanent_address || ""}
                  onChange={(e) => handleChange("permanent_address", e.target.value)}
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
                    isEditing ? "" : "cursor-not-allowed"
                  }`}
                />
                {isEditing && errors.permanent_address && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                    * {errors.permanent_address}
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

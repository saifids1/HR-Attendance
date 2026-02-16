import React, { useContext, useEffect, useState } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import { addPersonal, updatePersonal } from "../../../api/profile";
import { emptyPersonal } from "../../constants/emptyData";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";

const PersonalTab = ({ personalData, isEditing, setIsEditing, onSave, emp_id }) => {
  const { token } = useContext(AuthContext);
  
  // local state for the form inputs
  const [draft, setDraft] = useState({ ...emptyPersonal });
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [errors, setErrors] = useState({});

  // Synchronize internal draft when parent data arrives
  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      const initializedData = {};
      Object.keys(emptyPersonal).forEach((key) => {
        initializedData[key] = (personalData[key] !== null && personalData[key] !== undefined)
          ? personalData[key]
          : emptyPersonal[key];
      });
      setDraft(initializedData);
      // Determine if record is new based on presence of a specific field
      setIsNewRecord(!personalData.aadharnumber);
    }
  }, [personalData]);

  const handleSave = async () => {
    const newErrors = {};
    
    // Validation
    Object.keys(emptyPersonal).forEach((key) => {
      if (!draft[key] || draft[key].toString().trim() === "") {
        const fieldName = key.replace(/_/g, " ").toUpperCase();
        newErrors[key] = `${fieldName} IS REQUIRED`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors below");
      return;
    }

    try {
      if (isNewRecord) {
        await addPersonal(emp_id, draft);
        setIsNewRecord(false);
      } else {
        await updatePersonal(emp_id, draft);
      }

      toast.success("Personal Data Saved");
      setErrors({});
      
      // Notify the parent component that save was successful
      if (onSave) {
        onSave(draft); 
      } else {
        setIsEditing(false); // Fallback
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save personal data");
    }
  };

  const handleCancel = () => {
    // Reset draft to the original prop data
    setDraft({ ...emptyPersonal, ...personalData });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <>
      <FormCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">

        {Object.keys(emptyPersonal).map((key) => {
          const dropdownConfigs = {
            status: ["Active", "Inactive", "Pending"],
            gender: ["Male", "Female", "Other", "Prefer not to say"],
            maritalstatus: ["Single", "Married", "Divorced", "Widowed"],
            bloodgroup: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
          };

          const isDropdown = dropdownConfigs.hasOwnProperty(key);

          return (
            <div key={key} className="flex flex-col mb-3">
              <label className="text-[11px] font-bold mb-1 text-gray-600 uppercase tracking-tight">
                {key.replace(/_/g, " ")}
              </label>

              {isDropdown ? (
                <select
                  value={draft[key] || ""}
                  disabled={!isEditing}
                  className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100 bg-white text-gray-600 outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                    if (errors[key]) {
                      const { [key]: _, ...remainingErrors } = errors;
                      setErrors(remainingErrors);
                    }
                  }}
                >
                  {dropdownConfigs[key].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={draft[key] || ""}
                  disabled={!isEditing}
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                    if (errors[key]) {
                      const { [key]: _, ...remainingErrors } = errors;
                      setErrors(remainingErrors);
                    }
                  }}
                />
              )}

              {isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] font-medium mt-1 uppercase">
                  * {errors[key]}
                </p>
              )}
            </div>
          );
        })}
        </div>
      </FormCard>

      {isEditing && (
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold"
            onClick={handleCancel}
          >
            Cancel
          </button>

          <button
            className="px-6 py-2 bg-[#222F7D] text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-semibold"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      )}
    </>
  );
};

export default PersonalTab;
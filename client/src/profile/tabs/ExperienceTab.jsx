import React, { useContext, useEffect, useState, useCallback } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import Loader from "../../components/Loader";
import {
  getExperience,
  addExperienceses,
  updateExperience,
  deleteExperience,
} from "../../../api/profile";
import { emptyExperience } from "../../constants/emptyData";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";

const ExperienceTab = ({ experienceData, isEditing, setIsEditing, empId }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const { token } = useContext(AuthContext);

  const [draft, setDraft] = useState({ ...emptyExperience });
  const [savedExperience, setSavedExperience] = useState(experienceData || []);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper: Convert any date format to YYYY-MM-DD for HTML5 Input compatibility
  const toInputDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
  };

  const fetchExperience = useCallback(async () => {
    if (!emp_id) return;
    setLoading(true);
    try {
      const res = await getExperience(emp_id);
      const rawData = res?.data?.experience || [];
      const formattedData = rawData.map((e) => ({
        ...e,
        companyName: e.company_name, // Map DB to UI keys
        companyLocation: e.location,
        start_date: toInputDate(e.start_date),
        end_date: toInputDate(e.end_date),
      }));
      setSavedExperience(formattedData);
    } catch (err) {
      toast.error("Failed to load experience");
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(() => {
    if (token && emp_id) fetchExperience();
  }, [emp_id, fetchExperience, token]);

  const handleChange = (key, value) => {
    setDraft((prev) => {
      const newDraft = { ...prev, [key]: value };

      // Live calculation of years
      if ((key === "start_date" || key === "end_date") && newDraft.start_date && newDraft.end_date) {
        const start = new Date(newDraft.start_date);
        const end = new Date(newDraft.end_date);
        if (end >= start) {
          const diff = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
          newDraft.total_years = diff.toFixed(1);
        } else {
          newDraft.total_years = "0";
        }
      }
      return newDraft;
    });

    // Clear specific error when user types
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
    // If date is fixed, clear both date errors
    if (key === "start_date" || key === "end_date") {
        setErrors((prev) => ({ ...prev, start_date: null, end_date: null }));
    }
  };

 const handleSave = async () => {
    const newErrors = {};

    // 1. Validate All Fields (Checks if empty or just whitespace)
    Object.keys(emptyExperience).forEach((key) => {
      if (key !== "id") {
        const val = draft[key];
        if (!val || val.toString().trim() === "") {
          // Creating a user-friendly label for the error message
          const fieldLabel = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toUpperCase();
          newErrors[key] = `${fieldLabel} IS REQUIRED`;
        }
      }
    });

    // 2. Specific Date Logic Validation
    if (draft.start_date && draft.end_date) {
      const start = new Date(draft.start_date);
      const end = new Date(draft.end_date);
      if (end < start) {
        newErrors.end_date = "END DATE CANNOT BE BEFORE START DATE";
      }
    }

    // 3. If there are errors, stop execution and show toast
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return toast.error("Please fix the errors before saving");
    }

    try {
      setLoading(true);
      const payload = {
        company_name: draft.companyName,
        location: draft.companyLocation,
        designation: draft.designation,
        start_date: draft.start_date,
        end_date: draft.end_date,
        total_years: draft.total_years,
      };

      if (draft.id) {
        await updateExperience(empId, draft.id, payload);
        toast.success("Experience updated successfully");
      } else {
        await addExperienceses(empId, payload);
        toast.success("New experience added successfully");
      }

      setIsEditing(false);
      setDraft({ ...emptyExperience });
      fetchExperience();
    } catch (err) {
      toast.error("Save failed. Please check your connection or server logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this experience record?")) return;
    try {
      await deleteExperience(empId, id);
      toast.success("Deleted");
      fetchExperience();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (exp) => {
    // Ensure dates are formatted for the <input type="date" />
    const formattedExp = {
      ...exp,
      start_date: toInputDate(exp.start_date),
      end_date: toInputDate(exp.end_date),
    };
    setDraft(formattedExp);
    setErrors({});
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setDraft({ ...emptyExperience });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="w-full space-y-6">
      <FormCard title={draft.id ? "Edit Experience" : "Add Experience"}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {Object.keys(emptyExperience).map((key) => {
            if (key === "id") return null;
            const isCalculated = key === "total_years";

            return (
              <div key={key} className="flex flex-col w-full">
                <Input
                  label={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toUpperCase()}
                  type={key.includes("date") ? "date" : "text"}
                  value={draft[key] || ""}
                  disabled={!isEditing || isCalculated}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full"
                />
                {isEditing && errors[key] && (
                  <p className="text-red-500 text-[10px] mt-1 font-bold italic uppercase">
                    * {errors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </FormCard>

      {isEditing && (
        <div className="flex justify-end gap-3 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <button className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-all" onClick={handleCancel}>
            Cancel
          </button>
          <button className="px-5 py-2 bg-[#222F7D] text-white rounded-md hover:bg-blue-900 shadow-md font-medium" onClick={handleSave}>
            {draft.id ? "Update Record" : "Save Record"}
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">COMPANY NAME</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">COMPANY LOCATION</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">DESIGNATION</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Years</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10">
                  <div className="flex justify-center"><Loader /></div>
                </td>
              </tr>
            ) : savedExperience.length > 0 ? (
              savedExperience.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.companyName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{exp.companyLocation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{exp.designation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{exp.total_years} yrs</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex justify-center gap-4">
                      <button onClick={() => handleEdit(exp)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Edit Record">
                        <FaPencilAlt />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Delete Record">
                        <MdDelete size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400 italic">No experience records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExperienceTab;
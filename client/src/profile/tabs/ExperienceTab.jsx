import React, { useContext, useEffect, useState, useCallback } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
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

const ExperienceTab = ({ isEditing, setIsEditing }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const { token } = useContext(AuthContext);

  const [draft, setDraft] = useState({ ...emptyExperience });
  const [savedExperience, setSavedExperience] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Helper: Convert DB date to YYYY-MM-DD for <input type="date" />
  const toInputDate = (date) =>
    date ? new Date(date).toISOString().split("T")[0] : "";

  // Helper: Format for Table Display
  const formatDateDDMMYYYY = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB"); // Returns DD/MM/YYYY
  };

  const fetchExperience = useCallback(async () => {
    if (!emp_id) return;
    setLoading(true);
    try {
      const res = await getExperience(emp_id);
      const rawData = res?.data?.experience || [];

      // Map backend snake_case to frontend camelCase if necessary, 
      // or keep consistent with your draft structure
      const formattedData = rawData.map((e) => ({
        ...e,
        companyName: e.company_name, // Mapping for your Input labels
        start_date: toInputDate(e.start_date),
        end_date: toInputDate(e.end_date),
      }));

      setSavedExperience(formattedData);
      setDraft({ ...emptyExperience });
      setErrors({});
      setIsEditing(false);
    } catch (err) {
      console.error("Fetch Experience Error:", err);
      toast.error(err.response?.data?.message || "Failed to load experience");
    } finally {
      setLoading(false);
    }
  }, [emp_id, setIsEditing]);

  useEffect(() => {
    if (token && emp_id) {
      fetchExperience();
    }
  }, [emp_id, fetchExperience, token]);

  const handleChange = (key, value) => {
    setDraft((prev) => {
      const newDraft = { ...prev, [key]: value };
      
      // Auto-calculate total years if both dates exist
      if ((key === "start_date" || key === "end_date") && newDraft.start_date && newDraft.end_date) {
        const start = new Date(newDraft.start_date);
        const end = new Date(newDraft.end_date);
        const diff = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        newDraft.total_years = diff > 0 ? diff.toFixed(1) : "0";
      }
      return newDraft;
    });

    if (errors[key]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[key];
        return newErrs;
      });
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    Object.keys(emptyExperience).forEach((key) => {
      if (key !== "id" && (!draft[key] || draft[key].toString().trim() === "")) {
        newErrors[key] = "REQUIRED";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all fields");
      return;
    }

    try {
      const payload = {
        company_name: draft.companyName || draft.company_name,
        designation: draft.designation,
        start_date: draft.start_date,
        end_date: draft.end_date,
        total_years: draft.total_years,
      };

      if (draft.id) {
        await updateExperience(emp_id, draft.id, payload);
      } else {
        await addExperienceses(emp_id, payload);
      }
      toast.success("Experience saved");
      fetchExperience();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this experience record?")) return;
    try {
      await deleteExperience(emp_id, id);
      toast.success("Deleted");
      fetchExperience();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (exp) => {
    setDraft({ ...exp });
    setErrors({});
    setIsEditing(true);
  };

  return (
    <>
      <FormCard>
        {Object.keys(emptyExperience).map((key) => {
          if (key === "id") return null;
          return (
            <div key={key} className="flex flex-col mb-3">
              <Input
                label={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toUpperCase()}
                type={key.includes("date") ? "date" : "text"}
                value={draft[key] || ""}
                disabled={!isEditing}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              {isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                  * {errors[key]}
                </p>
              )}
            </div>
          );
        })}
      </FormCard>

      {isEditing && (
        <div className="flex gap-3 mt-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>
            Save Experience
          </button>
        </div>
      )}

      <div className="overflow-x-auto mt-6 shadow-sm rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-3 text-left">Company</th>
              <th className="border px-4 py-3 text-left">Designation</th>
              <th className="border px-4 py-3 text-left">Duration</th>
              <th className="border px-4 py-3 text-left">Years</th>
              <th className="border px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10">Fetching Experience Records...</td></tr>
            ) : savedExperience.length > 0 ? (
              savedExperience.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border px-4 py-2 font-medium">{exp.companyName || exp.company_name}</td>
                  <td className="border px-4 py-2">{exp.designation}</td>
                  <td className="border px-4 py-2">
                    {formatDateDDMMYYYY(exp.start_date)} - {formatDateDDMMYYYY(exp.end_date)}
                  </td>
                  <td className="border px-4 py-2">{exp.total_years}</td>
                  <td className="border px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(exp)} className="text-blue-600 hover:text-blue-800">
                        <FaPencilAlt size={14} />
                      </button>
                      <button onClick={() => handleDelete(exp.id)} className="text-red-600 hover:text-red-800">
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">No work experience added yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ExperienceTab;
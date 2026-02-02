import React, { useContext, useEffect, useState, useCallback } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import {
  getEducation,
  addEducations,
  updateEducation,
  deleteEducation,
} from "../../../api/profile";
import { emptyEducation } from "../../constants/emptyData";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";

const EducationTab = ({ isEditing, setIsEditing }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const { token } = useContext(AuthContext);

  const [draft, setDraft] = useState({ ...emptyEducation });
  const [savedEducation, setSavedEducation] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false); // Added loading state

  // Wrapped in useCallback to prevent unnecessary re-renders
  const fetchEducation = useCallback(async () => {
    if (!emp_id) return;
    setLoading(true);
    try {
      const res = await getEducation(emp_id);
      
      // Ensure we are setting actual data or an empty list
      const educationData = res?.data?.education || [];
      setSavedEducation(educationData);
      
      // Reset form states only on success
      setDraft({ ...emptyEducation });
      setErrors({});
      setIsEditing(false);
    } catch (err) {
      console.error("Fetch Education Error:", err);
      const msg = err.response?.data?.message || "Failed to fetch data";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [emp_id, setIsEditing]);

  useEffect(() => {
    if (token && emp_id) {
      fetchEducation();
    }
  }, [emp_id, fetchEducation, token]);

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
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
    // Skip "id" and validate
    Object.keys(emptyEducation).forEach((key) => {
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
      if (draft.id) {
        await updateEducation(emp_id, draft.id, draft);
      } else {
        await addEducations(emp_id, draft);
      }
      toast.success("Saved successfully");
      fetchEducation(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEducation(emp_id, id);
      toast.success("Deleted");
      fetchEducation();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEdit = (edu) => {
    setDraft({ ...edu });
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft({ ...emptyEducation });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <>
      <FormCard>
        {Object.keys(emptyEducation).map((key) => {
          if (key === "id") return null; // Don't render ID field
          return (
            <div key={key} className="flex flex-col mb-3">
              <Input
                label={key.replace(/_/g, " ").toUpperCase()}
                value={draft[key] || ""}
                disabled={!isEditing}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              {isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">
                  * {errors[key]}
                </p>
              )}
            </div>
          );
        })}
      </FormCard>

      {isEditing && (
        <div className="flex gap-3 mt-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleCancel}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>
            Save
          </button>
        </div>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Degree</th>
              <th className="border px-4 py-2 text-left">Field</th>
              <th className="border px-4 py-2 text-left">Institute</th>
              <th className="border px-4 py-2 text-left">Year</th>
              <th className="border px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
            ) : savedEducation.length > 0 ? (
              savedEducation.map((edu) => (
                <tr key={edu.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{edu.degree}</td>
                  <td className="border px-4 py-2">{edu.field_of_study}</td>
                  <td className="border px-4 py-2">{edu.university}</td>
                  <td className="border px-4 py-2">{edu.passing_year}</td>
                  <td className="border px-4 py-2">
                    <button onClick={() => handleEdit(edu)} className="text-blue-600 mr-3">
                      <FaPencilAlt />
                    </button>
                    <button onClick={() => handleDelete(edu.id)} className="text-red-600">
                      <MdDelete size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-400">
                  No education data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default EducationTab;
import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import Loader from "../../components/Loader"; // Ensure Loader is imported
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

const EducationTab = ({ isEditing, cancelEdit,setIsEditing }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const { token } = useContext(AuthContext);

  // Ref to prevent double-firing in Strict Mode
  const isFetched = useRef(false);

  const [draft, setDraft] = useState({ ...emptyEducation });
  const [savedEducation, setSavedEducation] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchEducation = useCallback(async (isSilent = false) => {
    if (!emp_id) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await getEducation(emp_id);
      const educationData = res?.data?.education || [];
      setSavedEducation(educationData);
      
      setDraft({ ...emptyEducation });
      setErrors({});
    } catch (err) {
      console.error("Fetch Education Error:", err);
      
      // Only toast error if it's NOT a "no data" status (like 404) and NOT silent
      const status = err.response?.status;
      if (status !== 404 && !isSilent) {
        const msg = err.response?.data?.message || "Failed to load education records";
        toast.error(msg);
      }

      // If no data found, just clear the list instead of showing error
      if (status === 404) {
        setSavedEducation([]);
      }
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(() => {
    if (token && emp_id && !isFetched.current) {
      fetchEducation();
      isFetched.current = true;
    }
    return () => { isFetched.current = false; };
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
    // 1. Validation Logic
    const newErrors = {};
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
      // 2. Prepare FormData (Required for file uploads and your backend logic)
      const formData = new FormData();
  
      // Your backend does: JSON.parse(req.body.education)
      // and then loops through it. So we send an array containing our draft.
      const educationEntries = [draft];

      console.log("educationEntries",educationEntries)
      formData.append("education", JSON.stringify(educationEntries));
      

      console.log("draft",draft);
      // 3. Handle File (if any)
      // Your backend looks for `file_${i}`. Since our index is 0, we use file_0
      if (draft.marksheet_file) {
        formData.append("file_0", draft.marksheet_file);
      }
  
      // 4. API Call
      // IMPORTANT: Ensure your updateEducation/addEducations functions 
      // in api/profile can handle FormData.

      console.log("formData",formData)
      if (draft.id) {
        await updateEducation(emp_id, draft.id, formData);
      } else {
        await addEducations(emp_id, formData);
      }
  
      toast.success("Saved successfully");
      fetchEducation(true); 
      if (cancelEdit) cancelEdit(); 
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteEducation(emp_id, id);
      setSavedEducation((prev) => prev.filter((item) => item.id !== id));
      if (draft.id === id) {
        setDraft({ ...emptyEducation });
        setErrors({});
      }
      toast.success("Deleted successfully");
    } catch (error) {
      toast.error("Delete failed",error);
    }
  };

  const handleEdit = (edu) => {
    setDraft({ ...edu });
    setErrors({});
    setIsEditing(true);
  };

  return (
    <>
      <FormCard>
        {Object.keys(emptyEducation).map((key) => {
          if (key === "id") return null;
          return (
            <div key={key} className="flex flex-col mb-3">
              <Input
                label={key.replace(/_/g, " ").toUpperCase()}
                value={draft[key] || ""}
                disabled={!isEditing}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              {isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] mt-1 font-bold">* {errors[key]}</p>
              )}
            </div>
          );
        })}
      </FormCard>

      {isEditing && (
        <div className="flex justify-end gap-3 mt-2 p-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={cancelEdit}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>Save</button>
        </div>
      )}

      <div className="overflow-x-auto mt-6 shadow-sm rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-3 text-left">Degree</th>
              <th className="border px-4 py-3 text-left">Field</th>
              <th className="border px-4 py-3 text-left">Institute</th>
              <th className="border px-4 py-3 text-left">Year</th>
              <th className="border px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="py-10 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader />
                    <span>Fetching Education Records...</span>
                  </div>
                </td>
              </tr>
            ) : savedEducation.length > 0 ? (
              savedEducation.map((edu) => (
                <tr key={edu.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border px-4 py-2">{edu.degree}</td>
                  <td className="border px-4 py-2">{edu.field_of_study}</td>
                  <td className="border px-4 py-2">{edu.university}</td>
                  <td className="border px-4 py-2">{edu.passing_year}</td>
                  <td className="border px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(edu)} className="text-blue-600 hover:text-blue-800">
                        <FaPencilAlt size={14} />
                      </button>
                      <button onClick={() => handleDelete(edu.id)} className="text-red-600 hover:text-red-800">
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400">
                  No education records found.
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
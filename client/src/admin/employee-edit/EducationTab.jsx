import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import Loader from "../../components/Loader";
import {
  getEducation,
  addEducations,
  updateEducation,
  deleteEducation,
} from "../../../api/profile";
import { emptyEducation } from "../../constants/emptyData";
import { FaPencilAlt, FaPlus } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";
import { useParams } from "react-router-dom";

const EducationTab = ({ isEditing, cancelEdit, setIsEditing }) => {
 const {emp_id} = useParams();
  const { token } = useContext(AuthContext);

  const isFetched = useRef(false);

  // States
  const [draft, setDraft] = useState({ ...emptyEducation });
  const [savedEducation, setSavedEducation] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // 1. Fetch Data
  const fetchEducation = useCallback(async (isSilent = false) => {
    if (!emp_id) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await getEducation(emp_id);
      const educationData = res?.data?.education || [];
      setSavedEducation(educationData);
    } catch (err) {
      console.error("Fetch Education Error:", err);
      if (err.response?.status === 404) {
        setSavedEducation([]);
      } else if (!isSilent) {
        toast.error("Failed to load records");
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

  // 2. Handle Inputs
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

  // 3. Validation & Save
  const handleSave = async () => {
    // 1. Validation (Same as before)
    const requiredFields = ["degree", "field_of_study", "university", "passing_year", "percentage_or_grade"];
    for (let key of requiredFields) {
      if (!draft[key] || draft[key].toString().trim() === "") {
        toast.error(`${key.replace(/_/g, " ")} is required`);
        return;
      }
    }
  
    try {
      const formData = new FormData();
  
      // 2. Prepare the array. 
      // Your backend expects an array even if you are only saving one row.
      const educationEntries = [draft]; 
      
      // 3. Append the JSON string
      formData.append("education", JSON.stringify(educationEntries));
  
      // 4. Append the file with the specific key 'file_0' 
      // because your backend looks for `file_${i}`
      if (draft.marksheet_file) {
        formData.append("file_0", draft.marksheet_file);
      }
  
      // 5. Send to API
      // Note: You can use your existing updateEducation or addEducations call
      await updateEducation(emp_id, draft.id || "new", formData);
  
      toast.success("Saved successfully");
      setDraft({ ...emptyEducation });
      setIsEditing(false);
      fetchEducation(true); 
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  // 4. Actions
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this education entry?")) return;
    try {
      await deleteEducation(emp_id, id);
      setSavedEducation((prev) => prev.filter((item) => item.id !== id));
      if (draft.id === id) setDraft({ ...emptyEducation });
      toast.success("Entry removed");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const handleEditRow = (edu) => {
    setDraft({ ...edu });
    setErrors({});
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setDraft({ ...emptyEducation });
    setErrors({});
    setIsEditing(true);
  };

  return (
    <>
      {/* Edit Form Section */}
      <div className={`transition-all duration-300 ${isEditing ? "opacity-100 mb-6" : "opacity-0 h-0 overflow-hidden"}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-blue-700 font-bold uppercase text-sm">
            {draft.id ? "Edit Entry" : "Add New Entry"}
          </h3>
          <button onClick={cancelEdit} className="text-gray-400 hover:text-red-500"><FaPlus className="rotate-45" /></button>
        </div>
        
        <FormCard>
          {Object.keys(emptyEducation).map((key) => {
            if (key === "id") return null;
            return (
              <div key={key} className="flex flex-col mb-1">
                <Input
                  label={key.replace(/_/g, " ").toUpperCase()}
                  value={draft[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={errors[key] ? "border-red-500" : ""}
                />
                {errors[key] && (
                  <p className="text-red-500 text-[9px] font-bold italic ml-1">* {errors[key]}</p>
                )}
              </div>
            );
          })}
        </FormCard>

        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
          <button className="px-5 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"  onClick={() => setIsEditing(false)}
          
          >
            Cancel
          </button>
          <button className="px-5 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition" onClick={handleSave}>
            {draft.id ? "Update" : "Save"}
          </button>
        </div>
      </div>

      {/* Display Table Section */}
      {/* <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Education History</h2>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 hover:bg-green-100 transition"
          >
            <FaPlus /> ADD EDUCATION
          </button>
        )}
      </div> */}

      <div className="overflow-x-auto shadow-sm rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold">
            <tr>
              <th className="px-6 py-4 text-left">Degree</th>
              <th className="px-6 py-4 text-left">Institute</th>
              <th className="px-6 py-4 text-left">Year</th>
              <th className="px-6 py-4 text-left">Grade</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader />
                    <span className="text-gray-400 animate-pulse">Syncing education records...</span>
                  </div>
                </td>
              </tr>
            ) : savedEducation.length > 0 ? (
              savedEducation.map((edu) => (
                <tr key={edu.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {edu.degree}
                    <p className="text-[11px] text-gray-500 font-normal">{edu.field_of_study}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{edu.university || edu.institution_name}</td>
                  <td className="px-6 py-4 text-gray-600">{edu.passing_year}</td>
                  <td className="px-6 py-4 font-bold text-blue-600">{edu.percentage_or_grade || edu.grade}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-4">
                      <button onClick={() => handleEditRow(edu)} title="Edit Row" className="text-gray-400 hover:text-blue-600 transition">
                        <FaPencilAlt size={14} />
                      </button>
                      <button onClick={() => handleDelete(edu.id)} title="Delete Row" className="text-gray-400 hover:text-red-600 transition">
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-16 text-gray-400 italic bg-gray-50/50">
                  No records found. Click "Add" to document your education.
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
import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import Input from "../../components/Input";
import Loader from "../../components/Loader";
import {
  getEducation,
  updateEducation,
  deleteEducation,
} from "../../../api/profile";
import { emptyEducation } from "../../constants/emptyData";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";
import { useParams } from "react-router-dom";

const EducationTab = ({ isEditing, setIsEditing,emp_id }) => {
  // const { emp_id } = useParams();
  const { token } = useContext(AuthContext);
  const isFetched = useRef(false);

  // States
  const [draft, setDraft] = useState({ ...emptyEducation });
  const [savedEducation, setSavedEducation] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchEducation = useCallback(async (isSilent = false) => {
    if (!emp_id) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await getEducation(emp_id);
      setSavedEducation(res?.data?.education || []);
    } catch (err) {
      if (err.response?.status === 404) setSavedEducation([]);
      else if (!isSilent) toast.error("Failed to load records");
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
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const handleSave = async () => {
    const requiredFields = ["degree", "field_of_study", "institution_name", "passing_year"];
    for (let key of requiredFields) {
      if (!draft[key]) {
        toast.error(`${key.replace(/_/g, " ")} is required`);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("education", JSON.stringify([draft]));
      
      // Backend expects 'new' if it's an addition, otherwise the ID
      await updateEducation(emp_id, draft.id || "new", formData);

      toast.success(draft.id ? "Updated successfully" : "Added successfully");
      setIsEditing(false);
      setDraft({ ...emptyEducation });
      fetchEducation(true);
    } catch (err) {
      toast.error("Save failed");
    }
  };

  const handleEditRow = (edu) => {
    setDraft({ ...edu }); // Load existing data
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setDraft({ ...emptyEducation }); // Force clear fields
    setErrors({});
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    // 1. Always ask for confirmation before deleting
    // console.log("id",id)
    // if (!window.confirm("Are you sure you want to delete this education record?")) {
    //   return;
    // }

    try {
      // 2. Call your API utility
      await deleteEducation(emp_id,id); 
      
      toast.success("Education record deleted");
      if (fetchEducation) {
        fetchEducation(); 
      }
     
     
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete record");
    }
  };

  return (
    <>
      {/* Input Form Section */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isEditing ? "opacity-100 mb-8 max-h-[1000px]" : "opacity-0 max-h-0"}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-blue-700 font-bold uppercase text-xs tracking-wider">
            {draft.id ? "Edit Education" : "Add Education"}
          </h3>
        </div>

        <div className="w-full border rounded-xl p-6 bg-white shadow-sm border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 w-full">
            {Object.keys(emptyEducation).map((key) => {
              if (key === "id") return null;
              return (
                <div key={key} className="w-full flex flex-col group">
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1 transition-colors group-focus-within:text-blue-600">
                    {key.replace(/_/g, " ").toUpperCase()}
                  </label>
                  <input
                    type="text"
                    value={draft[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                    placeholder={`Enter ${key.replace(/_/g, " ")}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-5">
            <button className="px-6 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button className="px-8 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition" onClick={handleSave}>
              {draft.id ? "Update Education" : "Save Education"}
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-700 font-bold">Education Records</h2>
          {!isEditing && (
            <button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2">
               Add Education
            </button>
          )}
        </div>

        <div className="overflow-x-auto shadow-sm rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold">
              <tr>
                <th className="px-6 py-4">Degree</th>
                <th className="px-6 py-4">Field Of Study</th>
                <th className="px-6 py-4">Institute</th>
                <th className="px-6 py-4">Year</th>
                <th className="px-6 py-4">University</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center"><Loader /></td></tr>
              ) : savedEducation.length > 0 ? (
                savedEducation.map((edu) => (
                  <tr key={edu.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{edu.degree}</td>
                    <td className="px-6 py-4 text-gray-600">{edu.field_of_study}</td>
                    <td className="px-6 py-4 text-gray-600">{edu.institution_name}</td>
                    <td className="px-6 py-4 text-gray-600">{edu.passing_year}</td>
                    <td className="px-6 py-4 text-gray-600">{edu.university}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{edu.percentage_or_grade}</td>
                    <td className="px-6 py-4 text-center flex justify-center gap-3">
                      <button onClick={() => handleEditRow(edu)} className="text-blue-600 hover:scale-110 transition"><FaPencilAlt /></button>
                      <button onClick={() => handleDelete(edu.id)} className="text-red-600 hover:scale-110 transition"><MdDelete size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="text-center py-10 text-gray-400">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default EducationTab;
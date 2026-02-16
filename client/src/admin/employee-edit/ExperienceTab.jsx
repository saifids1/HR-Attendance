import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { FaPlus, FaTrash, FaCheck, FaPencilAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";
import Loader from "../../components/Loader";
import { AuthContext } from "../../context/AuthContextProvider";
import {
  getExperience,
  addExperienceses,
  updateExperience,
  deleteExperience
} from "../../../api/profile";
import { emptyExperience } from "../../constants/emptyData";
import { useParams } from "react-router-dom";

// Helper: Formats date for Table (Jul 2025)
const formatDisplayDate = (dateString) => {
  if (!dateString) return "Present";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// Helper: Converts date for Input value (YYYY-MM-DD)
const toInputDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");

const ExperienceTab = ({ isEditing, setIsEditing, cancelEdit }) => {
  const { token } = useContext(AuthContext);

  const { emp_id } = useParams();

  // States
  const [savedExperience, setSavedExperience] = useState([]);
  const [draft, setDraft] = useState({ ...emptyExperience });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isFetched = useRef(false);

  // 1. Fetch Data from API
  const fetchExperience = useCallback(async (isSilent = false) => {
    if (!emp_id) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await getExperience(emp_id);
      const data = res?.data?.experience || [];
      // Normalize dates for the form
      const normalized = data.map(exp => ({
        ...exp,
        start_date: toInputDate(exp.start_date),
        end_date: toInputDate(exp.end_date)
      }));
      setSavedExperience(normalized);
    } catch (err) {
      if (err.response?.status !== 404) toast.error("Failed to load experience");
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(()=>{

    console.log(savedExperience);
  },[savedExperience])

  useEffect(() => {
    if (token && emp_id && !isFetched.current) {
      fetchExperience();
      isFetched.current = true;
    }
  }, [emp_id, fetchExperience, token]);

  // 2. Handle Form Input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDraft((prev) => {
      const newDraft = { ...prev, [name]: value };

      // Auto-calculate total years if both dates exist
      if ((name === "start_date" || name === "end_date") && newDraft.start_date && newDraft.end_date) {
        const start = new Date(newDraft.start_date);
        const end = new Date(newDraft.end_date);
        const diff = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
        newDraft.total_years = diff > 0 ? diff.toFixed(1) : "0";
      }
      return newDraft;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // 3. Save Current Draft (Add or Update)
  const handleSaveDraft = async () => {
    // Validation
    const required = ["company_name", "location", "designation", "start_date"];
    const newErrors = {};
    required.forEach(field => {
      if (!draft[field]) newErrors[field] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill required fields");
      return;
    }

    try {
      if (draft.id) {
        await updateExperience(emp_id, draft.id, draft);
        toast.success("Experience updated");
      } else {
        await addExperienceses(emp_id, draft);
        toast.success("Experience added");
      }
      setDraft({ ...emptyExperience });
      fetchExperience(true);
    } catch (err) {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteExperience(emp_id, id);
      setSavedExperience(prev => prev.filter(e => e.id !== id));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const handleEditRow = (exp) => {
    setDraft({ ...exp });
    setErrors({});
    setIsEditing(true);
  };

    const handleAddNew = () => {
      setDraft({ ...emptyExperience }); 
      setErrors({});
      setIsEditing(true);
    };

  return (
    <div className="space-y-8">
    {/* 1. Animated Edit/Add Form Section */}
    <div 
      className={`transition-all duration-500 overflow-hidden ${
        isEditing 
          ? "opacity-100 mb-8 max-h-[1000px] translate-y-0" 
          : "opacity-0 max-h-0 -translate-y-4 pointer-events-none"
      }`}
    >
      <div className="w-full border rounded-xl p-6 bg-white shadow-sm border-gray-100">
        <h3 className="text-sm font-bold text-blue-600 uppercase mb-4">
          {draft.id ? "Edit Experience" : "Add New Experience"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="md:col-span-1 group">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 transition-colors group-focus-within:text-blue-600">
              Company Name
            </label>
            <input
              name="company_name"
              value={isEditing ? draft.company_name:draft.companyName}
              onChange={handleInputChange}
              className={`w-full border ${errors.company_name ? 'border-red-500' : 'border-gray-200'} rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
          </div>
          
          <div className="md:col-span-1 group">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 transition-colors group-focus-within:text-blue-600">
              Company Location
            </label>
            <input
              name="location" 
              value={isEditing ? draft.location:draft.companyLocation}
              onChange={handleInputChange}
              className={`w-full border ${errors.location ? 'border-red-500' : 'border-gray-200'} rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
          </div>
  
          <div className="group">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 transition-colors group-focus-within:text-blue-600">
              Designation
            </label>
            <input
              name="designation"
              value={draft.designation || ""}
              onChange={handleInputChange}
              className={`w-full border ${errors.designation ? 'border-red-500' : 'border-gray-200'} rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
          </div>
  
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Start Date</label>
            <input
              type="date"
              name="start_date"
              value={draft.start_date || ""}
              onChange={handleInputChange}
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
  
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">End Date</label>
            <input
              type="date"
              name="end_date"
              value={draft.end_date || ""}
              onChange={handleInputChange}
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
  
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Total Years</label>
            <input
              type="number"
              name="total_years"
              value={draft.total_years || ""}
              readOnly
              className="w-full border border-gray-100 bg-gray-50 rounded-xl p-3 outline-none cursor-not-allowed text-gray-500"
            />
          </div>
        </div>
  
        <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-gray-50">
          <button 
            onClick={() => { setDraft({ ...emptyExperience }); setIsEditing(false) }} 
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDraft}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-100"
          >
            {draft.id ? "Update Experience" : "Save Experience"}
          </button>
        </div>
      </div>
    </div>
  
    {/* 2. SUMMARY TABLE */}
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-gray-700 font-bold">Experience Records</h2>
        {!isEditing && (
          <button 
            onClick={() => { setDraft({ ...emptyExperience }); setIsEditing(true); }} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <FaPlus size={12} /> Add Experience
          </button>
        )}
      </div>
  
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Company Details</th>
                <th className="px-6 py-4">Company Location</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="py-10 text-center"><Loader /></td></tr>
              ) : savedExperience.length > 0 ? (
                savedExperience.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-800">{exp.company_name}</div>
                      <div className="text-[11px] text-gray-400">{exp.location}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                      {exp.location}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                      {exp.designation}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {formatDisplayDate(exp.start_date)} — {formatDisplayDate(exp.end_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 text-gray-500">
                        {Number(exp.total_years || 0).toFixed(1)} YEARS
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-4">
                        <button onClick={() => handleEditRow(exp)} className="text-blue-600 hover:scale-125 transition-transform">
                          <FaPencilAlt size={14} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:scale-125 transition-transform">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm text-gray-400 italic">
                    No work experience documented.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  );
};

export default ExperienceTab;
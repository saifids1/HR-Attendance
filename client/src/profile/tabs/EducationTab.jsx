import React, { useState } from "react";
import {
  addEducations,
  updateEducation,
  deleteEducation,
} from "../../../api/profile";
import { emptyEducation } from "../../constants/emptyData";
import { FaPencilAlt, FaCheck, FaTimes } from "react-icons/fa";
import { MdDelete, MdAdd } from "react-icons/md";
import { toast } from "react-hot-toast";

const EducationTab = ({ educationData, onSave, empId }) => {
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);

  
  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const handleAddNew = () => {
    if (draft) return toast.error("Please save or cancel current changes first");
    setDraft({ ...emptyEducation });
    setIsAddingNew(true);
  };

  const handleEdit = (edu) => {
    if (draft) return toast.error("Please save or cancel current changes first");
    setDraft({ ...edu });
    setIsAddingNew(false);
  };

  const handleCancel = () => {
    setDraft(null);
    setErrors({});
    setIsAddingNew(false);
  };

  const handleSave = async () => {
   

    // Create a loading toast so the user knows work is happening
    const toastId = toast.loading("Saving education details...");

    try {
      const formData = new FormData();
      formData.append("education", JSON.stringify([draft]));
      if (draft.marksheet_file) formData.append("file_0", draft.marksheet_file);

      if (draft.id) {
        await updateEducation(empId, draft.id, formData);
        toast.success("Education updated", { id: toastId });
      } else {
        await addEducations(empId, formData);
        toast.success("New education added", { id: toastId });
    }

      setDraft(null);
      setIsAddingNew(false);
      
      // REFRESH DATA INSTANTLY
      if (onSave) {
        await onSave(); 
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    
    const toastId = toast.loading("Deleting record...");
    try {
      await deleteEducation(empId, id);
      toast.success("Deleted", { id: toastId });
      
      // REFRESH DATA INSTANTLY
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  return (
    <div className="container-fluid">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-end items-center mb-6 px-2">
          {/* <h2 className="text-xl font-bold text-gray-800">Education Details</h2> */}
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-all text-sm"
          >
            <MdAdd size={18} /> ADD NEW
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered w-full table-fixed align-middle mb-0">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="w-[18%] text-center">Degree</th>
                <th className="w-[20%] text-center">Field of Study</th>
                <th className="w-[20%] text-center">Institution</th>
                <th className="w-[12%] text-center">Year</th>
                <th className="w-[20%] text-center">University</th>
                <th className="w-[10%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New Row Input */}
              {isAddingNew && draft && !draft.id && (
                <EditableRow 
                  draft={draft} 
                  errors={errors} 
                  onChange={handleChange} 
                  onSave={handleSave} 
                  onCancel={handleCancel} 
                />
              )}

              {educationData?.map((edu) => (
                draft?.id === edu.id ? (
                  <EditableRow 
                    key={edu.id}
                    draft={draft} 
                    errors={errors} 
                    onChange={handleChange} 
                    onSave={handleSave} 
                    onCancel={handleCancel} 
                  />
                ) : (
                  <tr key={edu.id} className="text-center">
                    <td className="p-3 truncate">{edu.degree}</td>
                    <td className="p-3 truncate">{edu.field_of_study}</td>
                    <td className="p-3 truncate">{edu.institution_name}</td>
                    <td className="p-3">{edu.passing_year}</td>
                    <td className="p-3 truncate">{edu.university}</td>
                    <td className="p-3">
                      <div className="flex gap-4 items-center justify-center">
                        <button onClick={() => handleEdit(edu)} className="text-blue-500 hover:text-blue-700 transition-colors">
                          <FaPencilAlt size={14} />
                        </button>
                        <button onClick={() => handleDelete(edu.id)} className="text-red-500 hover:text-red-700 transition-colors">
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              
              {(!educationData || educationData.length === 0) && !isAddingNew && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500 italic bg-gray-50">
                    No records found. Click "Add New" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EditableRow = ({ draft, errors, onChange, onSave, onCancel }) => (
  <tr className="bg-blue-50/30">
    <td className="p-2">
      <input 
        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${errors.degree ? 'border-red-500' : 'border-gray-300'}`}
        value={draft.degree || ""} 
        onChange={(e) => onChange("degree", e.target.value)}
      />
    </td>
    <td className="p-2">
      <input 
        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${errors.field_of_study ? 'border-red-500' : 'border-gray-300'}`}
        value={draft.field_of_study || ""} 
        onChange={(e) => onChange("field_of_study", e.target.value)}
      />
    </td>
    <td className="p-2">
      <input 
        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${errors.institution_name ? 'border-red-500' : 'border-gray-300'}`}
        value={draft.institution_name || ""} 
        onChange={(e) => onChange("institution_name", e.target.value)}
      />
    </td>
    <td className="p-2">
      <input 
        className={`w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${errors.passing_year ? 'border-red-500' : 'border-gray-300'}`}
        value={draft.passing_year || ""} 
        onChange={(e) => onChange("passing_year", e.target.value)}
      />
    </td>
    <td className="p-2">
      <input 
        className="w-full px-2 py-1.5 text-sm border rounded border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
        value={draft.university || ""} 
        onChange={(e) => onChange("university", e.target.value)}
      />
    </td>
    <td className="p-2">
      <div className="flex gap-4 items-center justify-center">
        <button onClick={onSave} className="text-green-600 hover:text-green-800 transition-transform active:scale-90" title="Save">
          <FaCheck size={16} />
        </button>
        <button onClick={onCancel} className="text-orange-500 hover:text-orange-700 transition-transform active:scale-90" title="Cancel">
          <FaTimes size={16} />
        </button>
      </div>
    </td>
  </tr>
);

export default EducationTab;
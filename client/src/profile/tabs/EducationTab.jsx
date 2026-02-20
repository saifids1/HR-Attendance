import React, { useEffect, useState } from "react";
import {
  addEducations,
  updateEducation,
  deleteEducation,
} from "../../../api/profile";
import { emptyEducation, degreeOptions } from "../../constants/emptyData";
import { FaPencilAlt, FaCheck, FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";

const EducationTab = ({
  educationData,
  onSave,
  empId,
  isEditing,
  isAddingNew,
  setIsAddingNew,
}) => {
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  /* ================= CHANGE ================= */

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  /* ================= EDIT ================= */

  const handleEdit = (education, index) => {
    if (draft) {
      toast.error("Please save or cancel current changes first");
      return;
    }

    setEditingIndex(index);
    setDraft({ ...emptyEducation, ...education });
  };

  /* ================= CANCEL ================= */

  const handleCancel = () => {
    setDraft(null);
    setEditingIndex(null);
    setIsAddingNew(false);
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    if (!draft) return;

    const toastId = toast.loading("Saving education details...");

    try {
      const formData = new FormData();
      formData.append("education", JSON.stringify([draft]));

      if (draft.marksheet_file) {
        formData.append("file_0", draft.marksheet_file);
      }

      if (draft.id) {
        await updateEducation(empId, draft.id, formData);
        toast.success("Education updated", { id: toastId });
      } else {
        await addEducations(empId, formData);
        toast.success("New education added", { id: toastId });
      }

      setDraft(null);
      setEditingIndex(null);
      setIsAddingNew(false);

      if (onSave) await onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed", {
        id: toastId,
      });
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    const toastId = toast.loading("Deleting record...");
    try {
      await deleteEducation(empId, id);
      toast.success("Deleted", { id: toastId });
      if (onSave) await onSave();
    } catch {
      toast.error("Delete failed", { id: toastId });
    }
  };

  /* ================= AUTO NEW ROW ================= */

  useEffect(() => {
    if (isAddingNew) {
      setEditingIndex("new");
      setDraft({ ...emptyEducation });
    }
  }, [isAddingNew]);

  /* ================= UI ================= */

  return (
    <div className="container-fluid">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-bold text-gray-700" >Degree</th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">Field of Study</th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">Institution</th>
                <th className="px-4 py-2 text-left font-bold text-gray-700" >Year</th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">University</th>
                <th className="px-4 py-2 text-center font-bold text-gray-700">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {educationData?.map((edu, index) =>
                editingIndex === index ? (
                  <EditableRow
                    key={edu.id || index}
                    draft={draft}
                    onChange={handleChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <tr key={edu.id || index}>
                    <td className="px-4 py-2 text-sm">{edu.degree}</td>
                    <td className="px-4 py-2 text-sm">{edu.field_of_study}</td>
                    <td className="px-4 py-2 text-sm">{edu.institution_name}</td>
                    <td className="p-3">{edu.passing_year}</td>
                    <td className="px-4 py-2 text-sm">{edu.university}</td>
                    <td className="px-4 py-2 text-sm text-center">
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => handleEdit(edu, index)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaPencilAlt />
                        </button>

                        <button
                          onClick={() => handleDelete(edu.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <MdDelete size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {editingIndex === "new" && draft && (
                <EditableRow
                  draft={draft}
                  onChange={handleChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}

              {(!educationData || educationData.length === 0) &&
                !isAddingNew && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500 italic bg-gray-50">
                      No Education records found
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

/* ================= EDITABLE ROW ================= */

const EditableRow = ({ draft, onChange, onSave, onCancel }) => (
  <tr className="bg-blue-50/30">
    <td className="p-2" style={{width:"200px"}}>
      <select
        className="w-full border px-2 py-1 text-sm rounded"
        value={draft.degree || ""}
        onChange={(e) => onChange("degree", e.target.value)}
      >
        {degreeOptions.map((deg) => (
          <option key={deg} value={deg}>
            {deg}
          </option>
        ))}
      </select>
    </td>

    <td className="p-2" style={{width:"150px"}}>
      <input
        className="w-full px-2 py-1.5 text-sm border rounded border-gray-300"
        value={draft.field_of_study || ""}
        onChange={(e) => onChange("field_of_study", e.target.value)}
      />
    </td>

    <td className="p-2">
      <input
        className="w-full px-2 py-1.5 text-sm border rounded border-gray-300"
        value={draft.institution_name || ""}
        onChange={(e) => onChange("institution_name", e.target.value)}
      />
    </td>

    <td className="p-2" style={{width:"60px"}}>
      <input
        className="px-2 w-full py-1.5 text-sm border rounded border-gray-300"
        
        value={draft.passing_year || ""}
        onChange={(e) => onChange("passing_year", e.target.value)}
      />
    </td>

    <td className="p-2">
      <input
        className="w-full px-2 py-1.5 text-sm border rounded border-gray-300"
        value={draft.university || ""}
        onChange={(e) => onChange("university", e.target.value)}
      />
    </td>

    <td className="p-2">
      <div className="flex gap-4 justify-center">
        <button onClick={onSave} className="text-green-600">
          <FaCheck size={16} />
        </button>
        <button onClick={onCancel} className="text-orange-500">
          <FaTimes size={16} />
        </button>
      </div>
    </td>
  </tr>
);

export default EducationTab;
import React, { useEffect, useState } from "react";
import {
  addExperienceses,
  updateExperience,
  deleteExperience,
} from "../../../api/profile";
import { emptyExperience } from "../../constants/emptyData";
import { FaPencilAlt, FaCheck, FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import Loader from "../../components/Loader";

const ExperienceTab = ({
  experienceData = [],
  isEditing,
  isAddingNew,
  setIsAddingNew,
  empId,
  onSave,
}) => {
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /* ================= DATE FORMAT ================= */

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d)) return date;

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  const toInputDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return !isNaN(d) ? d.toISOString().split("T")[0] : "";
  };

  /* ================= HANDLE NEW ROW ================= */

  useEffect(() => {
    if (isAddingNew && !draft) {
      setDraft({ ...emptyExperience });
    }
  }, [isAddingNew,draft]);

  /* ================= HANDLE CHANGE ================= */

  const handleChange = (key, value) => {
    setDraft((prev) => {
      const updated = { ...prev, [key]: value };

      if (
        (key === "start_date" || key === "end_date") &&
        updated.start_date &&
        updated.end_date
      ) {
        const start = new Date(updated.start_date);
        const end = new Date(updated.end_date);

        if (end >= start) {
          const diff = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
          updated.total_years = diff.toFixed(1);
        } else {
          updated.total_years = "0";
        }
      }

      return updated;
    });
  };

  /* ================= EDIT ================= */

  const handleEdit = (exp) => {
    if (draft) {
      toast.error("Please save or cancel current changes first");
      return;
    }

    setDraft({
      ...exp,
      companyName: exp.company_name,
      companyLocation: exp.location,
      start_date: toInputDate(exp.start_date),
      end_date: toInputDate(exp.end_date),
    });
  };

  /* ================= CANCEL ================= */

  const handleCancel = () => {
    setDraft(null);
    setErrors({});
    setIsAddingNew(false);
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    if (!draft) return;

    const toastId = toast.loading("Saving experience...");

    try {
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
        toast.success("Experience updated", { id: toastId });
      } else {
        await addExperienceses(empId, payload);
        toast.success("New experience added", { id: toastId });
      }

      setDraft(null);
      setIsAddingNew(false);

      if (onSave) {
        console.log("calling after save")
        await onSave(); // refresh parent
      }
    } catch (err) {
      console.log(err);
      toast.error("Save failed", { id: toastId });
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    const toastId = toast.loading("Deleting record...");

    try {
      await deleteExperience(empId, id);
      toast.success("Deleted", { id: toastId });

      if (onSave) {
        await onSave(); // refresh parent
      }
    } catch (error) {
      console.log(error);
      toast.error("Delete failed", { id: toastId });
    }
  };

  /* ================= UI ================= */

  return (
    <div className="container-fluid">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  Company
                </th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  Location
                </th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  Designation
                </th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  Start Date
                </th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  End Date
                </th>
                <th className="px-4 py-2 text-left font-bold text-gray-700">
                  Years
                </th>
                <th className="px-4 py-2 text-center font-bold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10">
                    <Loader />
                  </td>
                </tr>
              ) : (
                experienceData.map((exp) =>
                  draft && String(draft.id) === String(exp.id) ? (
                    <EditableRow
                      key={exp.id}
                      draft={draft}
                      onChange={handleChange}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  ) : (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="text-sm px-4 py-2">
                        {exp.company_name}
                      </td>
                      <td className="text-sm px-4 py-2">
                        {exp.location}
                      </td>
                      <td className="text-sm px-4 py-2">
                        {exp.designation}
                      </td>
                      <td className="text-sm px-4 py-2">
                        {formatDate(exp.start_date)}
                      </td>
                      <td className="text-sm px-4 py-2">
                        {formatDate(exp.end_date)}
                      </td>
                      <td className="text-sm px-4 py-2">
                        {exp.total_years} yrs
                      </td>
                      <td className="text-sm px-4 py-2 text-center">
                        <div className="flex justify-center gap-4">
                          <button
                            onClick={() => handleEdit(exp)}
                            className="text-blue-600"
                          >
                            <FaPencilAlt />
                          </button>

                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="text-red-500"
                          >
                            <MdDelete size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}

              {/* NEW ROW */}
              {isAddingNew && draft && !draft.id && (
                <EditableRow
                  draft={draft}
                  onChange={handleChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EditableRow = ({ draft, onChange, onSave, onCancel }) => (
  <tr className="bg-blue-50/30">
    <td className="p-2">
      <input
        value={draft.companyName || ""}
        onChange={(e) => onChange("companyName", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2">
      <input
        value={draft.companyLocation || ""}
        onChange={(e) => onChange("companyLocation", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2">
      <input
        value={draft.designation || ""}
        onChange={(e) => onChange("designation", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2">
      <input
        type="date"
        value={draft.start_date || ""}
        onChange={(e) => onChange("start_date", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2">
      <input
        type="date"
        value={draft.end_date || ""}
        onChange={(e) => onChange("end_date", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2">
      <input
        value={draft.total_years || ""}
        onChange={(e) => onChange("total_years", e.target.value)}
        className="w-full border px-2 py-1 text-sm rounded"
      />
    </td>

    <td className="p-2 text-center">
      <div className="flex justify-center gap-4">
        <button onClick={onSave} className="text-green-600">
          <FaCheck />
        </button>
        <button onClick={onCancel} className="text-orange-500">
          <FaTimes />
        </button>
      </div>
    </td>
  </tr>
);

export default ExperienceTab;

import React, { useEffect, useState } from "react";
import { addContact, updateContact, deleteContact } from "../../../api/profile";
import { emptyContact } from "../../constants/emptyData";
import { FaPencilAlt, FaCheck, FaTimes } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";

const contactTypeOptions = ["Personal", "Emergency", "Work"];

const ContactTab = ({
  contactData,
  onSave,
  empId,
  isAddingNew,
  setIsAddingNew,
}) => {
  const [draft, setDraft] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const hasData = contactData && contactData.length > 0;

  /* ================= HANDLE CHANGE ================= */

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  /* ================= EDIT ================= */

  const handleEdit = (contact, index) => {
    if (draft) {
      toast.error("Please save or cancel current changes first");
      return;
    }
    setEditingIndex(index);
    setDraft({ ...contact });
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

    const payload = {
      contact_type: draft.contact_type,
      phone: draft.phone,
      email: draft.email,
      relation: draft.relation,
      is_primary: draft.is_primary ?? false,
    };

    try {
      if (draft.id) {
        // UPDATE: existing contact
        const updatedList = contactData.map((c) =>
          c.id === draft.id ? { ...c, ...payload } : c,
        );
        await updateContact(empId, updatedList);
        toast.success("Contact updated");
      } else {
        // ADD: new contact (covers both isAddingNew and empty-state editable row)
        await addContact(empId, [payload]);
        toast.success("New contact added");
      }

      setDraft(null);
      setEditingIndex(null);
      setIsAddingNew(false);

      if (onSave) await onSave();
    } catch (err) {
      toast.error("Save failed");
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteContact(empId, id);
      toast.success("Deleted");
      if (onSave) await onSave();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  /* ================= HANDLE NEW ROW ================= */

  useEffect(() => {
    if (isAddingNew) {
      if (draft) {
        toast.error("Please save or cancel current changes first");
        setIsAddingNew(false);
        return;
      }
      setDraft({ ...emptyContact });
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
                <th className="px-4 py-2 text-left text-sm text-gray-600 font-medium">Type</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 font-medium">Phone</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 font-medium">Email</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 font-medium">Relation</th>
                <th className="px-4 py-2 text-center text-sm text-gray-600 font-medium">Primary</th>
                <th className="px-4 py-2 text-center text-sm text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">

              {/* ── CASE 1 & 2 : contactData exists → show real rows ── */}
              {hasData &&
                contactData.map((contact, index) =>
                  editingIndex === index ? (
                    // Editing an existing row
                    <EditableRow
                      key={contact.id}
                      draft={draft}
                      onChange={handleChange}
                      onSave={handleSave}
                      onCancel={handleCancel}
                    />
                  ) : (
                    <tr key={contact.id}>
                      <td className="px-4 py-2 text-sm text-gray-600">{contact.contact_type}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{contact.phone}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{contact.email}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{contact.relation}</td>
                      <td className="px-4 py-2 text-center text-sm text-gray-600">
                        {contact.is_primary ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-2 text-sm text-center text-gray-600">
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={() => handleEdit(contact, index)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <FaPencilAlt />
                          </button>
                          <button
                            onClick={() => handleDelete(contact.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <MdDelete size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}

              {/* ── CASE 3 : no contactData → show one editable empty row ── */}
              {!hasData && !isAddingNew && (
                editingIndex === 0 ? (
                  <EditableRow
                    draft={draft}
                    onChange={handleChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-400">{emptyContact.contact_type}</td>
                    <td className="px-4 py-2 text-sm text-gray-400">{emptyContact.phone}</td>
                    <td className="px-4 py-2 text-sm text-gray-400">{emptyContact.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-400">{emptyContact.relation}</td>
                    <td className="px-4 py-2 text-center text-sm text-gray-400">{emptyContact.is_primary ? "Yes" : "No"}</td>
                    <td className="px-4 py-2 text-center text-sm text-gray-400">
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => {
                            setDraft({ ...emptyContact });
                            setEditingIndex(0);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FaPencilAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {/* ── CASE 4 : isAddingNew → append a fresh editable row ── */}
              {isAddingNew && !draft?.id && (
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

/* ================= EDITABLE ROW ================= */

const EditableRow = ({ draft, onChange, onSave, onCancel }) => {
  if (!draft) return null;

  return (
    <tr className="bg-blue-50/30">
      <td className="p-2 text-sm text-gray-600">
        <select
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.contact_type || ""}
          onChange={(e) => onChange("contact_type", e.target.value)}
        >
          <option value="" disabled>Select type</option>
          {contactTypeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </td>
      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.phone || ""}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="Phone"
        />
      </td>
      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.email || ""}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="Email"
        />
      </td>
      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.relation || ""}
          onChange={(e) => onChange("relation", e.target.value)}
          placeholder="Relation"
        />
      </td>
      <td className="p-2 text-center text-sm text-gray-600">
        <input
          type="checkbox"
          checked={draft.is_primary || false}
          onChange={(e) => onChange("is_primary", e.target.checked)}
        />
      </td>
      <td className="p-2 text-sm text-gray-600">
        <div className="flex gap-4 items-center justify-center">
          <button onClick={onSave} className="text-green-600 hover:text-green-800">
            <FaCheck size={16} />
          </button>
          <button onClick={onCancel} className="text-orange-500 hover:text-orange-700">
            <FaTimes size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default ContactTab;
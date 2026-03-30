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
  const [errors, setErrors] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  // console.log("contactData",contactData);

  /* ================= HANDLE CHANGE ================= */

 const handleChange = (key, value) => {
  setDraft((prev) => {
    let newValue = value;

    // 1. Phone Validation: Only digits, max 10
    if (key === "phone") {
      if (!/^\d*$/.test(value) || value.length > 10) {
        return prev; // Reject the change
      }
    }

    // 2. Email Validation: Auto-lowercase for uniqueness
    if (key === "email") {
      newValue = value.toLowerCase().trim();
    }

    // 3. Primary Contact Logic: 
    // If setting this row to Primary, we return the new state.
    // (The actual "unchecking" of other rows happens in handleSave 
    // to avoid mutating the main 'rows' list prematurely).
    return { 
      ...prev, 
      [key]: newValue 
    };
  });
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

  // --- 1. Validations (Phone/Email) ---
  if (draft.phone.length !== 10) return toast.error("Phone must be 10 digits");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(draft.email)) return toast.error("Invalid email");

  // --- 2. The "Primary Swap" Logic ---
  let finalArray;

  if (draft.id) {
    // UPDATING an existing row
    finalArray = contactData.map((item) => {
      if (item.id === draft.id) {
        return { ...draft }; // Save the current edit
      }
      // If the current draft is Primary, force all OTHER rows to false
      return draft.is_primary ? { ...item, is_primary: false } : item;
    });
  } else {
    // ADDING a new row
    const newEntry = { ...draft };
    
    // If new entry is Primary, map through existing data to remove their Primary status
    const existingDataAdjusted = draft.is_primary 
      ? contactData.map(item => ({ ...item, is_primary: false }))
      : [...contactData];

    finalArray = [...existingDataAdjusted, newEntry];
  }

  // --- 3. API Call ---
  try {
    // Send the whole array to updateContactInfo
    await updateContact(empId, finalArray);
    
    toast.success(draft.is_primary ? "Primary contact updated" : "Contact saved");
    
    // Reset UI
    setDraft(null);
    setEditingIndex(null);
    setIsAddingNew(false);
    if (onSave) await onSave(); 
  } catch (err) {
    toast.error(err.response?.data?.message || "Save failed");
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
      setDraft({ contact_type: "Personal"});
    }
  }, [isAddingNew]);

  /* ================= DATA SOURCE ================= */

  const rows =
    contactData && contactData.length > 0 ? contactData : [];

    // console.log("Contact - rows",rows)
  /* ================= UI ================= */

  return (
    <div className="container-fluid">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
                  Phone
                </th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
                  Relation
                </th>
                <th className="px-4 py-2 text-center text-sm text-gray-600 mb-1 font-medium">
                  Primary
                </th>
                <th className="px-4 py-2 text-center text-sm text-gray-600 mb-1 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((contact, index) =>
                editingIndex === index ? (
                  <EditableRow
                    key={contact.id || "new"}
                    draft={draft}
                    onChange={handleChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <tr key={contact.id || index}>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {contact.contact_type}
                    </td>
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
                          {draft && draft.id === contact.id ? (
                            <FaCheck />
                          ) : (
                            <FaPencilAlt />
                          )}
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
              {rows.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">
                    No contact information available
                  </td>
                </tr>
              )}
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
          {contactTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </td>

      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.phone || ""}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </td>

      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.email || ""}
          onChange={(e) => onChange("email", e.target.value)}
        />
      </td>

      <td className="p-2 text-sm text-gray-600">
        <input
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft.relation || ""}
          onChange={(e) => onChange("relation", e.target.value)}
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
          <button
            onClick={onSave}
            className="text-green-600 hover:text-green-800"
          >
            <FaCheck size={16} />
          </button>
          <button
            onClick={onCancel}
            className="text-orange-500 hover:text-orange-700"
          >
            <FaTimes size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default ContactTab;

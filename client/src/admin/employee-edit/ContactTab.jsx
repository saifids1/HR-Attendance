import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { getContact, updateContact, deleteContact, addContact } from "../../../api/profile";

const emptyContact = {
  id: null,
  contact_type: "Emergency",
  relation: "",
  phone: "",
  email: "",
  is_primary: false,
};

const ContactsTab = ({ isEditing, setIsEditing }) => {
  const { emp_id } = useParams();
  const [loading, setLoading] = useState(false);
  const [savedContacts, setSavedContacts] = useState([]);
  const [draft, setDraft] = useState({ ...emptyContact });

  // 1. Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getContact(emp_id);
      // Accessing res.data.contacts based on your previous structure
      setSavedContacts(res.data?.contacts || []);
    } catch (err) {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(()=>{

    console.log("savedContacts",savedContacts)
  },[savedContacts])
  // 2. Form Handlers
  const handleAddNew = () => {
    setDraft({ ...emptyContact });
    setIsEditing(true);
  };

  const handleEditRow = (item,id) => {
    setDraft({ ...item, is_primary: !!item.is_primary,id });
    setIsEditing(true);
  };

  const handleChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  // 3. Save Logic
  const handleSave = async () => {
    const newErrors = {};
    // Validate fields based on emptyContact keys
    Object.keys(emptyContact).forEach((key) => {
      if (key !== "id" && key !== "is_primary" && (!draft[key] || draft[key].toString().trim() === "")) {
        newErrors[key] = "REQUIRED";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill all fields");
      return;
    }

    try {
      // Prepare the object in the format backend expects (snake_case)
      const contactObject = {
        contact_type: draft.contactType || draft.contact_type,
        phone: draft.phone,
        email: draft.email,
        relation: draft.relation,
        is_primary: draft.is_primary ?? false,
      };

      if (draft.id) {
        /** * UPDATE CASE:
         * Your backend update logic wipes the table and re-inserts the array.
         * Therefore, we must send the CURRENT saved list with the edited item swapped in.
         */
        const updatedFullList = savedContacts.map((c) => 
          c.id === draft.id ? contactObject : {
            contact_type: c.contact_type,
            phone: c.phone,
            email: c.email,
            relation: c.relation,
            is_primary: c.is_primary
          }
        );

        await updateContact(emp_id, updatedFullList);
        toast.success("Contact updated successfully");
      } else {
        
        await addContact(emp_id, [contactObject]);
        toast.success("New contact added");
      }

      loadData();
      setIsEditing(false); 
    } catch (err) {
      console.error("Save Error:", err);
      toast.error(err.response?.data?.message || "Save failed");
    }
  };


  // 4. Delete Logic
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact permanently?")) return;
    try {
      await deleteContact(emp_id, id);
      toast.success("Contact deleted");
      loadData();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Animated Edit/Add Form Section */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isEditing ? "opacity-100 mb-8 max-h-[1000px]" : "opacity-0 max-h-0"}`}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-blue-700 font-bold uppercase text-xs tracking-wider">
            {draft.id ? "Edit Contact" : "Add New Contact"}
          </h3>
        </div>

        <div className="w-full border rounded-xl p-6 bg-white shadow-sm border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 w-full">
            
            {/* Contact Type Select */}
            <div className="w-full flex flex-col group">
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1 uppercase transition-colors group-focus-within:text-blue-600">
                Contact Type
              </label>
              <select
                value={draft.contact_type}
                onChange={(e) => handleChange("contact_type", e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            {/* Relation Input */}
            <div className="w-full flex flex-col group">
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1 uppercase">Relation</label>
              <input
                type="text"
                value={draft.relation}
                onChange={(e) => handleChange("relation", e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                placeholder="e.g. Spouse"
              />
            </div>

            {/* Phone Input */}
            <div className="w-full flex flex-col group">
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1 uppercase">Phone Number</label>
              <input
                type="text"
                value={draft.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              />
            </div>

            {/* Email Input */}
            <div className="w-full flex flex-col group">
              <label className="text-[11px] font-bold text-gray-500 mb-1.5 ml-1 uppercase">Email Address</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
              />
            </div>

            {/* Primary Toggle */}
            <div className="w-full flex flex-col justify-center pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={draft.is_primary}
                  onChange={(e) => handleChange("is_primary", e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-600 group-hover:text-blue-600 transition-colors">
                Primary Contact
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-5">
            <button className="px-6 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button className="px-8 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition" onClick={handleSave}>
              {draft.id ? "Update Contact" : "Save Contact"}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Table Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-700 font-bold">Contact Records</h2>
          {!isEditing && (
            <button onClick={handleAddNew} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2">
               + Add Contact
            </button>
          )}
        </div>

        <div className="overflow-x-auto shadow-sm rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[11px] font-bold">
              <tr>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Relation</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="py-10 text-center text-gray-400">Loading...</td></tr>
              ) : savedContacts.length > 0 ? (
                savedContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{contact.contact_type}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.relation || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{contact.email}</td>
                    <td className="px-6 py-4">
                      {contact.is_primary ? (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">PRIMARY</span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">SECONDARY</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center gap-3">
                      <button onClick={() => handleEditRow(contact,contact.id)} className="text-blue-600 hover:scale-110 transition"><FaPencilAlt /></button>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:scale-110 transition"><MdDelete size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContactsTab;
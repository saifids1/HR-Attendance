import React, { useContext, useEffect, useState, useCallback } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import Loader from "../../components/Loader";
import {
  getContact,
  addContact,
  updateContact,
  deleteContact,
} from "../../../api/profile";
import { emptyContact } from "../../constants/emptyData";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";

const ContactTab = ({contact, isEditing, setIsEditing }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const { token } = useContext(AuthContext);

  const [draft, setDraft] = useState({ ...emptyContact });
  const [savedContacts, setSavedContacts] = useState(contact ? contact:draft);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!emp_id) return;
    setLoading(true);
    try {
      const res = await getContact(emp_id);
      const rawData = res?.data?.contacts || [];

      const formattedData = rawData.map((c) => ({
        ...c,
        contactType: c.contact_type,
      }));

      setSavedContacts(formattedData);
      setDraft({ ...emptyContact });
      setErrors({});
    } catch (err) {
      console.error("Fetch Contact Error:", err);
      toast.error(err.response?.data?.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(() => {
    if (token && emp_id) {
      fetchContacts();
    }
  }, [emp_id, fetchContacts, token]);

  const handleChange = (key, value) => {
    // Check if the field is meant to be numeric (e.g., phone, zip, emp_id)
    // const numericFields = ['phone', 'zip_code', 'emp_id', 'aadhaar_no',];
  
    // if (numericFields.includes(key)) {
    //   const cleanValue = value.replace(/\D/g, "");
      
    //   setDraft((prev) => ({ ...prev, [key]: cleanValue }));
    // } else {
      // Normal update for other fields
      setDraft((prev) => ({ ...prev, [key]: value }));
    // }
  };

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

      fetchContacts();
      setIsEditing(false);
    } catch (err) {
      console.error("Save Error:", err);
      toast.error(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact record?")) return;
    try {
      await deleteContact(emp_id, id);
      toast.success("Deleted");
      fetchContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (contact) => {
    setDraft({ ...contact });
    setErrors({});
    setIsEditing(true); // Ensure the form is enabled when clicking edit icon
  };

  const handleCancel = () => {
     setDraft({ ...emptyContact });
     setErrors({});
     setIsEditing(false);
   };

  return (
    <>
      <FormCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">

        {Object.keys(emptyContact).map((key) => {
          if (key === "id") return null;

          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/_/g, " ")
            .toUpperCase();


          if (key === "isPrimary") {
            return (
              <div key={key} className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={draft[key] || false}
                  disabled={!isEditing}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="w-4 h-4"
                />
                <label className="text-sm font-semibold">{label}</label>
              </div>
            );
          }

          //Dropdown for contact_type
          if (key === "contact_type") {
            return (
              <div key={key} className="flex flex-col mb-3">
                <label className="text-sm font-semibold mb-1">{label}</label>
                <select
                  value={draft[key] || ""}
                  disabled={!isEditing}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={`border rounded p-2 ${!isEditing ? "bg-gray-200" : ""}`}
                >
                  <option value="">Select Type</option>
                  <option value="Personal">Personal</option>
                  <option value="Work">Work</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            );
          }

          // Normal Input Fields
          return (
            <div key={key} className="flex flex-col mb-3">
              <Input
                label={label}
                type="text" 
                value={draft[key] || ""}
                disabled={!isEditing}
                onChange={(e) => {
                  // Replace non-digits before passing to the handler
                  // const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                  handleChange(key, e.target.value);
                }}
              />

              {isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                  * {errors[key]}
                </p>
              )}
            </div>
          );
        })}
        </div>
      </FormCard>



      {isEditing && (
        <div className="flex justify-end gap-3 mt-2 p-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={handleCancel}>
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>
            {draft.id ? "Update Contact" : "Add Contact"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto mt-6 shadow-sm rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-3 text-left">Contact Type</th>
              <th className="border px-4 py-3 text-left">Phone</th>
              <th className="border px-4 py-3 text-left">Email</th>
              <th className="border px-4 py-3 text-left">Relation</th>
              <th className="border px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

           
  
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10">
                  <div className="flex justify-center mb-2"><Loader /></div>
                  Fetching Contact Records...
                </td>
              </tr>
            ) : savedContacts.length > 0 ? (
              savedContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <td className="border px-4 py-2 font-medium">{contact.contact_type}</td>
                  <td className="border px-4 py-2">{contact.phone}</td>
                  <td className="border px-4 py-2">{contact.email}</td>
                  <td className="border px-4 py-2">{contact.relation}</td>
                  <td className="border px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(contact)} className="text-blue-600 hover:text-blue-800">
                        <FaPencilAlt size={14} />
                      </button>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 hover:text-red-800">
                        <MdDelete size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-400">
                  No contact information added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ContactTab;
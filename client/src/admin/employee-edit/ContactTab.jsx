import React, { useState, useEffect } from "react";

const ContactsTab = ({ contactData, onSave, isEditing, setIsEditing }) => {
  // Array of contacts state
  const [contacts, setContacts] = useState([]);

    useEffect(()=>{

      console.log("contacts",contacts)
    },[contacts])

  // Sync with parent data
  useEffect(() => {
    // 1. Check if we actually have data from the API
    if (contactData && Array.isArray(contactData) && contactData.length > 0) {
      const formatted = contactData.map(c => ({
        id: c.id, // Primary key from DB
        contact_type: c.contact_type || "",
        phone: c.phone || "",
        email: c.email || "",
        relation: c.relation || "",
        isPrimary: c.is_primary || false,
      }));
      setContacts(formatted);
    } 
    // 2. If API returned nothing, but we are in Edit Mode, show one blank row
    else if (isEditing) {
      setContacts([{ contact_type: "Emergency", phone: "", email: "", relation: "", isPrimary: true }]);
    }
  }, [contactData, isEditing]); // Runs whenever data arrives OR edit mode toggles

  const handleChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const updated = [...contacts];
    updated[index][name] = type === "checkbox" ? checked : value;
    setContacts(updated);
  };

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Contact Details</h3>
      
      {contacts.map((contact, index) => (
        <div key={index} className="p-4 border rounded-lg bg-gray-50 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Contact Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Type</label>
              <select
                name="contact_type"
                disabled={!isEditing}
                value={contact.contact_type}
                onChange={(e) => handleChange(index, e)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100"
              >
                <option value="">Select Type</option>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            {/* Relation */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Relation</label>
              <input
                type="text"
                name="relation"
                placeholder="e.g. Father, Spouse, Self"
                disabled={!isEditing}
                value={contact.relation}
                onChange={(e) => handleChange(index, e)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                name="phone"
                disabled={!isEditing}
                value={contact.phone}
                onChange={(e) => handleChange(index, e)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                name="email"
                disabled={!isEditing}
                value={contact.email}
                onChange={(e) => handleChange(index, e)}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100"
              />
            </div>

            {/* Primary Checkbox */}
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                name="isPrimary"
                id={`primary-${index}`}
                disabled={!isEditing}
                checked={contact.isPrimary}
                onChange={(e) => handleChange(index, e)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor={`primary-${index}`} className="ml-2 block text-sm text-gray-900 font-medium">
                Set as Primary Contact
              </label>
            </div>
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button 
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => onSave(contacts)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update 
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactsTab;
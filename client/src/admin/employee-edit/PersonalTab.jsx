import React, { useState, useEffect } from "react";
// Ek helper function date format convert karne ke liye
const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    
    // Agar date already YYYY-MM-DD hai (contains '-'), aur pehla part 4 digits ka hai
    if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) {
      return dateStr;
    }
  
    // Agar date DD-MM-YYYY format mein hai
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
    }
    
    return dateStr;
  };
const PersonalTab = ({ personalData, onSave, isEditing, setIsEditing }) => {
    const [formData, setFormData] = useState({
        emp_id: "",           // Unique Key
        name: "",
        email: "",
        department: "",
        designation: "",
        status: "Active",
        dob: "",              // Format: YYYY-MM-DD
        joining_date: "",     // Format: YYYY-MM-DD
        gender: "",
        marital_status: "",
        nationality: "",
        blood_group: "",      // SQL: bloodgroup
        aadharnumber: "",          // SQL: aadharnumber
        address: "",
        nominee: ""           // SQL mein hai, state mein add karein
      });

  // Sync local state when parent data changes
  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      setFormData({
        ...personalData,
        name: personalData.name || "",
        // Date formatting yahan apply karein
        dob: formatDateForInput(personalData.dob),
        joining_date: formatDateForInput(personalData.joining_date),
        emp_id: personalData.emp_id || "",
        email: personalData.email || "",
        designation: personalData.designation || "",
        status: personalData.status || "Active",
        department: personalData.department || "",
        gender: personalData.gender || "",
        marital_status: personalData.marital_status || "",
        nationality: personalData.nationality || "",
        blood_group: personalData.blood_group || "",
        aadhaar: personalData.aadhaar || "",
        address: personalData.address || ""
      });
    }
  }, [personalData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            name="name"
            disabled={!isEditing}
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div>

        {/* Employee ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Employee ID</label>
          <input
            type="text"
            name="emp_id"
            disabled
            value={formData.emp_id}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 bg-gray-100"
          />
        </div>

        {/* Official Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Official Email</label>
          <input
            type="email"
            name="email"
            disabled={!isEditing}
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Department</label>
          <input
            type="text"
            name="department"
            disabled={!isEditing}
            value={formData.department}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div>

        {/* Designation */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700">Designation / Role</label>
          <input
            type="text"
            name="designation"
            disabled={!isEditing}
            value={formData.designation}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div> */}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Employment Status</label>
          <select
            name="status"
            disabled={!isEditing}
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            name="dob"
            disabled={!isEditing}
            value={formData.dob}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div>

        {/* Date of Joining */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
          <input
            type="date"
            name="joining_date"
            disabled={!isEditing}
            value={formData.joining_date}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            name="gender"
            disabled={!isEditing}
            value={formData.gender}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Address */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">Residential Address</label>
        <textarea
          name="address"
          disabled={!isEditing}
          value={formData.address || ""}
          onChange={handleChange}
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50"
        />
      </div>

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
            onClick={() => onSave(formData)} // Passing local data to parent
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Update Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonalTab;
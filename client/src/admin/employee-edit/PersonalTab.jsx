import React, { useState, useEffect } from "react";

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  // Check if already YYYY-MM-DD
  if (dateStr.includes("-") && dateStr.split("-")[0].length === 4) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return dateStr;
};

const PersonalTab = ({ personalData, onSave, isEditing, setIsEditing }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    status: "Active",
    dob: "",
    joining_date: "",
    gender: "Male",
    maritalstatus: "Single",
    nationality: "Indian",
    bloodgroup: "O+",
    aadharnumber: "",
    address: "",
    nominee: ""
  });

  useEffect(() => {
    if (personalData && Object.keys(personalData).length > 0) {
      setFormData({
        name: personalData.name || "",
        // emp_id: personalData.emp_id || "", // Keep for display/reference
        email: personalData.email || "",
        department: personalData.department || "",
        designation: personalData.designation || personalData.role || "",
        status: personalData.is_active === false ? "Inactive" : "Active",
        dob: formatDateForInput(personalData.dob),
        joining_date: formatDateForInput(personalData.joining_date),
        gender: personalData.gender || "Male",
        maritalstatus: personalData.maritalstatus || "Single",
        nationality: personalData.nationality || "Indian",
        bloodgroup: personalData.bloodgroup || "O+",
        aadharnumber: personalData.aadharnumber || "",
        address: personalData.address || "",
        nominee: personalData.nominee || ""
      });
    }
  }, [personalData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Construct the exact JSON format for the backend
    const payload = {
      name: formData.name,
      email: formData.email,
      department: formData.department,
      designation: formData.designation,
      status: formData.status,
      dob: formData.dob,
      joining_date: formData.joining_date,
      gender: formData.gender,
      maritalstatus: formData.maritalstatus,
      nationality: formData.nationality,
      bloodgroup: formData.bloodgroup,
      aadharnumber: formData.aadharnumber,
      address: formData.address,
      nominee: formData.nominee || "null" // Match your request for "null" string if empty
    };

    console.log("payload",payload);

    onSave(payload);
  };

  const inputClass = "mt-1 block w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all";

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">NAME</label>
          <input type="text" name="name" disabled={!isEditing} value={formData.name} onChange={handleChange} className={inputClass} />
        </div>

        {/* <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</label>
          <input type="text" name="emp_id" disabled value={formData.emp_id} className="mt-1 block w-full border border-gray-200 rounded-md p-2 bg-blue-50 text-blue-700 font-bold" />
        </div> */}

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">EMAIL</label>
          <input type="email" name="email" disabled={!isEditing} value={formData.email} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
          <input type="text" name="department" disabled={!isEditing} value={formData.department} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</label>
          <input type="text" name="designation" disabled={!isEditing} value={formData.designation} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
          {/* <input type="text" /> */}
          <select name="status" disabled={!isEditing} value={formData.status} onChange={handleChange} className={inputClass}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">DOB</label>
          <input type="date" name="dob" disabled={!isEditing} value={formData.dob} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">JOINING DATE</label>
          <input type="date" name="joining_date" disabled={!isEditing} value={formData.joining_date} onChange={handleChange} className={inputClass} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</label>
          <select name="gender" disabled={!isEditing} value={formData.gender} onChange={handleChange} className={inputClass}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">MARITALSTATUS</label>
          <select name="maritalstatus" disabled={!isEditing} value={formData.maritalstatus} onChange={handleChange} className={inputClass}>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Nationality</label>
          <input type="text" name="nationality" disabled={!isEditing} value={formData.nationality} onChange={handleChange} className={inputClass} />
        </div>

        
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">BLOODGROUP</label>
          <select name="bloodgroup" disabled={!isEditing} value={formData.bloodgroup} onChange={handleChange} className={inputClass}>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">AADHARNUMBER</label>
          <input type="text" name="aadharnumber" disabled={!isEditing} value={formData.aadharnumber} onChange={handleChange} className={inputClass} />
        </div>

       

        

        
      
        <div className="">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">ADDRESS</label>
        <input name="address" disabled={!isEditing} value={formData.address} onChange={handleChange} rows="2" className={inputClass} />
      </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Nominee</label>
          <input type="text" name="nominee" disabled={!isEditing} value={formData.nominee} onChange={handleChange} className={inputClass} />
        </div>
    
      </div>

    

      {isEditing && (
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm">Save Changes</button>
        </div>
      )}
    </div>
  );
};

export default PersonalTab;
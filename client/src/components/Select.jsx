import React from 'react'
const Select = ({ label, disabled, ...props }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        {...props}
        disabled={disabled}
        className={`w-full border rounded px-3 py-2 text-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
      >
        <option>Full Time</option>
        <option>Part Time</option>
        <option>Internship</option>
      </select>
    </div>
  );


export default Select;
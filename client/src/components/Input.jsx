import React from 'react'

const Input = ({ label, disabled, ...props }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        {...props}
        disabled={disabled}
        className={`w-full border rounded px-3 py-2 text-sm ${disabled ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
      />
    </div>
  );

export default Input
import React from "react";

const Input = ({ label, disabled,isEditing,placehoder, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm text-gray-600 font-medium capitalize">
      {label?.replace(/_/g, " ")}
    </label>

    <input 
    style={{textTransform : "capitalize"}}
    placeholder={placehoder}
      {...props}
      disabled={disabled}
      className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${
        isEditing ? "" : "cursor-not-allowed"
      }`}
    />
  </div>
);

export default Input;

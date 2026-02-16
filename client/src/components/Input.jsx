import React from 'react';

const Input = ({ label, disabled, error, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm text-gray-600 font-medium">
      {label?.replace(/_/g, " ")}
    </label>

    <input
      {...props}
      disabled={disabled}
      className={`
        border rounded px-3 py-2 text-sm
        transition-all duration-200
        ${disabled
          ? "bg-gray-200 text-gray-600 cursor-not-allowed border-gray-300"
          : error 
            ? "border-red-500 bg-red-50/10 focus:ring-red-200" 
            : "bg-white text-gray-900 border-gray-300 focus:ring-[#222F7D]/20 focus:border-[#222F7D]"}
        focus:outline-none focus:ring-2
      `}
    />
  </div>
);

export default Input;
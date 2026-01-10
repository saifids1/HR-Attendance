import React from "react";

const Select = ({
  label,
  value,
  onChange,
  options = [],
  disabled,
  placeholder = "Select",
}) => {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">
        {label}
      </label>

      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full border rounded px-3 py-2 text-sm
          ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
        `}
      >
        {/* Placeholder */}
        <option value="" disabled>
          {placeholder}
        </option>

        {/* Dynamic options */}
        {options.map((opt, index) => (
          <option key={index} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;

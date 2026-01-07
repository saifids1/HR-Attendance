import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

const SidebarDropdown = ({
  icon: Icon,
  label,
  items = [],
  openSidebar,
  activeBasePath,
}) => {
  const location = useLocation();
  const [open, setOpen] = useState(
    location.pathname.startsWith(activeBasePath)
  );

  const isActive = location.pathname.startsWith(activeBasePath);

  return (
    <div>
      {/* Parent */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-2 rounded border transition
        ${
          isActive
            ? "bg-[#222F7D] text-white"
            : "hover:bg-[#222F7D] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={20} />
          {openSidebar && <span>{label}</span>}
        </div>

        {openSidebar && (
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {/* Child Items */}
      {open && (
        <div className="ml-8 mt-2 space-y-1">
          {items.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded text-sm transition
                 ${
                   isActive
                     ? "bg-blue-100 text-[#222F7D] font-medium"
                     : "text-gray-700 hover:bg-blue-50"
                 }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarDropdown;

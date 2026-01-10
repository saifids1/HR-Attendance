import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

const SidebarDropdown = ({
  icon: Icon,
  label,
  items = [],
  openSidebar,
  activeBasePath = "",
}) => {
  const location = useLocation();

  const isActive = location.pathname.startsWith(activeBasePath);
  const [open, setOpen] = useState(isActive);

  // ✅ Auto-open when route changes (important)
  useEffect(() => {
    if (isActive) {
      setOpen(true);
    }
  }, [isActive]);

  return (
    <div>
      {/* Parent */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-4 py-2 rounded-md transition-colors
        ${
          isActive
            ? "bg-[#222F7D] text-white"
            : "text-gray-700 hover:bg-[#222F7D] hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} />}
          {openSidebar && <span className="text-sm font-medium">{label}</span>}
        </div>

        {openSidebar && (
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Child Items */}
      {open && openSidebar && (
        <div className="ml-8 mt-2 space-y-1">
          {items.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `block px-3 py-1.5 rounded-md text-sm transition-colors
                ${
                  isActive
                    ? "bg-blue-100 text-[#222F7D] font-medium"
                    : "text-gray-600 hover:bg-blue-50"
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

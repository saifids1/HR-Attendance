import { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { EmployContext } from "../context/EmployContextProvider";

const SidebarDropdown = ({ icon: Icon, label, items, openSidebar }) => {
  const [open, setOpen] = useState(false);
  const{setIsMyDash} = useContext(EmployContext);

  const handleClick = ()=>{
  setOpen(!open)
  setIsMyDash(false);
  
  }
  return (
    <div>
      {/* Parent Button */}
      <button
        type="button"
        onClick={handleClick}  // toggle dropdown
        className={`w-full flex items-center justify-between px-4 py-2 rounded-md transition
          ${open ? "bg-[#222F7D] text-[#fff]" : "text-gray-700 hover:bg-[#222F7D] hover:text-white"} text-[15px]`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon size={18} />}
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

      {/* Dropdown Items */}
      {open && openSidebar && (
        <div className="ml-8 mt-1 space-y-1">
          {items.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
                end={index === 0}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm transition
                 ${isActive ? "bg-blue-200 text-[#222F7D] font-medium" : "text-gray-600 hover:bg-gray-100"}`
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

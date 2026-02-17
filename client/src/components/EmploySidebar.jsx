import React, { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { IoMdSettings } from "react-icons/io";
import { MdOutlineHolidayVillage } from "react-icons/md";
import { SlCalender } from "react-icons/sl";
import { RiAdminFill } from "react-icons/ri";

import { CgProfile } from "react-icons/cg";
import { House, LockKeyhole, BookAIcon, X } from "lucide-react";
import { Tooltip } from "@mui/material";
import logo from "../assets/ids-logo.png"
import GotoAdmin from "./GotoAdmin";

const EmploySidebar = ({ open, setOpen }) => {

  const user = JSON.parse(localStorage.getItem("user"));
const location = useLocation();

  
  const isAdminInEmployeeView = user.role === "admin" && location.pathname.startsWith("/employee");

  if (!isAdminInEmployeeView) return null;

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded transition border
     ${isActive
      ? "bg-[#222F7D] text-white"
      : "text-black hover:bg-[#222F7D] hover:text-white border-[#dbdbdb]"
    }`;

  return (
    <>
    
    {/* Desktop */}
    <aside
  className={`
    fixed inset-y-0 left-0 z-40 bg-white shadow-xl
    transition-all duration-300 ease-in-out 
    flex flex-col h-screen overflow-hidden
    
    /* MOBILE: Toggle logic using 'open' state */
    ${open ? "translate-x-0" : "-translate-x-full"}
    
    /* DESKTOP: Always Open and Fixed Width */
    md:static md:translate-x-0 md:w-[260px] 
  `}
>
  {/* Header Section */}
  <div className="relative flex items-center justify-center w-full h-16 border-b shrink-0">
  {/* Logo Container */}
  <div className="flex items-center justify-center">
    <img 
      src={logo} 
      className="w-[100px] h-[40px] object-contain" 
      alt="Logo" 
    />
  </div>

  {/* Mobile close button - Positioned absolute so it doesn't push the logo to the left */}
  <button
    className="md:hidden absolute right-4 p-2 rounded-md hover:bg-gray-100"
    onClick={() => setOpen(false)}
  >
    <X size={24} />
  </button>
</div>

  {/* Menu */}
 <nav className="mt-4 space-y-2 px-4 flex-1 overflow-y-auto custom-scrollbar">
    
    <NavLink to="/employee" end className={navClass}>
      <House size={20} className="shrink-0" />
      <span className="text-md">My Dashboard</span>
    </NavLink>

    <NavLink to="/employee/attendance" className={navClass}>
      <LockKeyhole size={20} className="shrink-0" />
      <span>My Attendance</span>
    </NavLink>

    <NavLink to="/employee/profile" className={navClass}>
      <CgProfile size={20} className="shrink-0" />
      <span>My Profile</span>
    </NavLink>

    <NavLink to="/employee/holidays" className={navClass}>
      <MdOutlineHolidayVillage size={20} className="shrink-0" />
      <span>My Holidays</span>
    </NavLink>

    <NavLink to="/employee/leaves" className={navClass}>
      {/* Tooltip can stay, but the label is now always visible */}
      <Tooltip
        title="My Leaves"
        placement="right"
        arrow
        disableHoverListener={true} // Since it's always open, tooltip is less critical
      >
        <span className="flex items-center justify-center shrink-0">
          <SlCalender size={20} />
        </span>
      </Tooltip>
      <span className="ml-1">My Leaves</span>
    </NavLink>

   {user.role === 'admin' && (
        // <div className="mt-auto px-2 pb-4">
          <NavLink to="/admin" className={navClass}>
            <RiAdminFill size={18} className="shrink-0" />
            <span className="text-nowrap">Go To Admin </span>
          </NavLink>
     
      )}
    
  

  </nav>

  {/* Optional Footer */}
  <div className="p-4 border-t text-center shrink-0">
    <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
      Employee Portal
    </p>
  </div>
</aside>
    </>
  );
};

export default EmploySidebar;

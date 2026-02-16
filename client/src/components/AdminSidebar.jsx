import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { RxAvatar } from "react-icons/rx";
import {
  House,
  LockKeyhole,
  Book,
  X
} from "lucide-react";
import { TbLogs } from "react-icons/tb";
import { FaRegCalendarAlt } from "react-icons/fa";


import { SlCalender } from "react-icons/sl";
import SidebarDropdown from "./SidebarDropdown";
import logo from "../assets/ids-logo.png"
import logoIcon from "../assets/IDS-Outline-logo.png"


const AdminSidebar = ({ open, setOpen }) => {
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded transition border
     ${isActive
      ? "bg-[#222F7D] text-white"
      : "text-black hover:bg-[#222F7D] hover:text-white border-[#dbdbdb]"
    }`;

  return (
    <>
      {/* MOBILE OVERLAY - Only acts on mobile screens */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-white shadow-xl
          transition-all duration-300 ease-in-out 
          flex flex-col h-screen overflow-hidden
          
          /* MOBILE: Toggle logic */
          ${open ? "translate-x-0" : "-translate-x-full"}
          
          /* DESKTOP: Always Open */
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

        {/* Navigation Menu */}
        <nav className="mt-4 space-y-1 px-3 flex-1 overflow-y-auto custom-scrollbar">
          <NavLink to="/admin" end className={navClass}>
            <House size={15} className="shrink-0" />
            <span className="text-[16px]">Overview</span>
          </NavLink>

          {/* Employees Dropdown - Pass openSidebar={true} to keep it expanded on desktop */}
          <SidebarDropdown
            icon={Book}
            label="Employees"
            openSidebar={true}
            items={[
              { label: "Employee List", path: "/admin/employees" },
              // { label: "Add Employee", path: "/admin/add-emp" },
              { label: "Daily Attendance", path: "/admin/attendance" },
              { label: "Weekly Attendance", path: "/admin/week" },
              // { label: "Employee Attendance", path: "/admin/all" },
            ]}
          />

          {/* <NavLink to="/admin/admin-attendance" className={navClass}>
            <LockKeyhole size={20} className="shrink-0" />
            <span className="text-[16px]">My Attendance</span>
          </NavLink> */}
          <NavLink to="/employee" className={navClass}>
            <House size={18} className="shrink-0" />
            <span className="whitespace-nowrap">
              My Employee Dashboard
            </span>
          </NavLink>

          <NavLink to="/admin/profile" className={navClass}>
          

            <RxAvatar size={18} className="shrink-0" />
            <span className="text-[16px]">My Profile</span>
          </NavLink>

          <NavLink to="/admin/activity-logs" className={navClass}>
            <TbLogs size={18} className="shrink-0" />
            <span className="text-[16px]">Attendance Log</span>
          </NavLink>

          <NavLink to="/admin/leaves" className={navClass}>
            <FaRegCalendarAlt size={18} className="shrink-0" />
            <span className="text-[16px]">Leave Requests</span>
          </NavLink>
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t text-center">
          <p className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">
            I-diligence Solutions
          </p>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;


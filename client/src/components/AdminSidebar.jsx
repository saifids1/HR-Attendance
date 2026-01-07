import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  House,
  LockKeyhole,
  Book,
  Menu,
  X
} from "lucide-react";
import { IoMdSettings } from "react-icons/io";
import { IoIosHelpCircle } from "react-icons/io";
import { SlCalender } from "react-icons/sl";
import SidebarDropdown from "./SidebarDropdown";

const Sidebar = () => {
  const [open, setOpen] = useState(true);       // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded transition border
     ${
       isActive
         ? "bg-[#222F7D] text-white"
         : "text-black hover:bg-[#222F7D] hover:text-white border-gray-200"
     }`;

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b">
        {open ? <span className="font-semibold">Admin Attendance</span> : null}

        {/* Desktop collapse */}
       

        {/* Mobile close */}
        <button
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <X />
        </button>
      </div>

      {/* Menu */}
      <nav className="mt-4 space-y-2 px-3 flex-1 overflow-y-auto">
        <NavLink to="/admin" end className={navClass}>
          <House />
          {open && <span>Overview</span>}
        </NavLink>

        <NavLink to="/admin/change-password" className={navClass}>
          <LockKeyhole />
          {open && <span>Change Password</span>}
        </NavLink>

        <SidebarDropdown
          icon={Book}
          label="Employees"
          openSidebar={open}
          activeBasePath="/admin/employees"
          items={[
            { label: "Employee List", path: "/admin/employees" },
            { label: "Add Employee", path: "/employee/add" },
          ]}
        />

        <NavLink to="/admin/attendance" className={navClass}>
          <LockKeyhole />
          {open && <span>Attendance</span>}
        </NavLink>

        <NavLink to="/admin/leaves" className={navClass}>
          <SlCalender size={18} />
          {open && <span>Leave Requests</span>}
        </NavLink>

        <NavLink to="/admin/settings" className={navClass}>
          <IoMdSettings size={18} />
          {open && <span>Settings</span>}
        </NavLink>

        <NavLink to="/admin/help" className={navClass}>
          <IoIosHelpCircle />
          {open && <span>Help</span>}
        </NavLink>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      {/* <button
        className="lg:hidden fixed top-4 left-4 z-50  text-black p-2 rounded"
        onClick={() => setMobileOpen(true)}
      >
        <Menu />
      </button> */}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 shadow-md transition-all duration-300
        ${open ? "w-64" : "w-20"}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen((prev)=> !prev )}
          />

          {/* Drawer */}
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-md flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;

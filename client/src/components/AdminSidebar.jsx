import React, { useContext, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { IoMdSettings } from "react-icons/io";
import { MdOutlineHolidayVillage } from "react-icons/md";
import { Tooltip } from "@mui/material";
import { NavLink, useNavigate } from "react-router-dom";
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
import { EmployContext } from "../context/EmployContextProvider";


const AdminSidebar = ({ open, setOpen }) => {
  const navigate = useNavigate();

  const { handleDashboard,isMyDash,setIsMyDash,} = useContext(EmployContext);



  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2 rounded transition border
     ${isActive
      ? "bg-[#222F7D] text-white"
      : "text-black hover:bg-[#222F7D] hover:text-white border-[#dbdbdb]"
    }`;

  // const handleNavigate = ()=>{
  //   navigate("/admin/employee");
  //   setIsMyDash((prev)=> !prev);
  // }

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
          fixed inset-y-0 left-0 z-40  shadow-xl
          transition-all duration-300 ease-in-out 
          flex flex-col h-screen overflow-hidden
          
          /* MOBILE: Toggle logic */
          ${open ? "translate-x-0" : "-translate-x-full"}
          
          /* DESKTOP: Always Open */
          md:static md:translate-x-0 md:w-[280px] 
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
        <nav className="mt-4 space-y-2 px-4 flex-1 overflow-y-auto custom-scrollbar">
          {/* <h1 className="text-center">Admin Dashboard</h1> */}
          <NavLink to="/admin" end className={navClass}>
            <House size={15} className="shrink-0" />
            <span className="text-[15px]">Company Dashboard </span>
          </NavLink>

          {/* Employees Dropdown - Pass openSidebar={true} to keep it expanded on desktop */}
          <SidebarDropdown
            icon={Book}
            label="Company Employees"
            openSidebar={true}
            items={[
              { label: "Employee List", path: "/admin/employees" },
              { label: "Add Employee", path: "/admin/add-emp" },
              { label: "Daily Attendance", path: "/admin/attendance" },
              { label: "Weekly Attendance", path: "/admin/week" },
              { label: "Monthly Attendance", path: "/admin/all" },
            ]}
          /> 

          
{/*           
          <NavLink to="/employee"  className={navClass} >
            <House size={18} className="shrink-0" />
            <span className="whitespace-nowrap text-[15px]">
              My Dashboard
            </span>
          </NavLink> */}

           {/* <SidebarDropdown
            icon={Book}
            label="My Dashboard"
            openSidebar={true}
              onClick={() => {
          setIsMyDash((prev) => !prev);       // open dropdown
          navigate("/admin/employee-details"); // go to first option
        }}
            items={[
            {label:"My Dashboard",path:"/admin/employee-details"},
              { label: "My Attendance", path: "/admin/employee-details/attendance" },
              
              { label: "My Profile ", path: "/admin/employee-details/profile" },
              { label: "My Holiday", path: "/admin/employee-details/holidays" },
              { label: "My Leaves ", path: "/admin/employee-details/leaves" },
             
            ]}
          />  */}

          {/* <NavLink to="/employee"  className={navClass}>
           <RxAvatar size={18} className="shrink-0" />
            <span className="text-[15px]">My Dashboard</span>
          </NavLink> */}

          <NavLink to="/admin/profile" className={navClass}>
          

            <RxAvatar size={18} className="shrink-0" />
            <span className="text-[15px]">Company Profile</span>
          </NavLink>

          <NavLink to="/admin/activity-logs" className={navClass}>
            <TbLogs size={18} className="shrink-0" />
            <span className="text-[15px] text-nowrap">Company Attendance Log</span>
          </NavLink>

          <NavLink to="/admin/leaves" className={navClass}>
            <FaRegCalendarAlt size={18} className="shrink-0" />
            <span className="text-[15px] text-nowrap">Company Leave Requests</span>
          </NavLink>

            <NavLink to="/admin/cron-manager" className={navClass}>
            <FaRegCalendarAlt size={18} className=" shrink-0" />
            <span className="text-[15px] text-wrap">Report Schedular</span>
          </NavLink>



        <h1 className="text-center text-blue-600">My Employee Dashboard</h1>

<NavLink to="/admin/my-dashboard" end className={navClass}>
  <House size={20} className="shrink-0" />
  <span className="text-md">My Dashboard</span>
</NavLink>

<NavLink to="/admin/my-dashboard/attendance" className={navClass}>
  <LockKeyhole size={20} className="shrink-0" />
  <span>My Attendance</span>
</NavLink>

<NavLink to="/admin/my-dashboard/profile" className={navClass}>
  <CgProfile size={20} className="shrink-0" />
  <span>My Profile</span>
</NavLink>

<NavLink to="/admin/my-dashboard/holidays" className={navClass}>
  <MdOutlineHolidayVillage size={20} className="shrink-0" />
  <span>My Holidays</span>
</NavLink>

<NavLink to="/admin/my-dashboard/leaves" className={navClass}>
  <Tooltip
    title="My Leaves"
    placement="right"
    arrow
    disableHoverListener={true}
  >
    <span className="flex items-center justify-center shrink-0">
      <SlCalender size={20} />
    </span>
  </Tooltip>
  <span>My Leaves</span>
</NavLink>
        </nav>

        {/* Employee Dashboard */}
        

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


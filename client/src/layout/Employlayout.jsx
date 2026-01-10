import React, { useState,useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmploySidebar from "../components/EmploySidebar";
import axios from "axios";

const Employlayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  
  
  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <EmploySidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 ">
        <Navbar open={sidebarOpen} setOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Employlayout;

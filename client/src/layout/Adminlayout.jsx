import { NavLink,Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import Navbar from "../components/Navbar";
import { useState } from "react";


function Adminlayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
    {/* Sidebar */}
    <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
  
    {/* Main Content Wrapper */}
    <div className="flex flex-1 flex-col min-w-0 ">
      
      {/* Navbar */}
      <Navbar setOpen={setSidebarOpen} open={sidebarOpen} />
  
      {/* Page Content (Outlet) */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden py-2 ">
        <Outlet />
      </main>

      {/* <footer>IDilligence Solution</footer> */}
  
    </div>
  </div>

  );
}

export default Adminlayout


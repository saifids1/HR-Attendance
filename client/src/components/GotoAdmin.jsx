import React from 'react';
import { RiAdminFill } from 'react-icons/ri';
import { NavLink, useLocation } from 'react-router-dom';

const GotoAdmin = ({ role }) => {
  const location = useLocation();

  
  const isAdminInEmployeeView = role === "admin" && location.pathname.startsWith("/employee");

  if (!isAdminInEmployeeView) return null;

  return (
    <div className="mt-auto px-2 pb-4"> 
      <NavLink 
        to="/admin" 
        className="flex items-center justify-center gap-3 "
      >
        <RiAdminFill size={18} className="shrink-0 " />
        <span className='text-nowrap'>Go To Admin Dashboard</span>
      </NavLink>
    </div>
  );
};

export default GotoAdmin;
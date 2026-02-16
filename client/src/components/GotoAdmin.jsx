import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const GotoAdmin = ({role}) => {
   const location  = useLocation()
  return (
    <div className="mb-5">

    {role === "admin" && location.pathname === "/employee" && (
    <NavLink 
      to="/admin" 
      className="bg-[#222F7D] px-2 py-3 text-white rounded-md shadow-md hover:bg-blue-900 transition-colors"
    >
      Go To Admin Dashboard
    </NavLink>
  )}
        
      </div>
  )
}

export default GotoAdmin
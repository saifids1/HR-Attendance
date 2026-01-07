import React, { createContext, useState } from "react";

export const SidebarContext = createContext();

const SidebarContextProvider = ({ children }) => {
  const [open, setOpen] = useState(!false);
  const [isModalOpen,setIsModalOpen] = useState(false);
  const role = localStorage.getItem("role");
  
  

  return (
    <SidebarContext.Provider value={{ open, setOpen,isModalOpen,setIsModalOpen,role }}>
      {children}
    </SidebarContext.Provider>
  );
};

export default SidebarContextProvider;

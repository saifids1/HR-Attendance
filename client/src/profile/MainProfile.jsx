import React, { useState } from "react";
import OrganizationTab from "./tabs/OrganizationTab";
import PersonalTab from "./tabs/PersonalTab";
import EducationTab from "./tabs/EducationTab";
import ExperienceTab from "./tabs/ExperienceTab";
import ContactsTab from "./tabs/ContactTab";
import BankTab from "./tabs/BankTab";
import DocumentTab from "./tabs/DocumentTab";
const tabs = ["Organization", "Personal", "Education", "Experience", "Contacts", "Bank", "Documents"];

const MainProfile = () => {
  const [activeTab, setActiveTab] = useState("Organization");
  // const admin = JSON.parse(localStorage.getItem("user"))?.role;

  const role = JSON.parse(localStorage.getItem("user"))?.role; 
  const isAdmin = role === "admin";
  const isOrganizationTab = activeTab === "Organization"; 
  
  // Track which specific tab is being edited (null means no tab is being edited)
  // const [editingTab, setEditingTab] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => {
    // setEditingTab(activeTab)
    setIsEditing(true);
  }; 
  const cancelEdit = () => {
    // setEditingTab(null)
  setIsEditing(false)
};


const canEdit =
  !isEditing && (isAdmin || !isOrganizationTab);

  return (
    <div>
      {/* Tabs Container */}
      <div className="bg-[#222F7D] px-2 sm:px-4 py-2 rounded-xl mx-auto mt-4 flex items-center justify-between gap-4">
        
        <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap text-sm sm:text-base transition-all duration-200
                ${activeTab === tab 
                  ? "text-[#222F7D] bg-white rounded-md px-4 py-1.5 font-semibold shadow-sm" 
                  : "text-slate-300 hover:text-white px-2 py-1.5"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>
    
      
        {canEdit && (
  <button
    onClick={startEdit}
    className="bg-white px-4 py-1.5 rounded-md text-sm font-medium text-[#222F7D]"
  >
    Edit Profile
  </button>
)}

      </div>
    
      {/* Tabs Content - All receive the same isEditing state */}
      <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "Organization" && <OrganizationTab  isEditing={isEditing} cancelEdit={cancelEdit}/>}
        
        {activeTab === "Personal" && (
          <PersonalTab isEditing={isEditing} cancelEdit={cancelEdit} />
        )}
        {activeTab === "Education" && (
          <EducationTab isEditing={isEditing} cancelEdit={cancelEdit} setIsEditing={setIsEditing} />
        )}
        {activeTab === "Experience" && (
          <ExperienceTab isEditing={isEditing} cancelEdit={cancelEdit} setIsEditing={setIsEditing} />
        )}
        {activeTab === "Contacts" && (
          <ContactsTab isEditing={isEditing} cancelEdit={cancelEdit} />
        )}
        {activeTab === "Bank" && (
          <BankTab isEditing={isEditing} cancelEdit={cancelEdit} />
        )}
        {activeTab === "Documents" && (
          <DocumentTab isEditing={isEditing} cancelEdit={cancelEdit} />
        )}
      </div>
      
    
      {/* Tabs Content */}
     
    </div>
  );
};

export default MainProfile;

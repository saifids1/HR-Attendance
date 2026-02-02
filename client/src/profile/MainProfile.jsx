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
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => setIsEditing(false);

  return (
    <div>
    {/* Tabs Container */}
    <div className="bg-[#222F7D] px-2 sm:px-4 py-2 rounded-xl mx-auto mt-4 flex items-center justify-between gap-4">
      
      {/* Scrollable Tab Wrapper */}
      <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setIsEditing(false);
            }}
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
  
      {/* Edit Button - Fixed position on the right */}
      {!isEditing && activeTab !== "Organization" && (
        <button 
          onClick={startEdit} 
          className="bg-white px-4 py-1.5 rounded-md text-sm font-medium text-[#222F7D] hover:bg-gray-100 transition-colors shadow-sm shrink-0"
        >
          Edit
        </button>
      )}
    </div>
  
    {/* Tabs Content */}
    <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {activeTab === "Organization" && <OrganizationTab />}
      {activeTab === "Personal" && (
        <PersonalTab isEditing={isEditing} setIsEditing={setIsEditing} cancelEdit={cancelEdit} />
      )}
      {activeTab === "Education" && (
        <EducationTab setIsEditing={setIsEditing} isEditing={isEditing} cancelEdit={cancelEdit} />
      )}
      {activeTab === "Experience" && (
        <ExperienceTab setIsEditing={setIsEditing} isEditing={isEditing} cancelEdit={cancelEdit} />
      )}
      {activeTab === "Contacts" && (
        <ContactsTab setIsEditing={setIsEditing} isEditing={isEditing} cancelEdit={cancelEdit} />
      )}
      {activeTab === "Bank" && (
        <BankTab setIsEditing={setIsEditing} isEditing={isEditing} cancelEdit={cancelEdit} />
      )}
      {activeTab === "Documents" && (
        <DocumentTab isEditing={isEditing} setIsEditing={setIsEditing} />
      )}
    </div>
  </div>
  );
};

export default MainProfile;

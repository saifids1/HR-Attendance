import React, { useState } from "react";
import OrganizationTab from "./tabs/OrganizationTab";
import PersonalTab from "./tabs/PersonalTab";
import EducationTab from "./tabs/EducationTab";
import ExperienceTab from "./tabs/ExperienceTab";
import ContactsTab from "./tabs/ContactTab";
import BankTab from "./tabs/BankTab";
import DocumentTab from "./tabs/DocumentTab";
import NomineeTab from "./tabs/NomineeTab";
// import { getEducation } from "../../api/profile";

const tabs = [
  "Organization",
  "Personal",
  "Education",
  "Experience",
  "Contacts",
  "Nominees",
  "Bank",
  "Documents",
];

const MainProfile = ({
  personalData,
  educationData,
  experienceData,
  contactData,
  bankData,
  organizationData,
  userRole, // "admin" or "employee"
  isEditing,
  setIsEditing,
  onSave,
  empId, // The dynamic ID (from URL or LocalStorage)
  isAddingNew,
  setIsAddingNew,
}) => {
  const [activeTab, setActiveTab] = useState("Personal");

  // console.log("empId",empId);

  const isAdmin = userRole === "admin";
  const isOrganizationTab = activeTab === "Organization";

  // console.log("aciveTab",activeTab)

  // Admins can edit anything. Employees can edit anything except Organization.
  const canShowEditButton = !isEditing && !isAddingNew && (isAdmin || !isOrganizationTab);

  return (
    <div>
      <div className="bg-[#222F7D] px-4 py-2 rounded-xl flex items-center justify-between gap-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setIsEditing(false); // Reset editing mode when switching tabs
                setIsAddingNew(false); // Reset adding new mode when switching tabs
              }}
              className={`whitespace-nowrap text-sm px-4 py-1.5 transition-all ${
                activeTab === tab
                  ? "bg-white text-[#222F7D] rounded-md font-bold"
                  : "text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {canShowEditButton &&
          (["Education", "Experience", "Contacts", "Documents"].includes(
            activeTab,
          ) ? (
            <button
              onClick={() => setIsAddingNew(true)}
              className="bg-white px-4 py-1.5 rounded-md text-sm font-medium text-[#222F7D] hover:bg-gray-100"
            >
              + Add New
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white px-4 py-1.5 rounded-md text-sm font-medium text-[#222F7D] hover:bg-gray-100"
            >
              Edit Profile
            </button>
          ))}
      </div>

      <div className="mt-4">
        {activeTab === "Organization" && (
          <OrganizationTab
            organizationData={organizationData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={onSave}
            empId={empId}
            personalData={personalData}
          />
        )}

        {activeTab === "Personal" && (
          <PersonalTab
            personalData={personalData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={onSave}
            empId={empId}
          />
        )}

        {activeTab === "Education" && (
          <EducationTab
            educationData={educationData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={onSave}
            empId={empId}
            isAddingNew={isAddingNew}
            setIsAddingNew={setIsAddingNew}
          />
        )}

        {activeTab === "Experience" && (
          <ExperienceTab
            experienceData={experienceData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
            isAddingNew={isAddingNew}
            setIsAddingNew={setIsAddingNew}
          />
        )}

        {activeTab === "Contacts" && (
          <ContactsTab
            contactData={contactData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
            isAddingNew={isAddingNew}
            setIsAddingNew={setIsAddingNew}
          />
        )}

        {activeTab === "Bank" && (
          <BankTab
            bankData={bankData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
          />
        )}

        {activeTab === "Documents" && (
          <DocumentTab
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
            isAddingNew={isAddingNew}
            setIsAddingNew={setIsAddingNew}
          />
        )}
        {activeTab === "Nominees" && (
          <NomineeTab
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
          />
        )}
      </div>
    </div>
  );
};

export default MainProfile;

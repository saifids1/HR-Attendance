import React, { useEffect, useState } from "react";
import OrganizationTab from "./tabs/OrganizationTab";
import PersonalTab from "./tabs/PersonalTab";
import EducationTab from "./tabs/EducationTab";
import ExperienceTab from "./tabs/ExperienceTab";
import ContactsTab from "./tabs/ContactTab";
import BankTab from "./tabs/BankTab";
import DocumentTab from "./tabs/DocumentTab";
import NomineeTab from "./tabs/NomineeTab";

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
  nomineeData,
  bankData,
  organizationData,
  userRole,
  isEditing,
  setIsEditing,
  onSave,
  empId,
  isAddingNew,
  setIsAddingNew,
  addNewEmployee,
}) => {
  const [activeTab, setActiveTab] = useState("Personal");

  const isAdmin = userRole === "admin";
  const isOrganizationTab = activeTab === "Organization";

  // ✅ If addNewEmployee is true → force editing mode
  useEffect(() => {
    console.log("can show eidt button", canShowEditButton);
    console.log("addNewEmployee", addNewEmployee);
    if (addNewEmployee) {
      setIsEditing(true);
    }
  }, [addNewEmployee, setIsEditing]);

  // ✅ Hide buttons when editing OR  adding new employee
  const canShowEditButton =
    (!isEditing || addNewEmployee) &&
    !isAddingNew &&
    (isAdmin || !isOrganizationTab);

  const cancelEdit = () => {
    setIsEditing(false);
    setIsAddingNew(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // Reset add new always
    setIsAddingNew(false);

    // If adding new employee → stay in editing mode
    if (addNewEmployee) {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <div>
      <div className="bg-[#222F7D] px-4 py-2 rounded-xl flex items-center justify-between gap-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
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
          ) : !addNewEmployee ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white px-4 py-1.5 rounded-md text-sm font-medium text-[#222F7D] hover:bg-gray-100"
            >
              Edit Profile
            </button>
          ) : null)}
      </div>

      <div className="mt-3">
        {activeTab === "Organization" && (
          <OrganizationTab
            organizationData={organizationData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={onSave}
            empId={empId}
            personalData={personalData}
            cancelEdit={cancelEdit}
            addNewEmployee={addNewEmployee}
          />
        )}

        {activeTab === "Personal" && (
          <PersonalTab
            personalData={personalData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={onSave}
            empId={empId}
            addNewEmployee={addNewEmployee}
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
            addNewEmployee={addNewEmployee}
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
            addNewEmployee={addNewEmployee}
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
            addNewEmployee={addNewEmployee}
          />
        )}

        {activeTab === "Bank" && (
          <BankTab
            bankData={bankData}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
            addNewEmployee={addNewEmployee}
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
            addNewEmployee={addNewEmployee}
          />
        )}

        {activeTab === "Nominees" && (
          <NomineeTab
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            empId={empId}
            onSave={onSave}
            nomineData={nomineeData}
            addNewEmployee={addNewEmployee}
          />
        )}
      </div>
    </div>
  );
};

export default MainProfile;

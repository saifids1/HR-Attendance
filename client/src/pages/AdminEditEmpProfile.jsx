import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axiosInstance";
import {updateContact, updateEducation, updatePersonal } from "../../api/profile";

import ContactsTab from "../admin/employee-edit/ContactTab";
import EducationTab from "../admin/employee-edit/EducationTab";
import ExperienceTab from "../admin/employee-edit/ExperienceTab";
import BankTab from "../admin/employee-edit/BankTab";
import DocumentTab from "../profile/tabs/DocumentTab";
import PersonalTab from "../admin/employee-edit/PersonalTab";



const TABS = [
  { key: "personal", label: "Personal Info" },
  { key: "contact", label: "Contact" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "bank", label: "Bank Details" },
  // { key: "documents", label: "Documents" },
];

const AdminEditEmpProfile = () => {
  const { emp_id } = useParams();
  const token = localStorage.getItem("token");

  const [activeTab, setActiveTab] = useState("personal");
  const [isEditing, setIsEditing] = useState(false);

  const [personal, setPersonal] = useState({});
  const [contacts, setContacts] = useState({});
  const [education,setEducation] = useState({});
  const [experience,setExperience] =useState({});
  const [bank,setBank] = useState({});

  const [backupPersonal, setBackupPersonal] = useState({});


  const fetchPersonal = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/employee/profile/personal/${emp_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formatted = {
        ...data,
        dob: data.dob?.slice(0, 10) || "",
        joining_date: data.joining_date?.slice(0, 10) || "",
      };

      setPersonal(formatted);
      setBackupPersonal(formatted);
    } catch {
      toast.error("Failed to load profile");
    }
  }, [emp_id, token]);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/contact/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Agar backend direct array bhej raha hai
      setContacts(Array.isArray(data) ? data : [data]);
    } catch (error) {
      console.error("Failed to fetch contacts");
    }
  }, [emp_id, token]);

  const fetchEducation = useCallback(async () => {
    try {
      const { data } = await api.get(`employee/profile/education/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Your backend returns { total: X, education: [...] }
      // So we access data.education

      setEducation(data.education || []); 
      
    } catch (error) {
      if (error.response?.status === 404) {
        setEducation([]); // Clear if no records found
      }
      console.error("Failed to fetch education info", error);
    }
  }, [emp_id, token]);

  const fetchExperience = useCallback(async () => {
    try {
      const { data } = await api.get(`employee/profile/experience/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Your backend returns { total: X, education: [...] }
      // So we access data.education

      console.log("experience",data)

      setExperience(data.experience || []); 
      
    } catch (error) {
      if (error.response?.status === 404) {
        setExperience([]); // Clear if no records found
      }
      console.error("Failed to fetch education info", error);
    }
  }, [emp_id, token]); 

  const fetchBank = useCallback(async () => {
    try {
      const { data } = await api.get(`employee/profile/bank/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Your backend returns { total: X, education: [...] }
      // So we access data.education

      console.log("bank",data)

      setBank(data.bankDetails || []); 
      
    } catch (error) {
      if (error.response?.status === 404) {
        setBank([]); // Clear if no records found
      }
      console.error("Failed to fetch education info", error);
    }
  }, [emp_id, token]); 


  useEffect(() => {
    
    fetchPersonal();
    fetchContacts();
    fetchEducation();
    fetchExperience()
    fetchBank();
  }, [fetchPersonal,fetchContacts,fetchEducation,fetchExperience,fetchBank]);



  const handleEdit = () => {
    setBackupPersonal(personal);
    setIsEditing(true);
  };

  


  // handleSave ko aise update karein
  const handleSave = async (updatedData) => {
    try {
      if (activeTab === "personal") {
        await updatePersonal(emp_id, updatedData);
        setPersonal(updatedData);
        toast.success("Personal updated");
      } 
      else if (activeTab === "contact") {
       
        await updateContact(emp_id, updatedData); 
        setContacts(updatedData); // Local state update
        toast.success("Contacts updated");
      }
      else if (activeTab === "education") {
        
        
        
        const mainId = updatedData[0]?.id || 0; 
    
        await updateEducation(emp_id, mainId, updatedData); 
        
        setEducation(updatedData);
        toast.success("Education details saved");
    }
      // setIsEditing(false);
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl p-6 shadow">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{personal.name}</h1>
            <p className="text-blue-600 text-sm">EMP-ID: {emp_id}</p>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="px-4 py-1 border rounded bg-blue-600 text-white"
              >
                Edit
              </button>
            ) : (
              <>
                {null}
              </>
            )}
          </div>
        </div>

        {/* TABS ( NOT DISABLED) */}
        <div className="flex gap-2 mt-6 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 ${
                activeTab === tab.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto bg-white mt-4 p-6 rounded-xl shadow">

        {activeTab === "personal" && (
        <PersonalTab isEditing={isEditing} onSave={handleSave} personalData={personal} setIsEditing={setIsEditing}/>
        )}

        {activeTab === "contact" && (
          <ContactsTab isEditing={isEditing}  onSave={handleSave} contactData={contacts} setIsEditing={setIsEditing} />
        )}

        {activeTab === "education" && (
          <EducationTab isEditing={isEditing} onSave={handleSave} educationData={education} setIsEditing={setIsEditing} />
        )}

        {activeTab === "experience" && (
          <ExperienceTab isEditing={isEditing}  onSave={handleSave} experienceData={experience} setIsEditing={setIsEditing} />
        )}

        {activeTab === "bank" && (
          <BankTab bankData={bank} isEditing={isEditing} setIsEditing={setIsEditing}/>
        )}
{/* 
        {activeTab === "documents" && (
          <DocumentTab isEditing={isEditing} />
        )} */}

      </div>
    </div>
  );
};

export default AdminEditEmpProfile;

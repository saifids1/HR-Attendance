import React, { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Divider } from "@mui/material";
import { IoHomeSharp } from "react-icons/io5";
import { MdOutlineEmail } from "react-icons/md";
import defaultProfile from "../assets/avatar.webp";
import { toast } from "react-hot-toast";

import {
  getEducation,
  getExperience,
  getPersonal,
  getContact,
  getBank,
} from "../../api/profile";

import { EmployContext } from "../context/EmployContextProvider";
import MainProfile from "../profile/MainProfile";
import ReportingCard from "../components/ReportingCard";
import api from "../../api/axiosInstance";

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const emp_id = user?.emp_id;

  const { profileImage, setProfileImage, orgAddress } = useContext(EmployContext);

  // --- State Management ---
  const [isEditing, setIsEditing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [reporting, setReporting] = useState([]);
  
  // Data States
  const [personalData, setPersonalData] = useState({});
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [contactsData, setContactsData] = useState([]);
  const [bankData, setBankData] = useState({});

  // --- 1. Fetch All Profile Data ---
  const fetchProfileData = useCallback(async () => {
    if (!emp_id) return;
    try {
      const results = await Promise.allSettled([
        getPersonal(emp_id),
        getEducation(emp_id),
        getExperience(emp_id),
        getContact(emp_id),
        getBank(emp_id),
      ]);

      if (results[0].status === "fulfilled") setPersonalData(results[0].value.data.personalDetails || {});
      if (results[1].status === "fulfilled") setEducationData(results[1].value.data.education || []);
      if (results[2].status === "fulfilled") setExperienceData(results[2].value.data.experience || []);
      if (results[3].status === "fulfilled") setContactsData(results[3].value.data.contact || []);
      if (results[4].status === "fulfilled") setBankData(results[4].value.data.bankInfo || {});

    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, [emp_id]);

  // --- 2. Fetch Profile Image ---
  const fetchProfileImage = useCallback(async () => {
    try {
      if (!token || !emp_id) return;
      const res = await api.get("employee/profile/image");
      if (res.data && res.data.profile_image) {
        const newUrl = `${res.data.profile_image}?t=${Date.now()}`;
        setProfileImage(newUrl);
      }
    } catch (error) {
      console.error("Error fetching image:", error);
    }
  }, [token, emp_id, setProfileImage]);

  // --- 3. Fetch Reporting Manager ---
  const fetchReporting = useCallback(async () => {
    try {
      const res = await api.get(`employees/reporting/${emp_id}`);
      setReporting(res.data.managers || []);
    } catch (error) {
      console.error("Failed to fetch reporting managers", error);
    }
  }, [emp_id]);

  useEffect(() => {
    fetchProfileData();
    fetchProfileImage();
    fetchReporting();
  }, [fetchProfileData, fetchProfileImage, fetchReporting, refreshTrigger]);

  // --- Handlers ---
  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profile", file);

    try {
      const res = await api.post(`employee/profile/image/${emp_id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRefreshTrigger(prev => prev + 1);
      toast.success("Profile Image Updated");
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  // This function is passed to child tabs. When they save, they call this.
  const handleDataRefresh = async () => {
    await fetchProfileData();
  };

  return (
    <div className="min-h-screen py-4 px-3 sm:py-6 sm:px-4 bg-gray-50/70">
      {/* HEADER */}
      <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6">
        <Typography className="text-white text-xl sm:text-2xl font-bold">
          {user?.role === "admin" ? "Admin Profile" : "Employee Profile"}
        </Typography>
      </div>

      <div className="mx-auto grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-6">
        {/* LEFT: Profile Card */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="relative w-32 h-32 group">
              <label className="cursor-pointer block w-full h-full">
                <img
                  src={profileImage || defaultProfile}
                  alt="Profile"
                  className="w-full h-full rounded-full border-4 border-[#222F7D] object-cover"
                />
                <input type="file" className="hidden" onChange={handleProfileUpload} />
                <div className="absolute bottom-1 right-1 bg-[#222F7D] text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white">
                  ✎
                </div>
              </label>
            </div>

            <div className="w-full text-center md:text-left">
              <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-[#222F7D] font-bold text-xs tracking-wider uppercase">{user?.role}</p>
              <p className="text-gray-500 text-sm mt-1">ID: {emp_id}</p>

              <div className="flex flex-col sm:flex-row gap-4 mt-4 text-gray-600 text-sm justify-center md:justify-start">
                <span className="flex items-center gap-2">
                  <IoHomeSharp className="text-[#222F7D]" /> {orgAddress?.address || "Office Address"}
                </span>
                <span className="flex items-center gap-2">
                  <MdOutlineEmail className="text-[#222F7D] text-lg" /> {user?.email}
                </span>
              </div>
            </div>
          </div>
          <Divider className="my-6" />
        </div>

        {/* RIGHT: Reporting */}
        <div className="bg-white rounded-xl shadow p-4 h-fit">
          <ReportingCard reportingManagers={reporting} />
        </div>
      </div>

      {/* TABS CONTENT */}
      <div className="mx-auto mt-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MainProfile
            personalData={personalData}
            educationData={educationData}
            experienceData={experienceData}
            contactData={contactsData}
            bankData={bankData}
            userRole={user?.role}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={handleDataRefresh} // Passing refresh function
            empId={emp_id}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
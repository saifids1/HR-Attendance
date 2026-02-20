import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../api/axiosInstance";
import { IoHomeSharp } from "react-icons/io5";
import { MdOutlineEmail } from "react-icons/md";
import { Divider } from "@mui/material";
import ReportingCard from "../components/ReportingCard";
// import defaultProfile from "../assets/avatar.webp";

import {
  updatePersonal,
  updateContact,
  updateEducation,
} from "../../api/profile";

import MainProfile from "../profile/MainProfile";

const AdminEditEmpProfile = () => {
  const { emp_id } = useParams();
  const token = localStorage.getItem("token");

  const [isEditing, setIsEditing] = useState(false);

  // ===== Profile Data States =====
  const [personalData, setPersonalData] = useState({});
  const [contactsData, setContactsData] = useState([]);
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [bankData, setBankData] = useState({});

  // ===== Header Data States =====
  // const [profileImage, setProfileImage] = useState("");
  // const [reporting, setReporting] = useState([]);
  // const [employeeBasic, setEmployeeBasic] = useState({});

  /* ================= FETCH FUNCTIONS ================= */

  const fetchBasicInfo = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/personal/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🔥 SAFE handling (important)
      const basic =
        data?.personalDetails || data?.data?.personalDetails || data || {};

      setEmployeeBasic(basic);
    } catch (error) {
      console.error("Failed to load basic info");
      setEmployeeBasic({});
    }
  }, [emp_id, token]);

  const fetchProfileImage = useCallback(async () => {
    try {
      const res = await api.get(`/employee/profile/image/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res?.data?.profile_image) {
        setProfileImage(`${res.data.profile_image}?t=${Date.now()}`);
      } else {
        setProfileImage("");
      }
    } catch (error) {
      console.error("Failed to load profile image");
      setProfileImage("");
    }
  }, [emp_id, token]);

  const fetchReporting = useCallback(async () => {
    try {
      const res = await api.get(`/employees/reporting/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReporting(res?.data?.managers || []);
    } catch (error) {
      console.error("Failed to load reporting");
      setReporting([]);
    }
  }, [emp_id, token]);

  const fetchPersonal = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/personal/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formatted = {
        ...(data?.personalDetails || data || {}),
        dob: data?.dob?.slice(0, 10) || "",
        joining_date: data?.joining_date?.slice(0, 10) || "",
      };

      setPersonalData(formatted);
    } catch {
      toast.error("Failed to load personal details");
      setPersonalData({});
    }
  }, [emp_id, token]);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/contact/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setContactsData(Array.isArray(data) ? data : data ? [data] : []);
    } catch {
      setContactsData([]);
    }
  }, [emp_id, token]);

  const fetchEducation = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/education/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEducationData(data?.education || []);
    } catch {
      setEducationData([]);
    }
  }, [emp_id, token]);

  const fetchExperience = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/experience/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setExperienceData(data?.experience || []);
    } catch {
      setExperienceData([]);
    }
  }, [emp_id, token]);

  const fetchBank = useCallback(async () => {
    try {
      const { data } = await api.get(`/employee/profile/bank/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBankData(data?.bankDetails || {});
    } catch {
      setBankData({});
    }
  }, [emp_id, token]);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (!emp_id) return;

    fetchBasicInfo();
    fetchProfileImage();
    fetchReporting();

    fetchPersonal();
    fetchContacts();
    fetchEducation();
    fetchExperience();
    fetchBank();
  }, [
    emp_id,
    fetchBasicInfo,
    fetchProfileImage,
    fetchReporting,
    fetchPersonal,
    fetchContacts,
    fetchEducation,
    fetchExperience,
    fetchBank,
  ]);

  /* ================= SAVE HANDLER ================= */

  const handleSave = async (updatedData, activeTab) => {
    try {
      if (activeTab === "personal") {
        await updatePersonal(emp_id, updatedData);
        setPersonalData(updatedData);
        toast.success("Personal updated");
      }

      if (activeTab === "contact") {
        await updateContact(emp_id, updatedData);
        setContactsData(updatedData);
        toast.success("Contact updated");
      }

      if (activeTab === "education") {
        const mainId = updatedData[0]?.id || 0;
        await updateEducation(emp_id, mainId, updatedData);
        setEducationData(updatedData);
        toast.success("Education updated");
      }
    } catch {
      toast.error("Update failed");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen py-4 px-3 sm:py-6 sm:px-4 bg-gray-50/70">

      {/* TABS SECTION */}
      <div className="mx-auto mt-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <MainProfile
            personalData={personalData}
            educationData={educationData}
            experienceData={experienceData}
            contactData={contactsData}
            bankData={bankData}
            userRole="admin"
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onSave={handleSave}
            empId={emp_id}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminEditEmpProfile;

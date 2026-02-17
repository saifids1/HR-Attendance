import React, { useContext, useEffect } from "react";
import { Typography } from "@mui/material";
import axios from "axios";
import { useLocation } from "react-router-dom";

// Icons
import { IoPerson, IoExitOutline, IoEnterOutline } from "react-icons/io5";
import { MdOutlineCoPresent } from "react-icons/md";
import { BsFillPersonXFill } from "react-icons/bs";
import { TbClockX } from "react-icons/tb";
import { FaUserClock } from "react-icons/fa6";
import { SlCalender } from "react-icons/sl";

// Components & Assets
import AttendanceBarChart from "../charts/AttendanceBarChart";
import Leavecards from "../components/Leavecards";
import MonthlyHolidays from "../components/Monthlyholidays";
import Cards from "../components/Cards";
import AttendanceDoughnutChart from "../charts/Doughnut";
import Loader from "../components/Loader";
import GotoAdmin from "../components/GotoAdmin";
import defaultProfile from "../assets/avatar.webp";

// Context
import { EmployContext } from "../context/EmployContextProvider";

const Overview = () => {
  const location = useLocation();
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase()?.trim();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const { 
    profileImage, 
    setProfileImage, 
    token, 
    loading 
  } = useContext(EmployContext);

  useEffect(() => {
    const fetchProfileImage = async () => {
 
      try {
        const res = await axios.get("http://localhost:5000/api/employee/profile/image", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data && res.data.profile_image) {
          // Update global context with the fresh image URL
          setProfileImage(`${res.data.profile_image}?t=${new Date().getTime()}`);
        } else {
          setProfileImage(defaultProfile);
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
        // Don't clear the image on error if one already exists
        if (!profileImage) setProfileImage(defaultProfile);
      }
    };

    if (token) {
      fetchProfileImage();
    }
    
    // REMOVED: return () => setProfileImage(null); 
    // This was the cause of the image disappearing on tab change!
  }, [token, setProfileImage]);

  // ... (Keep adminData, leaveData, holidayList same as your code)
  const adminData = [
    { id: 1, title: "Total Employees", total: 15, icon: <IoPerson />, bgColor: "#222f7d" },
    { id: 2, title: "Present Today", total: 9, icon: <MdOutlineCoPresent />, bgColor: "#27F598" },
    { id: 3, title: "Absent Today", total: 6, icon: <BsFillPersonXFill />, bgColor: "#EB1010" },
    { id: 4, title: "Late Check-ins", total: 3, icon: <TbClockX />, bgColor: "#EB9310" },
    { id: 5, title: "On Leave", total: 2, icon: <FaUserClock />, bgColor: "#FACC15" }
  ];

  const leaveData = [
    { id: 1, title: "Total Leaves Allowed", value: 15, icon: <SlCalender />, bgColor: "#4f46e5" },
    { id: 2, title: "Total Leaves Taken", value: 5, icon: <SlCalender />, bgColor: "#32a852" },
    { id: 3, title: "Leave Requests", value: 2, icon: <SlCalender />, bgColor: "#e8970c" }
  ];

  const holidayList = [
    { id: 1, name: "Christmas Day", date: "25 Dec 2025", month: "December" },
    { id: 2, name: "New Year’s Day", date: "01 Jan 2026", month: "January" },
    { id: 3, name: "Makar Sankranti", date: "14 Jan 2026", month: "January" },
    { id: 4, name: "Republic Day", date: "26 Jan 2026", month: "January" }
  ];

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-2">
      <div className="sticky z-20 top-2 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6 h-[40px] mt-2">
        <Typography className="text-white text-2xl sm:text-2xl text-center font-bold tracking-wide py-0">
          Dashboard
        </Typography>
      </div>

    

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <Cards />
          <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Leave Overview</h2>
            <Leavecards LeavecardData={leaveData} />
          </div>
        </div>

        {/* Profile Card */}
        {!isAdminRoute && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform hover:-translate-y-1 transition-all">
            <div className="h-24 bg-[#222F7D]" />
            <div className="-mt-14 flex justify-center">
              <img
                src={profileImage || defaultProfile}
                alt="profile"
                className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover bg-gray-200"
              />
            </div>

            <div className="px-6 pb-6 pt-4 text-center">
              <h3 className="text-xl font-bold text-gray-800">{user?.name || "Employee"}</h3>
              <span className="inline-block mt-2 px-4 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 uppercase">
                {role}
              </span>
              <div className="border-t my-5" />
              <div className="text-sm text-gray-600 space-y-3 text-left">
                <div className="flex justify-between">
                  <span>Employee ID</span>
                  <span className="font-semibold text-gray-800">{user?.emp_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-gray-800 truncate max-w-[160px]">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdminRoute && (
          <div className="bg-white rounded-2xl shadow-xl p-5 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Attendance Statistics</h2>
            <div className="flex-1 flex items-center justify-center">
              <AttendanceDoughnutChart cardData={adminData} />
            </div>
          </div>
        )}
      </div>

      {/* Admin Analytics */}
      {isAdminRoute && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold mb-5 text-gray-800">Attendance Exceptions</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-5">
                <p className="text-sm text-gray-500">Late Coming</p>
                <h3 className="text-3xl font-bold text-red-500 mt-1">2</h3>
              </div>
              <div className="bg-orange-50 rounded-xl p-5">
                <p className="text-sm text-gray-500">Early Leaving</p>
                <h3 className="text-3xl font-bold text-orange-500 mt-1">4</h3>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-4">
            <AttendanceBarChart cardData={adminData} />
          </div>
        </div>
      )}

      {!isAdminRoute && (
        <div className="mt-8">
          <MonthlyHolidays holidays={holidayList} />
        </div>
      )}
    </div>
  );
};

export default Overview;
import React, { useContext, useMemo } from "react";
import { EmployContext } from "../context/EmployContextProvider";
import PeopleIcon from "@mui/icons-material/People";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

const Cards = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase()?.trim();

  const {
    adminAttendance = [],
    singleAttendance,
    loading,
  } = useContext(EmployContext);

  const getTime = (dateTime) => {
    if (!dateTime) return "--";
  
    // If already HH:MM
    if (/^\d{2}:\d{2}$/.test(dateTime)) return dateTime;
  
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return "--";
  
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // change to true if you want AM/PM
    });
  };

  console.log("singleAttendance",singleAttendance)
  console.log("adminAttendance",adminAttendance)

  /* =======================
     ADMIN CARDS
  ======================== */
  const adminCards = useMemo(() => {
    if (!Array.isArray(adminAttendance) || adminAttendance.length === 0) {
      return [];
    }

    const totalEmployees = adminAttendance.length;

    const presentToday = adminAttendance.filter(
      (emp) =>
        emp.status === "Present" ||
        emp.status === "Working"
    ).length;

    const absentToday = adminAttendance.filter(
      (emp) => emp.status === "Absent"
    ).length;

    return [
      {
        id: 1,
        title: "Total Employees",
        value: totalEmployees,
        icon: <PeopleIcon />,
        bgColor: "#4F46E5",
      },
      {
        id: 2,
        title: "Present Today",
        value: presentToday,
        icon: <CheckCircleIcon />,
        bgColor: "#16A34A",
      },
      {
        id: 3,
        title: "Absent Today",
        value: absentToday,
        icon: <CancelIcon />,
        bgColor: "#DC2626",
      },
    ];
  }, [adminAttendance]);

  /* =======================
     EMPLOYEE CARDS
  ======================== */
  const employeeCards = useMemo(() => {
    if (!singleAttendance) return [];

    return [
      
      {
        id: 1,
        title: "Punch In",
        value: singleAttendance.today.punch_in
          ?getTime(singleAttendance.today.punch_in)
          : "--",
        icon: <PeopleIcon />,
        bgColor: "#4F46E5",
      },
      {
        id: 2,
        title: "Punch Out",
        value: singleAttendance.today.punch_in
          ? "Working"
          : "--",
        icon: <PeopleIcon />,
        bgColor: "#6B7280",
      },
      {
        id: 3,
        title: "Weekly Hours",
        value: singleAttendance.weekly.total_hours ?? "--",
        icon: <CheckCircleIcon />,
        bgColor:
          singleAttendance.status === "Present"
            ? "#16A34A"
            : "#DC2626",
      },
    ];
  }, [singleAttendance]);

  /* =======================
     LOADING STATE
  ======================== */
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const cardsToRender = role === "admin" ? adminCards : employeeCards;

  if (!cardsToRender.length) return null;

  /* =======================
     RENDER
  ======================== */
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cardsToRender.map((data) => (
        <div
          key={data.id}
          className="w-full min-h-[120px] rounded-xl bg-white border border-gray-200
                     p-5 shadow-sm flex flex-col justify-between
                     transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-lg text-white text-2xl"
              style={{ backgroundColor: data.bgColor }}
            >
              {data.icon}
            </div>

            <div>
              <p className="text-sm text-gray-500">{data.title}</p>
              <p className="text-2xl font-semibold">
                {data.value ?? "--"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Cards;

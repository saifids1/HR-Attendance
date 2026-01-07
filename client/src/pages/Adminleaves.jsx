import { Typography } from "@mui/material";
import React, { useState } from "react";

import { FaCalendarCheck } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import { FaCalendarAlt } from "react-icons/fa";
import { TfiMenuAlt } from "react-icons/tfi";
import { FaScaleBalanced } from "react-icons/fa6";

import Leavecards from "../components/Leavecards";
import LeavesTable from "../components/LeavesTable";

const Adminleaves = () => {
  const [activeTab, setActiveTab] = useState("pending");

  const selectedEmployee = "john@gmail.com";

  const adminLeaveCards = [
    { id: 1, request: "Total Request", total: 8, icon: <FaCalendarCheck />, bgColor: "#0e6efe" },
    { id: 2, request: "Pending", total: 1, icon: <FaRegClock />, bgColor: "#FFC107" },
    { id: 3, request: "Approved", total: 2, icon: <FaCheckCircle />, bgColor: "#1A8755" },
    { id: 4, request: "This Month", total: 1, icon: <FaCalendarAlt />, bgColor: "#0EC9F0" }
  ];

  const adminLeaveTableHeader = [
    "Employee",
    "Request Date",
    "Period",
    "Days",
    "Type",
    "Reason",
    "Contact",
    "Status"
  ];

  const adminLeaveTableBody = [
    {
      id: 1,
      Employee: "john@gmail.com",
      Date: "12/04/2025",
      Period: "12/04/2025 - 15/04/2025",
      Days: 3,
      Type: "Casual",
      Reason: "Personal",
      Contact: "9876543210",
      status: "pending"
    },
    {
      id: 2,
      Employee: "john@gmail.com",
      Date: "05/04/2025",
      Period: "05/04/2025 - 06/04/2025",
      Days: 2,
      Type: "Sick",
      Reason: "Fever",
      Contact: "9999999999",
      status: "approved"
    }
  ];

  // Filter  Employee
  const employeeLeaves = adminLeaveTableBody.filter(
    (item) => item.Employee === selectedEmployee
  );

  // Tabs Filter
  const filteredLeaves = employeeLeaves.filter((item) => {
    if (activeTab === "pending") return item.status === "pending";
    if (activeTab === "all") return true;
    return false;
  });


  // Pending Request Counts
  const pendingCount = employeeLeaves.filter(
    (item) => item.status === "pending"
  ).length;

  // Leave Balance
  const TOTAL_LEAVES = 20;

  const usedLeaves = employeeLeaves.reduce(
    (sum, item) => sum + item.Days,
    0
  );

  const remainingLeaves = TOTAL_LEAVES - usedLeaves;

  return (
    <div className="px-3 pb-6">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#222F7D] rounded-lg">
        <Typography className="text-white py-2 text-2xl text-center">
          Leave Requests
        </Typography>
      </div>

      <h1 className="text-lg mt-4 py-1">Leave Management</h1>

      {/* Cards */}
      <Leavecards LeavecardData={adminLeaveCards} />

      {/* Tabs */}
      <div className="flex items-center gap-4 w-full px-3 py-2 mt-4">

        {/* Pending */}
        <div
          onClick={() => setActiveTab("pending")}
          className={`px-3 py-2 rounded-md cursor-pointer relative
            ${activeTab === "pending"
              ? "bg-[#1a8755] text-white"
              : "bg-[#1a8755] bg-opacity-10 text-[#1a8755] border border-[#1a8755]"
            }`}
        >
          <p className="flex items-center gap-1.5">
            <FaRegClock />
            <span>Pending Leaves</span>
          </p>

          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white
              w-5 h-5 text-xs rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>

        {/* All */}
        <div
          onClick={() => setActiveTab("all")}
          className={`px-3 py-2 rounded-md flex items-center gap-1.5 cursor-pointer
            ${activeTab === "all"
              ? "bg-[#1a8755] text-white"
              : "text-[#1a8755] border bg-[#1a8755] bg-opacity-10 border-[#1a8755]"
            }`}
        >
          <TfiMenuAlt />
          <span>All Leaves</span>
        </div>

        {/* Leave Balance */}
        <div
          onClick={() => setActiveTab("balance")}
          className={`px-3 py-2 rounded-md flex items-center gap-1.5 cursor-pointer
            ${activeTab === "balance"
              ? "bg-[#1a8755] text-white"
              : "text-[#1a8755] border border-[#1a8755] bg-[#1a8755] bg-opacity-10"
            }`}
        >
          <FaScaleBalanced />
          <span>Leave Balance</span>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "balance" ? (
          <div className="p-4 border rounded-md text-[#000] space-y-1">
            <p>Employee : {selectedEmployee}</p>
            <p>Total Leaves : {TOTAL_LEAVES}</p>
            <p>Used Leaves : {usedLeaves}</p>
            <p>Remaining Leaves : {remainingLeaves}</p>
          </div>
        ) : (
          <LeavesTable
            adminLeavesHeader={adminLeaveTableHeader}
            adminLeavesBody={filteredLeaves}
          />
        )}
      </div>

    </div>
  );
};

export default Adminleaves;

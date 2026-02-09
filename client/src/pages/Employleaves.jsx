import { Typography } from '@mui/material'
import React, { useState, useEffect } from 'react'
import Leavecards from '../components/Leavecards'
import { SlCalender } from 'react-icons/sl'
import LeavesTable from '../components/LeavesTable';
import { FaCalendarCheck, FaCheckCircle, FaHourglassHalf, FaPlusCircle } from "react-icons/fa";
import Modal from '../components/Modal';
import axios from 'axios'; // Ensure axios is installed

const Employleaves = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveTableData, setLeaveTableData] = useState([]);
  const [leaveCardData, setLeaveCardData] = useState([]);
  
  // Get emp_id and role from local storage/auth context
  const empId = JSON.parse(localStorage.getItem("user")).emp_id;
  // console.log("empId",empId);
  const role = localStorage.getItem("user")?.role || "employee";

  const fetchLeaveData = async () => {
    try {
      // 1. Fetch Leave Balance for Cards


      const res = await axios.get(`http://localhost:5000/api/leaves/types/my-summary/${empId}`);
      const data = res.data;

      // 2. Transform the Object into the Array required by Leavecards
      const mappedCards = [
        {
          id: 1,
          title: "Total Allowed",
          value: `${data.total_allowed} Days`,
          icon: <FaCalendarCheck />,
          bgColor: "#32a852" // Green
        },
        {
          id: 2,
          title: "Total Taken",
          value: `${data.total_taken} Days`,
          icon: <FaCheckCircle />,
          bgColor: "#e8970c" // Orange
        },
        {
          id: 3,
          title: "Available Balance",
          value: `${data.total_remaining} Days`,
          icon: <SlCalender />,
          bgColor: "#1a8755" // Dark Green
        },
        {
          id: 4,
          title: "Pending Requests",
          value: data.pending_requests,
          icon: <FaHourglassHalf />,
          bgColor: "#e60707" // Red
        }
      ];

      // console.log(mappedCards,"mappedCards");
      setLeaveCardData(mappedCards);

      // 2. Fetch Leave History for Table
      const endpoint = role === "admin" 
        ? `http://localhost:5000/api/leaves/types/pending-approvals/${empId}`
        : `http://localhost:5000/api/leaves/types/my/${empId}`;
      

        console.log("endpoint",endpoint)
      const historyRes = await axios.get(endpoint);
      setLeaveTableData(historyRes.data);
    } catch (err) {
      console.error("Error fetching leave data:", err);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const leavesTableHeader = [
    "Applied On", "Period", "Days", "Type", "Status", "Remarks/Reason"
  ];

  const adminLeavesHeader = [
    "Employee", "Period", "Days", "Type", "Reason", "Current Level", "Actions"
  ];

  return (
    <div className="px-3 pb-6">
       <div className="sticky top-0 z-10 bg-[#222F7D] rounded-lg">
         <Typography className="text-white py-2 text-2xl text-center ">Leaves</Typography>
       </div>
       <h1 className='text-lg py-2'>Leave Management</h1>

        <Leavecards LeavecardData={leaveCardData}/>

        <div className='bg-slate-50 w-full py-3 mb-4'>
          <div className='flex items-center justify-between w-full py-2'>
            <h1>{role === "admin" ? "Pending Approvals" : "My Leave Requests"}</h1>
            {role !== "admin" && (
              <div className='flex items-center gap-2 border border-white hover:border-blue-500 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-500 cursor-pointer' onClick={()=> setIsModalOpen(true)}>
                <FaPlusCircle size={15} className='text-2xl'/>
                <button>Request New Leave</button>
              </div>
            )}
          </div>

          <Modal isOpen={isModalOpen} setisOpen={setIsModalOpen} refreshData={fetchLeaveData} />
           
          <LeavesTable 
            leavesHeader={leavesTableHeader} 
            leavesBody={leaveTableData}
            adminLeavesHeader={adminLeavesHeader}
            adminLeavesBody={leaveTableData} // Same data source, filtered by backend
            refreshData={fetchLeaveData}
          />
        </div>
     </div>
  )
}

export default Employleaves;
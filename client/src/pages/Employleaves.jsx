import { Typography } from '@mui/material'
import React, { useState } from 'react'
import Leavecards from '../components/Leavecards'
import { SlCalender } from 'react-icons/sl'
import LeavesTable from '../components/LeavesTable';
import { FaPlusCircle } from "react-icons/fa";
import Modal from '../components/Modal';



const Employleaves = () => {

  const [isModalOpen,setIsModalOpen] = useState(false);
  const leaveCardData = [
      { id: 1, title: "Total Allowed", value: "21 days", icon: <SlCalender />, bgColor: "#32a852" },
      { id: 2, title: "Used", value: "9 days", icon: <SlCalender />, bgColor: "#e8970c" },
      { id: 3, title: "Available", value: "12 days", icon: <SlCalender />, bgColor: "#e60707" }
    ]

  const leavesTableHeader = [
    
    "Request Date","Period","Days","Type","Status","Reason","Approved By"
  ]


  const leaveTableData = [
    {id:1,request:"17/10/2025",period:"20/10/2025",Days:3,Type:"Annual",status:"Approved",Reason:"Leave For Wedding",approvedby:"Ryan"},
    {id:2,request:"08/04/2025",period:"09/04/2025",Days:1,Type:"Casual",status:"pending",Reason:"Feeling Not Well",approvedby:"Nick"},
    

  ]
  
  return (
    <div className="px-3 pb-6">
   
       {/* Sticky Header */}
       <div className="sticky top-0 z-50 bg-[#222F7D] rounded-lg">
         <Typography className="text-white py-2 text-2xl text-center">
          Leaves
         </Typography>
   
       </div>
       <h1 className='text-lg py-2'>Leave Management</h1>

        <Leavecards LeavecardData={leaveCardData}/>

        <div className='bg-slate-50 w-full py-3 mb-4'>

          <div className='flex items-center justify-between w-full py-2'>

          <h1>My Leave Requests</h1>
          <div className='flex items-center gap-2 border border-white hover:border-blue-500 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-500 cursor-pointer' onClick={()=> setIsModalOpen(true)}>
          <FaPlusCircle size={15} className='text-2xl'/>
          <button >Request New Leave</button>
          </div>
          </div>

          <Modal isOpen={isModalOpen} setisOpen={setIsModalOpen} />
           
          <LeavesTable leavesHeader={leavesTableHeader} leavesBody={leaveTableData}/>
        </div>
      
     
     </div>
  )
}

export default Employleaves;
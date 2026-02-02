import React, { useEffect } from "react";

const SortIcon = () => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    viewBox="0 0 320 512"
    height="0.9em"
    width="0.9em"
    className="text-gray-400"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41zm255-105L177 64c-9.4-9.4-24.6-9.4-33.9 0L24 183c-15.1 15.1-4.4 41 17 41h238c21.4 0 32.1-25.9 17-41z" />
  </svg>
);

const LeavesTable = ({ leavesHeader, leavesBody, adminLeavesHeader, adminLeavesBody, refreshData }) => {
  const role = localStorage.getItem("role") || "employee";

  const handleAction = async (approvalId, status) => {
    const remarks = prompt(`Enter remarks for ${status}:`);
    try {
      await axios.put(`http://localhost:5000/api/leaves/types/approve/${approvalId}`, {
        status,
        remarks
      });
      alert(`Request ${status} successfully`);
      refreshData(); // Trigger list refresh
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };


  useEffect(()=>{
    console.log(leavesBody,"leavesBody,")
  },[])
  if (role === "employee") {
    return (
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {leavesHeader?.map((data, index) => (
              <th key={index} className="border px-4 py-3 font-semibold text-left"><div className="flex items-center gap-1">{data}<SortIcon /></div></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leavesBody?.map((data, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
              <td className="border px-4 py-3">{new Date(data.applied_at).toLocaleDateString()}</td>
              <td className="border px-4 py-3">{`${new Date(data.start_date).toLocaleDateString()} - ${new Date(data.end_date).toLocaleDateString()}`}</td>
              <td className="border px-4 py-3">{data.total_days}</td>
              <td className="border px-4 py-3">{data.leaves_type}</td>
              <td className="border px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${data.status === 'approved' ? 'bg-green-100 text-green-700' : data.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {data.status}
                </span>
              </td>
              <td className="border px-4 py-3">{data.approver_remarks || data.reason}</td>
              {/* <td className="border px-4 py-3">{data.approver_role} ({data.level_status})</td> */}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Admin / Manager View
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          {adminLeavesHeader.map((data, index) => (
            <th key={index} className="border px-4 py-3 font-semibold text-left"><div className="flex items-center gap-1">{data}<SortIcon /></div></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {adminLeavesBody.map((data, i) => (
          <tr key={data.approval_id || i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}>
            <td className="border px-4 py-3">{data.applicant_name}</td>
            <td className="border px-4 py-3">{`${new Date(data.start_date).toLocaleDateString()} - ${new Date(data.end_date).toLocaleDateString()}`}</td>
            <td className="border px-4 py-3">{data.total_days}</td>
            <td className="border px-4 py-3">{data.leave_type}</td>
            <td className="border px-4 py-3">{data.reason}</td>
            <td className="border px-4 py-3">Level {data.approval_level}</td>
            <td className="border px-4 py-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAction(data.approval_id, 'approved')}
                  className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded">Accept</button>
                <button 
                  onClick={() => handleAction(data.approval_id, 'rejected')}
                  className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded">Reject</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LeavesTable;

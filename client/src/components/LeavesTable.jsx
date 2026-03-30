import React, { useEffect } from "react";
import api from "../../api/axiosInstance";

const LeavesTable = ({
  leavesHeader,
  leavesBody,
  adminLeavesHeader,
  adminLeavesBody,
  refreshData,
  isManager
}) => {

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role || "employee";
  const empId = user?.emp_id;
  
  
  // console.log("isManager Leaves Table",isManager);

  

  const handleAction = async (approvalId, status) => {
    const remarks = prompt(`Enter remarks for ${status}:`);
    try {
      await api.put(`/leaves/types/approve/${approvalId}`, {
        status,
        remarks,
      });
      // alert(`Request ${status} successfully`);
      refreshData();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    }
  };

  // useEffect(() => {
  //   console.log("Leaves Table Data Updated:", {
  //     leavesBody,
  //     adminLeavesBody,
  //   });
  // }, [leavesBody, adminLeavesBody]);

  const formattedDate = (dateStr) => {
    const date = new Date(dateStr);
    const dd = date.getDate().toString().padStart(2, "0");
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const yy = date.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

 
  //  EMPLOYEE VIEW

  if (!isManager) {
    return (
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {leavesHeader?.map((data, index) => (
              <th key={index} className="border px-4 py-3 text-left">
                {data}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leavesBody?.map((data, i) => (
            <tr key={i} className="hover:bg-gray-100">
              <td className="border px-4 py-3">
                {formattedDate(data.applied_at)}
              </td>
              <td className="border px-4 py-3">
                {formattedDate(data.start_date)} -{" "}
                {formattedDate(data.end_date)}
              </td>
              <td className="border px-4 py-3">{data.total_days}</td>
              <td className="border px-4 py-3">{data.leaves_type}</td>
              <td className="border px-4 py-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    data.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : data.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.status}
                </span>
              </td>
              <td className="border px-4 py-3">
                {data.approver_remarks || data.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if(isManager){
     return (
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {adminLeavesHeader?.map((data, index) => (
              <th key={index} className="border px-4 py-3 text-left">
                {data}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leavesBody?.map((data, i) => (
            <tr key={i} className="hover:bg-gray-100">
              <td className="border px-4 py-3">
                {formattedDate(data.applied_at)}
              </td>
              <td className="border px-4 py-3">
                {data.start_date} -{" "}
                {data.end_date}
              </td>
              <td className="border px-4 py-3">{data.total_days}</td>
              <td className="border px-4 py-3">{data.leave_type}</td>
              <td className="border px-4 py-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    data.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : data.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {data.status}
                </span>
              </td>
              <td className="border px-4 py-3">
                {data.approver_remarks || data.reason}
              </td>
               <td className="border px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAction(data.approval_id, "approved")
                  }
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    handleAction(data.approval_id, "rejected")
                  }
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                >
                  Reject
                </button>
              </div>
            </td>
            </tr>
          ))}
        </tbody>
      </table>
     )
  }
  
  //  TEAM LEAD VIEW
 
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          {adminLeavesHeader?.map((data, index) => (
            <th key={index} className="border px-4 py-3 text-left">
              {data}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {adminLeavesBody?.map((data, i) => (
          <tr key={data.approval_id || i} className="hover:bg-gray-100">
            <td className="border px-4 py-3">{data.applicant_name}</td>
            <td className="border px-4 py-3">
              {formattedDate(data.start_date)} -{" "}
              {formattedDate(data.end_date)}
            </td>
            <td className="border px-4 py-3">{data.total_days}</td>
            <td className="border px-4 py-3">{data.leave_type}</td>
            <td className="border px-4 py-3">{data.reason}</td>
            <td className="border px-4 py-3">
              Level {data.approval_level}
            </td>
            <td className="border px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleAction(data.approval_id, "approved")
                  }
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    handleAction(data.approval_id, "rejected")
                  }
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                >
                  Reject
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LeavesTable;
import React from "react";

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

const LeavesTable = ({
  leavesHeader = [],
  leavesBody = [],
  adminLeavesHeader = [],
  adminLeavesBody = [],
}) => {
  const role = localStorage.getItem("role") || "employee";

  // Employee
  if (role === "employee") {
    return (
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            {leavesHeader.map((data, index) => (
              <th
                key={index}
                className="border px-4 py-3 font-semibold whitespace-nowrap text-left"
              >
                <div className="flex items-center gap-1">
                  {data}
                  <SortIcon />
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leavesBody.map((data, i) => (
            <tr
              key={i}
              className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
            >
              <td className="border px-4 py-3">{data.request}</td>
              <td className="border px-4 py-3">{data.period}</td>
              <td className="border px-4 py-3">{data.Days}</td>
              <td className="border px-4 py-3">{data.Type}</td>
              <td className="border px-4 py-3">{data.status}</td>
              <td className="border px-4 py-3">{data.Reason}</td>
              <td className="border px-4 py-3">{data.approvedby}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

    // Admin 
  return (
    <table className="min-w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          {adminLeavesHeader.map((data, index) => (
            <th
              key={index}
              className="border px-4 py-3 font-semibold whitespace-nowrap text-left"
            >
              <div className="flex items-center gap-1">
                {data}
                <SortIcon />
              </div>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {adminLeavesBody.map((data, i) => (
          <tr
            key={data.id || i}
            className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
          >
            <td className="border px-4 py-3">{data.Employee}</td>
            <td className="border px-4 py-3">{data.Date}</td>
            <td className="border px-4 py-3">{data.Period}</td>
            <td className="border px-4 py-3">{data.Days}</td>
            <td className="border px-4 py-3">{data.Type}</td>
            <td className="border px-4 py-3">{data.Reason}</td>
            <td className="border px-4 py-3">{data.Contact}</td>

            {/* ACTIONS */}
            <td className="border px-4 py-3">
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded">
                  Accept
                </button>
                <button className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded">
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

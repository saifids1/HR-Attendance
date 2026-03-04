import { Typography, Button } from '@mui/material'; // Added Button for Export
import React, { useEffect, useState, useContext } from 'react';
import Filters from '../components/Filters';
import Loader from '../components/Loader';
import { EmployContext } from '../context/EmployContextProvider';
import { exportWeekToExcel } from '../utils/weekToExcel'; // Import your utility
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const StatusBadge = ({ status }) => {
    const styles = {
        Present: "bg-green-600 text-white",
        Working: "bg-blue-600 text-white",
        Absent: "bg-red-600 text-white",
    };

    return (
        <span
            className={`
                inline-flex items-center justify-center
                w-24 h-6
                text-center
                rounded text-[12px]
                uppercase font-semibold
                ${styles[status] || "bg-gray-300 text-gray-800"}
            `}
        >
            {status || "No Data"}
        </span>
    );
};


const WeeklyAttendance = () => {
    const {
        holidays,
        filters,
        formatDate,
        weeklyData,
        weeklyLoading
    } = useContext(EmployContext);



    // Safely extract attendance array
   const employees = weeklyData?.data || [];
    // const attendanceList = employees?.attendance || [];

    console.log("weeklyData",weeklyData)



    const getDayName = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
    };

    const getHolidayMatch = (dateStr) => {
        if (!dateStr || !holidays?.length) return null;
        const aDate = new Date(dateStr).toDateString();
        return holidays.find(h => new Date(h.holiday_date).toDateString() === aDate);
    };

    const headers = ["Sr No", "Day", "Emp ID", "Employee", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"];

    return (
        <div className="min-h-max px-3 bg-gray-50">
            <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-2 mb-1 shadow-lg flex justify-center items-center px-6 mt-[9px]">
                <div className="w-10"></div> {/* Spacer to center text */}
                <Typography className="text-white font-bold" sx={{ fontSize: '1rem' }}>
                    Weekly Attendance
                </Typography>

              
            </div>

            <Filters />

            <div className="relative overflow-auto w-full border border-gray-300 rounded max-h-[800px]  bg-white shadow-sm">
                <table className={`min-w-full text-sm border-collapse ${weeklyLoading ? 'opacity-50' : 'opacity-100'} h-[400px]`}>
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="border-b px-4 py-3 font-bold text-left text-gray-700 whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
  {employees.length > 0 ? (
    employees.filter((emp)=> emp.emp_id !== "2020").flatMap((employee, empIndex) =>
      employee.attendance.map((row, i) => {
        const dayStr = getDayName(row.date);
        const holidayMatch = getHolidayMatch(row.date);

        const isSunday = dayStr === "Sunday";
        const isSaturday = dayStr === "Saturday";

        const totalHours = Number(row.total_hours || 0);

        const hasWork =
          !!row.first_in ||
          !!row.last_out ||
          totalHours > 0;

        const isAbsent =
          !hasWork && !holidayMatch && !isSunday;

        const expectedHours = isSaturday ? 5 : 9.5;

        return (
          <tr
            key={`${empIndex}-${i}`}
            className={`transition-colors ${
              isSunday
                ? "bg-orange-100"
                : holidayMatch
                ? "bg-blue-50"
                : ""
            }`}
          >
            <td className="px-4 py-2 font-bold text-gray-800">
              {empIndex * 7 + i + 1}
            </td>

            <td className="px-4 py-2 font-bold text-gray-800 text-[11px] uppercase">
              {dayStr}
            </td>

            <td className="px-4 py-2 font-bold text-gray-800">
              {employee.emp_id}
            </td>

            <td className="px-4 py-2 whitespace-nowrap font-medium">
              {employee.name}
            </td>

            <td className="px-4 py-2 whitespace-nowrap font-semibold">
              {formatDate(row.date)}
            </td>

            <td className="px-4 py-2">
  {holidayMatch ? (
    <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-200">
      {holidayMatch.holiday_name}
    </span>
  ) : isSunday ? (
    <span className="inline-block w-24 text-center text-white font-bold bg-orange-600 px-2 py-0.5 rounded text-[10px] uppercase">
      Week Off
    </span>
  ) : row.first_in && !row.last_out ? (
    <StatusBadge status="Working" />
  ) : row.first_in && row.last_out ? (
    <StatusBadge status="Present" />
  ) : (
    <StatusBadge status="Absent" />
  )}
</td>

            <td className="px-4 py-2 font-semibold">
              {holidayMatch || isSunday
                ? "--"
                : row.first_in || "--"}
            </td>

            <td className="px-4 py-2 font-semibold">
              {holidayMatch || isSunday
                ? "--"
                : row.last_out || "--"}
            </td>

            <td className="px-4 py-2 font-bold">
              {holidayMatch || isSunday
                ? "--"
                : totalHours.toFixed(2)}
            </td>

            <td className="px-4 py-2 font-bold">
              {holidayMatch || isSunday
                ? "--"
                : expectedHours}
            </td>
          </tr>
        );
      })
    )
  ) : (
    <tr>
     <td colSpan={headers.length} className="py-20">
  <div className="flex justify-center items-center w-full">
    {weeklyLoading ? (
      <Loader />
    ) : (
      <span className="text-gray-400">
        No attendance records found for this period
      </span>
    )}
  </div>
</td>
    </tr>
  )}
                </tbody>
                </table>
            </div>
        </div>
    );
};

export default WeeklyAttendance;
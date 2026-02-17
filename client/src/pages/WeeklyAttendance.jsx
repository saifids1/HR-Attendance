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
        Late: "bg-yellow-500 text-white",
        Absent: "bg-red-600 text-white",
        "Half Day": "bg-orange-500 text-white",
    };

    return (
        <span className={`
            inline-block w-20 text-center 
            px-2 py-0.5 rounded text-[10px] uppercase font-semibold 
            ${styles[status] || "bg-gray-300 text-gray-800"}
        `}>
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

    const [empInfo, setEmpInfo] = useState({ name: "--", emp_id: "--" });

    // Safely extract attendance array
    const attendanceList = weeklyData?.attendance || [];

    // console.log("weeklyData",weeklyData)

    useEffect(() => {
        if (weeklyData?.employee) {
            setEmpInfo({
                name: weeklyData.employee.name,
                emp_id: weeklyData.employee.emp_id
            });
        }
    }, [weeklyData]);


    // useEffect(()=>{

    //     // console.log("attendanceList",weeklyData)
    // },[attendanceList])
    const getDayName = (dateStr) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
    };

    const getHolidayMatch = (dateStr) => {
        if (!dateStr || !holidays?.length) return null;
        const aDate = new Date(dateStr).toDateString();
        return holidays.find(h => new Date(h.holiday_date).toDateString() === aDate);
    };

    const headers = ["Sr No", "DATE", "Emp ID", "Employee", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"];

    return (
        <div className="min-h-screen px-4 bg-gray-50">
            <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6">
                <div className="w-10"></div> {/* Spacer to center text */}
                <Typography className="text-white font-bold" sx={{ fontSize: '1rem' }}>
                    Weekly Attendance
                </Typography>

              
            </div>

            <Filters />

            <div className="relative overflow-auto w-full border border-gray-300 rounded max-h-[600px]  bg-white shadow-sm">
                <table className={`min-w-full text-sm border-collapse ${weeklyLoading ? 'opacity-50' : 'opacity-100'}`}>
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="border-b px-4 py-3 font-bold text-left text-[#222F7D] bg-gray-100 whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {attendanceList.length > 0 ? (
                            attendanceList.map((row, i) => {
                                const dayStr = getDayName(row.date);
                                const holidayMatch = getHolidayMatch(row.date);
                                const isSunday = dayStr === "Sun";
                                const isSaturday = dayStr === "Sat";

                                const hasWork = row.first_in || row.last_out || parseFloat(row.total_hours) > 0;
                                const isAbsent = !hasWork && !holidayMatch && !isSunday;

                                return (
                                    <tr key={i} className={`transition-colors ${isSunday ? "bg-orange-500 text-white" : ""}`}>
                                        <td className={`px-4 py-2 font-bold ${isSunday ? "text-white" : "text-gray-800"}`}>
                                            {i + 1}
                                        </td>

                                        <td className="px-4 py-2 font-bold text-gray-800">

                                            <span className="text-[10px] uppercase">{isSunday ? "" : dayStr}

                                            </span>

                                        </td>
                                        <td className="px-4 py-2 font-bold text-gray-800">{isSunday ? "" : empInfo.emp_id}</td>
                                        <td className="px-4 py-2 whitespace-nowrap font-medium">{isSunday ? "" : empInfo.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{isSunday ? "" : formatDate(row.date)}</span>

                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {holidayMatch ? (
                                                <span className="text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-200">
                                                    {holidayMatch.holiday_name}
                                                </span>
                                            ) : isSunday ? (
                                                <span className="inline-block w-20 text-center text-white font-bold bg-orange-600 px-2 py-0.5 rounded text-nowrap text-[10px] uppercase">
                                                    Weekday Off
                                                </span>
                                            ) : isAbsent ? (
                                                <StatusBadge status="Absent" />
                                            ) : (
                                                <StatusBadge status="Present" />
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-black font-semibold">{isSunday || holidayMatch ? "--" : row.first_in || "--"}</td>
                                        <td className="px-4 py-2 text-black font-semibold">{isSunday || holidayMatch ? "--" : row.last_out || "--"}</td>
                                        <td className="px-4 py-2 font-bold text-gray-700">{isSunday || holidayMatch ? "--" : row.total_hours || "0.00"}</td>
                                        <td className="px-4 py-2 font-bold text-gray-800">
                                            {holidayMatch || isSunday ? "--" : isSaturday ? "5" : "9.3"}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={headers.length} className="text-center py-20 text-gray-400">
                                    {weeklyLoading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader />
                                            <p>Fetching records...</p>
                                        </div>
                                    ) : (
                                        "No attendance records found for this period"
                                    )}
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
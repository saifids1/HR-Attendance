import { Typography } from "@mui/material";
import React, { useContext, useEffect, useMemo } from "react";
import Filters from "../components/Filters";
import Loader from "../components/Loader";
import { EmployContext } from "../context/EmployContextProvider";

// const getStatus = () => {
//   if (holidayMatch) return holidayMatch.holiday_name;
//   if (isSunday) return "Week Off";
//   if (row.first_in && !row.last_out) return "Working";
//   if (row.first_in && row.last_out && row.total_hours > 9) return "Present";
//   if (row.first_in && row.last_out && row.total_hours < 9) return "Early Go";
//   if (row.first_in) return "Late Coming";
//   return "Absent";
// };
const StatusBadge = ({ status }) => {
  const styles = {
    "Present": "bg-green-600 text-white",
    "Working": "bg-blue-600 text-white",
    "Absent": "bg-red-600 text-white",
    "Late Come": "bg-orange-500 text-white",
    "Early Go": "bg-yellow-400 text-white", // optional
  };

  const className = `inline-block w-24 text-center font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
    styles[status] || "bg-gray-400 text-white"
  }`;

  return <span className={className}>{status}</span>;
};

const WeeklyAttendance = () => {
  const { holidays, filters, formatDate, weeklyData, weeklyLoading } = useContext(EmployContext);



  const employees = weeklyData?.data || [];
  // const searchTerm = (filters.weekSearch || "").toLowerCase().trim();
  const date = new Date();
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  // const filteredEmployees = useMemo(() => {
  //     const rawSearch = (filters.weekSearch || "").toLowerCase().trim();

  //     // 1. If no search term, just remove the excluded ID
  //     if (!rawSearch) {
  //       return employees.filter((emp) => emp.emp_id !== "2020");
  //     }

  //     const isTimeSearch = rawSearch.includes(":");

  //     // 2. Clean Search: Remove everything except numbers and colons
  //     // Handles "10 : 30 AM" -> "10:30"
  //     const cleanSearch = rawSearch.replace(/[^\d:]/g, "");

  //     const getCleanTime = (timeStr) => {
  //       if (!timeStr) return "";
  //       // Strip everything but digits and colons (removes spaces, AM/PM, hidden chars)
  //       return timeStr.replace(/[^\d:]/g, "");
  //     };

  //     return employees
  //       .filter((emp) => emp.emp_id !== "2020")
  //       .map((emp) => {
  //         const attendance = (emp.attendance || []).filter((row) => {
  //           const firstIn = getCleanTime(row.first_in); // e.g. "10:07"
  //           const lastOut = getCleanTime(row.last_out); // e.g. "03:59"

  //           if (isTimeSearch) {
  //             // Check both standard "03:59" and stripped "3:59" for better UX
  //             const matchFirst = firstIn.includes(cleanSearch) || firstIn.replace(/^0/, "").includes(cleanSearch);
  //             const matchLast = lastOut.includes(cleanSearch) || lastOut.replace(/^0/, "").includes(cleanSearch);
  //             return matchFirst || matchLast;
  //           }

  //           // Standard Search (Name or ID)
  //           return (
  //             emp.name?.toLowerCase().includes(rawSearch) ||
  //             emp.emp_id?.toString().includes(rawSearch) ||
  //             emp.first_in?.toLowerCase().includes(rawSearch) ||
  //             emp.last_out?.toLowerCase().includes(rawSearch) 
  //           );
  //         });

  //         return { ...emp, attendance };
  //       })
  //       .filter((emp) => emp.attendance.length > 0);
  //   }, [employees, filters.weekSearch]);
  const filteredEmployees = useMemo(() => {
    const rawSearch = (filters.weekSearch || "").toLowerCase().trim();

    // If no search → only remove excluded employee
    if (!rawSearch) {
      return employees.filter((emp) => emp.emp_id !== "2020");
    }

    const isTimeSearch = rawSearch.includes(":");

    // remove spaces / am pm / symbols
    const cleanSearch = rawSearch.replace(/[^\d:]/g, "");

    const getCleanTime = (timeStr) => {
      if (!timeStr) return "";
      return timeStr.replace(/[^\d:]/g, "");
    };

    return employees
      .filter((emp) => emp.emp_id !== "2020")
      .map((emp) => {
        const attendance = (emp.attendance || []).filter((row) => {
          const firstIn = getCleanTime(row.first_in);
          const lastOut = getCleanTime(row.last_out);

          if (isTimeSearch) {
            const matchFirst =
              firstIn.includes(cleanSearch) ||
              firstIn.replace(/^0/, "").includes(cleanSearch);

            const matchLast =
              lastOut.includes(cleanSearch) ||
              lastOut.replace(/^0/, "").includes(cleanSearch);

            return matchFirst || matchLast;
          }

          // normal search
          return (
            emp.name?.toLowerCase().includes(rawSearch) ||
            emp.emp_id?.toString().includes(rawSearch) ||
            row.first_in?.toLowerCase().includes(rawSearch) ||
            row.last_out?.toLowerCase().includes(rawSearch)
          );
        });

        return { ...emp, attendance };
      })
      .filter((emp) => emp.attendance.length > 0);
  }, [employees, filters.weekSearch]);

  useEffect(() => {
    console.log("filteredEmployees Weekly", filteredEmployees);

  }, [filters, filteredEmployees]);
  // Helper functions
  const getDayName = (dateStr) => !dateStr ? "" : new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });

  const getHolidayMatch = (dateStr) => {
    if (!dateStr || !holidays?.length) return null;
    const aDate = new Date(dateStr).toDateString();
    return holidays.find((h) => new Date(h.holiday_date).toDateString() === aDate);
  };

  const getDayIndexMondayFirst = (date) => {
    const day = new Date(date).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatHours = (hours) => {
    if (!hours) return "--";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  };

  const headers = ["Sr No", "Day", "Emp ID", "Employee", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"];

  return (
    <div className="min-h-max px-3 bg-gray-50">
      <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-2 mb-1 shadow-lg flex justify-between items-center px-6 mt-[9px]">
        <div className="w-8 text-nowrap text-white justify-start">{`Date: ${day}-${month}-${year} `}</div>
        <Typography className="text-white font-bold" sx={{ fontSize: "1rem" }}>
          Weekly Attendance
        </Typography>
        <div className=""></div>
      </div>

      <Filters />

      <div className="relative overflow-auto w-full border border-gray-300 rounded max-h-[800px] bg-white shadow-sm">
        <table className={`min-w-full text-sm border-collapse ${weeklyLoading ? "opacity-50" : "opacity-100"}`}>
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border-b px-4 py-3 font-bold text-left text-gray-700 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.flatMap((employee, empIndex) => {
                const sortedAttendance = [...(employee.attendance || [])].sort(
                  (a, b) => getDayIndexMondayFirst(a.date) - getDayIndexMondayFirst(b.date)
                );

                return sortedAttendance.map((row, i) => {
                  const dayStr = getDayName(row.date);
                  const holidayMatch = getHolidayMatch(row.date);
                  const isSunday = dayStr === "Sunday";
                  const isSaturday = dayStr === "Saturday";
                  const expectedHours = isSaturday ? 5 : 9.3;

                  return (
                    <tr key={`${employee.emp_id}-${i}`} className={`transition-colors ${isSunday ? "bg-orange-100" : holidayMatch ? "bg-blue-50" : ""}`}>
                      <td className="px-4 py-2 font-bold text-gray-800">{empIndex * 7 + i + 1}</td>
                      <td className="px-4 py-2 font-bold text-gray-800 text-[11px]">{dayStr}</td>
                      <td className="px-4 py-2 font-bold text-gray-800">{employee.emp_id}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium">{employee.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-semibold">{formatDate(row.date)}</td>
                      <td className="px-4 py-2">
                        {holidayMatch ? (
                          <span className="inline-block text-center font-bold text-blue-700 w-24 h-6 bg-blue-100 px-2 py-0.5 rounded text-[10px] uppercase border border-blue-200">
                            {holidayMatch.holiday_name}
                          </span>
                        ) : isSunday ? (
                          <span className="inline-block w-24 text-center text-white font-bold bg-orange-600 px-2 py-0.5 rounded text-[10px] uppercase">
                            Week Off
                          </span>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                        {/* {row.status} */}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {holidayMatch || isSunday ? "--" : row.first_in ? row.first_in.toLowerCase() : "--"}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {holidayMatch || isSunday ? "--" : row.last_out ? row.last_out.toLowerCase() : "--"}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {holidayMatch || isSunday ? "--" : formatHours(row.total_hours)}
                      </td>
                      <td className="px-4 py-2 font-semibold">
                        {holidayMatch || isSunday ? "--" : expectedHours}
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan={headers.length} className="py-20 text-center">
                  {weeklyLoading ? <Loader /> : <span className="text-gray-400">No attendance records found</span>}
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
// import React, { useContext, useMemo, useEffect } from "react";
// import { EmployContext } from "../context/EmployContextProvider";
// import Loader from "./Loader";
// import { useLocation } from "react-router-dom";

// const StatusBadge = ({ status }) => {
//   const styles = {
//     Present: "bg-green-600 text-white",
//     Working: "bg-blue-600 text-white",
//     Late: "bg-yellow-500 text-white",
//     Absent: "bg-red-600 text-white",
//     "Half Day": "bg-orange-500 text-white",
//   };

//   return (
//     <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || "bg-gray-300 text-gray-800"}`}>
//       {status}
//     </span>
//   );
// };

// const getHolidayMatch = (attendanceDate, holidays = []) => {
//   if (!attendanceDate || !holidays.length) return null;
//   const aDate = new Date(attendanceDate).toDateString();
//   return holidays.find(h => new Date(h.holiday_date).toDateString() === aDate);
// };

// const formatTime = (value) => {
//   if (!value) return "--";
//   if (typeof value === 'string' && (value.includes("AM") || value.includes("PM"))) return value;
//   try {
//     const d = new Date(value);
//     return d.toLocaleTimeString('en-IN', {
//       timeZone: 'Asia/Kolkata',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     });
//   } catch (e) { return value; }
// };

// const formatInterval = (val) => {
//   if (!val) return "--";
//   if (typeof val === "string") return val;
//   if (typeof val === "object") {
//     const h = String(val.hours || 0).padStart(2, "0");
//     const m = String(val.minutes || 0).padStart(2, "0");
//     return `${h}:${m}`;
//   }
//   return "--";
// };

// const Table = () => {
//   const { adminAttendance = [], employeeAttendance = [], loading, filters, holidays } = useContext(EmployContext);

//   const isAdminRoute = location.pathname.includes("admin");

//   const headers = isAdminRoute ? adminHeaders : employeeHeaders;


//   const user = JSON.parse(localStorage.getItem("user") || "{}");
//   const role = (user?.role || "").toLowerCase();
//   const isAdmin = role === "admin";

//   // Standardized Date Formatter for Day of Week
//   const getDayName = (dateStr) => {
//     if (!dateStr) return "";
//     return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
//   };

//   const data = isAdmin
//     ? adminAttendance
//     : employeeAttendance.filter((a) => a.emp_id === user.emp_id);

//   const filteredData = useMemo(() => {
//     let result = [...data];
//     const normalizeDate = (d) => {
//       if (!d) return null;
//       const date = new Date(d);
//       date.setHours(0, 0, 0, 0);
//       return date;
//     };

//     const start = normalizeDate(filters?.startDate);
//     const end = normalizeDate(filters?.endDate);

//     if (start) result = result.filter((row) => normalizeDate(row.attendance_date) >= start);
//     if (end) result = result.filter((row) => normalizeDate(row.attendance_date) <= end);

//     if (isAdmin && filters?.attendanceSearch) {
//       const search = filters.attendanceSearch.toLowerCase();
//       result = result.filter(
//         (row) =>
//           row.name?.toLowerCase().includes(search) ||
//           String(row.emp_id || "").includes(search)
//       );
//     }
//     return result;
//   }, [data, filters, isAdmin]);

//   const getRowClass = (dayStr, isToday, isHoliday, index) => {
//     if (isHoliday) return "bg-blue-50 text-blue-900 font-medium";
//     if (dayStr === "Sun" && !isAdmin) return "bg-[#faa307] text-white font-semibold";
//     if (dayStr === "Sat" && !isAdmin) return "bg-[#D1FFBD] text-dark font-semibold";
//     if (isToday) return "bg-white font-semibold";
//     return index % 2 === 0 ? "bg-white" : "bg-gray-50";
//   };
//   const formatDate = (dateString) => {
//     if (!dateString) return "-";

//     const date = new Date(dateString);

//     // Extract parts
//     const d = date.getDate();
//     const m = date.getMonth() + 1; // Months are 0-indexed
//     const y = date.getFullYear();

//     // padStart adds the '0' if the number is less than 10
//     const day = String(d).padStart(2, '0');
//     const month = String(m).padStart(2, '0');

//     return `${month}-${day}-${y}`;
//   };


//   const headers = isAdmin
//     ? ["Sr No", "Emp ID", "Employee", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"]
//     : ["Day", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"];

//   if (loading) return <div className="flex items-center justify-center h-[70vh]"><Loader /></div>;
//   if (!filteredData.length) return <div className="flex items-center justify-center h-[70vh] text-gray-500">No attendance data found</div>;

//   return (
//     <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
//       <table className="min-w-full text-sm border-collapse">
//         <thead className="bg-gray-100 sticky top-0 z-10">
//           <tr>
//             {headers.map((h, i) => (
//               <th key={i} className="border-b px-4 py-3 font-semibold text-left text-gray-700 whitespace-nowrap">
//                 {h}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="bg-white">
//           {filteredData
//             .filter((row) => row.emp_id && (isAdmin ? row.is_active === true : true )&& row.emp_id != '2020')
//             .map((row, i) => {
//               const dayStr = getDayName(row.attendance_date);
//               const holidayMatch = getHolidayMatch(row.attendance_date, holidays);
//               const isToday = new Date(row.attendance_date).toDateString() === new Date().toDateString();
//               const isSunday = dayStr === "Sun";
//               const isSaturday = dayStr === "Sat";
//               const isAbsent = row.status === "Absent" && !holidayMatch && !isSunday;

//               const displayName = row.employee_name || row.name || "--";
//               const dateDisplay = new Date(row.attendance_date).toLocaleDateString('en-IN');

//               return (
//                 <tr
//                   key={row.emp_id ? `${row.emp_id}-${i}` : i}
//                   className={`${getRowClass(dayStr, isToday, !!holidayMatch, i)} transition-colors`}
//                 >
//                   {isAdmin ? (
//                     <>
//                       <td className="border-b px-4 py-2 text-gray-600">{i + 1}</td>
//                       <td className="border-b px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{row.emp_id || "--"}</td>
//                       <td className="border-b px-4 py-2 whitespace-nowrap">{displayName}</td>
//                       <td className="border-b px-4 py-2 whitespace-nowrap">
//                         {formatDate(dateDisplay)}
//                       </td>
//                       <td className="border-b px-4 py-2">
//                         {holidayMatch ? (
//                           <span className="inline-block text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200 text-[10px] uppercase">
//                             {holidayMatch.holiday_name}
//                           </span>
//                         ) : isSunday ? (
//                           <span className="text-white font-bold bg-orange-600 px-2 py-0.5 rounded text-[10px] uppercase">Weekday Off</span>
//                         ) : (
//                           <StatusBadge status={row.status} />
//                         )}
//                       </td>
//                       <td className="border-b px-4 py-2">{(isAbsent || holidayMatch || isSunday) ? "--" : formatTime(row.punch_in)}</td>
//                       <td className="border-b px-4 py-2">
//                         {(isAbsent || holidayMatch || isSunday) ? "--" : row.punch_out ? formatTime(row.punch_out) : <span className="text-orange-500">Working...</span>}
//                       </td>
//                       <td className="border-b px-4 py-2">{(isAbsent || holidayMatch || isSunday) ? "--" : formatInterval(row.total_hours)}</td>
//                       <td className="border-b px-4 py-2">{(holidayMatch || isSunday) ? "0" : (isSaturday ? "5" : "9.3")}</td>
//                     </>
//                   ) : (
//                     <>
//                       <td className="border-b px-4 py-2 font-semibold text-gray-600">{dayStr}</td>
//                       <td className="border-b px-4 py-2 whitespace-nowrap">{dateDisplay}</td>
//                       <td className="border-b px-4 py-2">
//                         {holidayMatch ? (
//                           <span className="text-blue-700 font-bold whitespace-nowrap">{holidayMatch.holiday_name}</span>
//                         ) : isSunday ? (
//                           <span className="text-white font-bold">WeekDay Off</span>
//                         ) : (
//                           <StatusBadge status={row.status} />
//                         )}
//                       </td>
//                       <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : formatTime(row.punch_in)}</td>
//                       <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : row.punch_out ? formatTime(row.punch_out) : "Working..."}</td>
//                       <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : formatInterval(row.total_hours)}</td>
//                       <td className="border-b px-4 py-2">{(isSunday || holidayMatch) ? "" : (isSaturday ? "5" : "9.3")}</td>
//                     </>
//                   )}
//                 </tr>
//               );
//             })}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default Table;























import React, { useContext, useMemo } from "react";
import { EmployContext } from "../context/EmployContextProvider";
import Loader from "./Loader";
import { useLocation } from "react-router-dom";

const StatusBadge = ({ status }) => {
  const styles = {
    Present: "bg-green-600 text-white",
    Working: "bg-blue-600 text-white",
    Late: "bg-yellow-500 text-white",
    Absent: "bg-red-600 text-white",
    "Half Day": "bg-orange-500 text-white",
  };

  return (
    <span className={`px-2 py-1 rounded text-[10px] uppercase font-semibold ${styles[status] || "bg-gray-300 text-gray-800"}`}>
      {status}
    </span>
  );
};

const formatTime = (value) => {
  if (!value) return "--";
  if (typeof value === 'string' && (value.includes("AM") || value.includes("PM"))) return value;
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) { return value; }
};

const formatInterval = (val) => {
  if (!val) return "--";
  if (typeof val === "object") {
    const h = String(val.hours || 0).padStart(2, "0");
    const m = String(val.minutes || 0).padStart(2, "0");
    return `${h}:${m}`;
  }
  return val;
};

const Table = () => {
  const { adminAttendance = [], employeeAttendance = [], loading, filters, holidays } = useContext(EmployContext);
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdminRoute = location.pathname.includes("admin");
  const isAdmin = (user?.role || "").toLowerCase() === "admin" && isAdminRoute;

  const getDayName = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
  };

  const getHolidayMatch = (attendanceDate, holidaysList = []) => {
    if (!attendanceDate || !holidaysList.length) return null;
    const aDate = new Date(attendanceDate).toDateString();
    return holidaysList.find(h => new Date(h.holiday_date).toDateString() === aDate);
  };

  const getRowClass = (dayStr, isToday, isHoliday, index) => {
    if (isHoliday) return "bg-blue-50 text-blue-900 font-medium";
    if (dayStr === "Sun" && !isAdmin) return "bg-[#faa307] text-white font-semibold";
    if (dayStr === "Sat" && !isAdmin) return "bg-[#D1FFBD] text-dark font-semibold";
    if (isToday) return "bg-white font-semibold";
    return index % 2 === 0 ? "bg-white" : "bg-gray-50";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${date.getFullYear()}`;
  };

  // Logic to switch data source
  const data = isAdmin ? adminAttendance : employeeAttendance;

  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Date Filtering
    if (filters?.startDate) {
      const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
      result = result.filter(row => new Date(row.attendance_date).getTime() >= start);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate).setHours(23, 59, 59, 999);
      result = result.filter(row => new Date(row.attendance_date).getTime() <= end);
    }

    // Search Filtering (Admin only)
    if (isAdmin && filters?.attendanceSearch) {
      const search = filters.attendanceSearch.toLowerCase();
      result = result.filter(row => 
        (row.name || row.employee_name)?.toLowerCase().includes(search) || 
        String(row.emp_id).includes(search)
      );
    }
    return result;
  }, [data, filters, isAdmin]);

  const headers = isAdmin
    ? ["Sr No", "Emp ID", "Employee", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"]
    : ["Day", "Date", "Status", "Punch In", "Punch Out", "Working Hours", "Expected Hours"];

  if (loading) return <div className="flex items-center justify-center h-[70vh]"><Loader /></div>;
  if (!filteredData.length) return <div className="flex items-center justify-center h-[70vh] text-gray-500">No attendance data found</div>;

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-gray-100 sticky top-0 left-0 z-8">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b px-4 py-3 font-semibold text-left text-gray-700 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {filteredData
            .filter((row) => row.emp_id && (isAdmin ? row.is_active === true : true) && row.emp_id !== '2020')
            .map((row, i) => {
              const dayStr = getDayName(row.attendance_date);
              const holidayMatch = getHolidayMatch(row.attendance_date, holidays);
              const isToday = new Date(row.attendance_date).toDateString() === new Date().toDateString();
              const isSunday = dayStr === "Sun";
              const isSaturday = dayStr === "Sat";
              const isAbsent = row.status === "Absent" && !holidayMatch && !isSunday;
              const displayName = row.employee_name || row.name || "--";
              const dateDisplay = new Date(row.attendance_date).toLocaleDateString('en-IN');

              return (
                <tr
                  key={row.emp_id ? `${row.emp_id}-${i}` : i}
                  className={`${getRowClass(dayStr, isToday, !!holidayMatch, i)} transition-colors`}
                >
                  {isAdmin ? (
                    <>
                      <td className="border-b px-4 py-2 text-gray-600">{i + 1}</td>
                      <td className="border-b px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{row.emp_id || "--"}</td>
                      <td className="border-b px-4 py-2 whitespace-nowrap">{displayName}</td>
                      <td className="border-b px-4 py-2 whitespace-nowrap">{formatDate(row.attendance_date)}</td>
                      <td className="border-b px-4 py-2">
                        {holidayMatch ? (
                          <span className="inline-block text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200 text-[10px] uppercase">
                            {holidayMatch.holiday_name}
                          </span>
                        ) : isSunday ? (
                          <span className="text-white font-bold bg-orange-600 px-2 py-0.5 rounded text-[10px] uppercase">Weekday Off</span>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </td>
                      <td className="border-b px-4 py-2">{(isAbsent || holidayMatch || isSunday) ? "--" : formatTime(row.punch_in)}</td>
                      <td className="border-b px-4 py-2">
                        {(isAbsent || holidayMatch || isSunday) ? "--" : row.punch_out ? formatTime(row.punch_out) : <span className="text-orange-500">Working...</span>}
                      </td>
                      <td className="border-b px-4 py-2">{(isAbsent || holidayMatch || isSunday) ? "--" : formatInterval(row.total_hours)}</td>
                      <td className="border-b px-4 py-2">{(holidayMatch || isSunday) ? "0" : (isSaturday ? "5" : "9.3")}</td>
                    </>
                  ) : (
                    <>
                      <td className="border-b px-4 py-2 font-semibold text-gray-600">{dayStr}</td>
                      <td className="border-b px-4 py-2 whitespace-nowrap">{dateDisplay}</td>
                      <td className="border-b px-4 py-2">
                        {holidayMatch ? (
                          <span className="text-blue-700 font-bold whitespace-nowrap">{holidayMatch.holiday_name}</span>
                        ) : isSunday ? (
                          <span className="text-white font-bold">WeekDay Off</span>
                        ) : (
                          <StatusBadge status={row.status} />
                        )}
                      </td>
                      <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : formatTime(row.punch_in)}</td>
                      <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : row.punch_out ? formatTime(row.punch_out) : "Working..."}</td>
                      <td className="border-b px-4 py-2">{(isSunday || holidayMatch || isAbsent) ? "" : formatInterval(row.total_hours)}</td>
                      <td className="border-b px-4 py-2">{(isSunday || holidayMatch) ? "" : (isSaturday ? "5" : "9.3")}</td>
                    </>
                  )}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export default Table;

// export default Table;

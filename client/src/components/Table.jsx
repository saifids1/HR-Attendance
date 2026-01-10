import React, {useState, useContext,useMemo } from "react";
import { EmployContext } from "../context/EmployContextProvider";
import Loader from "./Loader";
import Filters from "./Filters";

// Status 
const StatusBadge = ({ status }) => {
  const styles = {
    Present: "bg-green-600 text-white",
    Working: "bg-blue-600 text-white",
    Late: "bg-yellow-500 text-white",
    Absent: "bg-red-600 text-white",
    "Half Day": "bg-orange-500 text-white",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || "bg-gray-300 text-gray-800"
        }`}
    >
      {status}
    </span>
  );
};

// Helpers
const formatTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-GB");
};


const EmpformatDate = (dateStr) => {
  if (!dateStr) return "--";

  const date = new Date(dateStr);

  const weekday = date.toLocaleDateString("en-IN", {
    weekday: "short", // Mon, Tue, Wed
  });

  const formattedDate = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return `${weekday}`;
};

const getWeekDay = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return new Date(year, month - 1, day)
    .toLocaleDateString("en-IN", { weekday: "short" });
};



const formatInterval = (val) => {
  if (!val) return "--";
  if (typeof val === "string") return val;

  if (typeof val === "object") {
    const h = String(val.hours || 0).padStart(2, "0");
    const m = String(val.minutes || 0).padStart(2, "0");
    return `${h}:${m}`;
  }

  return "--";
};



/*  Table */
const Table = () => {
  const { adminAttendance = [], employeeAttendance = [], loading,filters,holidays } =
    useContext(EmployContext);
    // Filter Loader
    const [filterLoading, setFilterLoading] = useState(false);


    // console.log("holidays",holidays)



  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase();
  const isAdmin = role === "admin";

  const data = isAdmin ? adminAttendance : employeeAttendance;
  

  const filteredData = useMemo(() => {
    let result = [...data];
  
    const normalizeDate = (d) => {
      if (!d) return null;
      const date = new Date(d);
      date.setHours(0, 0, 0, 0); // Remove time component
      return date;
    };
  
    const start = normalizeDate(filters?.startDate);
    const end = normalizeDate(filters?.endDate);
  
    if (start) {
      result = result.filter((row) => normalizeDate(row.attendance_date) >= start);
    }
  
    if (end) {
      result = result.filter((row) => normalizeDate(row.attendance_date) <= end);
    }
  
    // Admin search filter
    if (isAdmin && filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (row) =>
          row.name?.toLowerCase().includes(search) ||
          String(row.emp_id || "").includes(search)
      );
    }
  
    return result;
  }, [data, filters, isAdmin]);
  
  
  const getRowClass = (isSunday, isToday, index, isSaturday,role) => {
    if (isToday && role =="employee") return "bg-blue-100 font-semibold";
    if (isSunday) return "bg-[#faa307] text-white";
    if (isSaturday) return "bg-[#D1FFBD] text-dark"
    return index % 2 === 0 ? "bg-white" : "bg-gray-50";
  };
  /* Headers */
  const headers = isAdmin
    ? [
      "Sr No",
      "Emp ID",
      "Employee",
      "Date",
      "Status",
      "Punch In",
      "Punch Out",
      "Working Hours",
      "Expected Hours",
    ]
    : [
      "Day",
      "Date",
      "Status",
      "Punch In",
      "Punch Out",
      "Working Hours",
      "Expected Hours",
    ];

  /* Loading */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader />
      </div>
    );
  }

  /* NO DATA */
  if (!filteredData.length) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-gray-500">
        No attendance data found
      </div>
    );
  }


  return (
    <div className="overflow-auto w-full border border-gray-300 rounded max-h-[500px]">

      
      <table className="min-w-full text-sm border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border px-4 py-3 font-semibold text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row, i) => {
            const isAbsent = row.status === "Absent";
            const isSunday = getWeekDay(row.attendance_date) === "Sun";
            const isSaturday = getWeekDay(row.attendance_date) === "Sat";
            const isToday =
              new Date(row.attendance_date).toDateString() ===
              new Date().toDateString();




            return (


              <tr className={`${getRowClass(isSunday, isToday, i, isSaturday,role)} `}>


                {/*  Admin  */}
                {isAdmin && (
                  <>
                    <td className="border px-4 py-2">{i + 1}</td>
                    <td className="border px-4 py-2">
                      {row.emp_id || "--"}
                    </td>
                    <td className="border px-4 py-2">{row.name}</td>
                    <td className="border px-4 py-2">
                      {formatDate(row.attendance_date)}
                    </td>
                    <td className="border px-4 py-2">
                      <StatusBadge status={row.status} />
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent ? "--" : formatTime(row.punch_in)}
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent
                        ? "--"
                        : row.punch_out
                          ? formatTime(row.punch_out)
                          : "Working..."}
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent
                        ? "--"
                        : formatInterval(row.current_working_hours)}
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent ? "--" : "9.3"}
                    </td>
                  </>
                )}

                {/* Employee */}
                {!isAdmin && (
                  <>

                    <td
                      className={`border px-4 py-2 `}
                    >
                      {EmpformatDate(row.attendance_date)}
                    </td>

                    <td className="border px-4 py-2">
                      {formatDate(row.attendance_date)}
                    </td>
                    {/*  */}
                    <td className={`border px-4 py-2 `}>
                      {EmpformatDate(row.attendance_date) === "Sun" ? "Weekly Off" : <StatusBadge status={row.status} />}

                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent ? "--" : formatTime(row.punch_in)}
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent
                        ? "--"
                        : row.punch_out
                          ? formatTime(row.punch_out)
                          : "Working..."}
                    </td>

                    <td className="border px-4 py-2">
                      {isAbsent ? "--" : formatInterval(row.total_hours)}
                    </td>

                    <td className="border px-4 py-2">
                      {isSunday ? "--" : isSaturday ? "5" : "9.3"}
                    </td>

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

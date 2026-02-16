import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

// Status Icon component
const StatusIcon = ({ type }) => {
  switch (type?.toLowerCase()) {
    case "present":
      return <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />;
    case "absent":
      return <XCircleIcon className="w-5 h-5 text-red-500 mx-auto" />;
    case "holiday":
      return <StarIcon className="w-5 h-5 text-orange-400 mx-auto" />;
    case "leave":
      return <CalendarDaysIcon className="w-5 h-5 text-blue-500 mx-auto" />;
    case "halfday":
      return <span className="text-yellow-500 font-bold mx-auto">½</span>;
    default:
      return <span className="text-gray-300">-</span>;
  }
};

// Generate days of a given month/year
const generateDays = (month, year) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // last day of month
  const days = [];
  let id = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayName = currentDate.toLocaleDateString("en-US", { weekday: "short" });
    const dayNumber = currentDate.getDate();
    const monthName = currentDate.toLocaleDateString("en-US", { month: "short" });

    days.push({
      id: id++,
      dayName,
      dayNumber,
      monthName,
      month: month + 1,
      year,
      date: new Date(currentDate),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
};

export default function AttendanceSheet() {
  const token = localStorage.getItem("token");

  // Current month/year as default
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const [days, setDays] = useState(generateDays(month, year));
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Update days when month/year changes
  useEffect(() => {
    setDays(generateDays(month, year));
  }, [month, year]);

  // Fetch attendance for selected month/year
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await axios.get(
        "http://localhost:5000/api/admin/attendance/all-attendance",
        {
          params: {
            month: month + 1, // API expects 1-12
            year,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (resp.data.success) {
        setAttendance(resp.data.attendance || []);

        // Extract unique employees from attendance
        const uniqueEmployees = (resp.data.attendance || []).reduce((acc, item) => {
          if (!acc.some((e) => e.emp_id === item.emp_id)) {
            acc.push({
              name: item.name,
              role: item.role || "-",
              emp_id: item.emp_id,
              department: item.department || "-",
            });
          }
          return acc;
        }, []);

        setEmployees(uniqueEmployees);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [month, year, token]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Attendance status logic
  const getStatus = (item) => {
    if (!item) return "absent";
    const hours = parseFloat(item.total_hours);
    if (!item.first_in) return "absent";
    if (hours < 4) return "halfday";
    return "present";
  };

  const getAttendanceForDate = (empId, date) => {
    const record = attendance.find(
      (item) =>
        item &&
        item.emp_id === empId &&
        new Date(item.date).toDateString() === date.toDateString()
    );
    if (record) return { status: getStatus(record), record };
    return null;
  };

  // Format date range for display
  const getDateRangeText = () => {
    if (days.length === 0) return "No date selected";
    const start = days[0];
    const end = days[days.length - 1];
    return `${start.dayName}, ${start.dayNumber} ${start.monthName} ${start.year} - ${end.dayName}, ${end.dayNumber} ${end.monthName} ${end.year}`;
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Top Header with month/year dropdown */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold">All Employee Attendance</h2>
            <p className="text-xs text-gray-500 mt-1">HR • Employee Attendance • Month-wise</p>

            <div className="mt-2 flex gap-2 items-center">
              <label className="text-sm">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, i).toLocaleString("en-US", { month: "long" })}
                  </option>
                ))}
              </select>

              <label className="text-sm">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {days.length > 0 && (
              <p className="text-sm font-medium text-blue-600 mt-1">
                📅 {getDateRangeText()} • {employees.length} employees
              </p>
            )}
          </div>

          <div className="relative">
            <AdjustmentsHorizontalIcon className="w-6 h-6 text-gray-500" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {days.length}
            </span>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto bg-gray-50">
          {days.length > 0 ? (
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-200 text-gray-700">
                  <th className="px-4 py-3 text-left w-72 border-r sticky left-0 bg-gray-200 z-10">
                    EMPLOYEE
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.id}
                      className="px-3 py-3 text-center border-r text-xs min-w-[60px]"
                    >
                      <div className="font-semibold">{day.dayName}</div>
                      <div className="text-gray-500">{String(day.dayNumber).padStart(2, "0")}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white">
                {loading && (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-blue-500">
                      Loading attendance data...
                    </td>
                  </tr>
                )}
                {!loading && employees.length === 0 && (
                  <tr>
                    <td colSpan={days.length + 1} className="text-center py-8 text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
                {!loading && employees.map((emp) => (
                  <tr key={emp.emp_id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-4 border-r sticky left-0 bg-white z-10 hover:bg-gray-50">
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.role || emp.department || "-"}</p>
                      <p className="text-xs text-gray-400">{emp.emp_id}</p>
                    </td>

                    {days.map((day) => {
                      const attendanceData = getAttendanceForDate(emp.emp_id, day.date);
                      return (
                        <td
                          key={`${emp.emp_id}-${day.id}`}
                          className="text-center py-4 border-r"
                          title={attendanceData?.record ? 
                            `In: ${attendanceData.record.first_in || '--'}\nOut: ${attendanceData.record.last_out || '--'}\nHours: ${attendanceData.record.total_hours || '0'}`
                            : 'No attendance record'}
                        >
                          {attendanceData ? <StatusIcon type={attendanceData.status} /> : <span className="text-gray-300">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">No Days Available</p>
            </div>
          )}
        </div>

        {/* Status Legend */}
        {!loading && days.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-gray-700">Status Legend:</span>
              <div className="flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircleIcon className="w-4 h-4 text-red-500" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 font-bold">½</span>
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="w-4 h-4 text-blue-500" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-1">
                <StarIcon className="w-4 h-4 text-orange-400" />
                <span>Holiday</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              * Hover over status icons to see check-in/out details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

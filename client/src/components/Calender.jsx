import React, { useEffect, useState } from "react";

const STATUS_COLORS = {
  present: "bg-green-500 text-white",
  absent: "bg-red-500 text-white",
  leave: "bg-yellow-400 text-black",
};

const AttendanceCalendar = () => {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [attendance, setAttendance] = useState({});

  // api call
  useEffect(() => {
    const apiResponse = [
      { date: "2025-01-01", status: "present" },
      { date: "2025-01-02", status: "absent" },
      { date: "2025-01-03", status: "leave" },
      { date: "2025-01-05", status: "present" },
      { date: "2025-01-10", status: "present" },
    ];

    // Convert array → object map
    const mappedData = {};
    apiResponse.forEach(item => {
      mappedData[item.date] = item.status;
    });

    setAttendance(mappedData);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const formatKey = day =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

  //  Monthly Summary
  const summary = { present: 0, absent: 0, leave: 0 };
  Object.entries(attendance).forEach(([date, status]) => {
    if (date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
      summary[status]++;
    }
  });

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-4">

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          ◀
        </button>

        <h2 className="font-semibold">
          {currentDate.toLocaleString("default", { month: "long" })} {year}
        </h2>

        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          ▶
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 text-center text-sm text-gray-500 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={i} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = formatKey(day);
          const status = attendance[key];

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
              key={day}
              title={status?.toUpperCase() || "No Record"}
              className={`
                h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium
                ${status ? STATUS_COLORS[status] : "bg-gray-100 text-gray-600"}
                ${isToday ? "ring-2 ring-blue-500" : ""}
              `}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs mt-4">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded-full" />
          Present: {summary.present}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-red-500 rounded-full" />
          Absent: {summary.absent}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400 rounded-full" />
          Leave: {summary.leave}
        </span>
      </div>

    </div>
  );
};

export default AttendanceCalendar;

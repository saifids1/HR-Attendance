import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { EmployContext } from "../context/EmployContextProvider";

const MonthlyHolidays = () => {
  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const formatHolidayDate = (isoDate) => {
    const date = new Date(isoDate);
  
    return {
      day: date.toLocaleDateString("en-IN", { day: "2-digit" }),
      month: date.toLocaleDateString("en-IN", { month: "short" }),
      weekday: date.toLocaleDateString("en-IN", { weekday: "long" }),
    };
  };
  

  const {holidays} = useContext(EmployContext);

  
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm lg:mt-3">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold text-gray-700">
      Holidays – {currentMonth}
    </h2>

    <NavLink
      to="/employee/holidays"
      className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition"
    >
      View Holidays
    </NavLink>
  </div>

  {holidays.length === 0 ? (
    <p className="text-sm text-gray-400">No holidays this month 🎉</p>
  ) : (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {holidays.slice(0, 5).map((holiday, index) => {
        const { day, month, weekday } = formatHolidayDate(
          holiday.holiday_date
        );

        return (
          <li
            key={index}
            className="flex gap-3 items-center p-4 bg-gray-50 border rounded-lg"
          >
            {/* Date Box */}
            <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center">
              <span className="text-sm font-bold">{day}</span>
              <span className="text-xs uppercase">{month}</span>
            </div>

            {/* Holiday Info */}
            <div>
              <p className="font-medium text-gray-800">
                {holiday.holiday_name}
              </p>
              <p className="text-xs text-gray-500">
                {weekday} • {holiday.holiday_type}
              </p>

              {/* {holiday.is_paid && (
                <span className="text-xs text-green-600 font-medium">
                  Paid Holiday
                </span>
              )} */}
            </div>
          </li>
        );
      })}
    </ul>
  )}
</section>

  );
};

export default MonthlyHolidays;

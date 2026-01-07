import React from "react";
import { NavLink } from "react-router-dom";

const MonthlyHolidays = ({ holidays = [] }) => {
  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm lg:mt-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          Holidays – {currentMonth}
        </h2>

        <NavLink to="/employee/holidays" className="bg-blue-500 text-white hover:cursor-pointer px-3 py-2 rounded-lg hover:bg-slate-200 hover:text-blue-500 hover:transition duration-300">View Holidays</NavLink>
      </div>

      {holidays.length === 0 ? (
        <p className="text-sm text-gray-400">No holidays this month 🎉</p>
      ) : (
        <ul
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4
        w-full rounded-xl bg-white border border-gray-200 p-5 shadow-sm"
      >
        {holidays.slice(0, 5).map((holiday) => (
         <li className="flex gap-3 items-center p-4 bg-gray-50 border rounded-lg">
         <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex flex-col items-center justify-center">
           <span className="text-sm font-bold">
             {holiday.date.split(" ")[0]}
           </span>
           <span className="text-xs">
             {holiday.date.split(" ")[1]}
           </span>
         </div>
       
         <div>
           <p className="font-medium">{holiday.name}</p>
           <p className="text-xs text-gray-500">{holiday.day}</p>
         </div>
       </li>
       
        ))}
      </ul>
      
      )}
    </section>
  );
};

export default MonthlyHolidays;

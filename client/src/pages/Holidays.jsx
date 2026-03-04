import { Typography } from "@mui/material";
import React, { useContext } from "react";
import HolidayCalendar from "../components/HolidayCalender";
import { EmployContext } from "../context/EmployContextProvider";

const Holidays = () => {

  const { holidays } = useContext(EmployContext);

  // console.log(holidays);
  // const timelineData = [
  //   // ... (same data, unchanged)
  // ];

  return (
    <div className="px-2 sm:px-4 pb-6 w-full ">

      {/* Sticky Header */}
      <div className="sticky z-20 top-4 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6 h-[40px] -mt-2">
        <Typography className="text-white text-2xl sm:text-2xl text-center font-bold tracking-wide py-0">
          Holidays
        </Typography>
      </div>

      {/* Total Holidays */}
      <div className="mt-5 flex justify-center sm:justify-start">
        <h1 className="bg-[#222f7d] text-white rounded-md sm:rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 mt-3 text-base sm:text-xl">
          Total Holidays : {holidays.length}
        </h1>
      </div>

      {/* Calendar Wrapper */}
      <div className="w-full mt-4 flex justify-center overflow-x-auto">
        <div className="">
          <HolidayCalendar data={holidays} />
        </div>
      </div>

    </div>
  );
};

export default Holidays;

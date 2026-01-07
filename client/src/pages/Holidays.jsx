import { Typography } from "@mui/material";
import React from "react";
import HolidayCalendar from "../components/HolidayCalender";

const Holidays = () => {
  const timelineData = [
    // ... (same data, unchanged)
  ];

  return (
    <div className="px-2 sm:px-4 pb-6 w-full">

      {/* Sticky Header */}
      <div className="sticky top-0 z-0 bg-[#222F7D] rounded-md sm:rounded-lg">
        <Typography className="text-white py-2 sm:py-3 text-lg sm:text-2xl text-center font-semibold">
          Holidays
        </Typography>
      </div>

      {/* Total Holidays */}
      <div className="mt-4 flex justify-center sm:justify-start">
        <h1 className="bg-[#222f7d] text-white rounded-md sm:rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-base sm:text-xl">
          Total Holidays : {timelineData.length}
        </h1>
      </div>

      {/* Calendar Wrapper */}
      <div className="w-full mt-4 flex justify-center overflow-x-auto">
        <div className="min-w-[320px] max-w-full">
          <HolidayCalendar data={timelineData} />
        </div>
      </div>

    </div>
  );
};

export default Holidays;

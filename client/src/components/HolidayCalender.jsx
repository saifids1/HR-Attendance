import React from "react";
import { FaCalendarDay } from "react-icons/fa6";
import { GiPartyPopper } from "react-icons/gi";
import { IoFlagSharp } from "react-icons/io5";

const statusColors = {
    present: "bg-green-500",
    absent: "bg-red-500",
    leave: "bg-yellow-400",
};

const HolidayCalendar = ({ data = [] }) => {
    return (
        <div className="bg-white border rounded-xl p-6 shadow-sm max-w-3xl ">
            {/* <h2 className="text-lg font-semibold mb-6">Holiday Calendar </h2> */}

            <div className="relative border-l-2 border-gray-200 ml-4 ">
                {data.map((item, index) => (
                    <div key={index} className="mb-8 ml-6">
                        {/* Date Dot */}
                        <div className="absolute -left-2 w-6 h-6 bg-[#222f7d] rounded-full flex items-center justify-center">
                            <IoFlagSharp className="text-white text-xs" />
                        </div>


                        {/* Date Header */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-gray-700">
                                {item.date.split("-").reverse().join("-")}
                            </span>
                            <span className="text-sm text-gray-400">
                                {item.day}
                            </span>

                            {/* {item.holiday && (
                                <span className="text-xs bg-blue-100 text-[#222f7d] px-2 py-1 rounded flex items-center gap-2">
                                    <GiPartyPopper /> <span>
                                        {item.holidayName}
                                    </span>
                                </span>
                            )} */}
                        </div>

                        {/* Attendance */}
                        {item.attendance && (
                            <span
                                className={`inline-block text-xs text-white px-2 py-1 rounded mb-2
                  ${statusColors[item.attendance]}`}
                            >
                                {item.attendance.toUpperCase()}
                            </span>
                        )}

                        {/* Events */}
                        <div className="space-y-2">
                            {item.events?.length > 0 ? (
                                item.events.map((event, i) => (
                                    <div
                                        key={i}
                                        className="bg-gray-50 border rounded-lg p-3 "
                                    >
                                        <p className="text-sm font-medium">
                                            {event.title}
                                        </p>
                                        {/* <p className="text-xs text-gray-500 flex items-center gap-2 mt-2">
                                            <FaCalendarDay />
                                            <span>{event.time}</span>
                                        </p> */}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400">
                                    No events
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HolidayCalendar;
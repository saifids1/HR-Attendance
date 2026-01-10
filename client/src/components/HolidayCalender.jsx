import { IoFlagSharp } from "react-icons/io5";

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { weekday: "long" });
};



export default function HolidayTimeline({ data }) {
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm max-w-5xl">
      <h2 className="text-lg font-semibold mb-4">Holiday Calendar</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 justify-between  gap-4  pb-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="min-w-[240px]  text-white bg-[#3a50cc] border rounded-xl p-4 hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">
                {formatDate(item.holiday_date)}
              </span>

              {/* {item.is_paid && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Paid
                </span>
              )} */}
            </div>

            {/* Holiday Info */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#222f7d] rounded-full flex items-center justify-center">
                <IoFlagSharp className="text-white text-sm" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  {item.holiday_name}
                </p>

                <p className="text-xs text-white">
                  {item.holiday_type}
                </p>

                {item.remarks && (
                  <p className="text-xs text-white mt-1">
                    {item.remarks}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


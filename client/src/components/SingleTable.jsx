import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { EmployContext } from "../context/EmployContextProvider";
import axios from "axios";
import  Pagination  from "../components/Pagination";

const StatusBadge = ({ status }) => {
  const styles = {
    Present: "bg-green-100 text-green-700 border-green-200",
    Absent: "bg-red-100 text-red-700 border-red-200",
    HalfDay: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status || "N/A"}
    </span>
  );
};

const SingleTable = ({ empId }) => {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const { filters, holidays,formatDate } =
    useContext(EmployContext);

  const token = localStorage.getItem("token");

  const headers = [
    "Day",
    "Date",
    "Emp ID",
    "Name",
    "Status",
    "Punch In",
    "Punch Out",
    "Total Hours",
  ];

  const getDayName = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
    });

  useEffect(() => {
    setPage(1);
  }, [
    filters.startDate,
    filters.endDate,
    filters.search,
  ]);

  const fetchAttendance = useCallback(async () => {
    if (!filters.startDate || !filters.endDate) return;
  
    setLoading(true);
  
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        page,
        limit: 10,
      };
  
      // If search exists → send only search
      if (filters.search && filters.search.trim() !== "") {
        params.search = filters.search.trim();
      } 
      // Otherwise send emp_id (for exact employee)
      else if (empId) {
        params.emp_id = empId;
      }
  
      const resp = await axios.get(
        "http://localhost:5000/api/admin/attendance/all-attendance",
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      if (resp.data.success) {
        setAttendance(resp.data.attendance);
        setSummary({
          total: resp.data.meta.total_records,
          pages: resp.data.meta.total_pages,
        });
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    empId,
    filters.search,
    filters.startDate,
    filters.endDate,
    page,
    token,
  ]);
  

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handlePageChange = (_, value) => {
    setPage(value);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="text-center py-10 text-blue-500"
                >
                  Loading...
                </td>
              </tr>
            ) : attendance.length > 0 ? (
              attendance.map((row, i) => {
                const dayStr = getDayName(
                  row.date
                );
                const holidayMatch =
                  holidays?.find(
                    (h) =>
                      h.date === row.date
                  );

                let status = "Absent";
                if (row.first_in)
                  status = "Present";
                if (
                  row.total_hours > 0 &&
                  row.total_hours < 4
                )
                  status = "HalfDay";

                return (
                  <tr
                    key={i}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      {dayStr}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(row.date)}
                     
                    </td>
                    <td className="px-6 py-4">
                      {row.emp_id}
                    </td>
                    <td className="px-6 py-4">
                      {row.name}
                    </td>
                    <td className="px-6 py-4">
                      {holidayMatch ? (
                        <span className="text-blue-600 font-bold text-xs">
                          {holidayMatch.holiday_name}
                        </span>
                      ) : (
                        <StatusBadge
                          status={status}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.first_in ||
                        "--"}
                    </td>
                    <td className="px-6 py-4">
                      {row.last_out ||
                        "--"}
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      {row.total_hours
                        ? `${row.total_hours} hrs`
                        : "--"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="text-center py-10 text-gray-400"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {summary.pages > 1 && (
  <div className="flex justify-center py-4">
    <Pagination
      totalPages={summary.pages}
      page={page}
      onChange={handlePageChange}
      totalRecords={summary.total}
      limit={10}
    />
  </div>
)}

    </div>
  );
};

export default SingleTable;

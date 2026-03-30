
import { Typography, Box } from "@mui/material";
import React, { useContext, useEffect, useMemo } from "react";
import Table from "../components/Table";
import { EmployContext } from "../context/EmployContextProvider";
import Loader from "../components/Loader";
import Filters from "../components/Filters";
import { useLocation } from "react-router-dom";
import Pagination from "../components/Pagination";

const formatHours = (val) => {
  if (!val) return "00:00";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const h = String(val.hours || 0).padStart(2, "0");
    const m = String(val.minutes || 0).padStart(2, "0");
    return `${h}:${m}`;
  }
  return "00:00";
};

const Attendance = () => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase()?.trim();
  const isAdmin = role === "admin";

  const {
    filters,
    adminAttendance = [],
    employeeAttendance = [],
    loading,
    pagination,
    refreshEmployeeDashboard,
  } = useContext(EmployContext);

  // Detect if viewing my-dashboard (employee view)
  const isEmployee = location.pathname.startsWith("/employee")
  const isMyDashboard = location.pathname.startsWith("/admin/my-dashboard/attendance");

  // console.log("isMyDashboard",isMyDashboard);
  const isAdminWithEmp = isAdmin && isMyDashboard;

  const date = new Date();
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  // Fetch data on filter or role change
  useEffect(() => {
    if (isAdmin) refreshEmployeeDashboard(1);
  }, [filters, isAdmin]);

  const isDaily = location.pathname.endsWith("/attendance");

  const handlePageChange = (event, value) => {
    refreshEmployeeDashboard(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Table Headers
  const adminTableHeader = [
    "Sr.No",
    "Emp ID",
    "Employee Name",
    "Date",
    "Punch In",
    "Punch Out",
    "Status",
    "Expected Hours",
    "Actual Working Hours",
  ];
  const employeeTableHeader = [
    "Sr.No",
    "Emp ID",
    "Employee Name",
    "Date",
    "Status",
    "Punch In",
    "Punch Out",
    "Actual Working Hours",
    "Expected Hours",
  ];

  // Prepare raw data
  const rawData = isAdmin && !isAdminWithEmp ? adminAttendance : employeeAttendance;

  const tableData = useMemo(() => {
    return rawData.map((item, index) => {
      const srNo = ((pagination?.currentPage - 1) * (pagination?.limit || 10)) + index + 1;
      const commonData = {
        srNo,
        empId: item.device_user_id || item.emp_id,
        name: item.name || item.employee_name,
        date: item.attendance_date,
        punchIn: item.punch_in || "--",
        punchOut: item.punch_out || "--",
        workingHours: formatHours(item.total_hours),
        expectedHours: formatHours(item.expected_hours),
        status: item.status || "--",
      };

      return commonData;
    });
  }, [rawData, pagination]);

  return (
    <div className="min-h-max bg-gradient-to-br blur-0 bg-white px-3 pb-6">
      {/* HEADER */}
      <div
        className={`sticky z-20 top-0 bg-[#222F7D] rounded-xl py-2 mb-1 shadow-lg flex justify-between items-center px-6 ${location.pathname.startsWith("/employee/attendance") ? "mt-[17px]" : "mt-[8px]"
          }`}
      >
        <div className="w-8 text-nowrap text-white justify-start">{`Date: ${day}-${month}-${year}`}</div>
        <Typography className="text-white font-bold" sx={{ fontSize: '1rem' }}>
          {isMyDashboard  || isEmployee ? "Attendance" : "Daily Attendance"}
        </Typography>
        <div></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[70vh]">
          <Loader />
        </div>
      ) : (
        <div className="-inset-1.5">
          <Filters />

          <Table
            headers={isAdmin && !isAdminWithEmp ? adminTableHeader : employeeTableHeader}
            data={tableData}
            isAdminWithEmp={isAdminWithEmp}
          />

          {!isDaily && pagination?.totalPages > 1 && (
            <Box className="mt-6 flex justify-center pb-4">
              <Pagination
                totalPages={pagination.totalPages}
                page={pagination.currentPage}
                totalRecords={pagination.totalItems}
                limit={pagination.limit}
                onChange={handlePageChange}
              />
            </Box>
          )}

          {tableData.length === 0 && !loading && (
            <Typography className="text-center text-gray-500 mt-10">
              No data available for the selected filters.
            </Typography>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
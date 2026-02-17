import { Typography, Box } from "@mui/material";
import React, { useContext, useEffect, useMemo } from "react";
import Table from "../components/Table";
import { EmployContext } from "../context/EmployContextProvider";
import Loader from "../components/Loader";
import Filters from "../components/Filters";
import { useLocation } from "react-router-dom";
import Pagination from "../components/Pagination";
import GotoAdmin from "../components/GotoAdmin";

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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user?.role?.toLowerCase()?.trim();
  const isAdmin = role === "admin";
  const location = useLocation();

  const {
    filters,
    adminAttendance = [],
    employeeAttendance = [],
    loading,
    pagination,
    refreshEmployeeDashboard 
  } = useContext(EmployContext);

  // Reset logic is now handled by calling the fetcher with page 1
  useEffect(() => {
    if (isAdmin) refreshEmployeeDashboard(1);

    console.log('employeeAttendance', employeeAttendance)
  }, [filters]);

  const isDaily = location.pathname === '/admin/attendance'




  const handlePageChange = (event, value) => {
    // value is the new page number
    console.log("Changing to page:", value);
    refreshEmployeeDashboard(value);
    
    // Smooth scroll to top of table on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  {!isDaily && pagination && pagination.totalPages > 1 && (
    <Box className="mt-6 flex justify-center pb-4">
      <Pagination
        totalPages={pagination.totalPages}
        page={pagination.currentPage}
        totalRecords={pagination.totalItems}
        limit={pagination.limit}
        onChange={handlePageChange} // This ensures the function is called correctly
      />
    </Box>
  )}

  /* Headers */
  const adminTableHeader = ["Sr.No", "Emp ID", "Employee Name", "Date", "Punch In", "Punch Out", "Status", "Expected Hours", "Actual Working Hours"];
  const employeeTableHeader = ["Sr.No", "Emp ID", "Employee Name", "Date", "Status", "Punch In", "Punch Out", "Actual Working Hours", "Expected Hours"];

  /* Data Preparation */
  const rawData = isAdmin ? adminAttendance : employeeAttendance;

  const tableData = useMemo(() => {
    return rawData.map((item, index) => {
      // Correct Serial Number logic for server-side pagination
      const srNo = ((pagination?.currentPage - 1) * (pagination?.limit || 10)) + index + 1;

      const commonData = {
        srNo: srNo,
        empId: item.device_user_id || item.emp_id,
        name: item.name || item.employee_name,
        date: item.attendance_date,
        punchIn: item.punch_in || "--",
        punchOut: item.punch_out || "--",
        workingHours: formatHours(item.total_hours),
        expectedHours: formatHours(item.expected_hours),
      };

      if (isAdmin) {
        return {
          ...commonData,
          status: item.status,
        };
      } else {
        return {
          srNo: srNo,
          empId: commonData.empId,
          name: commonData.name,
          date: commonData.date,
          status: item.status,
          punchIn: commonData.punchIn,
          punchOut: commonData.punchOut,
          workingHours: commonData.workingHours,
          expectedHours: commonData.expectedHours,
        };
      }
    });
  }, [rawData, isAdmin, pagination]);

  return (
    <div className="min-h-screen bg-gradient-to-br blur-0 from-gray-50 to-gray-300 px-3 pb-6">
          
      {isAdmin && (
         <div className="sticky z-20 top-2 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6 h-[40px] mt-4">
                <Typography className="text-white text-2xl sm:text-2xl text-center font-bold tracking-wide py-0">
               {isDaily ? "Daily Attendance":"Attendance"}
                </Typography>
              </div>
      )}
    
      {loading ? (
        <div className="flex items-center justify-center h-[70vh]">
          <Loader />
        </div>
      ) : (
        <div className="mt-4">
          <Filters />

          <Table
            headers={isAdmin ? adminTableHeader : employeeTableHeader}
            data={tableData}
          />

          
          {!isDaily && pagination && pagination.totalPages > 1 && (
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
      {/* <GotoAdmin role={role} /> */}
    </div>
  );
};

export default Attendance;
import React, { useEffect, useContext } from "react";
import SingleTable from "../components/SingleTable";
import Filters from "../components/Filters";
import { EmployContext } from "../context/EmployContextProvider";

const SingleEmpAttendance = () => {
  const { filters, setFilters } = useContext(EmployContext);

  const getTodayDate = () =>
    new Date().toISOString().split("T")[0];

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return;

    try {
      const parsedUser = JSON.parse(savedUser);

      setFilters((prev) => ({
        ...prev,
        // 🔥 Employee auto locked
        allEmpId:
          parsedUser.role === "employee"
            ? parsedUser.emp_id
            : "", // Admin blank
        startDate: prev.startDate || getTodayDate(),
        endDate: prev.endDate || getTodayDate(),
      }));
    } catch (e) {
      console.error("Error parsing user:", e);
    }
  }, [setFilters]);

  return (
    <div className="min-h-screen bg-gray-50 px-3 pb-6">
      <div className="mt-4">
        <Filters />

        <SingleTable
          empId={filters.allEmpId}
        />
      </div>
    </div>
  );
};

export default SingleEmpAttendance;

import React, { createContext, useEffect, useState, useMemo } from "react";
import axios from "axios";

export const EmployContext = createContext();

const EmployProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [singleAttendance, setSingleAttendance] = useState(null);
  const [adminAttendance, setAdminAttendance] = useState([]);

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  /* 🔥 AUTH STATE (THIS IS THE FIX) */
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      token,
      role: user?.role?.toLowerCase() || null,
    };
  });

  /* 🔥 LISTEN TO LOGIN / LOGOUT */
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      setAuth({
        token,
        role: user?.role?.toLowerCase() || null,
      });
    };

    syncAuth(); // initial
    window.addEventListener("storage", syncAuth);

    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const axiosConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    }),
    [auth.token]
  );

  /* =======================
     EMPLOYEE DASHBOARD
  ======================== */
  const fetchEmployeeDashboard = async () => {
    try {
      setEmployeeLoading(true);

      const [historyRes, todayRes] = await Promise.all([
        axios.get(
          "http://localhost:5000/api/employee/attendance/history",
          axiosConfig
        ),
        axios.get(
          "http://localhost:5000/api/employee/attendance/today",
          axiosConfig
        ),
      ]);

      if (Array.isArray(historyRes.data)) {
        setEmployeeAttendance(historyRes.data);

        if (historyRes.data.length > 0) {
          setEmployee({
            emp_id: historyRes.data[0].emp_id,
            device_user_id: historyRes.data[0].device_user_id,
            name: historyRes.data[0].name,
          });
        }
      }

      setSingleAttendance(todayRes.data || null);
    } catch (err) {
      console.error(err);
      setEmployeeAttendance([]);
      setSingleAttendance(null);
    } finally {
      setEmployeeLoading(false);
      setInitialized(true);
    }
  };

  /* =======================
     ADMIN DASHBOARD
  ======================== */
  const fetchAdminAttendance = async () => {
    try {
      setAdminLoading(true);

      const res = await axios.get(
        "http://localhost:5000/api/admin/attendance/today",
        axiosConfig
      );

      setAdminAttendance(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setAdminAttendance([]);
    } finally {
      setAdminLoading(false);
      setInitialized(true);
    }
  };

  /* =======================
     FETCH ON AUTH CHANGE
  ======================== */
  useEffect(() => {
    if (!auth.token || !auth.role) return;

    setInitialized(false);

    if (auth.role === "admin") {
      fetchAdminAttendance();
    }

    if (auth.role === "employee") {
      fetchEmployeeDashboard();
    }
  }, [auth.token, auth.role]);

  const loading =
    auth.role === "admin" ? adminLoading : employeeLoading;

  return (
    <EmployContext.Provider
      value={{
        employee,
        employeeAttendance,
        singleAttendance,
        adminAttendance,
        loading,
        initialized,

        refreshEmployeeDashboard: fetchEmployeeDashboard,
        refreshAdminAttendance: fetchAdminAttendance,
      }}
    >
      {children}
    </EmployContext.Provider>
  );
};

export default EmployProvider;

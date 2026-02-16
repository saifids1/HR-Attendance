import React, { createContext, useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import ProfImg from "../assets/avatar.webp";
import api from "../../api/axiosInstance";

export const EmployContext = createContext();

const EmployProvider = ({ children }) => {
  /* Attendance & Data State */
  const [employee, setEmployee] = useState(null);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 15
  });
  const [singleAttendance, setSingleAttendance] = useState(null);
  const [adminAttendance, setAdminAttendance] = useState([]);
  const [activelogs, setActiveLogs] = useState([]);
  const [singleAdminAttendance, setSingleAdminAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [orgAddress, setOrgAddress] = useState("");

  /* Loading & Initialization */
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  /* Weekly Data & Filters */
  const [weeklyData, setWeeklyData] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    attendanceSearch: "",
    adminAttSearch: "",
    activitySearch: "",
    employeeSearch: "",
    search: ""
  });

  // Profile Image - Initialized from LocalStorage for INSTANT load
  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || ProfImg
  );

  /* Auth State */
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      token,
      role: user?.role?.toLowerCase() || null,
      emp_id: user?.emp_id || null
    };
  });

  // Sync Auth across tabs
  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setAuth({
        token,
        role: user?.role?.toLowerCase() || null,
        emp_id: user?.emp_id || null
      });
    };
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${auth.token}` },
  }), [auth.token]);

  /* --- PROFILE IMAGE LOGIC --- */
  const refreshImage = useCallback(async () => {
    if (!auth.token) return;
    try {
      const res = await api.get(`employee/profile/image/${auth.emp_id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.data?.profile_image) {
        const imageUrl = `${res.data.profile_image}?t=${Date.now()}`;
        setProfileImage(imageUrl);
        localStorage.setItem("profileImage", imageUrl); // Persistent storage
      }
    } catch (err) {
      console.error("Image fetch failed", err);
    }
  }, [auth.token]);

  /* --- ACTIONS --- */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const fetchEmployeeDashboard = async (page = 1, appliedFilters = filters) => {
    try {
      setEmployeeLoading(true);
      const { startDate, endDate } = appliedFilters;
      let url = `employee/attendance/history?page=${page}&limit=${pagination.limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const [historyRes, todayRes] = await Promise.all([
        api.get(url, axiosConfig),
        api.get("employee/attendance/today", axiosConfig),
      ]);

      if (historyRes.data?.attendance) {
        setEmployeeAttendance(historyRes.data.attendance);
        if (historyRes.data.pagination) setPagination(historyRes.data.pagination);
        if (historyRes.data.attendance.length > 0) {
          const emp = historyRes.data.attendance[0];
          setEmployee({ emp_id: emp.emp_id, name: emp.employee_name });
        }
      }
      setSingleAttendance(todayRes.data || null);
    } catch (err) {
      console.error("Dashboard error", err);
    } finally {
      setEmployeeLoading(false);
      setInitialized(true);
    }
  };

  const fetchAdminAttendance = async () => {
    if (!auth.token) return;
    try {
      setAdminLoading(true);
      const res = await api.get("admin/attendance/today", axiosConfig);
      setAdminAttendance(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
      }
    } finally {
      setAdminLoading(false);
      setInitialized(true);
    }
  };

  const fetchLogs = useCallback(async () => {
    const currentSearch = (filters.search || filters.activitySearch || auth.emp_id || "").toString().trim();
    if (!currentSearch || !auth.token) return;

    try {
      setWeeklyLoading(true);
      let url = `admin/attendance/weekly-attendance?search=${encodeURIComponent(currentSearch)}`;
      if (filters.startDate) url += `&from=${filters.startDate}`;
      if (filters.endDate) url += `&to=${filters.endDate}`;

      const res = await api.get(url, axiosConfig);
      const logs = res.data || [];
      setWeeklyData(logs);
      setActiveLogs(logs);
    } catch (err) {
      setWeeklyData([]);
    } finally {
      setWeeklyLoading(false);
    }
  }, [filters.search, filters.activitySearch, filters.startDate, filters.endDate, auth.emp_id, auth.token, axiosConfig]);

  const fetchHolidays = async () => {

    try {

      const resp = await api.get(

        "employee/attendance/holiday",

        axiosConfig

      );

      setHolidays(resp.data);

    } catch (err) {

      console.error(err);

      setHolidays([]);

    }

  };

  /* --- EFFECTS --- */
  
  // Debounced logs fetch
  useEffect(() => {
    const handler = setTimeout(() => { fetchLogs(); }, 400);
    return () => clearTimeout(handler);
  }, [fetchLogs]);

  // Initial Data Fetch
  useEffect(() => {
    if (!auth.token || !auth.role) return;
    refreshImage();
    if (auth.role === "admin") fetchAdminAttendance();
    fetchEmployeeDashboard();
    fetchHolidays()
    // fetchHolidays logic here...
  }, [auth.token, auth.role]);

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  const loading = auth.role === "admin" ? adminLoading : employeeLoading;

  return (
    <EmployContext.Provider
      value={{
        employee, employeeAttendance, singleAttendance, adminAttendance,
        setAdminAttendance, orgAddress, setOrgAddress, holidays,
        loading, initialized, profileImage, setProfileImage, refreshImage,
        activelogs, setActiveLogs, singleAdminAttendance, setSingleAdminAttendance,
        weeklyLoading, weeklyData, setWeeklyData, filters, setFilters,
        pagination, setPagination, handleFilterChange, formatDate,
        refreshEmployeeDashboard: fetchEmployeeDashboard,
        refreshAdminAttendance: fetchAdminAttendance,
      }}
    >
      {children}
    </EmployContext.Provider>
  );
};

export default EmployProvider;
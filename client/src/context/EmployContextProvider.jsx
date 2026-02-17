import React, { createContext, useEffect, useState, useMemo, useCallback } from "react";
import api from "../../api/axiosInstance";
import ProfImg from "../assets/avatar.webp";

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
  
  // 1. UPDATED: Synchronized filter keys with Filters.jsx
  const [filters, setFilters] = useState({
    // Generic
    search: "",
    // My Attendance / Admin All
    startDate: "",
    endDate: "",
    employeeSearch: "",
    // Admin Attendance (Daily)
    attendanceSearch: "",
    // Single Admin History
    adminStart: "",
    adminEnd: "",
    adminAttSearch: "",
    // Activity Logs
    actStart: "",
    actEnd: "",
    activitySearch: "",
    // Weekly
    weekSearch: ""
  });

  // Profile Image
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

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${auth.token}` },
  }), [auth.token]);

  /* --- ACTIONS --- */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // 2. UPDATED: Fetch Employee Dashboard logic to use standard startDate/endDate
  const fetchEmployeeDashboard = async (page = 1) => {
    if (!auth.token) return;
    try {
      setEmployeeLoading(true);
      const { startDate, endDate } = filters;
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
    if (!auth.token || auth.role !== "admin") return;
    try {
      setAdminLoading(true);
      const res = await api.get("admin/attendance/today", axiosConfig);
      setAdminAttendance(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Admin fetch failed", err);
    } finally {
      setAdminLoading(false);
    }
  };

  // 3. UPDATED: Weekly logs logic
 const fetchLogs = useCallback(async () => {
    const currentSearch = (filters.activitySearch || filters.search || filters.weekSearch || "").toString().trim();
    
    // Fallback logic: if no search, use logged in user's ID
    const searchTerm = currentSearch || auth.emp_id;

    if (!auth.token || !searchTerm) return;

    try {
        setWeeklyLoading(true);
        
        const params = new URLSearchParams();
        params.append("search", searchTerm);
        if (filters.startDate) params.append("from", filters.startDate);
        if (filters.endDate) params.append("to", filters.endDate);

        const url = `admin/attendance/weekly-attendance?${params.toString()}`;
        console.log("Fetching URL:", url);

        const res = await api.get(url, axiosConfig);
        
        // Ensure we set data correctly based on your API response structure
        setWeeklyData(res.data); 
    } catch (err) {
        console.error("Fetch error:", err);
        setWeeklyData({ attendance: [] }); 
    } finally {
        setWeeklyLoading(false);
    }
}, [filters.search, filters.activitySearch, filters.weekSearch, filters.startDate, filters.endDate, auth.token, auth.emp_id, axiosConfig]);
 
const fetchHolidays = (async()=>{
   
    try {

      const res = await api.get("employee/attendance/holiday", axiosConfig);
      setHolidays(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Admin fetch failed", err);
    } finally {
      setAdminLoading(false);
    }
})
  
  useEffect(() => {
    const handler = setTimeout(() => { fetchLogs(); }, 400);
    return () => clearTimeout(handler);
  }, [fetchLogs]);

  useEffect(() => {
  const effectiveToken = auth.token || localStorage.getItem("token");
  
  if (!effectiveToken) return;
    if (auth.role === "admin") fetchAdminAttendance();
    fetchEmployeeDashboard();
    fetchHolidays();
  }, [auth.token, auth.role]);

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  return (
    <EmployContext.Provider
      value={{
        employee, employeeAttendance, singleAttendance, adminAttendance,
        setAdminAttendance, orgAddress, setOrgAddress, holidays,
        loading: auth.role === "admin" ? adminLoading : employeeLoading,
        initialized, profileImage, setProfileImage,
        activelogs, setActiveLogs, singleAdminAttendance, setSingleAdminAttendance,
        weeklyLoading, weeklyData, setWeeklyData, filters, setFilters,
        pagination, setPagination, handleFilterChange, formatDate,
        refreshEmployeeDashboard: fetchEmployeeDashboard,
        refreshAdminAttendance: fetchAdminAttendance,
        refreshWeeklyAttendane:fetchLogs,
      }}
    >
      {children}
    </EmployContext.Provider>
  );
};

export default EmployProvider;
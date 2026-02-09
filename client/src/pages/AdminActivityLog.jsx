import { Typography, Pagination, LinearProgress } from '@mui/material';
import React, { useEffect, useState, useCallback, useContext } from 'react';
import axios from 'axios';
import Filters from '../components/Filters';
import Loader from '../components/Loader';
import { EmployContext } from '../context/EmployContextProvider';

const AdminActivityLog = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
    const [page, setPage] = useState(1);
    
    const { setActiveLogs, formatDate, filters } = useContext(EmployContext);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            let url = `http://localhost:5000/api/admin/attendance/activity-log?page=${page}&limit=20`;

            if (filters.startDate) url += `&from=${filters.startDate}`;
            if (filters.endDate) url += `&to=${filters.endDate}`;
            if (filters.activitySearch) url += `&emp_id=${filters.activitySearch.trim()}`;

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const logs = res.data.data || [];
            setData(logs);
            setActiveLogs(logs); 
            setPagination(res.data.pagination || { currentPage: 1, totalPages: 1 });
        } catch (err) {
            console.error("Error fetching logs:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [page, filters.startDate, filters.endDate, filters.activitySearch, setActiveLogs]);

    // Debounced Effect: Waits for user to stop typing before searching
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchLogs();
        }, 400); // 400ms delay

        return () => clearTimeout(handler);
    }, [fetchLogs]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [filters.activitySearch, filters.startDate, filters.endDate]);

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    if (loading) {
        return (
          <div className="fixed inset-0 flex items-center justify-center  z-50">
            <div className="flex flex-col items-center gap-4">
              <Loader />
             
            </div>
          </div>
        );
      }

    return (
        <div className="min-h-screen py-6 px-4 bg-gray-50">
            <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-2 mb-6 shadow-lg">
                <Typography className="text-white text-2xl text-center font-bold">
                    Activity Logs
                </Typography>
            </div>

            <Filters />

            <div className="relative overflow-auto w-full border border-gray-300 rounded max-h-[500px] mt-4 bg-white shadow-sm">
                {/* Top Loading Bar for smooth transitions */}
                {/* <div className="" style={{ height: '3px' }}>
                    {loading && <Loader/> }
                </div> */}

                <table className={`min-w-full text-sm border-collapse transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr className="divide-x divide-gray-200">
                            {["Sr No", "Emp ID", "Punch Date", "Punch Time", "Device IP", "Device SN"].map((h, i) => (
                                <th key={i} className="border-b px-4 py-3 font-bold text-left text-[#222F7D] bg-gray-100">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.length > 0 ? (
                            data.map((row, i) => {
                                const punchTime = new Date(row.punch_time).toLocaleTimeString('en-IN', {
                                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                                });

                                return (
                                    <tr key={i} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-2 text-gray-500">{(page - 1) * 20 + (i + 1)}</td>
                                        <td className="px-4 py-2 font-bold text-gray-800">{row.emp_id}</td>
                                        <td className="px-4 py-2">{formatDate(row.punch_time)}</td>
                                        <td className="px-4 py-2 text-blue-700 font-semibold">{punchTime}</td>
                                        <td className="px-4 py-2 text-gray-600">{row.device_ip}</td>
                                        <td className="px-4 py-2 text-xs font-mono text-gray-400">{row.device_sn}</td>
                                    </tr>
                                );
                            })
                        ) : !loading && (
                            <tr>
                                <td colSpan="6" className="text-center py-20 text-gray-400">
                                    <p className="text-lg">No activity logs found</p>
                                    <p className="text-sm">Check your filters or Employee ID</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center mt-6 bg-white p-3 rounded-lg border shadow-sm">
                <p className="text-sm text-gray-500">Showing {data.length} records</p>
                <Pagination
                    count={pagination.totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    variant="outlined"
                    shape="rounded"
                />
            </div>
        </div>
    );
};

export default AdminActivityLog;
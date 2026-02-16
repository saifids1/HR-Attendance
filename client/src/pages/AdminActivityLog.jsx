import { Typography, Pagination } from '@mui/material';
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
    const [limit, setLimit] = useState(20); // Records per page state
    const [jumpPage, setJumpPage] = useState(""); 

    const { setActiveLogs, formatDate, filters } = useContext(EmployContext);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            // URL now includes dynamic page AND limit
            let url = `http://localhost:5000/api/admin/attendance/activity-log?page=${page}&limit=${limit}`;

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
    }, [page, limit, filters.startDate, filters.endDate, filters.activitySearch, setActiveLogs]);

    // Fetch logs when page, limit, or filters change
    useEffect(() => {
        const handler = setTimeout(() => { fetchLogs(); }, 400);
        return () => clearTimeout(handler);
    }, [fetchLogs]);

    // Reset page to 1 when filters or limit change
    useEffect(() => { 
        setPage(1); 
    }, [filters.activitySearch, filters.startDate, filters.endDate, limit]);

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const handleJumpPageSubmit = (e) => {
        e.preventDefault();
        const pageNum = parseInt(jumpPage);
        if (pageNum > 0 && pageNum <= pagination.totalPages) {
            setPage(pageNum);
            setJumpPage("");
        } else {
            alert(`Please enter a page between 1 and ${pagination.totalPages}`);
        }
    };

    if (loading && data.length === 0) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <Loader />
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
                                        <td className="px-4 py-2 text-gray-500">{(page - 1) * limit + (i + 1)}</td>
                                        <td className="px-4 py-2 font-bold text-gray-800">{row.emp_id}</td>
                                        <td className="px-4 py-2">{formatDate(row.punch_time)}</td>
                                        <td className="px-4 py-2 text-blue-700 font-semibold">{punchTime}</td>
                                        <td className="px-4 py-2 text-gray-600">{row.device_ip}</td>
                                        <td className="px-4 py-2 text-xs font-mono text-gray-400">{row.device_sn}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-20 text-gray-400">No records found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-6 bg-white p-4 rounded-lg border shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                        Showing {data.length} records
                    </p>
                    
                    {/* Records per page select */}
                    <div className="flex items-center space-x-2 border-l pl-4">
                        <label className="text-sm font-medium text-gray-700">Records:</label>
                        <select 
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value))}
                            className="border border-gray-300 rounded text-sm p-1 px-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* <Pagination
                        count={pagination.totalPages}
                        page={page}
                        onChange={handlePageChange}
                        color="primary"
                        variant="outlined"
                        shape="rounded"
                        size="small"
                    /> */}

                    <nav aria-label="Page navigation" className="border-l pl-6">
                        <form onSubmit={handleJumpPageSubmit} className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="jump-page" className="text-sm font-medium text-gray-700">Go to</label>
                                <input 
                                    type="number" 
                                    id="jump-page" 
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value)}
                                    className="w-12 border border-gray-300 text-sm rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500" 
                                    placeholder={pagination.totalPages} 
                                />
                                <span className="text-sm font-medium text-gray-700">page</span>
                            </div>
                            <button 
                                type="submit" 
                                className="text-white bg-[#222F7D] hover:bg-blue-800 font-medium rounded-md text-sm px-4 py-1.5 transition-colors shadow-sm"
                            >
                                Go
                            </button>
                        </form>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default AdminActivityLog;
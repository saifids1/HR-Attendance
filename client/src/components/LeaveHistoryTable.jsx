import React, { useState, useEffect } from 'react'
import api from '../../api/axiosInstance'

const StatusBadge = (data) => {

    // console.log("statusBadge",data.status);
    const {status} = data;


    if (status == "approved") {
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Approved</span>;
    }
    else if (status == "rejected") {
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Rejected</span>;
    }
    else {
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>;
    }
};
const LeaveHistoryTable = () => {

    const [historyData, sethistoryData] = useState([]);

    const leaveHistoryHeader = [
        "Leave Request ID",
        "Employee Name",
        "Leave Type",
        "Start Date",
        "End Date",
        "Reason",
        "Leave Status"
    ]
    
    const leaveHistoryData = async () => {
        try {

            const resp = await api.get("leaves/types/my-history")

            // console.log("resp", resp.data);
            sethistoryData(resp.data);

        } catch (error) {
            console.log(error);
        }
    }


    useEffect(() => {
        leaveHistoryData()
    }, [])

    const formattedDate = (dateStr) => {
        const date = new Date(dateStr);
        const dd = date.getDate().toString().padStart(2, "0");
        const mm = (date.getMonth() + 1).toString().padStart(2, "0");
        const yy = date.getFullYear();
        return `${dd}-${mm}-${yy}`;
    };

    return (
        <div>
            <table className="min-w-full border-collapse text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        {leaveHistoryHeader?.map((data, index) => (
                            <th key={index} className="border px-4 py-3 text-left">
                                {data}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {historyData?.map((data, index) => (
                        <tr key={index} className="">
                            <td className='border px-4 py-3'>{data.approval_id}</td>

                            <td className='border px-4 py-3'>{data.employee_name}</td>

                            <td className='border px-4 py-3'>{data.leave_type_name}</td>

                            <td className='border px-4 py-3'>
                                {formattedDate(data.start_date)}
                            </td>

                            <td className='border px-4 py-3'>
                                {formattedDate(data.end_date)}
                            </td>
                            <td className='border px-4 py-3'>
                                {data.reason}
                            </td>
                            <td className='border px-4 py-3'>
                                <StatusBadge status={data.leave_status} />
                                
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default LeaveHistoryTable
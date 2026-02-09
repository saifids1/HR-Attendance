import React, { useState, useEffect } from "react";
import { BsSendFill } from "react-icons/bs";
import axios from "axios";

const Modal = ({ isOpen, setisOpen, onSave }) => {
    const [formData, setFormData] = useState({
        leave_type_id: "",
        start_date: "",
        end_date: "",
        reason: "",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setFormData({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. Validate Dates
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        
        if (end < start) {
            alert("End date cannot be earlier than start date.");
            return;
        }

        // 2. Calculate Total Days (Inclusive)
        const diffTime = end - start;
        const total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        setLoading(true);

        try {
            // Fix: Parse the user object from local storage
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            const emp_id = userData.emp_id;

            if (!emp_id) throw new Error("User session not found. Please log in again.");

            const payload = {
                emp_id,
                leave_type_id: parseInt(formData.leave_type_id),
                start_date: formData.start_date,
                end_date: formData.end_date,
                total_days,
                reason: formData.reason,
            };

            await axios.post("http://localhost:5000/api/leaves/types/apply", payload);
            
            alert("Leave application submitted successfully!");
            setisOpen(false);
            if (onSave) onSave(); 
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || error.message || "Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-xl p-4">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-xl font-semibold text-gray-800">Request Leave</h3>
                        <button 
                            type="button" 
                            onClick={() => setisOpen(false)} 
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="space-y-5 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                                <input required id="start_date" type="date" value={formData.start_date} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                <input required id="end_date" type="date" value={formData.end_date} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-1">Leave Type</label>
                            <select required id="leave_type_id" value={formData.leave_type_id} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Choose a Leave Type</option>
                                <option value="1">Sick Leave</option>
                                <option value="2">Casual Leave</option>
                                <option value="3">Annual Leave</option>
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm font-semibold text-gray-700 mb-1">Reason for Leave</label>
                            <textarea required id="reason" rows={3} value={formData.reason} onChange={handleChange} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Provide a brief explanation..." />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t pt-4">
                        <button 
                            type="button" 
                            onClick={() => setisOpen(false)} 
                            className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium flex items-center gap-2 disabled:bg-blue-300 transition-all shadow-md active:scale-95"
                        >
                            {loading ? "Sending..." : <><BsSendFill size={15} /> <span>Submit Request</span></>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Modal;
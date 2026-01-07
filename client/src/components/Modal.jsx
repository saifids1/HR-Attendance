import React, { useState } from "react";
import { BsSendFill } from "react-icons/bs";




const Modal = ({ isOpen, setisOpen }) => {
    //   const [open, setOpen] = useState(false);

    return (
        <div>

            {/* Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    tabIndex={-1}
                >
                    <div className="relative w-full max-w-2xl p-4">
                        <div className="bg-white border border-default rounded-base shadow-sm p-4 md:p-6 rounded-lg">

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-default pb-4">
                                <h3 className="text-lg font-medium text-heading">
                                    Leave Request Form
                                </h3>
                                <button
                                    onClick={() => setisOpen(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-base hover:bg-gray-100"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Body */}
                            <div className="space-y-4 py-4">

                                {/* Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col">
                                        <label htmlFor="startDate" className="text-sm font-medium p-2">
                                            Start Date
                                        </label>
                                        <input
                                            id="startDate"
                                            type="date"
                                            className="border rounded px-3 py-2"
                                        />
                                    </div>

                                    <div className="flex flex-col">
                                        <label htmlFor="endDate" className="text-sm font-medium p-2">
                                            End Date
                                        </label>
                                        <input
                                            id="endDate"
                                            type="date"
                                            className="border rounded px-3 py-2"
                                        />
                                    </div>
                                </div>

                                {/* Leave Type & Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <div className="flex flex-col">
                                        <label for="countries" class="block mb-2.5 text-sm font-medium text-heading ">Select an option</label>
                                        <select id="countries" class="block w-full px-3 py-2 bg-neutral-secondary-medium border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand shadow-xs placeholder:text-body">
                                            <option selected>Choose a Leaves</option>
                                            <option value="casual-leave">Casual Leave</option>
                                            <option value="sick-leave">Sick Leave</option>
                                            <option value="annual-leave">Annual Leave</option>
                                            <option value="maternity-leave">Maternity Leave</option>
                                            <option value="paternity-leave">Paternity Leave</option>
                                            {/* <option value="leave-without-pay">Leave Without Pay</option> */}
                                        </select>
                                    </div>

                                    <div className="flex flex-col">
                                        <label htmlFor="contact" className="text-sm font-medium py-1">
                                            Contact Number
                                        </label>
                                        <input
                                            id="contact"
                                            type="tel"
                                            className="border rounded px-3 py-2"
                                            placeholder="Enter Contact Number ..."
                                        />
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="flex flex-col">
                                    <label htmlFor="reason" className="text-sm font-medium p-2">
                                        Reason
                                    </label>
                                    <textarea
                                        id="reason"
                                        rows={3}
                                        className="border rounded px-3 py-2"
                                        placeholder="Reason for leave"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 border-t border-default pt-4">
                                <button
                                    onClick={() => setisOpen(false)}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-opacity-80"
                                >
                                    Cancel
                                </button>
                                <button
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-brand-strong hover:bg-opacity-80 flex items-center gap-2 "
                                >   
                                <BsSendFill size={15} className=""/>
                                   <span>Send Request</span> 
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

            )}
        </div>
    );
};

export default Modal;

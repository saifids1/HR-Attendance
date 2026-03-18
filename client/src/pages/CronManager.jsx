import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';


// console.log("API_BASE",API_BASE); // http://localhost:5000/api
const CronManager = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [empEmail,setEmpEmail] = useState([]);
  const[email,setEmail]=useState("");
  
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/update-schedule`);
      const formatted = data.map(s => {
        const parts = s.cron_pattern.split(' ');
        return { 
          ...s, 
          timeValue: `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}` 
        };
      });
      setSchedules(formatted);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    try {
      const { data } = await api.get(`/update-schedule/emails`);
      setEmpEmail(data);
      console.log("Emails",data);
    } catch (err) {
      console.error("Failed to fetch emails",err);
    }
  };


  useEffect(() => { fetchSchedules(); fetchEmails()}, []);

  const handleUpdate = async (slot) => {
    setUpdating(slot.slot_name);
    const [hour, minute] = slot.timeValue.split(':');
    try {
      const resp = await api.post(`/update-schedule`, {
        slot_name: slot.slot_name,
        hour: parseInt(hour, 10),
        minute: parseInt(minute, 10),
        is_enabled: slot.is_enabled,
        email: email
      });

      console.log("Resp Cron",resp);

      setStatus({ type: 'success', msg: 'Changes saved successfully.' });
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Error saving changes.' });
    } finally {
      setUpdating(null);
    }
  };

  const handleAddEmail = async () => {
    if (!email) return;
    try {
      await api.post(`/update-schedule/add-email`, { email });
      setEmpEmail(prev => [...prev, { email }]);
      setEmail("");
      toast.success("Email added successfully");
    } catch (err) {
      console.error("Failed to add email", err);
    } 
  };

  const handleDeleteEmail = async (index) => {
    // const emailToDelete = empEmail[index].email;
    try {
      await api.delete(`/update-schedule/emails/${index}`);
      const filtered = empEmail.filter((item, i) => item.id !== index);
      setEmpEmail(filtered);
      toast.success("Email deleted successfully");
    } catch (err) {
      console.error("Failed to delete email", err);
    }
  };



  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    // <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', color: '#333' }}>
      
    //   {/* Header */}
    //   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    //     <h2 style={{ margin: 0 }}>Report Scheduling</h2>
    //     <button onClick={fetchSchedules} className="cursor-pointer text-[12px] bg-[#212e7d] text-white p-2 rounded-md">Refresh</button>
    //   </div>

    //   <div>
    //     <label htmlFor="">Email To Add</label>
    //     <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

    //   {/* Message Box */}
    //   {status.msg && (
    //     <div style={{ 
    //       padding: '10px', 
    //       marginBottom: '20px', 
    //       borderRadius: '4px',
    //       backgroundColor: status.type === 'success' ? '#e6fffa' : '#fff5f5',
    //       color: status.type === 'success' ? '#2c7a7b' : '#c53030',
    //       border: `1px solid ${status.type === 'success' ? '#b2f5ea' : '#feb2b2'}`,
    //       fontSize: '14px'
    //     }}>
    //       {status.msg}
    //     </div>
    //   )}

    //   {/* List of Slots */}
    //   <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
    //     {schedules.map((slot, index) => (
    //       <div key={slot.slot_name} style={{ 
    //         padding: '20px', 
    //         borderBottom: index !== schedules.length - 1 ? '1px solid #eee' : 'none',
    //         backgroundColor: slot.is_enabled ? '#fff' : '#fafafa'
    //       }}>
    //         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
    //           <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{slot.slot_name} Report</span>
    //           <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
    //             <input 
    //               type="checkbox" 
    //               checked={slot.is_enabled}
    //               onChange={() => {
    //                 const updated = schedules.map(s => 
    //                   s.slot_name === slot.slot_name ? { ...s, is_enabled: !s.is_enabled } : s
    //                 );
    //                 setSchedules(updated);
    //               }}
    //               style={{ marginRight: '8px' }}
    //             />
    //             Enabled
    //           </label>
    //         </div>

    //         <div style={{ display: 'flex', gap: '10px' }}>
    //           <input 
    //             type="time" 
    //             value={slot.timeValue}
    //             disabled={!slot.is_enabled}
    //             onChange={(e) => {
    //               const newSchedules = schedules.map(s => 
    //                 s.slot_name === slot.slot_name ? { ...s, timeValue: e.target.value } : s
    //               );
    //               setSchedules(newSchedules);
    //             }}
    //             style={{ 
    //               padding: '8px', 
    //               flex: 1, 
    //               border: '1px solid #ccc', 
    //               borderRadius: '4px',
    //               opacity: slot.is_enabled ? 1 : 0.5 
    //             }}
    //           />
    //           <button 
    //             onClick={() => handleUpdate(slot)}
    //             disabled={updating === slot.slot_name}
    //             style={{ 
    //               padding: '8px 20px', 
    //               backgroundColor: '#212e7d', 
    //               color: 'white', 
    //               border: 'none', 
    //               borderRadius: '4px', 
    //               cursor: updating === slot.slot_name ? 'not-allowed' : 'pointer',
    //               fontSize: '14px'
    //             }}
    //           >
    //             {updating === slot.slot_name ? '' : 'Save'}
    //           </button>
    //         </div>
    //       </div>
    //     ))}
    //   </div>

    //   {/* Note */}
    //   {/* <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f7fafc', borderRadius: '4px', fontSize: '12px', color: '#718096' }}>
    //     <strong>Note:</strong> Times are based on Asia/Kolkata (IST). Changes update the server cron jobs immediately.
    //   </div> */}
    // </div>
   <div className="max-w-5xl mx-auto p-6 text-gray-700">

  {/* Header */}
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-2xl font-semibold text-[#212e7d]">
      Report Scheduler
    </h1>

    <button
      onClick={fetchSchedules}
      className="bg-[#212e7d] text-white px-4 py-2 rounded-md text-sm hover:bg-[#1a2563]"
    >
      Refresh
    </button>
  </div>

  {/* EMAIL MANAGEMENT CARD */}
  <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">

    <h3 className="text-lg font-semibold mb-4 text-gray-800">
      Email Recipients
    </h3>

    {/* Email Input */}
    <div className="flex gap-3 mb-4">
      <input
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email address"
        className="flex-1 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#212e7d] focus:outline-none"
      />

      <button
        onClick={handleAddEmail}
        className="bg-[#212e7d] text-white px-5 py-2 rounded-md text-sm hover:bg-[#1a2563]"
      >
        Add
      </button>
    </div>

    {/* Email Chips */}
    <div className="flex flex-wrap gap-2">
      {empEmail.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2 bg-gray-100 border px-3 py-1 rounded-full text-sm"
        >
          {item.email}

          <button
            onClick={() => handleDeleteEmail(item.id)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </div>


  {/* STATUS MESSAGE */}
  {status.msg && (
    <div
      className={`mb-6 px-4 py-3 rounded-md text-sm
      ${
        status.type === "success"
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {status.msg}
    </div>
  )}


  {/* SCHEDULE SETTINGS CARD */}
  <div className="bg-white border rounded-lg shadow-sm">

    <div className="border-b px-6 py-4">
      <h3 className="text-lg font-semibold text-gray-800">
        Schedule Settings
      </h3>
    </div>

    <div className="divide-y">

      {schedules.map((slot) => (
        <div
          key={slot.slot_name}
          className="flex items-center justify-between px-6 py-4"
        >

          {/* Slot Name */}
          <div className="w-1/3 font-medium capitalize">
            {slot.slot_name} Report
          </div>


          {/* Enable Toggle */}
          <div className="flex items-center gap-2 w-1/4">
            <input
              type="checkbox"
              checked={slot.is_enabled}
              onChange={() => {
                const updated = schedules.map((s) =>
                  s.slot_name === slot.slot_name
                    ? { ...s, is_enabled: !s.is_enabled }
                    : s
                );
                setSchedules(updated);
              }}
              className="accent-[#212e7d]"
            />
            <span className="text-sm">Enabled</span>
          </div>


          {/* Time */}
          <div className="w-1/4">
            <input
              type="time"
              value={slot.timeValue}
              disabled={!slot.is_enabled}
              onChange={(e) => {
                const newSchedules = schedules.map((s) =>
                  s.slot_name === slot.slot_name
                    ? { ...s, timeValue: e.target.value }
                    : s
                );
                setSchedules(newSchedules);
              }}
              className={`border rounded-md px-3 py-2 text-sm
              ${!slot.is_enabled ? "opacity-50" : ""}`}
            />
          </div>


          {/* Save */}
          <div>
            <button
              onClick={() => handleUpdate(slot)}
              disabled={updating === slot.slot_name}
              className={`px-4 py-2 rounded-md text-sm text-white
                ${
                  updating === slot.slot_name
                    ? "bg-gray-400"
                    : "bg-[#212e7d] hover:bg-[#1a2563]"
                }`}
            >
              {updating === slot.slot_name ? "Saving..." : "Save"}
            </button>
          </div>

        </div>
      ))}

    </div>
  </div>

</div>
  );
};

export default CronManager;
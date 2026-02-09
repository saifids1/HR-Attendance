import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const CronManager = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/update-schedule`);
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

  useEffect(() => { fetchSchedules(); }, []);

  const handleUpdate = async (slot) => {
    setUpdating(slot.slot_name);
    const [hour, minute] = slot.timeValue.split(':');
    try {
      await axios.post(`${API_BASE}/update-schedule`, {
        slot_name: slot.slot_name,
        hour: parseInt(hour, 10),
        minute: parseInt(minute, 10),
        is_enabled: slot.is_enabled
      });
      setStatus({ type: 'success', msg: 'Changes saved successfully.' });
      setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Error saving changes.' });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', color: '#333' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Report Scheduling</h2>
        <button onClick={fetchSchedules} className="cursor-pointer text-[12px] bg-[#212e7d] text-white p-2 rounded-md">Refresh</button>
      </div>

      {/* Message Box */}
      {status.msg && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          borderRadius: '4px',
          backgroundColor: status.type === 'success' ? '#e6fffa' : '#fff5f5',
          color: status.type === 'success' ? '#2c7a7b' : '#c53030',
          border: `1px solid ${status.type === 'success' ? '#b2f5ea' : '#feb2b2'}`,
          fontSize: '14px'
        }}>
          {status.msg}
        </div>
      )}

      {/* List of Slots */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        {schedules.map((slot, index) => (
          <div key={slot.slot_name} style={{ 
            padding: '20px', 
            borderBottom: index !== schedules.length - 1 ? '1px solid #eee' : 'none',
            backgroundColor: slot.is_enabled ? '#fff' : '#fafafa'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{slot.slot_name} Report</span>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  checked={slot.is_enabled}
                  onChange={() => {
                    const updated = schedules.map(s => 
                      s.slot_name === slot.slot_name ? { ...s, is_enabled: !s.is_enabled } : s
                    );
                    setSchedules(updated);
                  }}
                  style={{ marginRight: '8px' }}
                />
                Enabled
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="time" 
                value={slot.timeValue}
                disabled={!slot.is_enabled}
                onChange={(e) => {
                  const newSchedules = schedules.map(s => 
                    s.slot_name === slot.slot_name ? { ...s, timeValue: e.target.value } : s
                  );
                  setSchedules(newSchedules);
                }}
                style={{ 
                  padding: '8px', 
                  flex: 1, 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  opacity: slot.is_enabled ? 1 : 0.5 
                }}
              />
              <button 
                onClick={() => handleUpdate(slot)}
                disabled={updating === slot.slot_name}
                style={{ 
                  padding: '8px 20px', 
                  backgroundColor: '#212e7d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: updating === slot.slot_name ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {updating === slot.slot_name ? '' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      {/* <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f7fafc', borderRadius: '4px', fontSize: '12px', color: '#718096' }}>
        <strong>Note:</strong> Times are based on Asia/Kolkata (IST). Changes update the server cron jobs immediately.
      </div> */}
    </div>
  );
};

export default CronManager;
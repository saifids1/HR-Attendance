import React, { useContext, useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { IoMdRefreshCircle } from "react-icons/io";
import { useParams } from "react-router-dom";
import { EmployContext } from "../context/EmployContextProvider";
import api from "../../api/axiosInstance";
import { updatePersonal } from "../../api/profile";
import MainProfile from "../profile/MainProfile";

const EmployeeDetails = () => {
  // 1. Get emp_id from URL (for Admin view)
  const { emp_id: urlEmpId } = useParams();

  // console.log("urlEmpId",urlEmpId)
  
  // 2. Get logged-in user info from localStorage
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const token = localStorage.getItem("token");

  // Logic: Use URL ID if available (Admin viewing someone), otherwise use own ID (Self Profile)
  const emp_id = urlEmpId || user.emp_id;
  const isAdmin = user.role === "admin";

  const { setAdminAttendance } = useContext(EmployContext);

  // --- State Management ---
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [loading, setLoading] = useState(false);

  const [personal, setPersonal] = useState({});
  const [contact, setContact] = useState([]);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [bank, setBank] = useState([]);
  const [documents, setDocuments] = useState({});

  const isActive = personal.is_active ?? true;

  // --- Data Fetching ---
  const fetchAllData = useCallback(async () => {
    if (!emp_id) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, cRes, eRes, exRes, bRes, dRes] = await Promise.allSettled([
        api.get(`employee/profile/personal/${emp_id}`, { headers }),
        api.get(`employee/profile/contact/${emp_id}`, { headers }),
        api.get(`employee/profile/education/${emp_id}`, { headers }),
        api.get(`employee/profile/experience/${emp_id}`, { headers }),
        api.get(`employee/profile/bank/${emp_id}`, { headers }),
        api.get(`employee/profile/bank/doc/${emp_id}`, { headers }),
      ]);

      if (pRes.status === "fulfilled") setPersonal(pRes.value.data || {});
      if (cRes.status === "fulfilled") setContact(cRes.value.data?.contacts || []);
      if (eRes.status === "fulfilled") setEducation(eRes.value.data?.education || []);
      if (exRes.status === "fulfilled") setExperience(exRes.value.data?.experience || []);
      if (bRes.status === "fulfilled") setBank(bRes.value.data?.bankDetails || []);
      
      if (dRes.status === "fulfilled") {
        const docObj = {};
        (dRes.value.data?.documents || []).forEach(d => {
          docObj[d.file_type] = d.file_path;
        });
        setDocuments(docObj);
      }
    } catch (err) {
      toast.error("Error fetching employee data");
    } finally {
      setLoading(false);
    }
  }, [emp_id, token]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Handlers ---
  const handleToggleActive = async () => {
    if (!isAdmin || isToggling) return;
    try {
      setIsToggling(true);
      const newStatus = !isActive;
      await api.patch(`/admin/attendance/${emp_id}/status`, { is_active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPersonal(prev => ({ ...prev, is_active: newStatus }));
      setAdminAttendance(prev => prev.map(e => String(e.emp_id) === String(emp_id) ? { ...e, is_active: newStatus } : e));
      toast.success(`Employee ${newStatus ? "Activated" : "Deactivated"}`);
    } catch {
      toast.error("Status update failed");
    } finally {
      setIsToggling(false);
    }
  };

  const handleSavePersonal = async (updatedData) => {
    try {
      // Logic for saving personal info specifically
      await updatePersonal(emp_id, updatedData);
      setPersonal(prev => ({ ...prev, ...updatedData }));
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const refreshPage = () => {
    fetchAllData();
    toast.success("Data Refreshed");
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl p-6 shadow">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{personal.name || "Employee Profile"}</h1>
              <p className="text-blue-600 text-sm font-mono font-semibold">EMP-ID: {emp_id}</p>
            </div>
            <button 
              onClick={refreshPage}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh Data"
            >
              <IoMdRefreshCircle size={30} />
            </button>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-4 bg-gray-50 p-2 px-4 rounded-lg border">
              <span className={`text-xs font-bold ${isActive ? "text-green-600" : "text-red-400"}`}>
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isActive} 
                  disabled={isToggling} 
                  onChange={handleToggleActive} 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white mt-4 p-6 rounded-xl shadow min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500 italic">
            Loading Profile Data...
          </div>
        ) : (
     
          <MainProfile 
            personalData={personal}  
            educationData={education}
            experienceData={experience}
            contactData={contact}
            bankData={bank}
            userRole={user.role}      
            isEditing={isEditing}
            setIsEditing={setIsEditing} 
            // onSave={handleSavePersonal} // Specifically for personal tab
            empId={emp_id}   
            onSave={fetchAllData} 

          />
        )}
      </div>
    </div>
  );
};

export default EmployeeDetails;
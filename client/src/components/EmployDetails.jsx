import React, { useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";
import { EmployContext } from "../context/EmployContextProvider";
import api from "../../api/axiosInstance";

const TABS = [
  { key: "personal", label: "Personal Info" },
  { key: "contact", label: "Contact" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "bank", label: "Bank Details" },
  { key: "documents", label: "Documents" },
];

const DOCUMENTS = [
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
  { key: "passbook", label: "Bank Passbook" },
  { key: "address_proof", label: "Address Proof" },
];


const DataField = ({ label, value, highlight = false }) => (
  <div className="flex flex-col border-b border-gray-100 py-2">
    <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
    <span className={`text-sm ${highlight ? "text-blue-600 font-bold" : "text-gray-800"}`}>
      {value || "—"}
    </span>
  </div>
);

const DocumentRow = ({ label, file }) => {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-sm font-semibold text-gray-700 mb-2">
        {label}
      </p>

      {!file ? (
        <span className="text-gray-400 italic text-sm">
          Not Uploaded
        </span>
      ) : file.toLowerCase().endsWith(".pdf") ? (
        <a
          href={file}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 text-sm underline"
        >
          View Document
        </a>
      ) : (
        <img
          src={file}
          alt={label}
          className="w-32 h-32 object-cover rounded border"
        />
      )}
    </div>
  );
};


const EmployeeDetails = () => {
  const { emp_id } = useParams();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const role = user.role;

  const isAdmin = role === "admin";

  const { adminAttendance, setAdminAttendance } = useContext(EmployContext);

  const [activeTab, setActiveTab] = useState("personal");
  const [personal, setPersonal] = useState({});
  const [contact, setContact] = useState([]);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [bank, setBank] = useState([]);
  const [documents, setDocuments] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const isActive = personal.is_active ?? true;


  const fetchEmployeeDetails = useCallback(async () => {
    if (!emp_id) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [
        pRes,
        cRes,
        eRes,
        exRes,
        bRes,
        dRes,
      ] = await Promise.allSettled([
        api.get(`employee/profile/personal/${emp_id}`, { headers }),
        api.get(`employee/profile/contact/${emp_id}`, { headers }),
        api.get(`employee/profile/education/${emp_id}`, { headers }),
        api.get(`employee/profile/experience/${emp_id}`, { headers }),
        api.get(`employee/profile/bank/${emp_id}`, { headers }),
        api.get(`employee/profile/bank/doc/${emp_id}`, { headers }),
      ]);

      setPersonal(pRes.value?.data || {});
      setContact(cRes.value?.data?.contacts || []);
      setEducation(eRes.value?.data?.education || []);
      setExperience(exRes.value?.data?.experience || []);
      setBank(bRes.value?.data?.bankDetails || []);

      const docObj = {};
      (dRes.value?.data?.documents || []).forEach(d => {
        docObj[d.file_type] = d.file_path;
      });
      setDocuments(docObj);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    }
  }, [emp_id, token]);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [fetchEmployeeDetails]);

  // 🔹 Sync ACTIVE status from Admin Context
  useEffect(() => {
    if (!adminAttendance) return;

    const emp = adminAttendance.find(e => String(e.emp_id) === String(emp_id));
    if (emp) {
      setPersonal(prev => ({ ...prev, is_active: emp.is_active }));
    }
  }, [adminAttendance, emp_id]);

  // 🔹 ADMIN ONLY Toggle
  const handleToggleActive = async () => {
    if (!isAdmin) return;

    try {
      setIsToggling(true);
      const newStatus = !isActive;

      await fetch(`/api/admin/attendance/${emp_id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      setPersonal(prev => ({ ...prev, is_active: newStatus }));

      setAdminAttendance(prev =>
        prev.map(emp =>
          String(emp.emp_id) === String(emp_id)
            ? { ...emp, is_active: newStatus }
            : emp
        )
      );

      toast.success(`Employee ${newStatus ? "Activated" : "Deactivated"}`);
    } catch {
      toast.error("Status update failed");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl p-6 shadow">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{personal.name || "Employee Profile"}</h1>
            <p className="text-blue-600 text-sm">EMP-ID: {emp_id}</p>
          </div>

          {/* ADMIN ONLY */}
          {isAdmin && (
  <div className="flex items-center gap-4">
    <span className={`text-sm font-bold ${isActive ? "text-green-600" : "text-gray-400"}`}>
       Status: {isActive ? "ACTIVE" : "INACTIVE"}
    </span>
    
    <label className={`relative inline-flex items-center ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        className="sr-only peer" // Hide the default checkbox
        checked={isActive}
        disabled={isToggling}
        onChange={handleToggleActive}
      />
      {/* The Switch Track */}
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
    </label>
  </div>
)}
        </div>

        {/* TABS */}
        <div className="flex gap-2 mt-6 border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 ${activeTab === tab.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto bg-white mt-4 p-6 rounded-xl shadow">
        {activeTab === "personal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4"> <DataField label="Full Name" value={personal.name} highlight /> <DataField label="Employee ID" value={personal.emp_id} highlight /> <DataField label="Official Email" value={personal.email} /> <DataField label="Department" value={personal.department} highlight /> <DataField label="Designation / Role" value={personal.role} /> <DataField label="Employment Status" value={isActive ? "Active" : "Inactive"} /> <DataField label="Date of Birth" value={personal.dob} /> <DataField label="Date of Joining" value={personal.joining_date} /> <DataField label="Gender" value={personal.gender} /> <DataField label="Marital Status" value={personal.maritalstatus} /> <DataField label="Nationality" value={personal.nationality} /> <DataField label="Blood Group" value={personal.bloodgroup} /> <DataField label="Aadhaar Number" value={personal.aadharnumber} /> <div className="md:col-span-2 lg:col-span-3"> <DataField label="Residential Address" value={personal.address} /> </div> </div>
        )}
       {activeTab === "contact" && (
<div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
   <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
         <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Relation</th>
         </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100 text-sm text-gray-700">
         {contact.map((c, i) => (
         <tr key={i} className="hover:bg-blue-50/30">
            <td className="px-6 py-4 font-semibold text-gray-600">{c.contact_type}</td>
            <td className="px-6 py-4">{c.email}</td>
            <td className="px-6 py-4 font-mono">{c.phone}</td>
            <td className="px-6 py-4 italic">{c.relation}</td>
         </tr>
         ))} 
      </tbody>
   </table>
</div>
)}

{activeTab === "education" && (
<div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
   <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
         <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Degree</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Institution</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Field</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Year</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Result</th>
         </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100 text-sm text-gray-700">
         {education.map((edu, i) => (
         <tr key={i} className="hover:bg-blue-50/30">
            <td className="px-6 py-4 font-semibold">{edu.degree}</td>
            <td className="px-6 py-4 text-gray-500">{edu.institution_name}</td>
            <td className="px-6 py-4 text-gray-500">{edu.field_of_study}</td>
            <td className="px-6 py-4">{edu.passing_year}</td>
            <td className="px-6 py-4 font-bold text-gray-500">{edu.percentage_or_grade} %</td>
         </tr>
         ))} 
      </tbody>
   </table>
</div>
)}

{activeTab === "experience" && ( 
<div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm">
   <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
         <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Company</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Designation</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Years</th>
         </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100 text-sm text-gray-700">
         {experience.map((exp, i) => ( 
         <tr key={i} className="hover:bg-blue-50/30">
            <td className="px-6 py-4 font-semibold text-gray-900">{exp.company_name}</td>
            <td className="px-6 py-4 text-gray-600 font-medium">{exp.designation}</td>
            <td className="px-6 py-4 text-gray-500"> {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : 'N/A'} - {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'} </td>
            <td className="px-6 py-4 text-gray-500 font-bold">{parseInt(exp.total_years) || 0} Yrs</td>
         </tr>
         ))} 
      </tbody>
   </table>
</div>
)}
{activeTab === "bank" && ( 
<div className="space-y-6">
   {bank.map((b, i) => ( 
   <div key={i} className="p-4 border border-blue-100 bg-blue-50/20 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <DataField label="Account Holder" value={b.account_holder_name} />
      <DataField label="Bank Name" value={b.bank_name} />
      <DataField label="Account No" value={b.account_number} highlight />
      <DataField label="IFSC Code" value={b.ifsc_code} />
      <DataField label="Branch" value={b.branch_name} />
      <DataField label="Type" value={b.account_type} />
      <DataField label="PAN Number" value={b.pan_number} />
   </div>
   ))} 
</div>
)}

{activeTab === "documents" && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {DOCUMENTS.map(doc => (
      <DocumentRow
        key={doc.key}
        label={doc.label}
        file={
          documents[doc.key]
            ? `http://localhost:5000${documents[doc.key]}`
            : null
        }
      />
    ))}
  </div>
)}

      </div>
    </div>
  );
};

export default EmployeeDetails;

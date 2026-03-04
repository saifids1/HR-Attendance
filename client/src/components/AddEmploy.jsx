import React, { useState } from "react";
import { toast } from "react-hot-toast";
import MainProfile from "../profile/MainProfile";
import { addEmploy } from "../../services/authServices";
import defaultProfile from "../assets/avatar.webp";
import { Typography, Divider } from "@mui/material";
import { MdOutlineEmail } from "react-icons/md";
import { IoHomeSharp } from "react-icons/io5";
import ReportingCard from "../components/ReportingCard";

const AddEmployee = () => {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const emp_id = "";
  // const isAdmin = user.role === "admin";

  // ===== Header Data States =====
  const [profileImage, setProfileImage] = useState("");
  const [reporting, setReporting] = useState([]);
  const [employeeBasic, setEmployeeBasic] = useState({});

  // Empty structures (same shape as EmployeeDetails expects)
  const emptyPersonal = {
    name: "",
    email: "",
    password: "",
    emp_id: "",
    role: "employee",
    is_active: true,
    shift_id: 3,
    dob: "",
    gender: "",
    department: "",
    joining_date: "",
    maritalstatus: "",
    nominee: "",
    aadharnumber: "",
    bloodgroup: "",
    nationality: "",
    address: "",
    profile_image: null,
  };

  const handleCreateEmployee = async (personalData) => {
    try {
      setLoading(true);

      const formData = new FormData();
      Object.keys(personalData).forEach((key) => {
        if (personalData[key] !== null && personalData[key] !== undefined) {
          formData.append(key, personalData[key]);
        }
      });

      await addEmploy(formData);
      toast.success("Employee Created Successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className=" max-w-6xl bg-transparent mx-auto  rounded-xl">
        {/* SAME HEADER AS EmployeeDetails */}
        <div className="sticky z-20 top-0 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg flex justify-center items-center px-6">
          <Typography className="text-white text-xl sm:text-2xl font-bold">
            Add New Employee
          </Typography>
        </div>

        {/* PROFILE HEADER SECTION */}
        <div className="mx-auto grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-6">
          {/* LEFT CARD */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 h-25">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <div className="relative w-32 h-32">
                <img
                  src={profileImage || defaultProfile}
                  alt="Profile"
                  className="w-full h-full rounded-full border-4 border-[#222F7D] object-cover"
                />
                <input
                  type="file"
                  className="hidden"
                  // onChange={handleProfileUpload}
                />
                <div className="absolute bottom-1 right-1 bg-[#222F7D] text-white w-8 h-8 rounded-full flex items-center justify-center border-2 border-white">
                  ✎
                </div>
              </div>

              <div className="w-full text-center md:text-left">
                <h2 className="text-xl font-bold text-gray-800">
                  {employeeBasic?.name || "Employee Name"}
                </h2>

                <p className="text-[#222F7D] font-bold text-xs tracking-wider uppercase">
                  {employeeBasic?.role || "Employee"}
                </p>

                <p className="text-gray-500 text-sm mt-1">ID: {emp_id}</p>

                <div className="flex flex-col sm:flex-row gap-4 mt-4 text-gray-600 text-sm justify-center md:justify-start">
                  <span className="flex items-center gap-2">
                    <IoHomeSharp className="text-[#222F7D]" />
                    {employeeBasic?.address || "Office Address"}
                  </span>

                  <span className="flex items-center gap-2">
                    <MdOutlineEmail className="text-[#222F7D] text-lg" />
                    {employeeBasic?.email || "Email"}
                  </span>
                </div>
              </div>
            </div>
            <Divider className="my-6" />
          </div>

          {/* RIGHT REPORTING */}
          <div className="bg-white rounded-xl shadow p-4 h-25">
            <ReportingCard reportingManagers={reporting} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-transparent mt-5 rounded-xl shadow min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-gray-500 italic">
            Loading Profile Data...
          </div>
        ) : (
          <MainProfile
            personalData={[]}
            educationData={[]}
            experienceData={[]}
            contactData={[]}
            bankData={[]}
            userRole={"admin"}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            // onSave={handleSavePersonal} // Specifically for personal tab
            empId={null}
            onSave={handleCreateEmployee}
            isAddingNew={isAddingNew}
            setIsAddingNew={setIsAddingNew}
          />
        )}
      </div>
    </div>
  );
};

export default AddEmployee;

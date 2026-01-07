import React, { useContext, useState } from "react";
import { Typography, Divider } from "@mui/material";
import profileImg from "../assets/avatar.webp";
import { IoHomeSharp } from "react-icons/io5";
import { MdOutlineEmail } from "react-icons/md";
import Input from "../components/Input";
import Select from "../components/Select";
import FormCard from "../components/FormCard";
import { EmployContext } from "../context/EmployContextProvider";

const Profile = () => {

  const user = JSON.parse(localStorage.getItem("user"));
  
  const tabs = [
    "Organization",
    "Personal Details",
    "Education",
    "Experience",
    "Skills"
  ];
  

  const [activeTab, setActiveTab] = useState("Organization");
  const [isEditing, setIsEditing] = useState(false);

  // Organization
  const [orgData, setOrgData] = useState({
    firstName: "John",
    lastName: "Doe",
    employeeId: "EMP1023",
    joiningDate: "2021-06-15",
    employeeType: "Full Time",
    designation: "Frontend Developer",
    role: "UI Engineer",
    department: "Engineering",
    company: "ABC Technologies",
    location: "Bangalore",
    email: "john.doe@abctech.com",
    phone: "9876543210"
  });

  const [draftOrg, setDraftOrg] = useState(orgData);

  //  Personal
  const [personalData, setPersonalData] = useState({
    gender: "Male",
    dob: "1996-08-17",
    bloodGroup: "O+",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "Bangalore, Karnataka, India"
  });

  const [draftPersonal, setDraftPersonal] = useState(personalData);

  // Education
  const [educationData, setEducationData] = useState([
    {
      degree: "B.Tech",
      field: "Computer Science",
      institution: "ABC University",
      startYear: "2014",
      endYear: "2018",
      grade: "8.4 CGPA"
    }
  ]);

  const [draftEducation, setDraftEducation] = useState(educationData);

  // Experience
  const [experienceData, setExperienceData] = useState([
    {
      companyName: "XYZ Solutions",
      designation: "Frontend Engineer",
      employmentType: "Full Time",
      startDate: "2018-07-01",
      endDate: "2021-05-30",
      responsibilities: "Built reusable React components and optimized UI performance",
      location: "Pune"
    }
  ]);

  const [draftExperience, setDraftExperience] = useState(experienceData);

  /* Skills*/
  const [skillsData, setSkillsData] = useState([
    {
      skillName: "React",
      skillType: "Technical",
      proficiency: "Advanced",
      years: 4
    },

  ]);

  const [draftSkills, setDraftSkills] = useState(skillsData);

  const startEdit = () => {
    setDraftOrg(orgData);
    setDraftPersonal(personalData);
    setDraftEducation(educationData);
    setDraftExperience(experienceData);
    setDraftSkills(skillsData);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    setOrgData(draftOrg);
    setPersonalData(draftPersonal);
    setEducationData(draftEducation);
    setExperienceData(draftExperience);
    setSkillsData(draftSkills);
    setIsEditing(false);
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="bg-[#222F7D] rounded-lg">
        <Typography className="text-white py-3 text-2xl text-center font-semibold">
          Employee Profile
        </Typography>
      </div>

      <div className="max-w-6xl mx-auto mt-3">
  <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-6 items-stretch">

    {/* Left  */}
    <div className="bg-white rounded-xl shadow p-6 h-full flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <img
          src={profileImg}
          alt="profile"
          className="w-32 h-32 rounded-full mx-auto border-4 border-[#222F7D] object-cover"
        />

        <div className="md:col-span-3">
          <h2 className="text-xl font-semibold">{user?.name.toUpperCase()}</h2>
          <p className="text-gray-600">{user?.role}</p>

          <div className="flex gap-6 mt-2 text-gray-600">
            <span className="flex items-center gap-1">
              <IoHomeSharp /> {orgData.location}
            </span>
            <span className="flex items-center gap-1">
              <MdOutlineEmail /> {orgData.email}
            </span>
          </div>
        </div>
      </div>

      <Divider className="my-4" />
      <div className="flex-grow" />
    </div>

    {/* RIGHT: Reporting (NARROWER) */}
    <div className="bg-white rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-2">Reporting</h2>

      <p className="text-gray-700">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Doloribus, eum.
      </p>

      <div className="flex-grow" />
    </div>

  </div>
</div>



      {/*  */}
      {/* TABS */}
      <div className="flex justify-between bg-[#222F7D] px-4 py-2 rounded max-w-6xl mx-auto mt-3">
        <div className="flex gap-14">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setIsEditing(false);
              }}
              className={`
          relative text-sm pb-1
          transition-all duration-50000 ease-in-out
          text-[17px]
          ${activeTab === tab
                  ? "text-white"
                  : "text-slate-300 hover:text-white"}
        `}
            >
              {tab}

              {/* Animated underline */}
              <span
                className={`
            absolute left-0 bottom-0 h-[2px] bg-white
            transition-all duration-300 ease-in-out
            ${activeTab === tab ? "w-full" : "w-0"}
          `}
              />
            </button>
          ))}
        </div>

        {!isEditing && (
          <button
            onClick={startEdit}
            className="
        bg-white px-4 py-1 rounded text-sm
        transition-all duration-300 ease-in-out
        hover:bg-slate-200 hover:scale-105
      "
          >
            Edit
          </button>
        )}
      </div>


      <div className="max-w-6xl mx-auto">

        {/* Organization */}
        {activeTab === "Organization" && (
          <FormCard title="Organization Details">
            <Input label="First Name" value={draftOrg.firstName} disabled={!isEditing}
              onChange={e => setDraftOrg({ ...draftOrg, firstName: e.target.value })} />
            <Input label="Last Name" value={draftOrg.lastName} disabled={!isEditing}
              onChange={e => setDraftOrg({ ...draftOrg, lastName: e.target.value })} />
            <Input label="Employee ID" value={draftOrg.employeeId} disabled />
            <Input label="Joining Date" type="date" value={draftOrg.joiningDate} disabled={!isEditing}
              onChange={e => setDraftOrg({ ...draftOrg, joiningDate: e.target.value })} />
            <Input label="Designation" value={draftOrg.designation} disabled={!isEditing}
              onChange={e => setDraftOrg({ ...draftOrg, designation: e.target.value })} />
            <Input label="Department" value={draftOrg.department} disabled={!isEditing}
              onChange={e => setDraftOrg({ ...draftOrg, department: e.target.value })} />
          </FormCard>
        )}

        {/* Personal */}
        {activeTab === "Personal Details" && (
          <FormCard title="Personal Information">
            <Select label="Gender" value={draftPersonal.gender} disabled={!isEditing}
              options={["Male", "Female", "Other"]}
              onChange={e => setDraftPersonal({ ...draftPersonal, gender: e.target.value })} />
            <Input label="Date of Birth" type="date" value={draftPersonal.dob} disabled={!isEditing}
              onChange={e => setDraftPersonal({ ...draftPersonal, dob: e.target.value })} />
            <Input label="Blood Group" value={draftPersonal.bloodGroup} disabled={!isEditing}
              onChange={e => setDraftPersonal({ ...draftPersonal, bloodGroup: e.target.value })} />
            <Select label="Marital Status" value={draftPersonal.maritalStatus} disabled={!isEditing}
              options={["Single", "Married"]}
              onChange={e => setDraftPersonal({ ...draftPersonal, maritalStatus: e.target.value })} />
            <Input label="Nationality" value={draftPersonal.nationality} disabled={!isEditing}
              onChange={e => setDraftPersonal({ ...draftPersonal, nationality: e.target.value })} />
            <Input label="Address" value={draftPersonal.address} disabled={!isEditing}
              onChange={e => setDraftPersonal({ ...draftPersonal, address: e.target.value })} />
          </FormCard>
        )}

        {/* Education*/}
        {activeTab === "Education" &&
          draftEducation.map((edu, i) => (
            <FormCard key={i} title={`Education ${i + 1}`}>
              <Input label="Degree" value={edu.degree} disabled={!isEditing} />
              <Input label="Field of Study" value={edu.field} disabled={!isEditing} />
              <Input label="Institution" value={edu.institution} disabled={!isEditing} />
              <Input label="Start Year" value={edu.startYear} disabled={!isEditing} />
              <Input label="End Year" value={edu.endYear} disabled={!isEditing} />
              <Input label="Grade" value={edu.grade} disabled={!isEditing} />
            </FormCard>
          ))}

        {/* Experience */}
        {activeTab === "Experience" &&
          draftExperience.map((exp, i) => (
            <FormCard key={i} title={`Experience ${i + 1}`}>
              <Input label="Company Name" value={exp.companyName} disabled={!isEditing} />
              <Input label="Designation" value={exp.designation} disabled={!isEditing} />
              <Input label="Employment Type" value={exp.employmentType} disabled={!isEditing} />
              <Input label="Start Date" type="date" value={exp.startDate} disabled={!isEditing} />
              <Input label="End Date" value={exp.endDate} disabled={!isEditing} />
              <Input label="Location" value={exp.location} disabled={!isEditing} />
              <Input label="Responsibilities" value={exp.responsibilities} disabled={!isEditing} />
            </FormCard>
          ))}

        {/*Skills */}
        {activeTab === "Skills" && (
          <FormCard title="Skills">
            <div className="space-y-6">

              {skillsData.map((skill, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg"
                >
                  <Input
                    label="Skill Name"
                    value={skill.skillName}
                    disabled={!isEditing}
                  />

                  <Select
                    label="Skill Type"
                    value={skill.skillType}
                    disabled={!isEditing}
                    options={["Technical", "Soft Skill", "Language"]}
                  />

                  <Select
                    label="Proficiency"
                    value={skill.proficiency}
                    disabled={!isEditing}
                    options={["Beginner", "Intermediate", "Advanced", "Expert"]}
                  />

                  <Input
                    label="Years of Experience"
                    type="number"
                    value={skill.years}
                    disabled={!isEditing}
                  />
                </div>
              ))}

              {/* Add Skill Button */}
              {isEditing && (
                <button
                  onClick={() =>
                    setSkillsData([
                      ...skillsData,
                      {
                        skillName: "",
                        skillType: "Technical",
                        proficiency: "Beginner",
                        years: "",
                      },
                    ])
                  }
                  className="px-4 py-2 border rounded text-sm text-[#222F7D]"
                >
                  + Add Skill
                </button>
              )}
            </div>
          </FormCard>
        )}


        {/* Save*/}
        {isEditing && (
          <div className="flex justify-end gap-4 mt-6">
            <button onClick={cancelEdit} className="border px-4 py-2 rounded">
              Cancel
            </button>
            <button onClick={saveEdit} className="bg-[#222F7D] text-white px-4 py-2 rounded">
              Save
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default Profile;

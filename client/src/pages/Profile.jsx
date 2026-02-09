import React, { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Typography, Divider } from "@mui/material";
import { IoHomeSharp } from "react-icons/io5";
import { MdOutlineEmail } from "react-icons/md";
import defaultProfile from "../assets/avatar.webp"
import { toast } from "react-hot-toast"

import Input from "../components/Input";
import Select from "../components/Select";
import FormCard from "../components/FormCard";

import {
  getEducation,
  getExperience,
  getOrganization,
  getPersonal,
  getContact,
  getBank,
  updateContact,
  updateExperience,
  addEducations,
  addExperienceses,
  updateEducation,
  deleteEducation,
  deleteExperience,
  uploadBankDoc,
  updatePersonal,
  addPersonal,

} from "../../api/profile";

import { EmployContext } from "../context/EmployContextProvider";
// import Experience from "../profile/Experience";
// import Organization from "../profile/Organization";
import MainProfile from "../profile/MainProfile";
import ReportingCard from "../components/ReportingCard";
import { emptyExperience } from "../constants/emptyData";



// const emptyEducation = {
//   degree: "",
//   field_of_study: "",
//   institution_name: "",
//   passing_year: "",
//   university: "",
// };

// const emptyPersonal = {
//   gender: "", dob: "", bloodgroup: "", maritalstatus: "", nationality: "", address: "", aadharnumber: "", nominee: "", emp_id: ""
// }
// const emptyExperience = {
//   companyName: "",
//   designation: "",
//   from: "",
//   to: "",
//   total_years: "",
//   location: ""
// };

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
};

const isEmptyRow = (obj) => Object.values(obj).every((v) => !v);

const emptyBankData = {
  account_holder_name: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch_name: "",
  pan_number: "",
  account_type: "",
};



const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const emp_id = user?.emp_id;

  useEffect(()=>{
    console.log(emp_id);
    
  },[emp_id])

  const tabs = ["Organization", "Personal Details", "Education", "Experience", "Contacts", "Bank", "Documents"];

  const { profileImage, setProfileImage } = useContext(EmployContext);

  const [activeTab, setActiveTab] = useState("Organization");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  /* ----------------------------- source states ----------------------------- */

  const [orgData, setOrgData] = useState({});
  const [personalData, setPersonalData] = useState({});
  const [educationData, setEducationData] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [contactsData, setContactsData] = useState([]);
  const [bankData, setBankData] = useState(emptyBankData);
  const [empId, setEmpId] = useState(null)
  /* ----------------------------- draft states ----------------------------- */

  const [draftOrg, setDraftOrg] = useState({});
  const [draftPersonal, setDraftPersonal] = useState({});
  const [draftEducation, setDraftEducation] = useState([]);
  const [draftExperience, setDraftExperience] = useState([]);
  const [draftContact, setDraftContact] = useState([]);
  const [draftBank, setDraftBank] = useState(emptyBankData);

  const { orgAddress } = useContext(EmployContext);
  const [reporting, setReporting] = useState([]);
  // const [profilePreview, setProfilePreview] = useState(profile); // For the UI

  const [refreshTrigger, setRefreshTrigger] = useState(0);



  useEffect(() => {
    const emp = localStorage.getItem("user")?.role
    setEmpId(emp);
  }, [])

  useEffect(() => {
 
    if (!empId || activeTab !== "Profile") return;

    const fetchProfile = async () => {
      try {
        const results = await Promise.allSettled([
          getOrganization(),
          getPersonal(emp_id),
          getEducation(emp_id),
          getExperience(emp_id),
          getContact(emp_id),
          getBank(emp_id),
        ]);

      
        if (results[0].status === "fulfilled") {
          const org = results[0].value.data.organizationDetails || {};
          setOrgData(org);
          setDraftOrg(org);
        }

        // ----------------- Personal -----------------
        if (results[1]?.status === "fulfilled") {
          const p = results[1]?.value?.data?.personalDetails ?? {};

          const cleanPersonal = {
            ...emptyPersonal,
            ...p,
            dob: p?.dob ? formatDate(p.dob) : ""
          };

          setPersonalData(cleanPersonal);
          setDraftPersonal([cleanPersonal]); // always array for mapping
        } else {
          setPersonalData({ ...emptyPersonal });
          setDraftPersonal([{ ...emptyPersonal }]);
        }


        // ----------------- Education -----------------
        if (results[2].status === "fulfilled") {
          const eduList = results[2].value.data.education || [];
          const mergedEdu = eduList.length
            ? eduList.map((e) => ({ ...emptyEducation, ...e }))
            : [emptyEducation]; // fallback dummy row
          setEducationData(mergedEdu);
          setDraftEducation(mergedEdu);
        } else {
          setEducationData([emptyEducation]);
          setDraftEducation([emptyEducation]);
        }

        // ----------------- Experience -----------------
        if (results[3].status === "fulfilled") {
          const exps =
            results[3].value.data.experience?.map((e) => ({
              ...emptyExperience,
              companyName: e.company_name || "",
              designation: e.designation || "",
              start_date: formatDate(e.start_date),
              end_date: formatDate(e.end_date),
              total_years: e.total_years || "",
              id: e.id,
            })) || [{ ...emptyExperience }]; // always array

          setExperienceData(exps);        // <-- set as array
          setDraftExperience(exps);       // <-- set as array
        } else {
          setExperienceData([{ ...emptyExperience }]);  
          setDraftExperience([{ ...emptyExperience }]); 
        }

        if (results[4].status === "fulfilled") {
          const contacts = results[4].value.data.contact || [];
          const mergedContacts = contacts.length
            ? contacts.map(c => ({ ...c }))
            : [{ contact_type: "", phone: "", email: "", relation: "", isPrimary: false }];
          setContactsData(mergedContacts);
          setDraftContact(mergedContacts);
        } else {
          setContactsData([{ contact_type: "", phone: "", email: "", relation: "", isPrimary: false }]);
          setDraftContact([{ contact_type: "", phone: "", email: "", relation: "", isPrimary: false }]);
        }

        // ----------------- Bank -----------------
        if (results[5].status === "fulfilled") {
          const apiBank = results[5].value.data.bankInfo || {};
          const mergedBank = { ...emptyBankData, ...apiBank };
          setBankData(mergedBank);
          setDraftBank(mergedBank);
        } else {
          setBankData(emptyBankData);
          setDraftBank(emptyBankData);
        }

      } catch (err) {
        console.error("Error fetching profile:", err);
        // fallback to dummy for all
        setPersonalData(emptyPersonal);
        setDraftPersonal([emptyPersonal]);
        setEducationData([emptyEducation]);
        setDraftEducation([emptyEducation]);
        setExperienceData([emptyExperience]);
        setDraftExperience([emptyExperience]);
        setContactsData([{ contact_type: "", phone: "", email: "", relation: "", isPrimary: false }]);
        setDraftContact([{ contact_type: "", phone: "", email: "", relation: "", isPrimary: false }]);
        setBankData(emptyBankData);
        setDraftBank(emptyBankData);
      }
    };

    fetchProfile();
  }, [empId, activeTab,token]);


  useEffect(() => {
    // If the state 'emp_id' is null, try grabbing it from localStorage directly
    const idToUse = emp_id || JSON.parse(localStorage.getItem("user"))?.emp_id;
  
    const fetchProfileImage = async () => {
      const DEFAULT_IMAGE = defaultProfile;
  
      try {
        // 2. Strict check: Don't fetch if token is missing
        if (!token) return;
  
        const res = await axios.get(
          "http://localhost:5000/api/employee/profile/image",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
  
        if (res.data && res.data.profile_image) {
          // Your backend already returns the full URL, so we just add the cache buster
          setProfileImage(`${res.data.profile_image}?t=${Date.now()}`);
        } else {
          setProfileImage(DEFAULT_IMAGE);
        }
      } catch (error) {
        console.error("Error fetching profile image:", error);
        setProfileImage(DEFAULT_IMAGE);
      }
    };
  
    // 3. Only trigger if we have both the token and the employee identity
    if (token && idToUse) {
      fetchProfileImage();
    }
  
  }, [token, refreshTrigger, emp_id]);




  const startEdit = () => {
    // Organization (object)
    setDraftOrg({ ...(orgData || {}) });

    // Personal (ALWAYS array with single object)
    const personal =
      Array.isArray(personalData) && personalData.length
        ? personalData[0]
        : personalData || emptyPersonal;

    setDraftPersonal([{ ...emptyPersonal, ...personal }]);

    // Education (array)
    setDraftEducation(
      Array.isArray(educationData) && educationData.length
        ? educationData.map(e => ({ ...e }))
        : [{ ...emptyEducation }]
    );

    // Experience (array)
    setDraftExperience(
      Array.isArray(experienceData) && experienceData.length
        ? experienceData.map(e => ({ ...e }))
        : [{ ...emptyExperience }]
    );

    // Contacts (array)
    setDraftContact(
      Array.isArray(contactsData) && contactsData.length
        ? contactsData.map(c => ({ ...c }))
        : [{
          contact_type: "",
          phone: "",
          email: "",
          relation: "",
          isPrimary: false,
        }]
    );

    // Bank (object)
    setDraftBank({ ...emptyBankData, ...(bankData || {}) });

    setIsEditing(true);
  };

  useEffect(() => {
    if (activeTab === "Experience" && isEditing) {
      setDraftExperience(
        Array.isArray(experienceData) && experienceData.length
          ? experienceData.map(e => ({ ...e }))
          : [{ ...emptyExperience }]
      );
    }
  }, [activeTab, isEditing]);





  const cancelEdit = () => {
    setDraftOrg({ ...orgData });

    // MUST remain array (single object)
    setDraftPersonal([{ ...personalData }]);

    setDraftEducation(
      Array.isArray(educationData)
        ? educationData.map(e => ({ ...e }))
        : []
    );

    setDraftExperience(
      Array.isArray(experienceData)
        ? experienceData.map(e => ({ ...e }))
        : []
    );

    setDraftContact(
      Array.isArray(contactsData)
        ? contactsData.map(c => ({ ...c }))
        : []
    );

    setDraftBank({ ...bankData });

    // Reset files / previews
    setPassbookFile(null);
    setPanPreview(null);
    setPassbookPreview(null);

    setIsEditing(false);
  };



  useEffect(() => {

    console.log(draftExperience);

  }, [])




  const saveEdit = async () => {
    setSaving(true);
    try {
      // DONE
      if (activeTab === "Personal Details") {
        const personalPayload = draftPersonal?.[0];
        if (!personalPayload) return;

        try {
          //  Step 1: Check if record exists in DB
          const res = await getPersonal(emp_id);
          const dbPersonal = res?.data?.personalDetails;

          if (dbPersonal && Object.keys(dbPersonal).length > 0) {
            //  Record exists → UPDATE
            await updatePersonal(emp_id, personalPayload);
          } else {
            //  Record does not exist → ADD
            console.log(personalPayload);
            await addPersonal(emp_id, personalPayload);
          }

          setPersonalData(personalPayload);
          setIsEditing(false);

          toast.success("Personal Information Updated ")
        } catch (err) {
          // If GET returns 404 → create record
          if (err?.response?.status === 404) {
            await addPersonal(emp_id, personalPayload);
            setPersonalData(personalPayload);
            toast.error(err.response);
          } else {
            console.error("Save personal failed:", err);
            toast.error(err);
          }
        }
      }



      // DONE
      if (activeTab === "Education") {
        const saved = [];

        let existingEducation = [];
        try {
          const res = await getEducation(emp_id);
          existingEducation = res.data.education || [];

          // console.log("existingEducation", existingEducation)
        } catch (err) {
          // If 404 or any error, treat as no existing records
          // console.warn("No existing education records found, will add new ones.", err);
          existingEducation = [];
        }

        // console.log("draftEducation", draftEducation);

        for (const edu of draftEducation) {
          // console.log("edu", isEmptyRow(edu));

          if (isEmptyRow(edu)) continue; // Skip empty rows

          // Check if this edu already exists in DB by id
          // console.log("edu",edu)
          let exists;
          if (edu.id) {
            exists = existingEducation.find(e => Number(e.id) === Number(edu.id));
          }



          // console.log("exists", exists);
          if (exists) {
            // Update existing record
            await updateEducation(emp_id, edu.id, edu);
            saved.push(edu);
            toast.success("Education Updated Successfuly");
          } else {
            // Add new record
            // console.log("edu",edu)
            const addRes = await addEducations(emp_id, edu);
            // console.log("emp_id", emp_id)
            // console.log("addRes", addRes);

            saved.push({ ...edu, id: addRes.data.education.id }); // attach new id
            toast.success("Education Added Successfuly");
          }
        }

        // Update state
        setEducationData(saved);
        setDraftEducation(saved);
        setIsEditing(false);
      }


      if (activeTab === "Experience") {
        const saved = [];

        // Fetch existing experience from DB
        let existingExperience = [];
        try {
          const res = await getExperience(emp_id);
          existingExperience = res?.data?.experience || [];
        } catch {
          existingExperience = [];
        }

        for (const exp of draftExperience) {
          // DELETE
          if (exp.isDeleted) {
            if (exp.id) {
              await deleteExperience(emp_id, exp.id);
            }
            continue; // skip deleted rows
          }

          // Skip fully empty rows
          const isFullyEmpty =
            !exp.companyName &&
            !exp.designation &&
            !exp.start_date &&
            !exp.end_date &&
            !exp.total_years;

          if (isFullyEmpty) continue;

          const payload = {
            company_name: exp.companyName,
            designation: exp.designation,
            start_date: exp.start_date || null,
            end_date: exp.end_date || null,
            total_years: exp.total_years || null,
          };

          // Check if exists in DB
          const dbRecord = exp.id
            ? existingExperience.find(e => Number(e.id) === Number(exp.id))
            : null;

          // UPDATE
          if (dbRecord) {
            const res = await updateExperience(emp_id, dbRecord.id, payload);
            saved.push({
              ...exp,
              id: res?.data?.experience?.id ?? dbRecord.id,
            });
            toast.success("Experience Updated Successfully");
            // Don't clear draftExperience here
          }

          // ADD new
          else {
            const res = await addExperienceses(emp_id, payload);
            if (res?.data?.experience) {
              saved.push({
                ...exp,
                id: res.data.experience.id,
              });
            }
            toast.success("Experience Added Successfully");
          }
        }

        // Always keep at least one row for UI
        const finalData = saved.length ? saved : [{ ...emptyExperience }];

        setExperienceData(finalData);
        setDraftExperience(finalData); // ← now it remains an array
        setIsEditing(false);
      }




      if (activeTab === "Contacts") {
        const saved = [];

        // Fetch existing contacts
        let existingContacts = [];
        try {
          const res = await getContact(emp_id);
          existingContacts = res?.data?.contact || [];
        } catch {
          existingContacts = [];
        }

        for (const contact of draftContact) {
          // DELETE by unique key (emp_id + email)
          if (contact.isDeleted && contact.email) {
            await deleteContact(emp_id, contact.email); // modify deleteContact to use email
            continue;
          }

          // Skip fully empty row
          if (
            !contact.contact_type &&
            !contact.phone &&
            !contact.email &&
            !contact.relation
          ) continue;

          const payload = {
            contact_type: contact.contact_type,
            phone: contact.phone,
            email: contact.email,
            relation: contact.relation || null,
            is_primary: contact.isPrimary ?? false,
          };

          // UPSERT (backend handles add/update by emp_id + email)
          const res = await updateContact(emp_id, payload);

          saved.push({
            ...contact,
            // remove `id` completely
          });

          toast.success("Contact Updated Sucessful");
        }

        const finalData = saved.length
          ? saved
          : [{
            contact_type: "",
            phone: "",
            email: "",
            relation: "",
            isPrimary: false,
          }];

        setContactsData(finalData);
        setDraftContact(finalData);
        setIsEditing(false);
      }




      if (activeTab === "Bank") {
        console.log("emp_id:", emp_id);

        try {
          // Decide between POST and PUT

          // console.log("bankData", bankData)
          if (!bankData || Object.values(bankData).every(v => !v)) {
            // No existing bank data → POST
            await axios.post(
              `http://localhost:5000/api/employee/profile/bank/${emp_id}`,
              draftBank,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // console.log("Bank data inserted:", draftBank);
          } else {
            // Existing bank data → PUT
            await axios.put(
              `http://localhost:5000/api/employee/profile/bank/${emp_id}`,
              draftBank,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            // console.log("Bank data updated:", draftBank);
          }

          // Handle file uploads (PAN / Passbook)
          const fd = new FormData();
          if (panFile) fd.append("pan", panFile);
          if (passbookFile) fd.append("passbook", passbookFile);

          if (panFile || passbookFile) {
            await uploadBankDoc(emp_id, fd);
            console.log("Bank documents uploaded");
          }

          // Update frontend state
          setBankData(draftBank);
          setIsEditing(false);
          toast.success("Bank DetailsUpdated Sucessful");
          // alert("Bank details saved successfully");
        } catch (err) {
          console.error("Error saving bank details:", err);
          alert("Failed to save bank details");
        }
      }

    } catch (e) {
      console.error(e);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };
  const labelsBankMap = {
    account_holder_name: "Account Name",
    bank_name: "Bank Name",
    account_number: "Account Number",
    ifsc_code: "IFSC Code",
    branch_name: "Branch Name",
    upi_id: "UPI ID",
    pan_number: "PAN Number",
    account_type: "Account Type",
    is_active: "Active Account",
  };

  const labelsContactMap = {
    contact_type: "Contact Type",
    phone: "Phone",
    email: "Email",
    relation: "Relation",
    is_primary: "Primary Contact",
  };

  const hiddenFields = ["emp_id", "employee_id", "is_primary", "updated_at", "created_at", "upi_id", "is_active"];

  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profile", file); // must match multer field name

    try {
      const res = await axios.post(
        "http://localhost:5000/api/employee/profile/image",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`, // if auth required
          },
        }
      );

      // Update state immediately
      setProfileImage(res.data.profile_image);
      setRefreshTrigger(prev => prev + 1);
      toast.success("Profile Image Updated")
      // console.log("Profile uploaded:", res.data.profile_image);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      alert("Failed to upload profile image.");
    }
  };

  // const addEducation = () => setDraftEducation((prev) => [...prev, { ...emptyEducation }]);
  // const addExperience = () => setDraftExperience((prev) => [...prev, { ...emptyExperience }]);



  // console.log("passbookPreview",passbookPreview)


  // const handleSaveBank = async () => {
  //   try {
  //     // Update bank details
  //     await axios.put(
  //       `http://localhost:5000/api/employee/profile/bank/${emp_id}`,
  //       draftBank,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     // Upload documents
  //     const formData = new FormData();

  //     if (panFile) formData.append("pan", panFile);
  //     if (passbookFile) formData.append("passbook", passbookFile);

  //     console.log("panFile, passbookFile:", panFile, passbookFile);

  //     if (panFile || passbookFile) {
  //       await uploadBankDoc(emp_id, formData);
  //     }
  //   } catch (error) {
  //     console.error("Error saving bank details:", error);
  //   }
  // };
  // const addExperiences = () => {
  //   setDraftExperience(prev => [
  //     ...prev,
  //     {
  //       ...emptyExperience,
  //       tempId: crypto.randomUUID(),
  //       isDeleted: false,
  //     },
  //   ]);
  // };

  useEffect(() => {
    if (!empId) return;

    getExperience(empId).then((res) => {
      setExperienceData(res.data.experience);
      setDraftExperience(res.data.experience);
    });
  }, [empId]);

  // const handleEditExperience = () => {
  //   // Keep all experiences in draftExperience
  //   setDraftExperience([...experienceData]);
  //   setIsEditing(true); // now all inputs are editable
  // };

  // const handleSaveExperience = async () => {
  //   try {
  //     const payload = draftExperience.filter(e => !e.isDeleted);

  //     await api.put(`/experience/${empId}`, { experience: payload });

  //     await getExperience(); // refresh table

  //     setDraftExperience([{ ...emptyExperience }]);
  //     setIsEditing(false);
  //   } catch (err) {
  //     console.error(err);
  //   }
  // };
  // const handleDeleteExperience = async () => { }



  
  useEffect(() => {
    const fetchReporting = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/employees/reporting/${emp_id}`
        );

        console.log(res);

        // const newManager = [...new Set(res.data.managers.map(emp)=> emp.role)]
        setReporting(res.data.managers);
      } catch (error) {
        console.error("Failed to fetch reporting managers", error);
      }
    };

    fetchReporting();
  }, [emp_id]);

  // useEffect(()=>{

  //   console.log("reporting",reporting)
  // },[reporting])

  return (
    <div className="min-h-screen py-4 px-3 sm:py-6 sm:px-4 bg-gray-50">
    {/* HEADER */}
    <div className="sticky z-10 top-0 bg-[#222F7D] rounded-xl py-3 mb-6 shadow-lg">
      <Typography className="text-white text-xl sm:text-2xl text-center font-bold">
        {user?.role === "admin" ? "Admin Profile" : "Employee Profile"}
      </Typography>
    </div>
  
    {/* PROFILE CARD GRID */}
    <div className="mx-auto grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-6">
  
      {/* LEFT : Profile Card */}
      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
  
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32 group mx-auto">
              <label className={`relative block w-full h-full rounded-full ${!isUploadingImage ? "cursor-pointer" : ""}`}>
                <img
                  src={profileImage || defaultProfile}
                  alt="Profile"
                  className="w-full h-full rounded-full border-4 border-[#222F7D] object-cover transition-all group-hover:brightness-90 z-20"
                />
                <input type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} disabled={isUploadingImage} />
  
                {!isUploadingImage && (
                  <div className="absolute bottom-1 right-1 bg-[#222F7D] text-white w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-lg group-hover:scale-110">
                    ✎
                  </div>
                )}
              </label>
  
              {isUploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full z-30">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
  
          {/* Profile Info */}
          <div className="w-full">
            <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
            <p className="text-[#222F7D] font-medium uppercase text-xs tracking-wider mb-3">{user?.role}</p>
  
            {/* Contact Details Row: Wraps on mobile */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3 sm:gap-6 text-gray-600 text-sm">
              <span className="flex items-center justify-center md:justify-start gap-2">
                <IoHomeSharp className="text-[#222F7D]" /> 
                <span className="truncate max-w-[250px]">{orgAddress.address}</span>
              </span>
              <span className="flex items-center justify-center md:justify-start gap-2">
                <MdOutlineEmail className="text-[#222F7D] text-lg" /> 
                <span className="break-all">{user?.email}</span>
              </span>
            </div>
          </div>
        </div>
        <Divider className="my-6" />
      </div>
  
      {/* RIGHT : Reporting Card (Moves below on mobile) */}
      <div className="bg-white rounded-xl shadow p-4 h-fit">
        {/* <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 px-1"></h3> */}
        <ReportingCard reportingManagers={reporting} />
      </div>
    </div>
  
    {/* FORM CONTENT */}
    <div className="mx-auto mt-6 space-y-4">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
         <MainProfile />
      </div>
      
      {/* Save / Cancel : Sticky Mobile Bar optional, but here positioned for ease of use */}
      {isEditing && (
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <button onClick={cancelEdit} className="border border-gray-300 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 order-2 sm:order-1">
            Cancel
          </button>
          <button onClick={saveEdit} className="bg-[#222F7D] text-white px-8 py-2.5 rounded-lg font-medium shadow-md hover:bg-[#1a2563] active:scale-95 transition-all order-1 sm:order-2">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  </div>
  );
};

export default Profile;

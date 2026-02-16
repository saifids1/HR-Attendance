import api from "./axiosInstance"; // Import the custom instance we created



// -------- ORGANIZATION --------
export const getOrganization = () => api.get("/employee/profile/organization");

export const updateOrganization = (data) => 
  api.put("/employee/profile/organization", data);

// -------- PERSONAL --------
export const getPersonal = (emp_id) => 
  api.get(`/employee/profile/personal/${emp_id}`);

export const addPersonal = (emp_id, data) => 
  api.post(`/employee/profile/personal/${emp_id}`, data);


//  /api/employee/profile/personal/:emp_id
// VITE_API_URL = http://localhost:5000/api/
export const updatePersonal = (emp_id, data) =>{
  console.log("data",data);
  return api.put(`/employee/profile/personal/${emp_id}`, data);
}

// -------- EDUCATION --------
export const getEducation = (emp_id) => 
  api.get(`/employee/profile/education/${emp_id}`);

export const addEducations = (emp_id, formData) =>
  api.post(`/employee/profile/education/${emp_id}`, formData,{headers: { "Content-Type": "multipart/form-data" },});

export const updateEducation = (emp_id, id, formData) =>
  api.put(`/employee/profile/education/${emp_id}/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteEducation = (emp_id, id) =>{
  console.log("emp_id",emp_id)
  return api.delete(`/employee/profile/education/${emp_id}/${id}`);
}

// -------- EXPERIENCE --------
export const getExperience = (emp_id) => 
  api.get(`/employee/profile/experience/${emp_id}`);

export const addExperienceses = (emp_id, data) =>
  api.post(`/employee/profile/experience/${emp_id}`, data);

export const updateExperience = (emp_id, id, data) =>
  api.put(`/employee/profile/experience/${emp_id}/${id}`, data);

export const deleteExperience = (emp_id, id) =>
  api.delete(`/employee/profile/experience/${emp_id}/${id}`);

// -------- CONTACT --------
export const getContact = (emp_id) => 
  api.get(`/employee/profile/contact/${emp_id}`);

export const updateContact = (emp_id, data) =>{
  console.log(typeof data);
  return api.put(`/employee/profile/contact/${emp_id}`, data);
}
  
export const addContact = (emp_id,data)=>{

  return api.post(`/employee/profile/contact/${emp_id}`,data);
}

// Add this to your api service file
export const deleteContact = (emp_id, contact_id) =>
  api.delete(`/employee/profile/contact/${emp_id}/${contact_id}`);

// -------- BANK --------
export const getBank = (emp_id) => 
  api.get(`/employee/profile/bank/${emp_id}`);

export const addBank = (emp_id, data) => {
  console.log("data add ",data);
  return  api.post(`/employee/profile/bank/${emp_id}`, data);
}
 

export const updateBank = (emp_id, data) => {

  console.log("Data update",data);
return api.put(`/employee/profile/bank/${emp_id}`, data);
}


// Special case: File Upload (multipart/form-data)
export const uploadBankDoc = (emp_id, formData) =>
   api.post(`/employee/profile/bank/doc/${emp_id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });


export const getBankDocs = (emp_id)=>
  api.get(`/employee/profile/bank/doc/${emp_id}`)
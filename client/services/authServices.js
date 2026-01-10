import axiosInstance from "../api/axiosInstance";


export const addEmploy = async (data) => {
  const response = await axiosInstance.post("/admin/attendance/add-employee", data);
  return response.data;
};


export const loginUser = async (data) => {
  const response = await axiosInstance.post("/auth/login", data);

  // Save token
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user",JSON.stringify(response.data.user));
  }

  return response.data;
};

export const changePassword = async (data) => {
  const response = await axiosInstance.post("/auth/change-password", data);

  // Save token
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user",JSON.stringify(response.data.user));
  }

  return response.data;
};


export const logoutUser = () => {
  localStorage.removeItem("token");
};

import axios from "axios";
import { toast } from "react-hot-toast";

let isRedirecting = false; // prevent multiple redirects

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired / invalid token globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isRedirecting &&
      window.location.pathname !== "/login"
    ) {
      isRedirecting = true;

      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Optional: notify app state listeners
      window.dispatchEvent(new Event("storage"));

      // User feedback
      toast.error("Session expired. Please login again.");

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }

    return Promise.reject(error);
  }
);

export default api;

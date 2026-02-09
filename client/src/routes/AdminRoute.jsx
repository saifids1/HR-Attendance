import { jwtDecode } from "jwt-decode";
import { Navigate, Outlet } from "react-router-dom";

const AdminRoute = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // 1. Check if token is expired
    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      return <Navigate to="/login" replace />;
    }

    // 2. Normalize and check role
    const role = decoded?.role?.toLowerCase()?.trim();
    if (role !== "admin") {
      // Redirect non-admins to their specific dashboard
      return <Navigate to="/employee/profile" replace />;
    }

    return <Outlet />;
  } catch (err) {
    console.error("Token decoding failed:", err);
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;
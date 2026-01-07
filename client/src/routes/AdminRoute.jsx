import { jwtDecode } from "jwt-decode";
import { Navigate, Outlet } from "react-router-dom";

const AdminRoute = () => {
  const token = localStorage.getItem("token");

  //  No token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let decoded;

  try {
    decoded = jwtDecode(token);
  } catch (err) {
    return <Navigate to="/login" replace />;
  }

  // normalize role
  const role = decoded?.role?.toLowerCase()?.trim();

  //  Not admin
  if (role !== "admin") {
    return <Navigate to="/employee" replace />;
  }

  //Allow admin routes
  return <Outlet />;
};

export default AdminRoute;

import React, { useState } from "react";
import { NavLink,useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authServices";
import {toast} from "react-hot-toast";
const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const resp = await loginUser(formData);
  
      // 🔐 Save auth
      localStorage.setItem("token", resp.token);
      localStorage.setItem("user", JSON.stringify(resp.user));
  
      // 🔥 VERY IMPORTANT — notify context
      window.dispatchEvent(new Event("storage"));
  
      toast.success("Login Successfully");
  
      if (resp.user.role === "employee") {
        navigate("/employee");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Login failed");
    }
  };
  

  return (
    <section className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Sign in to your account
        </h1>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Your email
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-50"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-50"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 transition"
          >
            Sign in
          </button>

          {/* Footer */}
          {/* <p className="text-sm text-center text-gray-500">
            Don’t have an account yet?{" "}
            <NavLink to="/register" className="text-blue-600 hover:underline">
              Sign up
            </NavLink>
          </p> */}
        </form>
      </div>
    </section>
  );
};

export default Login;

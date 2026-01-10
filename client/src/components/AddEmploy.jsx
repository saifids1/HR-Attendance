import React, { useState } from "react";
import { addEmploy } from "../../services/authServices";
import {toast} from "react-hot-toast"
const AddEmploy = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    emp_id: "",
    role: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEmp = async (e) => {
    e.preventDefault();

    // basic validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.emp_id ||
      !formData.role
    ) {
    //   alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);
      const resp = await addEmploy(formData);
      console.log("Employee created:", resp.status);

      toast.success("New Employee Created!!")

      // reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        emp_id: "",
        role: "",
      });
    } catch (error) {
      console.error(error);
    //   alert("Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Create Employee
          </h2>
         
        </div>

        {/* Form */}
        <form onSubmit={handleAddEmp} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@company.com"
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full rounded-lg border px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            {/* Employee ID */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                name="emp_id"
                value={formData.emp_id}
                onChange={handleChange}
                placeholder="EMP1023"
                className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 flex justify-end gap-3">
           

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmploy;

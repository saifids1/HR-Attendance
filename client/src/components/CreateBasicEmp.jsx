import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { addEmploy } from "../../services/authServices";

const CreateEmployeeBasic = ({ onCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    emp_id: "",
    department: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.emp_id ||
      !formData.department
    ) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const res = await addEmploy(formData);

      toast.success("Employee Created Successfully");

      // send emp_id back to parent
      onCreated(res.data.emp_id);

    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-[#222F7D] mb-6">
        Create Basic Employee
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#222F7D]"
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#222F7D]"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#222F7D]"
        />

        <input
          type="text"
          name="emp_id"
          placeholder="Employee ID"
          value={formData.emp_id}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#222F7D]"
        />

        <input
          type="text"
          name="department"
          placeholder="Department"
          value={formData.department}
          onChange={handleChange}
          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#222F7D]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#222F7D] text-white py-2 rounded-lg hover:bg-blue-900 transition"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>
      </form>
    </div>
  );
};

export default CreateEmployeeBasic;
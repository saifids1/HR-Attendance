import React,{useState} from 'react'
import { NavLink,useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/authServices'

const Register = () => {

  const navigate = useNavigate();
  
  const [formData,setFormData] = useState({
    name:"",
    email:"",
    password:"",
    role:"employee"
  })

  const handleChange = (e)=>{

    setFormData({...formData,[e.target.name]:e.target.value});
  }

  const handleSubmit = async(e)=>{
    e.preventDefault();

    try {

      const resp = await registerUser(formData)
      alert(resp.message);
      navigate("/")

    } catch (error) {
      console.log(error);
    }
  }
  return (
    <section className="bg-gray-50 :bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md bg-white :bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8">
        
        <h1 className="text-2xl font-bold text-gray-900 :text-white mb-6 text-center">
          Sign up to your account
        </h1>

        <form className="space-y-5">

            {/* Full Name */}
            <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 :text-gray-300">
              Your Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter Name"
              className="w-full p-2.5 rounded-lg border border-gray-300 
              bg-gray-50 text-gray-900
              focus:ring-2 focus:ring-blue-500 focus:outline-none
              :bg-gray-700 :border-gray-600 :text-white"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          {/* Email */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 :text-gray-300">
              Your email
            </label>
            <input
              type="text"
              name="email"
              placeholder="name@company.com"
              className="w-full p-2.5 rounded-lg border border-gray-300 
              bg-gray-50 text-gray-900
              focus:ring-2 focus:ring-blue-500 focus:outline-none
              :bg-gray-700 :border-gray-600 :text-white"
              required
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 :text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="w-full p-2.5 rounded-lg border border-gray-300 
              bg-gray-50 text-gray-900
              focus:ring-2 focus:ring-blue-500 focus:outline-none
              :bg-gray-700 :border-gray-600 :text-white"
              required
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 
            text-white font-medium rounded-lg py-2.5 transition"

            onClick={handleSubmit}
          >
            Sign Up
          </button>

          {/* Footer */}
          <p className="text-sm text-center text-gray-500 :text-gray-400">
            Don’t have an account yet?{" "}
            <NavLink to="/" className="text-blue-600 hover:underline :text-blue-400">
              Sign in
            </NavLink>
          </p>
        </form>
      </div>
    </section>
  )
}

export default Register
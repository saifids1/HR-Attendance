import React, { useContext } from 'react'
import { EmployContext } from '../context/EmployContextProvider';

const Employelist = () => {
 const { adminAttendance, loading } = useContext(EmployContext);

 console.log(adminAttendance);
    const empHeader = [
        "Empid","Emp.Name","Email","Status"
    ]
    const employeesdata = [
        {
          id: "EMP001",
          name: "Amit Verma",
          email: "amit.verma@company.com",
          role: "Frontend Developer",
          department: "Engineering",
          status: "Active",
        },
        {
          id: "EMP002",
          name: "Neha Sharma",
          email: "neha.sharma@company.com",
          role: "HR Executive",
          department: "HR",
          status: "Active",
        },
        {
          id: "EMP003",
          name: "Rahul Mehta",
          email: "rahul.mehta@company.com",
          role: "Backend Developer",
          department: "Engineering",
          status: "On Leave",
        },
        {
          id: "EMP004",
          name: "Priya Singh",
          email: "priya.singh@company.com",
          role: "UI/UX Designer",
          department: "Design",
          status: "Active",
        },
        {
          id: "EMP005",
          name: "Ankit Patel",
          email: "ankit.patel@company.com",
          role: "QA Engineer",
          department: "Testing",
          status: "Inactive",
        },
        {
          id: "EMP006",
          name: "Sneha Iyer",
          email: "sneha.iyer@company.com",
          role: "Product Manager",
          department: "Product",
          status: "Active",
        },
        {
          id: "EMP007",
          name: "Karan Malhotra",
          email: "karan.malhotra@company.com",
          role: "DevOps Engineer",
          department: "Infrastructure",
          status: "Active",
        },
        {
          id: "EMP008",
          name: "Pooja Nair",
          email: "pooja.nair@company.com",
          role: "Business Analyst",
          department: "Business",
          status: "Active",
        },
        {
          id: "EMP009",
          name: "Rohit Kumar",
          email: "rohit.kumar@company.com",
          role: "Support Engineer",
          department: "Support",
          status: "On Leave",
        },
        {
          id: "EMP010",
          name: "Simran Kaur",
          email: "simran.kaur@company.com",
          role: "Recruiter",
          department: "HR",
          status: "Active",
        },
      ];
      
  return (
    <div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
  <h2 className="text-xl font-semibold text-[#222F7D] mb-4">
    Employee List
  </h2>

  <div className="overflow-x-auto">
  <table className="min-w-max w-full border-collapse text-sm">

<thead className="bg-gray-100">
  <tr>
    {empHeader.map((data, index) => (
      <th
        key={index}
        className="border px-4 py-3 font-semibold whitespace-nowrap"
      >
        <div className="flex items-center gap-1">
          {data}

          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 320 512"
            className="ms-1"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6 9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41zm255-105L177 64c-9.4-9.4-24.6-9.4-33.9 0L24 183c-15.1 15.1-4.4 41 17 41h238c21.4 0 32.1-25.9 17-41z"></path>
          </svg>
        </div>
      </th>
    ))}
  </tr>

</thead>



<tbody>
{adminAttendance.map((row, i) => (
<tr
key={row.id}
className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`}
>

<td className="border px-4 py-5 whitespace-nowrap text-gray-600 text-[16px]">
  {row.emp_id}
</td>
<td className="border px-4 py-5 whitespace-nowrap text-gray-600 text-[16px]">
  {row.name}
</td>

<td className="border px-4 py-5 whitespace-nowrap text-gray-600 text-[16px]">
  {row.email}
</td>


<td className="border px-4 py-5 whitespace-nowrap text-gray-600 text-[16px]">
  <span
    className={`px-3 py-1 rounded text-sm font-medium
      ${
        row.is_active
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
  >
    {row.is_active ? "Active" : "Inactive"}
  </span>
</td>

</tr>
))}
</tbody>



</table>
  </div>
</div>

    </div>
  )
}

export default Employelist;
import React, { useContext, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { EmployContext } from "../context/EmployContextProvider";
import "../components/Charts";

const AttendanceBarChart = () => {
  const { adminAttendance = [], loading } = useContext(EmployContext);

  // 🔹 Derive counts from adminAttendance
  const stats = useMemo(() => {
    const total = adminAttendance.length;

    const present = adminAttendance.filter(
      i => i.status === "Present" || i.status === "Working"
    ).length;

    const absent = adminAttendance.filter(
      i => i.status === "Absent"
    ).length;

    return [
      { title: "Total Employee", total, bgColor: "#4331cc" },
      { title: "Present", total: present, bgColor: "#27F598" },
      { title: "Absent", total: absent, bgColor: "#ff4d4f" },
    ];
  }, [adminAttendance]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-500">
        Loading chart...
      </div>
    );
  }

  if (!adminAttendance.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-500">
        No attendance data
      </div>
    );
  }

  const chartData = {
    labels: stats.map(i => i.title),
    datasets: [
      {
        label: "Employees",
        data: stats.map(i => i.total),
        backgroundColor: stats.map(i => i.bgColor),
        borderRadius: 8,
        barThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => ` ${ctx.raw} Employees`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0,
        },
      },
    },
  };

  return (
    <div className="w-full h-[260px]">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default AttendanceBarChart;

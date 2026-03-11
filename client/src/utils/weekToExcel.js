import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportWeekToExcel = (data, fileName = "Weekly_Attendance") => {

  console.log("data",data);

  if (!data.data || !data.data.length) {
    alert("No attendance data found");
    return;
  }

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-GB").replace(/\//g, "-");
  };

  const getDay = (date) => {
    return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  };

  const convertHours = (decimalHours) => {
    if (!decimalHours) return "0:00";
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours % 1) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Flatten all employees + attendance
 const excelData = data.data.flatMap((empRow) => {
  return empRow.attendance.map((att, index) => ({
    "Sr No": index + 1,
    "Day": getDay(att.date),
    "Emp ID": empRow.emp_id || "--",
    "Employee Name": empRow.name || "--",
    "Date": formatDate(att.date),
    "Status": att.status || "--",
    "Punch In": att.first_in ? att.first_in.replace("AM", "am").replace("PM", "pm") : "--",
    "Punch Out": att.last_out ? att.last_out.replace("AM", "am").replace("PM", "pm") : "--",
    "Total Hours": att.total_hours ? convertHours(Number(att.total_hours)) : "--",
    "Shift Hours": att.shift_hours || "9.3" // optional dynamic
  }));
});

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly Attendance");

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 15 },
    { wch: 25 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 }
  ];

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(blob, `Weekly Report.xlsx`);
};
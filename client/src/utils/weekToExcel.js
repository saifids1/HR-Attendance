import * as XLSX from 'xlsx';
import { saveAs } from "file-saver";

export const exportWeekToExcel = (data, fileName = "Weekly_Attendance") => {
  // 1. Check if data exists and contains the attendance array
  console.log("Exporting Data:", data);
  
  const attendance = data?.attendance || [];
  const employee = data?.employee || {};

  if (!attendance.length) {
    console.error("No attendance data found in the response object.");
    alert("No data available to export."); // Helpful for the user
    return;
  }

  // 2. Map the data to a flat structure for Excel
  const excelData = attendance.map((row, index) => ({
    "Sr No": index + 1,
    "Emp ID": employee.emp_id || "--",
    "Employee Name": employee.name || "--",
    "Date": row.date || "--",
    "First In": row.first_in || "Absent", // Handles null from backend
    "Last Out": row.last_out || "Absent", // Handles null from backend
    "Total Hours": row.total_hours || "0.00",
  }));

  // 3. Create Workbook and Sheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

  // 4. Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 15 }, // Emp ID
    { wch: 25 }, // Employee Name
    { wch: 15 }, // Date
    { wch: 12 }, // First In
    { wch: 12 }, // Last Out
    { wch: 12 }  // Total Hours
  ];

  // 5. Generate Buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  // 6. FIX: Use 'data' instead of 'response' for the filename
  const dateRange = data.date_range 
    ? `${data.date_range.from}_to_${data.date_range.to}` 
    : new Date().toISOString().split('T')[0];

  saveAs(blob, `${fileName}_${employee.name || 'User'}_${dateRange}.xlsx`);
};
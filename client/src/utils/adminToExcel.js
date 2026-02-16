import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Helper for total hours formatting (Handles PG Interval)
const formatHours = (val) => {
    if (!val || val === "0h 0m") return "00:00";
  
    if (typeof val === "string" && val.includes('h')) {
      const parts = val.match(/\d+/g); 
      if (parts) {
        const h = parts[0].padStart(2, "0");
        const m = (parts[1] || "0").padStart(2, "0");
        return `${h}:${m}`;
      }
    }
  
    if (typeof val === "object") {
      const h = String(val.hours || 0).padStart(2, "0");
      const m = String(val.minutes || 0).padStart(2, "0");
      return `${h}:${m}`;
    }
  
    return val;
};

// New internal helper for DD-MM-YYYY
const formatToDDMMYYYY = (dateVal) => {
    if (!dateVal) return "--";
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return "--";

    // Use Intl to extract parts for Asia/Kolkata
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const parts = formatter.formatToParts(date);
    const d = parts.find(p => p.type === 'day').value;
    const m = parts.find(p => p.type === 'month').value;
    const y = parts.find(p => p.type === 'year').value;
    
    return `${d}-${m}-${y}`;
};

export const exportAdminAttendanceToExcel = (data, fileName = "Active_Employee_Attendance") => {
  if (!data || !data.length) {
    console.warn("No data available to export");
    return;
  }

  const excelData = data.map((row, index) => {
    const dateObj = row.attendance_date ? new Date(row.attendance_date) : new Date();
    
    return {
      "Sr No": index + 1,
      "Employee Name": row.employee_name || "N/A",
      "Emp ID": row.emp_id || "--",
      // FIXED DATE FORMAT HERE
      "Date": formatToDDMMYYYY(row.attendance_date), 
      "Day": dateObj.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
      "Punch In": row.punch_in ? row.punch_in : "--",
      "Punch Out": row.punch_out ? row.punch_out : "--",
      "Total Hours": formatHours(row.total_hours_str),
      "Status": row.status || "Absent",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  worksheet["!cols"] = [
    { wch: 8 },  
    { wch: 25 }, 
    { wch: 12 }, 
    { wch: 15 }, 
    { wch: 10 }, 
    { wch: 15 }, 
    { wch: 15 }, 
    { wch: 15 }, 
    { wch: 12 }, 
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  
  const dateString = new Date().toISOString().split('T')[0];
  saveAs(dataBlob, `${fileName}_${dateString}.xlsx`);
};
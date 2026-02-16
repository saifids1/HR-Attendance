import * as XLSX from 'xlsx';
import { saveAs } from "file-saver";

/**
 * Utility to convert JSON data to Excel and trigger download
 */
export const exportActivityToExcel = (data, fileName = "Activity_Log") => {
  if (!data || !data.length) {
    console.error("No data available to export");
    return;
  }

  const excelData = data.map((row, index) => {
    const dateObj = row.punch_time ? new Date(row.punch_time) : null;

    // Formatting Date to DD-MM-YYYY
    let punchDate = "--";
    if (dateObj) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      punchDate = `${day}-${month}-${year}`; 
    }

    const punchTime = dateObj 
      ? dateObj.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) 
      : "--";

    return {
      "Sr No": index + 1,
      "Emp ID": row.emp_id || "--",
      "Punch Date": punchDate,
      "Punch Time": punchTime,
      "Device IP": row.device_ip || "--",
      "Device SN": row.device_sn || "--",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Raw Activity Logs");

  // Generate buffer and blob
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  const timestamp = new Date().toISOString().split('T')[0];
  saveAs(blob, `${fileName}_${timestamp}.xlsx`);
};
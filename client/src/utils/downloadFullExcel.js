import { exportActivityToExcel } from "./activityToExcel";
import api from "../../api/axiosInstance";

export const downloadFullExcel = async (filters) => {
  // 1. Basic Validation

  console.log("filters",filters);
 


  if (!filters?.actStart || !filters?.actEnd) {
    alert("Please select a valid date range before exporting.");
    return;
  }

  try {
    
    const response = await api.get('admin/attendance/activity-log/exports', {
      params: {
        from: filters.actStart,
        to: filters.actEnd,
        emp_id: filters.allEmpId, // Pass ID if filtering by specific employee
      }
    });
    
    // 3. Check for data and trigger utility
    if (response.data.success && response.data.data.length > 0) {
      exportActivityToExcel(response.data.data, `Activity_Log_${filters.startDate}_to_${filters.endDate}`);
    } else {
      alert("No logs found for the selected criteria.");
    }
  } catch (error) {
    console.error("Export Error:", error);
    alert("Failed to download Excel. Please check your connection.");
  }
};
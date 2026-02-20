import * as XLSX from "xlsx";

export const exportMonthlyMatrixAttendance = (rawData, targetMonth) => {
    try {
        // 1. STACK FIX: Deep clone data to strip React Proxies
        const data = JSON.parse(JSON.stringify(rawData));

        // 2. Identify all unique dates first to ensure consistent columns
        const allDates = [...new Set(data.flatMap(emp => 
            (emp.attendance || [])
                .map(day => day.date)
                .filter(date => date.startsWith(targetMonth))
        ))].sort();

        // 3. Transform data into Matrix Rows
        const matrixRows = data.map(emp => {
            // Start with fixed columns
            const row = {
                "Emp ID": emp.emp_id,
                "Name": emp.name,
                "Department": emp.department || "General"
            };

            let pCount = 0;
            const attMap = {};
            (emp.attendance || []).forEach(d => { attMap[d.date] = d; });

            // Ensure every date column exists for every row, even if empty
            allDates.forEach(date => {
                const dayRecord = attMap[date];
                if (dayRecord) {
                    const char = dayRecord.status === "Present" ? "P" : 
                                 (dayRecord.status === "Absent" ? "A" : "W");
                    row[date] = char;
                    if (char === "P" || char === "W") pCount++;
                } else {
                    row[date] = "-"; // Placeholder for missing data
                }
            });

            row["Total Present"] = pCount;
            return row;
        });

        // 4. Create Workbook
        const worksheet = XLSX.utils.json_to_sheet(matrixRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        // 5. Download
        XLSX.writeFile(workbook, `Attendance_Report_${targetMonth}.xlsx`);

    } catch (err) {
        console.error("Critical Export Error:", err);
        alert("Export failed. Check console for details.");
    }
};
import * as XLSX from "xlsx";

export const exportMonthlyMatrixAttendance = (rawData, targetMonth) => {

    // console.log("rawData", rawData);
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
            const today = new Date(); // current date

            allDates.forEach(date => {
                const formattedDate = new Date(date)
                    .toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
                    .replace(/\//g, "-");

                const dayRecord = attMap[date];

                console.log("dayRecord",dayRecord)
                const recordDate = new Date(date);

               if (recordDate > today) {
    // Future date
    row[formattedDate] = "--";

} else if (dayRecord) {

    if (dayRecord.status === "Present") {

        const formatTime = (isoDate) =>
            isoDate
                ? new Date(isoDate).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                      timeZone: "Asia/Kolkata",
                  })
                : "--";

        const punchIn = formatTime(dayRecord.first_in);
        const punchOut = formatTime(dayRecord.last_out);

        const totalHours = dayRecord.hours_worked
            ? `${Math.floor(dayRecord.hours_worked)}:${Math.round(
                  (dayRecord.hours_worked % 1) * 60
              )
                  .toString()
                  .padStart(2, "0")}`
            : "--";

        row[formattedDate] = `P\n (${punchIn} - ${punchOut} - ${totalHours})`;

    } else if (dayRecord.status === "Absent") {

        // Check Sunday 
        if (recordDate.getDay() === 0) {
            row[formattedDate] = "Week Off";
        } else {
            row[formattedDate] = "A";
        }

    } else {
        row[formattedDate] = "H";
    }
} else {
                    // No record, but date is past or today
                    row[formattedDate] = "-";
                }
            });

            // row["Total Present"] = pCount;
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
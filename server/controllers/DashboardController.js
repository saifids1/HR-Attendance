const db = require("../models");
const { sequelize } = require("../db/SequelizeDB");
const { Op, fn, col, literal, where: seqWhere } = require("sequelize");

const {
  successResponse,
  handleDbError,
} = require("../utils/response");

const {
  Organizations,
  DepartmentMaster,
  AttendanceLog,
  DailyAttendance,
  AttendanceStatus,
  Personal,
} = db;

const getActiveEmployeeCount = async (req, res) => {
  try {
    const active_employee_count = await Organizations.count({
      where: { or_is_active: true },
    });

    return successResponse(
      res,
      200,
      "Active employee count fetched successfully",
      { active_employee_count }
    );
  } catch (error) {
    console.error("Active employee count error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch active employee count"
    );
  }
};

const getActive_Present_EmployeeCount = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const rows = await AttendanceLog.findAll({
      attributes: ["emp_id"],
      where: {
        created_at: { [Op.gte]: start, [Op.lt]: end },
        emp_id: { [Op.ne]: null },
      },
      include: [
        {
          model: Organizations,
          as: "organization",
          required: true,
          attributes: [],
          where: { or_is_active: true },
        },
      ],
      group: ["AttendanceLog.emp_id"],
      raw: true,
    });

    const today_present_count = rows.length;

    return successResponse(
      res,
      200,
      "Active present employee count fetched successfully",
      { today_present_count }
    );
  } catch (error) {
    console.error("Active present employee count error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch active present employee count"
    );
  }
};

const getActive_Absent_EmployeeCount = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const activeOrgs = await Organizations.findAll({
      attributes: ["or_emp_id"],
      where: {
        or_is_active: true,
        or_emp_id: { [Op.ne]: null },
      },
      raw: true,
    });

    const empIds = activeOrgs
      .map((o) => o.or_emp_id)
      .filter((id) => id && String(id).trim() !== "");

    if (empIds.length === 0) {
      return successResponse(
        res,
        200,
        "Active absent employee count fetched successfully",
        { today_absent_count: 0 }
      );
    }

    const presentRows = await AttendanceLog.findAll({
      attributes: ["emp_id"],
      where: {
        emp_id: { [Op.in]: empIds },
        created_at: { [Op.gte]: start, [Op.lt]: end },
      },
      group: ["emp_id"],
      raw: true,
    });

    const presentSet = new Set(
      presentRows.map((r) => r.emp_id).filter(Boolean)
    );

    const today_absent_count = empIds.filter(
      (id) => !presentSet.has(id)
    ).length;

    return successResponse(
      res,
      200,
      "Active absent employee count fetched successfully",
      { today_absent_count }
    );
  } catch (error) {
    console.error("Active absent employee count error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch active absent employee count"
    );
  }
};

const getActive_Employee_Department_Count = async (req, res) => {
  try {
    const departments = await DepartmentMaster.findAll({
      where: { IsActive: true },
      attributes: ["DepartmentId", "DepartmentName"],
      include: [
        {
          model: Organizations,
          as: "employees",
          required: false,
          attributes: ["or_id"],
          where: { or_is_active: true },
        },
      ],
    });

    const counts = departments.map((d) => {
      const plain = d.toJSON();
      return {
        department_name: plain.DepartmentName,
        number_of_users: (plain.employees || []).length,
      };
    });

    const total = counts.reduce(
      (sum, c) => sum + c.number_of_users,
      0
    );

    const result = counts
      .map((c) => ({
        department_name: c.department_name,
        number_of_users: c.number_of_users,
        percent:
          total > 0
            ? Number(
                ((c.number_of_users * 100) / total).toFixed(2)
              )
            : 0,
      }))
      .sort((a, b) => b.number_of_users - a.number_of_users);

    return successResponse(
      res,
      200,
      "Active Department employee count fetched successfully",
      result
    );
  } catch (error) {
    console.error("Active Department employee count error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch active Department employee count"
    );
  }
};

const getWeeklyEmployeesData = async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!emp_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const formatDateOnly = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startStr = formatDateOnly(weekStart);
    const endStr = formatDateOnly(weekEnd);

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: {
          [Op.between]: [startStr, endStr],
        },
      },
      attributes: [
        "attendance_date",
        "punch_in",
        "punch_out",
        "total_hours",
        "expected_hours",
        "late_arrival",
        "is_late_arrived",
        "early_go",
        "is_early_gone",
        "status_id",
      ],
      raw: true,
    });

    const recordMap = {};
    records.forEach((r) => {
      let key;

      if (typeof r.attendance_date === "string") {
        key = r.attendance_date.substring(0, 10);
      } else {
        key = formatDateOnly(r.attendance_date);
      }

      recordMap[key] = r;
    });

    const result = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);

      const dateStr = formatDateOnly(d);

      const dayName = d.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const dow = d.getDay();

      const rec = recordMap[dateStr] || null;

      result.push({
        attendance_date: dateStr,
        day_name: dayName,
        punch_in: rec?.punch_in || null,
        punch_out: rec?.punch_out || null,
        total_hours: rec?.total_hours || null,
        expected_hours: rec?.expected_hours || null,
        late_arrival: rec?.late_arrival || null,
        is_late_arrived: rec?.is_late_arrived || null,
        early_go: rec?.early_go || null,
        is_early_gone: rec?.is_early_gone || null,
        status_id: rec?.status_id || null,
        attendance_status: rec ? "Present" : "No Data",
        target_hours:
          dow === 0 || dow === 6
            ? "00:00:00"
            : "09:18:00",
      });
    }

    return successResponse(
      res,
      200,
      "Weekly employee data fetched successfully",
      result
    );
  } catch (error) {
    console.error("Weekly employee data error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch weekly employee data"
    );
  }
};

const getEmployeeWeeklyPieChartData = async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!emp_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const formatDateOnly = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const today = new Date();

    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    const dow = todayDate.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;

    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      d.setHours(0, 0, 0, 0);
      if (d <= todayDate) {
        weekDates.push(formatDateOnly(d));
      }
    }

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: {
          [Op.in]: weekDates,
        },
      },
      include: [
        {
          model: AttendanceStatus,
          as: "status",
          attributes: ["status_name"],
          required: false,
        },
      ],
      raw: false,
    });

    const recordMap = {};
    records.forEach((r) => {
      const plain = r.toJSON();

      let key;

      if (typeof plain.attendance_date === "string") {
        key = plain.attendance_date.substring(0, 10);
      } else {
        key = formatDateOnly(plain.attendance_date);
      }

      recordMap[key] = plain;
    });

    let present_days = 0;
    let absent_days = 0;

    weekDates.forEach((dateStr) => {
      const rec = recordMap[dateStr];

      const statusName = rec?.status?.status_name;

      if (
        statusName === "Present" ||
        statusName === "Working"
      ) {
        present_days++;
      } else if (statusName === "Absent") {
        absent_days++;
      }
    });

    const total_days = weekDates.length;
    const other_days =
      total_days - present_days - absent_days;

    const pct = (value) => {
      if (total_days === 0) {
        return "0.00";
      }

      return ((value / total_days) * 100).toFixed(2);
    };

    const responseData = {
      total_days,
      present_days,
      absent_days,
      other_days,
      pie_chart_data: [
        {
          label: "Present",
          value: present_days,
          percentage: pct(present_days),
        },
        {
          label: "Absent",
          value: absent_days,
          percentage: pct(absent_days),
        },
        {
          label: "Other",
          value: other_days,
          percentage: pct(other_days),
        },
      ],
    };

    return successResponse(
      res,
      200,
      "Employee weekly pie chart data fetched successfully",
      responseData
    );
  } catch (error) {
    console.error(
      "Employee weekly pie chart data error:",
      error
    );

    return handleDbError(
      res,
      error,
      "Failed to fetch employee weekly pie chart data"
    );
  }
};

const getMonthlyEmployeesData = async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!emp_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }
    const formatDateOnly = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const today = new Date();

    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );

    monthEnd.setHours(0, 0, 0, 0);

    const startStr = formatDateOnly(monthStart);
    const endStr = formatDateOnly(monthEnd);

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: {
          [Op.between]: [startStr, endStr],
        },
      },
      attributes: [
        "attendance_date",
        "punch_in",
        "punch_out",
        "total_hours",
        "expected_hours",
        "late_arrival",
        "is_late_arrived",
        "early_go",
        "is_early_gone",
        "status_id",
      ],
      raw: true,
    });

    const recordMap = {};
    records.forEach((r) => {
      let key;

      if (typeof r.attendance_date === "string") {
        key = r.attendance_date.substring(0, 10);
      } else {
        key = formatDateOnly(r.attendance_date);
      }

      recordMap[key] = r;
    });

    const statusLabels = {
      1: "Present",
      2: "Absent",
      3: "Working",
      4: "Half Day",
      5: "Holiday",
      6: "Leave",
      7: "Weekly Off",
    };

    const result = [];
    const cursor = new Date(monthStart);

    while (cursor <= monthEnd) {
      const dateStr = formatDateOnly(cursor);
      const dayName = cursor.toLocaleDateString("en-US", {
        weekday: "short",
      });
      const dow = cursor.getDay();
      const rec = recordMap[dateStr] || null;

      let attendance_status = "Absent";
      if (rec && rec.status_id) {
        attendance_status =
          statusLabels[rec.status_id] || "Absent";
      }

      result.push({
        attendance_date: dateStr,
        day_name: dayName,
        punch_in: rec?.punch_in || null,
        punch_out: rec?.punch_out || null,
        total_hours: rec?.total_hours || null,
        expected_hours: rec?.expected_hours || null,
        late_arrival: rec?.late_arrival || null,
        is_late_arrived: rec?.is_late_arrived || null,
        early_go: rec?.early_go || null,
        is_early_gone: rec?.is_early_gone || null,
        status_id: rec?.status_id || null,
        attendance_status,
        target_hours:
          dow === 0 || dow === 6
            ? "00:00:00"
            : "09:18:00",
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return successResponse(
      res,
      200,
      "Monthly employee data fetched successfully",
      result
    );
  } catch (error) {
    console.error("Monthly employee data error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch monthly employee data"
    );
  }
};

const getYearlyEmployeesData = async (req, res) => {
  try {
    const { emp_id } = req.params;

    if (!emp_id) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }
    const formatDateOnly = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const currentYear = today.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    yearStart.setHours(0, 0, 0, 0);
    const yearEnd = new Date(currentYear, 11, 31);
    yearEnd.setHours(0, 0, 0, 0);

    const startStr = formatDateOnly(yearStart);
    const endStr = formatDateOnly(yearEnd);

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: {
          [Op.between]: [startStr, endStr],
        },
      },
      include: [
        {
          model: AttendanceStatus,
          as: "status",
          attributes: ["status_name"],
          required: false,
        },
      ],
      raw: false,
    });
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthMap = {};
    for (let m = 0; m < 12; m++) {
      const monthNumber = String(m + 1).padStart(2, "0");
      const key = `${currentYear}-${monthNumber}`;
      monthMap[key] = {
        present_days: 0,
        leave_days: 0,
        absent_days: 0,
        working_days: 0,
      };
    }

    records.forEach((r) => {
      const plain = r.toJSON();
      let dateStr;

      if (typeof plain.attendance_date === "string") {
        dateStr = plain.attendance_date.substring(0, 10);
      } else {
        dateStr = formatDateOnly(plain.attendance_date);
      }
      const key = dateStr.substring(0, 7);

      if (!monthMap[key]) {
        return;
      }

      const statusName = plain.status?.status_name;

      if (statusName === "Present") {
        monthMap[key].present_days++;
      } else if (statusName === "Leave") {
        monthMap[key].leave_days++;
      } else if (statusName === "Absent") {
        monthMap[key].absent_days++;
      }
    });

    const result = Object.keys(monthMap)
      .sort()
      .map((key) => {
        const [yr, mo] = key.split("-").map(Number);

        const monthStart = new Date(yr, mo - 1, 1);
        const monthEnd = new Date(yr, mo, 0);

        let targetDays = 0;

        const cursor = new Date(monthStart);

        while (cursor <= monthEnd) {
          const day = cursor.getDay();

          // Monday-Friday
          if (day !== 0 && day !== 6) {
            targetDays++;
          }

          cursor.setDate(cursor.getDate() + 1);
        }

        return {
          month: `${monthNames[mo - 1]} - ${yr}`,
          present_days: monthMap[key].present_days,
          leave_days: monthMap[key].leave_days,
          absent_days: monthMap[key].absent_days,
          target_days: targetDays,
        };
      });

    return successResponse(
      res,
      200,
      "Yearly employee data fetched successfully",
      result
    );
  } catch (error) {
    console.error("Yearly employee data error:", error);
    return handleDbError(
      res,
      error,
      "Failed to fetch yearly employee data"
    );
  }
};

module.exports = {
  getActiveEmployeeCount,
  getActive_Present_EmployeeCount,
  getActive_Absent_EmployeeCount,
  getActive_Employee_Department_Count,
  getWeeklyEmployeesData,
  getEmployeeWeeklyPieChartData,
  getMonthlyEmployeesData,
  getYearlyEmployeesData,
};
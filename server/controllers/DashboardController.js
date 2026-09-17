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

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split("T")[0];
    const endStr = weekEnd.toISOString().split("T")[0];

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: { [Op.between]: [startStr, endStr] },
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
      const key = new Date(r.attendance_date)
        .toISOString()
        .split("T")[0];
      recordMap[key] = r;
    });

    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);

      const dateStr = d.toISOString().split("T")[0];
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
          dow === 0 || dow === 6 ? "00:00:00" : "09:18:00",
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

    const today = new Date();
    const dow = today.getDay();
    const diffToMonday = (dow + 6) % 7;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d <= today) {
        weekDates.push(d.toISOString().split("T")[0]);
      }
    }

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: { [Op.in]: weekDates },
      },
      include: [
        {
          model: AttendanceStatus,
          as: "status",
          attributes: ["status_name"],
          required: false,
        },
      ],
    });

    const recordMap = {};
    records.forEach((r) => {
      const plain = r.toJSON();
      const key = new Date(plain.attendance_date)
        .toISOString()
        .split("T")[0];
      recordMap[key] = plain;
    });

    let present_days = 0;
    let absent_days = 0;

    weekDates.forEach((d) => {
      const rec = recordMap[d];
      const statusName = rec?.status?.status_name;

      if (statusName === "Present" || statusName === "Working") {
        present_days++;
      } else if (statusName === "Absent") {
        absent_days++;
      }
    });

    const total_days = weekDates.length;
    const other_days = total_days - (present_days + absent_days);

    const pct = (v) =>
      total_days > 0 ? ((v / total_days) * 100).toFixed(2) : 0;

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
    console.error("Employee weekly pie chart data error:", error);
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

    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startStr = monthStart.toISOString().split("T")[0];
    const endStr = monthEnd.toISOString().split("T")[0];

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: { [Op.between]: [startStr, endStr] },
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
      const key = new Date(r.attendance_date)
        .toISOString()
        .split("T")[0];
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
      const dateStr = cursor.toISOString().split("T")[0];
      const dayName = cursor.toLocaleDateString("en-US", {
        weekday: "short",
      });
      const dow = cursor.getDay();
      const rec = recordMap[dateStr] || null;

      let attendance_status = "Absent";
      if (rec && rec.status_id) {
        attendance_status = statusLabels[rec.status_id] || "Absent";
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
          dow === 0 || dow === 6 ? "00:00:00" : "09:18:00",
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

    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);

    const startStr = yearStart.toISOString().split("T")[0];
    const endStr = yearEnd.toISOString().split("T")[0];

    const records = await DailyAttendance.findAll({
      where: {
        emp_id,
        attendance_date: { [Op.between]: [startStr, endStr] },
      },
      include: [
        {
          model: AttendanceStatus,
          as: "status",
          attributes: ["status_name"],
          required: false,
        },
      ],
    });

    const monthMap = {};
    for (let m = 0; m < 12; m++) {
      const key = `${today.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
      monthMap[key] = {
        present_days: 0,
        leave_days: 0,
        absent_days: 0,
      };
    }

    records.forEach((r) => {
      const plain = r.toJSON();
      const d = new Date(plain.attendance_date);
      const key = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthMap[key]) return;

      const statusName = plain.status?.status_name;

      if (statusName === "Present") monthMap[key].present_days++;
      else if (statusName === "Leave") monthMap[key].leave_days++;
      else if (statusName === "Absent") monthMap[key].absent_days++;
    });

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const result = Object.keys(monthMap)
      .sort()
      .map((key) => {
        const [yr, mo] = key.split("-").map(Number);
        return {
          month: `${monthNames[mo - 1]} - ${yr}`,
          present_days: monthMap[key].present_days,
          leave_days: monthMap[key].leave_days,
          absent_days: monthMap[key].absent_days,
          target_days: 22,
        };
      });

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
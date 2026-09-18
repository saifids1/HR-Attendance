const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const ZKLib = require("zklib-js");
const { Client } = require("pg");

const { connectDB, sequelize } = require("./db/SequelizeDB");
const db = require("./models");

const userRoutes             = require("./routes/user.routes");
const employRoutes           = require("./routes/employ.routes");
const profileRoutes          = require("./routes/profile.routes");
const attendanceRoutes       = require("./routes/attendance.routes");
const shiftRoutes            = require("./routes/shifts.routes");
const reportingRoutes        = require("./routes/reporting.routes");
const leavesRoutes           = require("./routes/leave.routes");
const settingsRoutes         = require("./routes/settings.routes");
const departmentRoutes       = require("./routes/departmentRoutes");
const designationRoutes      = require("./routes/designationRoutes");
const employeeTypeRoutes     = require("./routes/employeeTypeRoutes");
const contactTypeRoutes      = require("./routes/contactTypeRoutes");
const nationalityRoutes      = require("./routes/nationalityRoutes");
const genderRoutes           = require("./routes/genderRoutes");
const maritalStatusRoutes    = require("./routes/maritalStatusRoutes");
const documentTypeRoutes     = require("./routes/documentTypeRoutes");
const countryRoutes          = require("./routes/countryRoutes");
const bloodGroupRoutes       = require("./routes/bloodGroupRoutes");
const stateRoutes            = require("./routes/stateRoutes");
const cityRoutes             = require("./routes/cityRoutes");
const branchRoutes           = require("./routes/branchRoutes");
const branchLocationRoutes   = require("./routes/branchLocationRoutes");
const vendorTypeRoutes       = require("./routes/vendorMasterRoutes");
const cronRoutes             = require("./routes/cron.routes");
const vendorDetailsRoutes    = require("./routes/vendorDetailsRoutes");
const dashboardRoutes        = require("./routes/DashboardRoutes");
const holidayTypeRoutes      = require("./routes/holidayTypeRoutes");
const degreeRoutes           = require("./routes/degreeRoutes");
const cronJobsRoutes         = require("./routes/cronJobs.routes");
const bankAccountTypeRoutes  = require("./routes/bankAccountTypeRoutes");
const holidayRoutes          = require("./routes/holidayRoutes");
const mobilePunchLogRoutes   = require("./routes/activityLogRoutes");
const punchTypeRoutes        = require("./routes/punchTypeRoutes");
const companyRoutes          = require("./routes/CompanyRoutes");
const leaveTypeRoutes        = require("./routes/leaveTypeRoutes");
const leaveStatusRoutes      = require("./routes/LeaveStatusRoutes");
const leaveProcessRoutes     = require("./routes/leaveProcessRoutes");
const leaveQuotaRoutes       = require("./routes/LeaveQuotaRoutes");
const salarySlipRoutes       = require("./routes/salarySlip.routes");
const bulkEmployeeUploadRoutes = require("./routes/bulkEmployeeUpload.routes");



require("./cron/attendance.cron");

console.log("CLIENT_URL =", process.env.CLIENT_URL);

const app = express();
const PORT = process.env.PORT || 5500;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map();

io.on("connection", (socket) => {
  const empId = socket.handshake.query.empId;

  if (empId) {
    userSockets.set(empId.toString(), socket.id);
    console.log(`Socket: User ${empId} connected on ${socket.id}`);
  }

  socket.on("disconnect", () => {
    if (empId) {
      userSockets.delete(empId.toString());
      console.log(`Socket: User ${empId} disconnected`);
    }
  });
});

app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  req.db = db;
  req.sequelize = sequelize;
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/IHRDocument", express.static(path.join(__dirname, "IHRDocument")));

app.use("/api/auth", userRoutes);

app.use("/api/employee/attendance", employRoutes);
app.use("/api/employee/profile", profileRoutes);

app.use("/api/admin/attendance", attendanceRoutes);
app.use("/api/admin/shifts", shiftRoutes);

app.use("/api", reportingRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/employee-types", employeeTypeRoutes);
app.use("/api/contact-types", contactTypeRoutes);
app.use("/api/nationalities", nationalityRoutes);
app.use("/api/genders", genderRoutes);
app.use("/api/marital-statuses", maritalStatusRoutes);
app.use("/api/document-types", documentTypeRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/blood-groups", bloodGroupRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/branch-locations", branchLocationRoutes);

app.use("/vendor-details", vendorDetailsRoutes);
app.use("/api/vendor-master", vendorTypeRoutes);

app.use("/api/degrees", degreeRoutes);
app.use("/api/bank-account-types", bankAccountTypeRoutes);

app.use("/api/leave-types", leaveTypeRoutes);
app.use("/api/leave-status", leaveStatusRoutes);
app.use("/api/leave", leaveProcessRoutes);
app.use("/api/leaves/types", leavesRoutes);
app.use("/api/leave-quota", leaveQuotaRoutes);

app.use("/api/settings", settingsRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/holiday-types", holidayTypeRoutes);
app.use("/api/holidays", holidayRoutes);

app.use("/api", companyRoutes);

app.use("/api/cron-jobs", cronJobsRoutes);

app.use("/api/mobile-activity-logs", mobilePunchLogRoutes);
app.use("/api/punch-types", punchTypeRoutes);

app.use("/api/update-schedule", cronRoutes);

app.use("/api/salary-slips", salarySlipRoutes);
app.use("/api/employees", bulkEmployeeUploadRoutes);

app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: "ok",
      db: "connected",
      models: Object.keys(db).filter(
        (k) => !["sequelize", "Sequelize"].includes(k)
      ),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

server.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`✅ Server Running on PORT ${PORT}`);
  } catch (err) {
    console.error("Database connection failed:", err);
  }
});
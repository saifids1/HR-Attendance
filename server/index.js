const express = require("express");
const cors = require("cors");
const path = require("path")
const ZKLib = require("zklib-js");
const {Client} = require("pg");
const http = require("http"); // 1. Import http
const { Server } = require("socket.io");
const {connectDB,db} = require("./db/connectDB");
const userRoutes = require("./routes/user.routes");
const employRoutes = require("./routes/employ.routes");
const profileRoutes = require("./routes/profile.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const shiftRoutes = require("./routes/shifts.routes");
const reportingRoutes = require("./routes/reporting.routes");
const leavesRoutes = require("./routes/leave.routes");
// const adminRoutes = require("./routes/admin.routes");
require("./cron/attendance.cron");
require("dotenv").config();

const app = express();



const PORT = process.env.PORT || 5500;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Match your frontend port
    methods: ["GET", "POST"]
  }
});

// 5. Track Connected Users (Map emp_id -> socket_id)
const userSockets = new Map();

io.on("connection", (socket) => {
  const empId = socket.handshake.query.empId;
  if (empId) {
    userSockets.set(empId, socket.id);
    console.log(` Socket: User ${empId} connected on ${socket.id}`);
  }

  socket.on("disconnect", () => {
    userSockets.delete(empId);
    console.log(`Socket: User ${empId} disconnected`);
  });
});

// 6. Middleware to make 'io' and 'userSockets' accessible in routes
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  next();
});
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  


// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Auth Routes
app.use("/api/auth",userRoutes);
// app.use("/employee-dashboard",employRoutes);

// Employee Routes
app.use("/api/employee/attendance", employRoutes);

// Employee Profile Routes

app.use("/api/employee/profile",profileRoutes);

// Admin Routes
app.use("/api/admin/attendance", attendanceRoutes);
// app.use("/admin-dashboard",adminRoutes)

// Shifts Routs
app.use("/api/admin/shifts",shiftRoutes);

// Reporting
app.use("/api",reportingRoutes)

// Leaves

app.use("/api/leaves/types",leavesRoutes);


app.listen(PORT,()=>{

    console.log(`Server Running on PORT ${PORT}`);
    connectDB();

})



// (async () => {
//   const zk = new ZKLib("192.168.0.10", 4370, 10000, 4000);

//   try {
//     await zk.createSocket();
//     console.log("✅ Connected");

//     // 🔑 VERY IMPORTANT
//     await zk.enableDevice();
//     console.log("✅ Device Enabled");

//     const serial = await zk.getSerialNumber();
//     console.log("📟 Serial:", serial);

//     const attendance = await zk.getAttendances();

//     console.log("📄 Attendance Data:");
//     console.log(attendance);

   
//     await zk.disconnect();
//   } catch (err) {
//     console.error("❌ Error:", err.message);
//   }
// })();

// setInterval(async () => {
//   try {
//     await zk.enableDevice(); // ALWAYS before fetch

//     const logs = await zk.getAttendances();

//     console.log("📥 Count:", logs?.data?.length || 0);

//     if (!logs?.data?.length) return;

//     for (const log of logs.data) {
//       console.log("✅ Attendance:", log);
//     }
//   } catch (err) {
//     console.error("❌ Fetch error:", err.message);
//   }
// }, 5000);


  

require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const { Student, User } = require("./models");
const bcrypt = require("bcryptjs");

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
const authenticateToken = (req, res, next) => {
  // Check multiple sources for token:
  // 1. Authorization header (Bearer token)
  // 2. Query parameter (for file downloads/exports)
  // 3. Cookies (if using cookie-based auth)
  
  const token = req.headers['authorization']?.split(' ')[1] || 
                req.query.token || 
                req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
  }
  
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

// Export middleware so routes can use it
app.set('authenticateToken', authenticateToken);

// ========================================
// DATABASE SEEDING
// ========================================
(async () => {
  // Add sample students if none exist
  const studentCount = await Student.count();
  if (studentCount === 0) {
    await Student.bulkCreate([
      { name: "John Doe", rollNumber: "A001", class: "CSE-A" },
      { name: "Jane Smith", rollNumber: "A002", class: "CSE-A" },
      { name: "Alex Brown", rollNumber: "A003", class: "CSE-A" },
    ]);
    console.log("🧑‍🎓 Sample students added");
  }

  // Add demo users if none exist
  const userCount = await User.count();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    await User.bulkCreate([
      { name: "Principal Admin", email: "principal@pgp.com", password: hashedPassword, role: "principal" },
      { name: "HOD Engineering", email: "hod@pgp.com", password: hashedPassword, role: "hod" },
      { name: "Class Advisor", email: "advisor@pgp.com", password: hashedPassword, role: "advisor" },
      { name: "Teacher John", email: "teacher@pgp.com", password: hashedPassword, role: "teacher" },
    ]);
    console.log("👤 Demo users added");
  }
})();

const { Timetable } = require("./models");

(async () => {
  // Add sample timetables if none exist
  const timetableCount = await Timetable.count();
  if (timetableCount === 0) {
    const teacher = await User.findOne({ where: { role: "teacher" } });
    const hod = await User.findOne({ where: { role: "hod" } });

    if (teacher && hod) {
      await Timetable.bulkCreate([
        { day: "Monday", periodNumber: 1, subject: "Mathematics", className: "CSE-A", teacherId: teacher.id, startTime: "09:00", endTime: "10:00", color: "green" },
        { day: "Monday", periodNumber: 2, subject: "Physics", className: "CSE-A", teacherId: hod.id, startTime: "10:00", endTime: "11:00", color: "green" },
        { day: "Tuesday", periodNumber: 1, subject: "Chemistry", className: "CSE-A", teacherId: teacher.id, startTime: "09:00", endTime: "10:00", color: "green" },
        { day: "Wednesday", periodNumber: 1, subject: "Computer Science", className: "CSE-A", teacherId: teacher.id, startTime: "09:00", endTime: "10:00", color: "green" },
      ]);
      console.log("📅 Sample timetables added");
    }
  }
})();

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================================
// ROUTES
// ========================================
const attendanceRoutes = require("./routes/attendance");
const timetableRoutes = require("./routes/timetable");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");

// API Routes
app.use("/attendance", attendanceRoutes);
app.use("/timetable", timetableRoutes);
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);

// Page Routes (HTML)
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/role-dashboard.html", (req, res) => {
  res.render("role-dashboard");
});

app.get("/timetable-management", (req, res) => {
  res.render("timetable-management");
});

app.get("/student-management", (req, res) => {
  res.render("student-management");
});

app.get("/reports-page", (req, res) => {
  res.render("reports");
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Loaded from .env' : 'Using default (CHANGE THIS!)'}`);
});

// Export for use in routes
module.exports = { authenticateToken };
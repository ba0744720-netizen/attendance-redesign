// ========================================
// ✅ IMPORTS & CONFIG
// ========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Sequelize } = require("sequelize");

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ✅ MODELS
// ========================================
const { Student, User, Timetable } = require("./models");

// ========================================
// 🔐 AUTH MIDDLEWARE
// ========================================
const authenticateToken = (req, res, next) => {
  const token =
    req.headers["authorization"]?.split(" ")[1] ||
    req.query.token ||
    req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid token" });
  }
};

app.set("authenticateToken", authenticateToken);

// ========================================
// 🧠 DATABASE SEEDING (Admin + Teacher only)
// ========================================
const seedDatabase = async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const studentCount = await Student.count();
    if (studentCount === 0) {
      await Student.bulkCreate([
        { name: "John Doe", rollNumber: "A001", class: "CSE-A" },
        { name: "Jane Smith", rollNumber: "A002", class: "CSE-A" },
        { name: "Alex Brown", rollNumber: "A003", class: "CSE-A" },
      ]);
      console.log("🧑‍🎓 Sample students added");
    }

    const userCount = await User.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash("password123", 10);
      await User.bulkCreate([
        {
          staffId: "ADM001",
          name: "Admin User",
          email: "admin@pgp.com",
          password: hashedPassword,
          role: "admin",
        },
        {
          staffId: "TCH001",
          name: "Teacher John",
          email: "teacher@pgp.com",
          password: hashedPassword,
          role: "teacher",
        },
      ]);
      console.log("👥 Demo users added (Admin + Teacher)");
    }
  } catch (err) {
    console.error("❌ Database seeding error:", err);
  }
};

seedDatabase();

// ========================================
// ⚙️ MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================================
// 🌐 ROUTES
// ========================================
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");

// Use routes
app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);

// ========================================
// 📄 PAGE ROUTES (EJS VIEWS)
// ========================================
app.get("/", (req, res) => res.render("login"));
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", (req, res) => res.render("dashboard"));
app.get("/student-management", (req, res) => res.render("student-management"));
app.get("/reports-page", (req, res) => res.render("reports"));
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

// ========================================
// 🚀 START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "Loaded" : "Using default secret (CHANGE THIS!)"}`);
  console.log(`👤 Admin: admin@pgp.com | password123`);
  console.log(`👤 Teacher: teacher@pgp.com | password123`);
});

module.exports = { authenticateToken };

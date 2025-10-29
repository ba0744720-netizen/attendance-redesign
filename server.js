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
const cookieParser = require("cookie-parser");

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ✅ MODELS
// ========================================
const { Student, User, Attendance, sequelize } = require("./models");

// ========================================
// ⚙️ MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================================
// 🧠 DATABASE SEEDING FUNCTION
// ========================================
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Check Student count
    const studentCount = await Student.count();
    if (studentCount === 0) {
      console.log("📚 Adding sample students...");
      await Student.bulkCreate([
        { name: "John Doe", rollNumber: "A001", class: "CSE-A" },
        { name: "Jane Smith", rollNumber: "A002", class: "CSE-A" },
        { name: "Alex Brown", rollNumber: "A003", class: "CSE-A" },
        { name: "Bob Johnson", rollNumber: "B001", class: "CSE-B" },
        { name: "Carol White", rollNumber: "B002", class: "CSE-B" },
      ]);
      console.log("✅ Sample students added");
    } else {
      console.log("ℹ️  Students already exist in database");
    }

    // Check User count
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("👥 Adding demo users...");
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
        {
          staffId: "TCH002",
          name: "Teacher Sarah",
          email: "sarah@pgp.com",
          password: hashedPassword,
          role: "teacher",
        },
      ]);
      console.log("✅ Demo users added");
      console.log("\n📋 LOGIN CREDENTIALS:");
      console.log("   👨‍🏫 Teacher: teacher@pgp.com | 🔑 password123");
      console.log("   🔐 Admin: admin@pgp.com | 🔑 password123\n");
    } else {
      console.log("ℹ️  Users already exist in database");
    }

    console.log("✅ Database seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
  }
};

// ========================================
// 🚀 START SERVER WITH PROPER INITIALIZATION
// ========================================
const startServer = async () => {
  try {
    // Step 1: Authenticate connection
    console.log("📡 Authenticating database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection verified\n");

    // Step 2: Sync models (with safe approach)
    console.log("🔄 Syncing database models...");
    try {
      await sequelize.sync({ 
        alter: false,  // ✅ Changed to false to avoid constraint issues
        force: false 
      });
      console.log("✅ Database models synced\n");
    } catch (syncError) {
      console.log("⚠️  Sync warning (this may be expected):", syncError.message);
      console.log("ℹ️  Continuing with existing tables...\n");
    }

    // Step 3: Seed database
    await seedDatabase();

    // Step 4: Start listening
    app.listen(PORT, () => {
      console.log(`\n✅ Server running at: http://localhost:${PORT}`);
      console.log(`📍 Login at: http://localhost:${PORT}/login`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "✅ Loaded" : "❌ Missing"}\n`);
    });

  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

// ========================================
// 🌐 API ROUTES
// ========================================

// Import routes
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");

// Try to import admin routes if they exist
let adminRoutes;
try {
  adminRoutes = require("./routes/admin");
} catch (error) {
  console.log("⚠️  Admin routes not found, skipping...");
}

// Use API Routes
app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Only use admin routes if they exist
if (adminRoutes) {
  app.use("/api/admin", adminRoutes);
}

// ========================================
// 📄 PAGE ROUTES
// ========================================

// Public routes
app.get("/", (req, res) => res.redirect('/login'));
app.get("/login", (req, res) => res.render("login"));

// Teacher Dashboard
app.get("/dashboard", (req, res) => {
  console.log("✅ Teacher dashboard accessed");
  res.render("teacher-dashboard");
});

// Admin Dashboard
app.get("/admin", (req, res) => {
  console.log("✅ Admin dashboard accessed");
  res.render("admin-dashboard");
});

// Admin User Management
app.get("/admin/users", (req, res) => {
  console.log("✅ Admin user management accessed");
  res.render("admin-users");
});

// New Attendance Page
app.get("/new-attendance", (req, res) => {
  res.render("new-attendance");
});

// Student Management
app.get("/student-management", (req, res) => {
  console.log("✅ Student management page accessed");
  res.render("student-management");
});

// Reports Page
app.get("/reports-page", (req, res) => {
  console.log("✅ Reports page accessed");
  res.render("reports");
});

// ========================================
// 🎯 START APPLICATION
// ========================================
startServer();
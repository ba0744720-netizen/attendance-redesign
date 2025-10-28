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
const { Student, User, sequelize } = require("./models");

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
// 🧠 DATABASE SEEDING
// ========================================
const seedDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connection verified for seeding");
        
        await new Promise((resolve) => setTimeout(resolve, 2000));

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
            console.log("👥 Demo users added");
            console.log("\n✅ LOGIN CREDENTIALS:");
            console.log("   📧 Teacher: teacher@pgp.com | 🔑 password123");
            console.log("   📧 Admin: admin@pgp.com | 🔑 password123\n");
        } else {
            console.log("📝 Users already exist in database");
        }
    } catch (err) {
        console.error("❌ Database seeding error:", err.message);
    }
};

// Run seeding after a delay
setTimeout(() => {
    seedDatabase();
}, 2000);

// ========================================
// 🌐 API ROUTES
// ========================================

// Import routes
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");

// Check if admin.js exists before requiring it
let adminRoutes;
try {
    adminRoutes = require("./routes/admin");
} catch (error) {
    console.log("⚠️  Admin routes not found, creating placeholder...");
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

// New Attendance Page (Teachers & Admins)
app.get("/new-attendance", (req, res) => {
    res.render("new-attendance");
});

// Student Management (Teachers & Admins)
app.get("/student-management", (req, res) => {
    console.log("✅ Student management page accessed");
    res.render("student-management");
});

// Reports Page (Teachers & Admins)
app.get("/reports-page", (req, res) => {
    console.log("✅ Reports page accessed");
    res.render("reports");
});

// ========================================
// 🚀 START SERVER
// ========================================
app.listen(PORT, () => {
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "Loaded" : "Using default secret (CHANGE THIS!)"}`);
    console.log(`\n📍 Login at: http://localhost:${PORT}/login`);
});
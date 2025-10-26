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
const { Student, User, Timetable, sequelize } = require("./models");

// ========================================
// 🔐 AUTH MIDDLEWARE
// ========================================
const authenticateToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

    const isProtectedPage = req.originalUrl.includes('/dashboard') || 
                            req.originalUrl.includes('/student-management') || 
                            req.originalUrl.includes('/reports-page') || 
                            req.originalUrl === '/'; 

    if (!token) {
        if (isProtectedPage) {
            console.log('No token found for page request. Redirecting to login.');
            res.cookie('redirect', req.originalUrl, { httpOnly: false, maxAge: 60000 }); 
            return res.redirect('/login');
        }
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.log('Invalid token. Clearing cookie.');
        res.clearCookie('token');
        
        if (isProtectedPage) {
            console.log('Invalid token for page request. Redirecting to login.');
            return res.redirect('/login');
        }
        return res.status(403).json({ success: false, message: "Invalid token" });
    }
};

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
            console.log("👥 Demo users added (Admin + Teacher)");
            console.log("\n✅ LOGIN CREDENTIALS:");
            console.log("   📧 Email: teacher@pgp.com");
            console.log("   🔑 Password: password123");
            console.log("   OR");
            console.log("   📧 Email: admin@pgp.com");
            console.log("   🔑 Password: password123\n");
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
// 🌐 API ROUTES
// ========================================
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const dashboardRoutes = require("./routes/dashboard");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");

// API Routes (with /auth prefix for auth)
app.use("/auth", authRoutes); // Changed to /auth prefix
app.use("/attendance", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);

// ========================================
// 📄 PAGE ROUTES (EJS VIEWS)
// ========================================
app.get("/", (req, res) => res.redirect('/login'));
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));
app.get("/dashboard", authenticateToken, (req, res) => res.render("dashboard", { user: req.user }));
app.get("/student-management", authenticateToken, (req, res) => res.render("student-management"));
app.get("/reports-page", authenticateToken, (req, res) => res.render("reports"));
app.get("/role-dashboard.html", authenticateToken, (req, res) => res.render("role-dashboard"));

// ========================================
// 🚀 START SERVER
// ========================================
app.listen(PORT, () => {
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "Loaded" : "Using default secret (CHANGE THIS!)"}`);
    console.log(`\n📍 Login at: http://localhost:${PORT}/login`);
});
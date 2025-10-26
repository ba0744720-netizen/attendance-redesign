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
const cookieParser = require("cookie-parser"); // <-- NEW: To read the JWT token cookie

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ✅ MODELS
// ========================================
const { Student, User, Timetable } = require("./models");

// ========================================
// 🔐 AUTH MIDDLEWARE (Updated for Reliable EJS Redirection)
// ========================================
const authenticateToken = (req, res, next) => {
    // 1. Check for token in cookies (for EJS page requests) or Authorization header (for API calls)
    const token = req.cookies?.token || req.headers["authorization"]?.split(" ")[1];

    // 🔍 Helper to check if the requested URL is for a protected EJS view
    const isProtectedPage = req.originalUrl.includes('/dashboard') || 
                            req.originalUrl.includes('/student-management') || 
                            req.originalUrl.includes('/reports-page') || 
                            req.originalUrl === '/'; 

    // 🛑 If no token is found, handle unauthorized access
    if (!token) {
        if (isProtectedPage) { // Check if it's an EJS page that needs protection
            console.log('No token found for page request. Redirecting to login.');
            // Store the path they were trying to reach to redirect back after login
            res.cookie('redirect', req.originalUrl, { httpOnly: false, maxAge: 60000 }); 
            return res.redirect('/login');
        }
        
        // If it's not a protected page URL, treat it as a pure API request and send JSON
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    // 2. Verify the token
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key");
        // Attach the decoded user payload to the request
        req.user = verified;
        next();
    } catch (err) {
        // 🛑 Invalid token
        console.log('Invalid token. Clearing cookie.');
        res.clearCookie('token'); // Clear the bad cookie
        
        if (isProtectedPage) { // Check if it's an EJS page that needs protection
            console.log('Invalid token for page request. Redirecting to login.');
            return res.redirect('/login');
        }

        // Treat as API request and send JSON
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
app.use(cookieParser()); // <-- Use cookie parser middleware
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
app.use("/", authRoutes); // Moved to root for simple /login, /register, /logout access
app.use("/attendance", attendanceRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);

// ========================================
// 📄 PAGE ROUTES (EJS VIEWS)
// ========================================
// Get the authentication middleware
const authMiddleware = app.get("authenticateToken");

app.get("/", (req, res) => res.redirect('/dashboard')); // Redirect root to dashboard (will be protected)
app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));

// Apply the authentication middleware to protected pages
app.get("/dashboard", authMiddleware, (req, res) => {
    // req.user contains { id: user.id, role: user.role } from the JWT token
    res.render("dashboard", { user: req.user });
});
app.get("/student-management", authMiddleware, (req, res) => res.render("student-management"));
app.get("/reports-page", authMiddleware, (req, res) => res.render("reports"));


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
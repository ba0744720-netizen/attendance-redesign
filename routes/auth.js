const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Helper function to handle token creation and redirection
const handleAuthSuccess = (res, user) => {
    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET not set in .env!");
        // Fallback to a plain view error if API error is not desired
        return res.status(500).render('login', { error: "Server configuration error. Please contact admin." });
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    // 🔑 Set the JWT in an HTTP-only cookie (This is the key fix)
    res.cookie('token', token, {
        httpOnly: true, // Prevents client-side JS access (security)
        secure: process.env.NODE_ENV === 'production', // Use true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    console.log("Authentication successful for:", user.email);

    // ➡️ Check for a pending redirect (from the authenticateToken middleware)
    const redirectPath = res.req.cookies?.redirect || '/dashboard';
    res.clearCookie('redirect'); // Clear the redirect cookie

    // 🎯 Redirect the user to the dashboard (This is the second key fix)
    // Note: Since forms submit to an API endpoint, the front-end will need to
    // be AJAX/Fetch based for a seamless redirect, or we render a simple page 
    // to trigger the client-side redirect. A pure POST redirect is simpler for now.
    return res.redirect(redirectPath);
};

// 📌 POST Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.render('login', { error: "Email and password required" });
        }

        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            return res.render('login', { error: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.render('login', { error: "Invalid credentials" });
        }

        // Handle success: set cookie and redirect
        return handleAuthSuccess(res, user);

    } catch (error) {
        console.error("Login error:", error);
        return res.render('login', { error: "An unexpected server error occurred." });
    }
});

// 📌 POST Register
router.post("/register", async (req, res) => {
    try {
        const { staffId, name, email, password } = req.body;

        if (!staffId || !name || !email || !password) {
            return res.render('register', { error: "All fields are required" });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.render('register', { error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "teacher", // Default role for new registrations
            staffId
        });

        // 🎯 Success: Login the user immediately after registration
        // Handle success: set cookie and redirect to dashboard
        return handleAuthSuccess(res, newUser);

    } catch (error) {
        console.error("Registration error:", error);
        return res.render('register', { error: "Registration failed due to a server error." });
    }
});

// 📌 POST Logout
router.post("/logout", (req, res) => {
    res.clearCookie('token'); // Remove the JWT cookie
    console.log("User logged out. Redirecting to login.");
    res.redirect('/login'); // Redirect to the login page
});

// 🛠️ DEBUG: Get all users (optional - for testing)
router.get("/users", async (req, res) => {
    try {
        // You might want to protect this route with authenticateToken later
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'staffId']
        });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
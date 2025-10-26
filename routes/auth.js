const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// 📌 POST Login (API endpoint for AJAX login)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log("Login attempt for:", email); // Debug log
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Email and password required" 
            });
        }

        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            console.log("User not found:", email); // Debug log
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials" 
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            console.log("Invalid password for:", email); // Debug log
            return res.status(401).json({ 
                success: false, 
                message: "Invalid credentials" 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        console.log("Login successful for:", email); // Debug log

        // Return success with token and user info
        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Server error during login" 
        });
    }
});

// 📌 POST Register
router.post("/register", async (req, res) => {
    try {
        const { staffId, name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "All fields are required" 
            });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Email already registered" 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "teacher", // Default role
            staffId
        });

        console.log("New user registered:", email);

        // Generate token for auto-login
        const token = jwt.sign(
            { id: newUser.id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Registration failed" 
        });
    }
});

// 📌 GET Logout (clear client-side token)
router.get("/logout", (req, res) => {
    res.redirect('/login');
});

module.exports = router;
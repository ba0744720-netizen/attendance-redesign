const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// 📌 POST Login
router.post("/login", async (req, res) => {
  try {
    console.log("Login attempt:", req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ where: { email } });
    console.log("User found:", user ? user.email : "No user");
    
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET not set in .env!");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("Login successful for:", user.email);

    res.json({
      success: true,
      token,
      user: { name: user.name, role: user.role }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// 📌 POST Register
router.post("/register", async (req, res) => {
  try {
    console.log("Registration attempt:", req.body);
    
    const { staffId, name, email, password } = req.body;

    // Validate input
    if (!staffId || !name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with default role "teacher"
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "teacher",
      staffId
    });

    console.log("New user registered:", newUser.email);

    res.json({
      success: true,
      message: "Registration successful! Please login.",
      user: { 
        name: newUser.name, 
        email: newUser.email,
        role: newUser.role 
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Registration failed: " + error.message 
    });
  }
});

// 🛠️ DEBUG: Get all users (optional - for testing)
router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'staffId']
    });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
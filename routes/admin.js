const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../models");

// ========================================
// MIDDLEWARE
// ========================================

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// Check if user is admin
const checkAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      message: "Only admins can access this resource" 
    });
  }
  next();
};

// ========================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ========================================

// 📌 GET All Users
router.get("/users", verifyToken, checkAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'staffId', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Users fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Single User
router.get("/users/:id", verifyToken, checkAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'staffId', 'name', 'email', 'role', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 POST Create User
router.post("/users/create", verifyToken, checkAdmin, async (req, res) => {
  try {
    const { staffId, name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, password, and role are required" 
      });
    }

    // Validate role
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role. Must be 'admin' or 'teacher'" 
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already exists" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      staffId,
      name,
      email,
      password: hashedPassword,
      role
    });

    res.json({ 
      success: true, 
      message: "User created successfully", 
      data: {
        id: user.id,
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("User create error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 PUT Update User
router.put("/users/update/:id", verifyToken, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId, name, email, role, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Validate role if provided
    if (role && !['admin', 'teacher'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid role. Must be 'admin' or 'teacher'" 
      });
    }

    // Check if new email conflicts with another user
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: "Email already exists" 
        });
      }
    }

    const updateData = {};
    if (staffId !== undefined) updateData.staffId = staffId;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await user.update(updateData);

    res.json({ 
      success: true, 
      message: "User updated successfully", 
      data: {
        id: user.id,
        staffId: user.staffId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("User update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 DELETE User
router.delete("/users/delete/:id", verifyToken, checkAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot delete your own account" 
      });
    }

    await user.destroy();

    res.json({ 
      success: true, 
      message: "User deleted successfully" 
    });
  } catch (error) {
    console.error("User delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET User Statistics
router.get("/stats/users", verifyToken, checkAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const adminCount = await User.count({ where: { role: 'admin' } });
    const teacherCount = await User.count({ where: { role: 'teacher' } });

    res.json({ 
      success: true, 
      data: {
        total: totalUsers,
        admins: adminCount,
        teachers: teacherCount
      }
    });
  } catch (error) {
    console.error("User stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
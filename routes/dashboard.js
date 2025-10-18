const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { User, Student, Attendance } = require("../models");

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

// 📌 GET Dashboard data based on role
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    const dashboardData = {
      user: { name: user.name, role: user.role },
      students: [],
      stats: {}
    };

    // Get students based on role
    if (req.user.role === "principal" || req.user.role === "hod" || req.user.role === "advisor") {
      dashboardData.students = await Student.findAll();
    } else if (req.user.role === "teacher") {
      // Teachers see limited student list (add class filter later)
      dashboardData.students = await Student.findAll({ limit: 10 });
    }

    // Get attendance stats for principal/hod
    if (req.user.role === "principal" || req.user.role === "hod") {
      const totalStudents = await Student.count();
      const todayAttendance = await Attendance.count({
        where: { date: new Date().toISOString().split('T')[0] }
      });
      
      dashboardData.stats = {
        totalStudents,
        todayAttendance,
        attendanceRate: totalStudents > 0 ? Math.round((todayAttendance / totalStudents) * 100) : 0
      };
    }

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
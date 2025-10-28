const express = require("express");
const router = express.Router();
const { Student, Attendance } = require("../models");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");

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

// ========================================
// MARK ATTENDANCE ROUTES
// ========================================

// 📌 POST Mark Single Attendance
router.post("/mark", verifyToken, async (req, res) => {
  try {
    const { studentId, status, date } = req.body;
    
    if (!studentId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID and status are required" 
      });
    }

    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Status must be 'Present' or 'Absent'" 
      });
    }

    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];

    const existingAttendance = await Attendance.findOne({
      where: {
        StudentId: studentId,
        date: attendanceDate
      }
    });

    if (existingAttendance) {
      await existingAttendance.update({ status });
      return res.json({ 
        success: true, 
        message: "Attendance updated successfully!",
        data: existingAttendance
      });
    }

    const attendance = await Attendance.create({
      date: attendanceDate,
      status,
      StudentId: studentId,
    });

    return res.json({ 
      success: true, 
      message: "Attendance marked successfully!",
      data: attendance
    });

  } catch (error) {
    console.error("Attendance marking error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error marking attendance" 
    });
  }
});

// 📌 POST Mark Bulk Attendance
router.post("/mark-bulk", verifyToken, async (req, res) => {
  try {
    const { students, date } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Students array is required" 
      });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const results = [];
    const errors = [];

    for (const item of students) {
      try {
        const { studentId, status } = item;

        if (!studentId || !status) {
          errors.push({ 
            studentId: studentId || 'unknown', 
            error: 'Missing studentId or status' 
          });
          continue;
        }

        if (!['Present', 'Absent'].includes(status)) {
          errors.push({ 
            studentId, 
            error: 'Invalid status value' 
          });
          continue;
        }

        const existing = await Attendance.findOne({
          where: { StudentId: studentId, date: attendanceDate }
        });

        if (existing) {
          await existing.update({ status });
          results.push({ studentId, action: 'updated', status });
        } else {
          await Attendance.create({
            date: attendanceDate,
            status,
            StudentId: studentId
          });
          results.push({ studentId, action: 'created', status });
        }
      } catch (error) {
        errors.push({ 
          studentId: item.studentId || 'unknown', 
          error: error.message 
        });
      }
    }

    res.json({ 
      success: true, 
      message: `Attendance processed for ${results.length} students`,
      data: { 
        success: results.length,
        failed: errors.length,
        results, 
        errors 
      }
    });

  } catch (error) {
    console.error("Bulk attendance error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error marking bulk attendance" 
    });
  }
});

// ========================================
// GET ATTENDANCE ROUTES
// ========================================

// 📌 GET Today's Attendance
router.get("/today", verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const attendance = await Attendance.findAll({
      where: { date: today },
      include: [{ 
        model: Student, 
        attributes: ['id', 'name', 'rollNumber', 'class'] 
      }],
      order: [[Student, 'rollNumber', 'ASC']]
    });

    res.json({ 
      success: true, 
      data: attendance,
      count: attendance.length 
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// 📌 GET Attendance by Date
router.get("/date/:date", verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { className } = req.query;
    
    const whereClause = { date };
    const studentWhere = className ? { class: className } : {};
    
    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{ 
        model: Student,
        where: studentWhere,
        attributes: ['id', 'name', 'rollNumber', 'class'] 
      }],
      order: [[Student, 'rollNumber', 'ASC']]
    });

    res.json({ 
      success: true, 
      data: attendance,
      count: attendance.length 
    });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

// 📌 GET Attendance Statistics
router.get("/stats/overview", verifyToken, async (req, res) => {
  try {
    const { date, className } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const studentWhere = className ? { class: className } : {};
    const totalStudents = await Student.count({ where: studentWhere });

    const attendance = await Attendance.findAll({
      where: { date: targetDate },
      include: [{
        model: Student,
        where: studentWhere,
        attributes: ['id']
      }]
    });

    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const notMarked = totalStudents - attendance.length;
    const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

    res.json({ 
      success: true, 
      data: {
        date: targetDate,
        className: className || 'All Classes',
        totalStudents,
        present,
        absent,
        notMarked,
        percentage
      }
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { Student, Attendance } = require("../models");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");

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

// 📌 POST Mark Attendance (All authenticated users can mark - NO period restrictions)
router.post("/mark", verifyToken, async (req, res) => {
  try {
    const { studentId, status, date } = req.body;
    
    // Validate required fields
    if (!studentId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID and status are required" 
      });
    }

    // Validate status
    if (!['Present', 'Absent'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Status must be 'Present' or 'Absent'" 
      });
    }

    // Check if student exists
    const student = await Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Use provided date or today's date
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Check if attendance already marked for this date
    const existingAttendance = await Attendance.findOne({
      where: {
        StudentId: studentId,
        date: attendanceDate
      }
    });

    if (existingAttendance) {
      // Update existing attendance
      await existingAttendance.update({ status });
      return res.json({ 
        success: true, 
        message: "Attendance updated successfully!",
        data: existingAttendance
      });
    }

    // Create new attendance record
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

// 📌 POST Bulk Mark Attendance (Mark multiple students at once)
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

        // Check if attendance already exists
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
        errors.push({ studentId: item.studentId, error: error.message });
      }
    }

    res.json({ 
      success: true, 
      message: `Attendance marked for ${results.length} students`,
      data: { results, errors }
    });

  } catch (error) {
    console.error("Bulk attendance error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error marking bulk attendance" 
    });
  }
});

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
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Attendance by Date
router.get("/date/:date", verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    
    const attendance = await Attendance.findAll({
      where: { date },
      include: [{ 
        model: Student, 
        attributes: ['id', 'name', 'rollNumber', 'class'] 
      }],
      order: [[Student, 'rollNumber', 'ASC']]
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Attendance by Date Range
router.get("/range", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, className } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.date = {
        [Op.lte]: endDate
      };
    }

    const studentWhere = className ? { class: className } : {};

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{ 
        model: Student,
        where: studentWhere,
        attributes: ['id', 'name', 'rollNumber', 'class'] 
      }],
      order: [['date', 'DESC'], [Student, 'rollNumber', 'ASC']]
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Attendance for a specific student
router.get("/student/:studentId", verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    const whereClause = { StudentId: studentId };
    
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{ 
        model: Student, 
        attributes: ['id', 'name', 'rollNumber', 'class'] 
      }],
      order: [['date', 'DESC']]
    });

    // Calculate statistics
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({ 
      success: true, 
      data: {
        attendance,
        stats: {
          total,
          present,
          absent,
          percentage
        }
      }
    });
  } catch (error) {
    console.error("Student attendance fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Attendance Statistics
router.get("/stats/overview", verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const totalStudents = await Student.count();
    const attendance = await Attendance.findAll({
      where: { date: targetDate }
    });

    const present = attendance.filter(a => a.status === 'Present').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const notMarked = totalStudents - attendance.length;
    const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

    res.json({ 
      success: true, 
      data: {
        date: targetDate,
        totalStudents,
        present,
        absent,
        notMarked,
        percentage
      }
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 DELETE Attendance Record
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const attendance = await Attendance.findByPk(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: "Attendance record not found" 
      });
    }

    await attendance.destroy();

    res.json({ 
      success: true, 
      message: "Attendance record deleted successfully" 
    });
  } catch (error) {
    console.error("Attendance delete error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting attendance" 
    });
  }
});

// 📌 GET Students without attendance for a specific date
router.get("/missing/:date", verifyToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { className } = req.query;

    // Get all students
    const studentWhere = className ? { class: className } : {};
    const allStudents = await Student.findAll({
      where: studentWhere,
      attributes: ['id', 'name', 'rollNumber', 'class']
    });

    // Get students with attendance for this date
    const attendedStudents = await Attendance.findAll({
      where: { date },
      attributes: ['StudentId']
    });

    const attendedIds = attendedStudents.map(a => a.StudentId);

    // Filter students without attendance
    const missingStudents = allStudents.filter(
      student => !attendedIds.includes(student.id)
    );

    res.json({ 
      success: true, 
      data: missingStudents,
      count: missingStudents.length
    });
  } catch (error) {
    console.error("Missing attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
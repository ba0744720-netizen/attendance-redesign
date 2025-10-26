const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Student } = require("../models");

// ========================================
// MIDDLEWARE
// ========================================

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "No token" });
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
// STUDENT ROUTES
// ========================================

// 📌 GET All Students
router.get("/", verifyToken, async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [['rollNumber', 'ASC']]
    });
    res.json({ success: true, data: students });
  } catch (error) {
    console.error("Students fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Single Student
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.json({ success: true, data: student });
  } catch (error) {
    console.error("Student fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 POST Create Student
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { name, rollNumber, className, course, year, branch } = req.body;

    if (!name || !rollNumber || !className) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, roll number, and class are required" 
      });
    }

    // Check if roll number already exists
    const existing = await Student.findOne({ where: { rollNumber } });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Roll number already exists" 
      });
    }

    const student = await Student.create({
      name,
      rollNumber,
      class: className,
      course: course || 'B.Tech',
      year: year || 'III',
      branch: branch || 'CSE'
    });

    res.json({ 
      success: true, 
      message: "Student added successfully", 
      data: student 
    });
  } catch (error) {
    console.error("Student create error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 PUT Update Student
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rollNumber, className, course, year, branch } = req.body;

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if new roll number conflicts with another student
    if (rollNumber && rollNumber !== student.rollNumber) {
      const existing = await Student.findOne({ where: { rollNumber } });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: "Roll number already exists" 
        });
      }
    }

    await student.update({
      name: name || student.name,
      rollNumber: rollNumber || student.rollNumber,
      class: className || student.class,
      course: course || student.course,
      year: year || student.year,
      branch: branch || student.branch
    });

    res.json({ 
      success: true, 
      message: "Student updated successfully", 
      data: student 
    });
  } catch (error) {
    console.error("Student update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 DELETE Student
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    await student.destroy();

    res.json({ 
      success: true, 
      message: "Student deleted successfully" 
    });
  } catch (error) {
    console.error("Student delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
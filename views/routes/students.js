const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Student } = require("../models");

// Middleware to verify token
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

// Check if user is advisor or principal
const verifyToken = (req, res, next) => {
  if (req.user.role !== "advisor" && req.user.role !== "principal") {
    return res.status(403).json({ 
      success: false, 
      message: "Only Class Advisors and Principals can manage students" 
    });
  }
  next();
};

// 📌 GET All Students
router.get("/", verifyToken, async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [['class', 'ASC'], ['rollNumber', 'ASC']]
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

// 📌 POST Create Student (Advisor/Principal only)
router.post("/create", verifyToken,  async (req, res) => {
  try {
    const { name, rollNumber, className } = req.body;

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
      class: className
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

// 📌 PUT Update Student (Advisor/Principal only)
router.put("/update/:id", verifyToken,  async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rollNumber, className } = req.body;

    const student = await Student.findByPk(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if new roll number conflicts with another student
    if (rollNumber !== student.rollNumber) {
      const existing = await Student.findOne({ where: { rollNumber } });
      if (existing) {
        return res.status(400).json({ 
          success: false, 
          message: "Roll number already exists" 
        });
      }
    }

    await student.update({
      name,
      rollNumber,
      class: className
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

// 📌 DELETE Student (Advisor/Principal only)
router.delete("/delete/:id", verifyToken,  async (req, res) => {
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
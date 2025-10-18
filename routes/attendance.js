const express = require("express");
const router = express.Router();
const { Student, Attendance } = require("../models");
const jwt = require("jsonwebtoken");

// 📌 GET Dashboard
router.get("/", async (req, res) => {
  const students = await Student.findAll();
  res.render("dashboard", { pageTitle: "Attendance Dashboard", students });
});

// 📌 POST Mark Attendance (with period validation)
router.post("/mark", async (req, res) => {
  try {
    const { studentId, status } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRole = decoded.role;

    // Class Advisors can mark anytime
    if (userRole === "advisor" || userRole === "principal" || userRole === "hod") {
      await Attendance.create({
        date: new Date(),
        status,
        StudentId: studentId,
      });
      return res.json({ success: true, message: "Attendance marked successfully!" });
    }

    // Teachers must be in their assigned period
    if (userRole === "teacher") {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
      const currentTime = now.toTimeString().slice(0, 5);

      const { Timetable } = require("../models");
      const currentPeriod = await Timetable.findOne({
        where: {
          teacherId: decoded.id,
          day: currentDay,
        }
      });

      if (!currentPeriod || currentTime < currentPeriod.startTime || currentTime > currentPeriod.endTime) {
        return res.status(403).json({ 
          success: false, 
          message: "You can only mark attendance during your assigned period" 
        });
      }

      await Attendance.create({
        date: new Date(),
        status,
        StudentId: studentId,
      });

      return res.json({ success: true, message: "Attendance marked successfully!" });
    }

    res.status(403).json({ success: false, message: "Unauthorized" });
  } catch (error) {
    console.error("Attendance marking error:", error);
    res.status(500).json({ success: false, message: "Error marking attendance" });
  }
});

module.exports = router;

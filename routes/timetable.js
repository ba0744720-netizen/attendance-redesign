const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Timetable, User } = require("../models");

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

// 📌 GET All Timetables
router.get("/", verifyToken, async (req, res) => {
  try {
    const timetables = await Timetable.findAll({
      include: [{ model: User, as: 'teacher', attributes: ['id', 'name', 'email'] }],
      order: [['day', 'ASC'], ['periodNumber', 'ASC']]
    });
    res.json({ success: true, data: timetables });
  } catch (error) {
    console.error("Timetable fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Timetable for specific teacher
router.get("/my-schedule", verifyToken, async (req, res) => {
  try {
    const schedule = await Timetable.findAll({
      where: { teacherId: req.user.id },
      order: [['day', 'ASC'], ['periodNumber', 'ASC']]
    });
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error("Schedule fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 GET Current period (for attendance restriction)
router.get("/current-period", verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // "14:30"

    const currentPeriod = await Timetable.findOne({
      where: {
        teacherId: req.user.id,
        day: currentDay,
      }
    });

    // Check if current time is within period
    if (currentPeriod && currentTime >= currentPeriod.startTime && currentTime <= currentPeriod.endTime) {
      res.json({ 
        success: true, 
        inPeriod: true, 
        period: currentPeriod 
      });
    } else {
      res.json({ 
        success: true, 
        inPeriod: false, 
        message: "Not in your assigned period" 
      });
    }
  } catch (error) {
    console.error("Current period error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 POST Create Timetable (HOD only)
router.post("/create", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ success: false, message: "Only HOD can create timetables" });
    }

    const { day, periodNumber, subject, className, teacherId, startTime, endTime, color } = req.body;

    const timetable = await Timetable.create({
      day,
      periodNumber,
      subject,
      className,
      teacherId,
      startTime,
      endTime,
      color: color || "green"
    });

    res.json({ success: true, message: "Timetable created", data: timetable });
  } catch (error) {
    console.error("Timetable create error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 PUT Update Timetable (HOD only)
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ success: false, message: "Only HOD can update timetables" });
    }

    const { id } = req.params;
    const updates = req.body;

    await Timetable.update(updates, { where: { id } });

    res.json({ success: true, message: "Timetable updated" });
  } catch (error) {
    console.error("Timetable update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 DELETE Timetable (HOD only)
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "hod" && req.user.role !== "principal") {
      return res.status(403).json({ success: false, message: "Only HOD can delete timetables" });
    }

    await Timetable.destroy({ where: { id: req.params.id } });

    res.json({ success: true, message: "Timetable deleted" });
  } catch (error) {
    console.error("Timetable delete error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { Student, Attendance, User } = require("../models");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

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

// 📌 GET Attendance Report Data
router.get("/attendance", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, className } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const studentWhere = className ? { class: className } : {};

    const attendanceData = await Attendance.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          where: studentWhere,
          attributes: ['id', 'name', 'rollNumber', 'class']
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    // Group by student
    const studentAttendance = {};
    attendanceData.forEach(record => {
      const studentId = record.Student.id;
      if (!studentAttendance[studentId]) {
        studentAttendance[studentId] = {
          student: record.Student,
          present: 0,
          absent: 0,
          total: 0,
          percentage: 0
        };
      }
      studentAttendance[studentId].total++;
      if (record.status === "Present") {
        studentAttendance[studentId].present++;
      } else {
        studentAttendance[studentId].absent++;
      }
    });

    // Calculate percentages
    Object.values(studentAttendance).forEach(data => {
      data.percentage = data.total > 0 
        ? Math.round((data.present / data.total) * 100) 
        : 0;
    });

    res.json({ 
      success: true, 
      data: Object.values(studentAttendance)
    });
  } catch (error) {
    console.error("Report error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Export as CSV
router.get("/export/csv", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, className } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const studentWhere = className ? { class: className } : {};

    const attendanceData = await Attendance.findAll({
      where: whereClause,
      include: [{ model: Student, where: studentWhere }],
      order: [['date', 'DESC']]
    });

    // Create CSV content
    let csv = "Date,Roll Number,Name,Class,Status\n";
    attendanceData.forEach(record => {
      csv += `${record.date},${record.Student.rollNumber},${record.Student.name},${record.Student.class},${record.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ success: false, message: "Export error" });
  }
});

// 📌 Export as Excel
router.get("/export/excel", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, className } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const studentWhere = className ? { class: className } : {};

    const attendanceData = await Attendance.findAll({
      where: whereClause,
      include: [{ model: Student, where: studentWhere }],
      order: [['date', 'DESC']]
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Add title
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = 'PGP Attendance Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add date range
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Period: ${startDate || 'All'} to ${endDate || 'All'}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Add headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Date', 'Roll Number', 'Name', 'Class', 'Status']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.eachCell(cell => {
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });

    // Add data
    attendanceData.forEach(record => {
      const row = worksheet.addRow([
        record.date,
        record.Student.rollNumber,
        record.Student.name,
        record.Student.class,
        record.status
      ]);
      
      // Color code status
      const statusCell = row.getCell(5);
      if (record.status === 'Present') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCB' }
        };
      }
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.xlsx"`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ success: false, message: "Export error" });
  }
});

// 📌 Export as PDF
router.get("/export/pdf", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, className } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = { [Op.between]: [startDate, endDate] };
    }

    const studentWhere = className ? { class: className } : {};

    const attendanceData = await Attendance.findAll({
      where: whereClause,
      include: [{ model: Student, where: studentWhere }],
      order: [['date', 'DESC']]
    });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.pdf"`);
    
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('PGP Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Period: ${startDate || 'All'} to ${endDate || 'All'}`, { align: 'center' });
    doc.moveDown(2);

    // Table headers
    const tableTop = 150;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date', 50, tableTop);
    doc.text('Roll No', 120, tableTop);
    doc.text('Name', 200, tableTop);
    doc.text('Class', 320, tableTop);
    doc.text('Status', 400, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table data
    doc.font('Helvetica');
    let y = tableTop + 25;
    
    attendanceData.forEach((record, i) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(record.date, 50, y);
      doc.text(record.Student.rollNumber, 120, y);
      doc.text(record.Student.name.substring(0, 15), 200, y);
      doc.text(record.Student.class, 320, y);
      
      if (record.status === 'Present') {
        doc.fillColor('green').text(record.status, 400, y);
      } else {
        doc.fillColor('red').text(record.status, 400, y);
      }
      doc.fillColor('black');

      y += 20;
    });

    // Footer
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ success: false, message: "Export error" });
  }
});

// 📌 Get Low Attendance Students
router.get("/low-attendance", verifyToken, async (req, res) => {
  try {
    const { threshold = 75 } = req.query; // Default 75%

    const students = await Student.findAll();
    const lowAttendanceStudents = [];

    for (const student of students) {
      const attendanceRecords = await Attendance.findAll({
        where: { StudentId: student.id }
      });

      if (attendanceRecords.length > 0) {
        const present = attendanceRecords.filter(r => r.status === 'Present').length;
        const total = attendanceRecords.length;
        const percentage = Math.round((present / total) * 100);

        if (percentage < threshold) {
          lowAttendanceStudents.push({
            student,
            present,
            total,
            percentage
          });
        }
      }
    }

    res.json({ success: true, data: lowAttendanceStudents });
  } catch (error) {
    console.error("Low attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
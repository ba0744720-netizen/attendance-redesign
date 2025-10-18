const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

// Connect SQLite
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: path.join(__dirname, "../database.sqlite"),
  logging: false,
});

// Define models
const Student = sequelize.define("Student", {
  name: { type: DataTypes.STRING, allowNull: false },
  rollNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  class: { type: DataTypes.STRING, allowNull: false },
});

const Attendance = sequelize.define("Attendance", {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
});

// Relationships
Student.hasMany(Attendance, { onDelete: "CASCADE" });
Attendance.belongsTo(Student);

// Sync models
sequelize.sync().then(() => {
  console.log("✅ Database & tables created!");
});

module.exports = { sequelize, Student, Attendance };

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('principal', 'hod', 'advisor', 'teacher'), 
    allowNull: false 
  },
});
module.exports = { sequelize, Student, Attendance, User };
const Timetable = sequelize.define("Timetable", {
  day: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, // Monday, Tuesday, etc.
  periodNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  }, // 1, 2, 3, 4...
  subject: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  className: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, // CSE-A, CSE-B, etc.
  startTime: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, // "09:00"
  endTime: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, // "10:00"
  color: { 
    type: DataTypes.STRING, 
    defaultValue: "white" 
  }, // white, green for visual coding
});

// Relationships
User.hasMany(Timetable, { as: 'assignedPeriods' });
Timetable.belongsTo(User, { as: 'teacher' });
module.exports = { sequelize, User, Student, Attendance, Timetable };
const { Sequelize, DataTypes } = require("sequelize");

// ========================================
// CONNECT TO PostgreSQL
// ========================================
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Test the connection
sequelize.authenticate()
  .then(() => console.log("✅ PostgreSQL connected successfully!"))
  .catch(err => console.error("❌ Database connection error:", err));

// ========================================
// DEFINE MODELS
// ========================================

const Student = sequelize.define("Student", {
  name: { type: DataTypes.STRING, allowNull: false },
  rollNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  class: { type: DataTypes.STRING, allowNull: false },
});

const Attendance = sequelize.define("Attendance", {
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false },
});

const User = sequelize.define("User", {
  staffId: { 
    type: DataTypes.STRING, 
    allowNull: true,
    unique: true 
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('admin', 'teacher'), 
    allowNull: false,
    defaultValue: 'teacher'
  },
});

const Timetable = sequelize.define("Timetable", {
  day: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  periodNumber: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  subject: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  className: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  startTime: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  endTime: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  color: { 
    type: DataTypes.STRING, 
    defaultValue: "white" 
  },
});

// ========================================
// DEFINE RELATIONSHIPS
// ========================================

Student.hasMany(Attendance, { onDelete: "CASCADE" });
Attendance.belongsTo(Student);

User.hasMany(Timetable, { as: 'assignedPeriods' });
Timetable.belongsTo(User, { as: 'teacher' });

// ========================================
// SYNC DATABASE
// ========================================

sequelize.sync({ alter: true })
  .then(() => {
    console.log("✅ Database & tables created!");
  })
  .catch(err => console.error("❌ Database sync error:", err));

// ========================================
// EXPORT MODELS
// ========================================

module.exports = { sequelize, Student, Attendance, User, Timetable };
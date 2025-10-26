const { Sequelize, DataTypes } = require("sequelize");

// ========================================
// CONNECT TO Supabase PostgreSQL
// ========================================

const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      protocol: "postgres",
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'postgres',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        },
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log("✅ Supabase PostgreSQL connected successfully!");
    console.log(`📍 Connected to: ${sequelize.config.host || 'DATABASE_URL host'}`);
  })
  .catch(err => {
    console.error("❌ Database connection error:", err.message);
  });

// ========================================
// DEFINE MODELS (✅ Fixed - Only defined ONCE)
// ========================================

const Student = sequelize.define("Student", {
  name: { type: DataTypes.STRING, allowNull: false },
  rollNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  class: { type: DataTypes.STRING, allowNull: false },
  course: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'B.Tech' 
  },
  year: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'III' 
  },
  branch: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'CSE' 
  }
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

// ========================================
// DEFINE RELATIONSHIPS
// ========================================

Student.hasMany(Attendance, { onDelete: "CASCADE" });
Attendance.belongsTo(Student);

// ========================================
// SYNC DATABASE
// ========================================

sequelize.sync({ alter: true })
  .then(() => {
    console.log("✅ Database & tables synced with Supabase!");
  })
  .catch(err => {
    console.error("❌ Database sync error:", err.message);
  });

// ========================================
// EXPORT MODELS
// ========================================

module.exports = { sequelize, Student, Attendance, User };
const { Sequelize, DataTypes } = require("sequelize");

// ========================================
// CONNECT TO Supabase PostgreSQL
// ========================================

// Option 1: Use DATABASE_URL (if available)
// Option 2: Use individual environment variables
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
    console.error("\n🔍 Connection Details:");
    if (process.env.DATABASE_URL) {
      console.error("Using DATABASE_URL from .env");
      console.error("Check if your DATABASE_URL is correct");
    } else {
      console.error(`Host: ${process.env.DB_HOST}`);
      console.error(`Port: ${process.env.DB_PORT}`);
      console.error(`Database: ${process.env.DB_NAME}`);
      console.error(`User: ${process.env.DB_USER}`);
    }
    console.error("\n💡 Tips:");
    console.error("1. Check if your Supabase project is paused");
    console.error("2. Verify connection string in Supabase Dashboard → Settings → Database");
    console.error("3. Make sure to use the Connection Pooling URL (port 6543)");
  });

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
    type: DataTypes.ENUM('admin', 'teacher', 'advisor', 'principal', 'hod'), 
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
// SYNC DATABASE (Supabase Compatible)
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

module.exports = { sequelize, Student, Attendance, User, Timetable };
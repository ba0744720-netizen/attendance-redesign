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
        min: 1,
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
          min: 1,
          acquire: 30000,
          idle: 10000
        }
      }
    );

// ========================================
// DEFINE MODELS (WITHOUT underscored: true)
// ========================================

const Student = sequelize.define("Student", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false,
    field: 'name'
  },
  rollNumber: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    field: 'rollnumber'  // ✅ Map to actual column name in DB
  },
  class: { 
    type: DataTypes.STRING, 
    allowNull: false,
    field: 'class'
  },
  course: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'B.Tech',
    field: 'course'
  },
  year: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'III',
    field: 'year'
  },
  branch: { 
    type: DataTypes.STRING, 
    allowNull: true,
    defaultValue: 'CSE',
    field: 'branch'
  }
}, {
  timestamps: true,
  underscored: true,  // ✅ ENABLE for timestamps: created_at, updated_at
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Attendance = sequelize.define("Attendance", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: { 
    type: DataTypes.DATEONLY, 
    allowNull: false,
    field: 'date'
  },
  status: { 
    type: DataTypes.ENUM('Present', 'Absent'), 
    allowNull: false,
    field: 'status'
  },
  StudentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Students',
      key: 'id'
    },
    field: 'studentid'  // ✅ Map to actual column name
  }
}, {
  timestamps: true,
  underscored: false,  // ✅ IMPORTANT: Disable snake_case conversion
  tableName: 'attendances'
});

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  staffId: { 
    type: DataTypes.STRING, 
    allowNull: true,
    unique: true,
    field: 'staff_id'  // ✅ Try staff_id with underscore
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false,
    field: 'name'
  },
  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    field: 'email'
  },
  password: { 
    type: DataTypes.STRING, 
    allowNull: false,
    field: 'password'
  },
  role: { 
    type: DataTypes.ENUM('admin', 'teacher'), 
    allowNull: false,
    defaultValue: 'teacher',
    field: 'role'
  },
}, {
  timestamps: true,
  underscored: false,  // ✅ IMPORTANT: Disable snake_case conversion
  tableName: 'users'
});

// ========================================
// DEFINE RELATIONSHIPS
// ========================================

Student.hasMany(Attendance, { 
  foreignKey: 'StudentId',
  onDelete: "CASCADE",
  onUpdate: "CASCADE"
});
Attendance.belongsTo(Student, { 
  foreignKey: 'StudentId' 
});

// ========================================
// EXPORT MODELS
// ========================================

module.exports = { 
  sequelize, 
  Student, 
  Attendance, 
  User 
};
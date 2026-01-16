const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  subject_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: true,
      min: 0,
      max: 100,
    },
  },
  evaluated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'grades',
  timestamps: false,
});

module.exports = Grade;

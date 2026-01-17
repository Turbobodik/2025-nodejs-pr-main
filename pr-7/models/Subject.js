const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  subject_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 255],
    },
  },
}, {
  tableName: 'subjects',
  timestamps: false,
});

module.exports = Subject;

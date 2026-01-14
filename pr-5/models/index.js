const Role = require('./Role');
const User = require('./User');
const Student = require('./Student');
const Subject = require('./Subject');
const Grade = require('./Grade');

// Define associations
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Student, { foreignKey: 'user_id', as: 'student' });

Grade.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
Grade.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Subject.hasMany(Grade, { foreignKey: 'subject_id', as: 'grades' });
Student.hasMany(Grade, { foreignKey: 'student_id', as: 'grades' });

module.exports = {
  Role,
  User,
  Student,
  Subject,
  Grade,
};

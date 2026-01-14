const { body, param, query, validationResult } = require('express-validator');

// Validation middleware to check for errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Validation rules for creating a student
const validateCreateStudent = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required and must be a non-empty string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('age')
    .isInt({ min: 0 })
    .withMessage('Age is required and must be a non-negative integer'),
  body('group')
    .isInt()
    .withMessage('Group is required and must be an integer'),
  handleValidationErrors,
];

// Validation rules for updating a student
const validateUpdateStudent = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Student ID must be a positive integer'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required and must be a non-empty string')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('age')
    .isInt({ min: 0 })
    .withMessage('Age is required and must be a non-negative integer'),
  body('group')
    .isInt()
    .withMessage('Group is required and must be an integer'),
  handleValidationErrors,
];

// Validation rules for student ID parameter
const validateStudentId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Student ID must be a positive integer'),
  handleValidationErrors,
];

// Validation rules for group ID parameter
const validateGroupId = [
  param('id')
    .isInt()
    .withMessage('Group ID must be a number'),
  handleValidationErrors,
];

// Validation rules for query parameters (filtering)
const validateQueryFilters = [
  query('group')
    .optional()
    .isInt()
    .withMessage('Group must be a number'),
  query('minAge')
    .optional()
    .isInt({ min: 0 })
    .withMessage('minAge must be a non-negative number'),
  query('maxAge')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxAge must be a non-negative number'),
  handleValidationErrors,
];

// Validation rules for replacing all students
const validateReplaceAllStudents = [
  body('students')
    .isArray()
    .withMessage('Request body must contain an array of students'),
  body('students.*.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Student id must be a valid positive integer if provided'),
  body('students.*.name')
    .trim()
    .notEmpty()
    .withMessage('Each student must have a non-empty name')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('students.*.age')
    .isInt({ min: 0 })
    .withMessage('Each student must have a non-negative integer age'),
  body('students.*.group')
    .isInt()
    .withMessage('Each student must have an integer group'),
  handleValidationErrors,
];

// Validation rules for backup interval
const validateBackupInterval = [
  body('interval')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Interval must be a number >= 1 (in seconds)'),
  handleValidationErrors,
];

module.exports = {
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId,
  validateGroupId,
  validateQueryFilters,
  validateReplaceAllStudents,
  validateBackupInterval,
  handleValidationErrors,
};

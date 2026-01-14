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

// Validation rules for registration
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('surname')
    .trim()
    .notEmpty()
    .withMessage('Surname is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Surname must be between 1 and 255 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role_id')
    .optional()
    .isUUID()
    .withMessage('Role ID must be a valid UUID'),
  handleValidationErrors,
];

// Validation rules for login
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Validation rules for creating a student
const validateCreateStudent = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('age')
    .isInt({ min: 0 })
    .withMessage('Age must be a non-negative integer'),
  body('group')
    .isInt()
    .withMessage('Group must be an integer'),
  body('user_id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
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
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters'),
  body('age')
    .isInt({ min: 0 })
    .withMessage('Age must be a non-negative integer'),
  body('group')
    .isInt()
    .withMessage('Group must be an integer'),
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

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId,
  validateGroupId,
  handleValidationErrors,
};

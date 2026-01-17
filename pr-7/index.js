const express = require('express');
const cors = require('cors');
const compression = require('compression');
const bcrypt = require('bcrypt');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const expressStatusMonitor = require('express-status-monitor');
const { sequelize, testConnection } = require('./config/database');
const { authenticate, authorize, generateToken } = require('./middleware/auth');
const { validateRegister, validateLogin, validateCreateStudent, validateUpdateStudent, validateStudentId, validateGroupId } = require('./middleware/validation');
const logger = require('./utils/logger');
const swaggerSpec = require('./config/swagger');

// Import models (loads associations)
const { Role, User, Student, Subject, Grade } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable compression middleware
app.use(compression());

// Express Status Monitor - protected route for admin/teacher only
// Mount status monitor with authentication and authorization middleware
app.use('/status', authenticate, authorize('admin', 'teacher'), expressStatusMonitor());

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Student Management API Documentation',
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Authentication Routes (Public)

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - surname
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               surname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional role ID (defaults to student role)
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
app.post('/api/auth/register', validateRegister, async (req, res) => {
  try {
    const { name, surname, email, password, role_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn(`Registration attempt with existing email: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default role (student) if not provided
    let userRoleId = role_id;
    if (!userRoleId) {
      const studentRole = await Role.findOne({ where: { role_name: 'student' } });
      if (!studentRole) {
        logger.error('Default student role not found in database');
        return res.status(500).json({
          success: false,
          error: 'Default role not found. Please run migrations first.',
        });
      }
      userRoleId = studentRole.id;
    }

    // Create user
    const user = await User.create({
      name,
      surname,
      email,
      password: hashedPassword,
      role_id: userRoleId,
    });

    // Get role for token
    const role = await Role.findByPk(userRoleId);

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: role.role_name,
      name: user.name,
      surname: user.surname,
    });

    logger.info(`User registered successfully: ${email}`, { userId: user.id, role: role.role_name });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: role.role_name,
      },
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      logger.warn(`Login attempt with invalid email: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login attempt with invalid password for email: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role.role_name,
      name: user.name,
      surname: user.surname,
    });

    logger.info(`User logged in successfully: ${email}`, { userId: user.id, role: user.role.role_name });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role.role_name,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Protected Routes - All require authentication

// Test endpoint to trigger errors (for testing logging) - MUST be before 404 handler
// Enable in production by setting ENABLE_TEST_ENDPOINTS=true or run in development mode
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_ENDPOINTS === 'true' || true) { // Always enabled for testing - remove || true in production
  /**
   * @swagger
   * /api/test/error:
   *   post:
   *     summary: Test endpoint to trigger error logging (testing only)
   *     tags: [Testing]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       500:
   *         description: Error triggered for testing
   */
  app.post('/api/test/error', authenticate, (req, res, next) => {
    logger.error('Test error triggered', { 
      test: true, 
      triggeredBy: req.user?.email || 'unknown',
      timestamp: new Date().toISOString() 
    });
    const testError = new Error('This is a test error for logging verification');
    next(testError);
  });

  // Simple test endpoint without auth (for easier testing)
  app.get('/api/test/error-simple', (req, res, next) => {
    logger.error('Simple test error triggered', { 
      test: true,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString() 
    });
    const testError = new Error('Simple test error for logging verification');
    next(testError);
  });
}

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all students
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.get('/api/students', authenticate, async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    // Convert Sequelize instances to plain objects to ensure proper JSON serialization
    const studentsData = students.map(student => student.toJSON());

    logger.debug(`Retrieved ${studentsData.length} students`, { requestedBy: req.user.email });

    res.status(200).json({
      success: true,
      count: studentsData.length,
      students: studentsData,
    });
  } catch (error) {
    logger.error('Error retrieving students', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student details
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.get('/api/students/:id', authenticate, validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    if (student) {
      logger.debug(`Retrieved student ${studentId}`, { requestedBy: req.user.email });
      res.status(200).json({
        success: true,
        student: student.toJSON(),
      });
    } else {
      logger.warn(`Student not found: ${studentId}`, { requestedBy: req.user.email });
      res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`,
      });
    }
  } catch (error) {
    logger.error('Error retrieving student', { error: error.message, stack: error.stack, studentId: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/students/group/{id}:
 *   get:
 *     summary: Get students by group number
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Group number
 *     responses:
 *       200:
 *         description: List of students in the group
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.get('/api/students/group/:id', authenticate, validateGroupId, async (req, res) => {
  try {
    const { id } = req.params;
    const groupNum = parseInt(id);

    const students = await Student.findAll({
      where: { group: groupNum },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    // Convert Sequelize instances to plain objects to ensure proper JSON serialization
    const studentsData = students.map(student => student.toJSON());

    logger.debug(`Retrieved ${studentsData.length} students from group ${groupNum}`, { requestedBy: req.user.email });

    res.status(200).json({
      success: true,
      group: groupNum,
      count: studentsData.length,
      students: studentsData,
    });
  } catch (error) {
    logger.error('Error retrieving students by group', { error: error.message, stack: error.stack, groupId: req.params.id });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Add new student (Admin/Teacher only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - age
 *               - group
 *               - user_id
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               age:
 *                 type: integer
 *                 minimum: 0
 *               group:
 *                 type: integer
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Validation error or student already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
app.post('/api/students', authenticate, authorize('admin', 'teacher'), validateCreateStudent, async (req, res) => {
  try {
    const { name, age, group, user_id } = req.body;

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      logger.warn(`Attempt to create student for non-existent user: ${user_id}`, { requestedBy: req.user.email });
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if student already exists for this user
    const existingStudent = await Student.findOne({ where: { user_id } });
    if (existingStudent) {
      logger.warn(`Attempt to create duplicate student for user: ${user_id}`, { requestedBy: req.user.email });
      return res.status(400).json({
        success: false,
        error: 'Student record already exists for this user',
      });
    }

    const student = await Student.create({
      name,
      age,
      group,
      user_id,
    });

    // Reload with user association for response
    await student.reload({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    logger.info(`Student created successfully: ${student.id}`, { requestedBy: req.user.email, studentId: student.id, userId: user_id });

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: student.toJSON(),
    });
  } catch (error) {
    logger.error('Error creating student', { error: error.message, stack: error.stack, requestedBy: req.user?.email });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     summary: Update student (Admin/Teacher only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - age
 *               - group
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               age:
 *                 type: integer
 *                 minimum: 0
 *               group:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
app.put('/api/students/:id', authenticate, authorize('admin', 'teacher'), validateUpdateStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const { name, age, group } = req.body;

    const student = await Student.findByPk(studentId);
    if (!student) {
      logger.warn(`Attempt to update non-existent student: ${studentId}`, { requestedBy: req.user.email });
      return res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`,
      });
    }

    student.name = name.trim();
    student.age = age;
    student.group = group;
    await student.save();

    // Reload with user association for response
    await student.reload({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    logger.info(`Student updated successfully: ${studentId}`, { requestedBy: req.user.email });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      student: student.toJSON(),
    });
  } catch (error) {
    logger.error('Error updating student', { error: error.message, stack: error.stack, studentId: req.params.id, requestedBy: req.user?.email });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     summary: Delete student (Admin only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Student not found
 *       500:
 *         description: Server error
 */
app.delete('/api/students/:id', authenticate, authorize('admin'), validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });
    if (!student) {
      logger.warn(`Attempt to delete non-existent student: ${studentId}`, { requestedBy: req.user.email });
      return res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`,
      });
    }

    // Get student data before destroying
    const studentData = student.toJSON();
    await student.destroy();

    logger.info(`Student deleted successfully: ${studentId}`, { requestedBy: req.user.email });

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      student: studentData,
    });
  } catch (error) {
    logger.error('Error deleting student', { error: error.message, stack: error.stack, studentId: req.params.id, requestedBy: req.user?.email });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path, method: req.method });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler for API routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
    });
  }
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

async function startServer() {
  try {
    // Log the mode at startup
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  🚀 Server Starting in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log(`  📝 NODE_ENV: ${nodeEnv}`);
    if (isProduction) {
      console.log(`  📁 Log files location: ${path.join(__dirname, 'logs')}`);
      console.log(`  📋 Log files will be created in: logs/ directory`);
    } else {
      console.log(`  💻 Console logging enabled`);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      logger.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`, { port: PORT, env: nodeEnv });
      logger.info(`API available at http://localhost:${PORT}/api/`);
      logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Status monitor available at http://localhost:${PORT}/status`);
      if (isProduction) {
        logger.info(`Log files location: ${path.join(__dirname, 'logs')}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  try {
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  try {
    await sequelize.close();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
});

// Export app for testing
if (require.main !== module || process.env.NODE_ENV === 'test') {
  module.exports = app;
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

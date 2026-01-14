const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { sequelize, testConnection } = require('./config/database');
const { authenticate, authorize, generateToken } = require('./middleware/auth');
const { validateRegister, validateLogin, validateCreateStudent, validateUpdateStudent, validateStudentId, validateGroupId } = require('./middleware/validation');

// Import models (loads associations)
const { Role, User, Student, Subject, Grade } = require('./models');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication Routes (Public)

// POST /api/auth/register - Register new user
app.post('/api/auth/register', validateRegister, async (req, res) => {
  try {
    const { name, surname, email, password, role_id } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
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
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/auth/login - Login user
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Protected Routes - All require authentication

// GET /api/students - Get all students
app.get('/api/students', authenticate, async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    // Convert Sequelize instances to plain objects to ensure proper JSON serialization
    const studentsData = students.map(student => student.toJSON());

    res.status(200).json({
      success: true,
      count: studentsData.length,
      students: studentsData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/:id - Get student by ID
app.get('/api/students/:id', authenticate, validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });

    if (student) {
      res.status(200).json({
        success: true,
        student: student.toJSON(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/group/:id - Get students by group
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

    res.status(200).json({
      success: true,
      group: groupNum,
      count: studentsData.length,
      students: studentsData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/students - Add new student (Admin/Teacher only)
app.post('/api/students', authenticate, authorize('admin', 'teacher'), validateCreateStudent, async (req, res) => {
  try {
    const { name, age, group, user_id } = req.body;

    // Verify user exists
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if student already exists for this user
    const existingStudent = await Student.findOne({ where: { user_id } });
    if (existingStudent) {
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

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: student.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/students/:id - Update student (Admin/Teacher only)
app.put('/api/students/:id', authenticate, authorize('admin', 'teacher'), validateUpdateStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const { name, age, group } = req.body;

    const student = await Student.findByPk(studentId);
    if (!student) {
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

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      student: student.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/students/:id - Delete student (Admin only)
app.delete('/api/students/:id', authenticate, authorize('admin'), validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }],
    });
    if (!student) {
      return res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`,
      });
    }

    // Get student data before destroying
    const studentData = student.toJSON();
    await student.destroy();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      student: studentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler for API routes
app.use((req, res) => {
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
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api/`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer();

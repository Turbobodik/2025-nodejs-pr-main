const express = require('express');
const cors = require('cors');
const path = require('path');
const {
  addStudent,
  removeStudent,
  updateStudent,
  getStudentById,
  getStudentsByGroup,
  getAllStudents,
  calculateAverageAge,
  loadStudents,
  saveStudents,
  replaceAllStudents,
  startBackupManager,
  stopBackupManager,
  getBackupManager,
} = require('./student');
const { BackupReporter } = require('./backup-reporter');
const {
  validateCreateStudent,
  validateUpdateStudent,
  validateStudentId,
  validateGroupId,
  validateQueryFilters,
  validateReplaceAllStudents,
  validateBackupInterval,
} = require('./middleware/validation');
const { sequelize, testConnection } = require('./config/database');

const app = express();
const PORT = 3000;

// Enable CORS for frontend
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'cv.html'));
});

// API Routes for Students
// Note: More specific routes must come before less specific ones

// GET /api/students/group/:id - Get all students by specific group id
app.get('/api/students/group/:id', validateGroupId, async (req, res) => {
  try {
    const { id } = req.params;
    const groupNum = parseInt(id);

    const students = await getStudentsByGroup(groupNum);
    res.status(200).json({
      success: true,
      group: groupNum,
      count: students.length,
      students: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/average-age - Calculate average age of students
app.get('/api/students/average-age', async (req, res) => {
  try {
    const averageAge = await calculateAverageAge();
    const allStudents = await getAllStudents();
    res.status(200).json({
      success: true,
      averageAge: parseFloat(averageAge.toFixed(2)),
      studentCount: allStudents.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/save - Save students to JSON file (for backup compatibility)
app.get('/api/students/save', async (req, res) => {
  try {
    await saveStudents();
    const allStudents = await getAllStudents();
    res.status(200).json({
      success: true,
      message: 'Students saved successfully',
      count: allStudents.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/load - Load students from JSON file (for backup compatibility)
app.get('/api/students/load', async (req, res) => {
  try {
    await loadStudents();
    const allStudents = await getAllStudents();
    res.status(200).json({
      success: true,
      message: 'Students loaded successfully',
      count: allStudents.length,
      students: allStudents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students - Get all students (with optional filtering)
app.get('/api/students', validateQueryFilters, async (req, res) => {
  try {
    let students = await getAllStudents();
    
    // Apply filters from query parameters
    const { group, minAge, maxAge } = req.query;
    
    if (group !== undefined) {
      const groupNum = parseInt(group);
      students = students.filter(s => s.group === groupNum);
    }
    
    if (minAge !== undefined) {
      const minAgeNum = parseInt(minAge);
      students = students.filter(s => s.age >= minAgeNum);
    }
    
    if (maxAge !== undefined) {
      const maxAgeNum = parseInt(maxAge);
      students = students.filter(s => s.age <= maxAgeNum);
    }
    
    res.status(200).json({
      success: true,
      count: students.length,
      students: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/students - Add new student
app.post('/api/students', validateCreateStudent, async (req, res) => {
  try {
    const { name, age, group } = req.body;

    const student = await addStudent(name.trim(), age, group);
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/students - Completely replace old students collection with a new one
app.put('/api/students', validateReplaceAllStudents, async (req, res) => {
  try {
    const { students: newStudents } = req.body;

    const students = await replaceAllStudents(newStudents);
    res.status(200).json({
      success: true,
      message: 'Students collection replaced successfully',
      count: students.length,
      students: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/students/:id - Get student by ID
app.get('/api/students/:id', validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const student = await getStudentById(studentId);

    if (student) {
      res.status(200).json({
        success: true,
        student: student,
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

// PUT /api/students/:id - Update existing student by ID
app.put('/api/students/:id', validateUpdateStudent, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const { name, age, group } = req.body;

    const updatedStudent = await updateStudent(studentId, name.trim(), age, group);

    if (updatedStudent) {
      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        student: updatedStudent,
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

// DELETE /api/students/:id - Remove existing student by ID
app.delete('/api/students/:id', validateStudentId, async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = parseInt(id);
    const removed = await removeStudent(studentId);

    if (removed) {
      res.status(200).json({
        success: true,
        message: 'Student removed successfully',
        student: removed,
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

// Backup Management API Routes

// POST /api/backup/start - Start backup manager
app.post('/api/backup/start', validateBackupInterval, (req, res) => {
  try {
    const { interval } = req.body;
    const intervalMs = interval ? parseInt(interval) * 1000 : 30000;

    const backupManager = getBackupManager();
    if (backupManager && backupManager.isRunning()) {
      return res.status(200).json({
        success: true,
        message: 'Backup manager is already running',
        status: 'running',
      });
    }

    startBackupManager(intervalMs);
    res.status(200).json({
      success: true,
      message: 'Backup manager started',
      status: 'running',
      interval: intervalMs / 1000,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/backup/stop - Stop backup manager
app.post('/api/backup/stop', (req, res) => {
  try {
    const backupManager = getBackupManager();
    if (!backupManager || !backupManager.isRunning()) {
      return res.status(200).json({
        success: true,
        message: 'Backup manager is not running',
        status: 'stopped',
      });
    }

    stopBackupManager();
    res.status(200).json({
      success: true,
      message: 'Backup manager stopped',
      status: 'stopped',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/backup/status - Get backup manager status
app.get('/api/backup/status', (req, res) => {
  try {
    const backupManager = getBackupManager();
    const isRunning = backupManager ? backupManager.isRunning() : false;
    const status = isRunning ? 'running' : 'stopped';

    res.status(200).json({
      success: true,
      status: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/backup/report - Get backup report
app.get('/api/backup/report', async (req, res) => {
  try {
    const reporter = new BackupReporter();
    const report = await reporter.generateReport();

    res.status(200).json({
      success: true,
      report: report,
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
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found',
    });
  }
  next();
});

async function startServer() {
  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    // Load students (initialize data)
    await loadStudents();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`CV available at http://localhost:${PORT}/`);
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
  stopBackupManager();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  stopBackupManager();
  await sequelize.close();
  process.exit(0);
});

startServer();

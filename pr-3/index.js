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
app.get('/api/students/group/:id', (req, res) => {
  try {
    const { id } = req.params;
    const groupNum = parseInt(id);

    if (isNaN(groupNum)) {
      return res.status(400).json({
        success: false,
        error: 'Group id must be a number'
      });
    }

    const students = getStudentsByGroup(groupNum);
    res.status(200).json({
      success: true,
      group: groupNum,
      count: students.length,
      students: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/average-age - Calculate average age of students
app.get('/api/students/average-age', (req, res) => {
  try {
    const averageAge = calculateAverageAge();
    res.status(200).json({
      success: true,
      averageAge: parseFloat(averageAge.toFixed(2)),
      studentCount: getAllStudents().length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/save - Save students to JSON file
app.get('/api/students/save', async (req, res) => {
  try {
    await saveStudents();
    res.status(200).json({
      success: true,
      message: 'Students saved successfully',
      count: getAllStudents().length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/load - Load students from JSON file
app.get('/api/students/load', async (req, res) => {
  try {
    await loadStudents();
    res.status(200).json({
      success: true,
      message: 'Students loaded successfully',
      count: getAllStudents().length,
      students: getAllStudents()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students - Get all students (with optional filtering)
app.get('/api/students', (req, res) => {
  try {
    let students = getAllStudents();
    
    // Apply filters from query parameters
    const { group, minAge, maxAge } = req.query;
    
    if (group !== undefined) {
      const groupNum = parseInt(group);
      if (isNaN(groupNum)) {
        return res.status(400).json({
          success: false,
          error: 'Group must be a number'
        });
      }
      students = students.filter(s => s.group === groupNum);
    }
    
    if (minAge !== undefined) {
      const minAgeNum = parseInt(minAge);
      if (isNaN(minAgeNum)) {
        return res.status(400).json({
          success: false,
          error: 'minAge must be a number'
        });
      }
      students = students.filter(s => s.age >= minAgeNum);
    }
    
    if (maxAge !== undefined) {
      const maxAgeNum = parseInt(maxAge);
      if (isNaN(maxAgeNum)) {
        return res.status(400).json({
          success: false,
          error: 'maxAge must be a number'
        });
      }
      students = students.filter(s => s.age <= maxAgeNum);
    }
    
    res.status(200).json({
      success: true,
      count: students.length,
      students: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/students - Add new student
app.post('/api/students', async (req, res) => {
  try {
    const { name, age, group } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be a non-empty string'
      });
    }

    if (age === undefined || typeof age !== 'number' || age < 0 || !Number.isInteger(age)) {
      return res.status(400).json({
        success: false,
        error: 'Age is required and must be a non-negative integer'
      });
    }

    if (group === undefined || typeof group !== 'number' || !Number.isInteger(group)) {
      return res.status(400).json({
        success: false,
        error: 'Group is required and must be an integer'
      });
    }

    const student = await addStudent(name.trim(), age, group);
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/students - Completely replace old students collection with a new one
app.put('/api/students', async (req, res) => {
  try {
    const { students: newStudents } = req.body;

    if (!Array.isArray(newStudents)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an array of students'
      });
    }

    // Validate all students
    for (let i = 0; i < newStudents.length; i++) {
      const student = newStudents[i];
      if (!student.id || typeof student.id !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Student at index ${i}: id is required and must be a string`
        });
      }
      if (!student.name || typeof student.name !== 'string' || student.name.trim() === '') {
        return res.status(400).json({
          success: false,
          error: `Student at index ${i}: name is required and must be a non-empty string`
        });
      }
      if (student.age === undefined || typeof student.age !== 'number' || student.age < 0 || !Number.isInteger(student.age)) {
        return res.status(400).json({
          success: false,
          error: `Student at index ${i}: age is required and must be a non-negative integer`
        });
      }
      if (student.group === undefined || typeof student.group !== 'number' || !Number.isInteger(student.group)) {
        return res.status(400).json({
          success: false,
          error: `Student at index ${i}: group is required and must be an integer`
        });
      }
    }

    const students = await replaceAllStudents(newStudents);
    res.status(200).json({
      success: true,
      message: 'Students collection replaced successfully',
      count: students.length,
      students: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/students/:id - Get student by ID
app.get('/api/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = getStudentById(id);

    if (student) {
      res.status(200).json({
        success: true,
        student: student
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/students/:id - Update existing student by ID
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, group } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Name is required and must be a non-empty string'
      });
    }

    if (age === undefined || typeof age !== 'number' || age < 0 || !Number.isInteger(age)) {
      return res.status(400).json({
        success: false,
        error: 'Age is required and must be a non-negative integer'
      });
    }

    if (group === undefined || typeof group !== 'number' || !Number.isInteger(group)) {
      return res.status(400).json({
        success: false,
        error: 'Group is required and must be an integer'
      });
    }

    const updatedStudent = await updateStudent(id, name.trim(), age, group);

    if (updatedStudent) {
      res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        student: updatedStudent
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/students/:id - Remove existing student by ID
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await removeStudent(id);

    if (removed) {
      res.status(200).json({
        success: true,
        message: 'Student removed successfully',
        student: removed
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Student with id ${id} not found`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Backup Management API Routes

// POST /api/backup/start - Start backup manager
app.post('/api/backup/start', (req, res) => {
  try {
    const { interval } = req.body;
    const intervalMs = interval ? parseInt(interval) * 1000 : 30000;

    if (interval && (isNaN(intervalMs) || intervalMs < 1000)) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be a number >= 1 (in seconds)'
      });
    }

    const backupManager = getBackupManager();
    if (backupManager && backupManager.isRunning()) {
      return res.status(200).json({
        success: true,
        message: 'Backup manager is already running',
        status: 'running'
      });
    }

    startBackupManager(intervalMs);
    res.status(200).json({
      success: true,
      message: 'Backup manager started',
      status: 'running',
      interval: intervalMs / 1000
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
        status: 'stopped'
      });
    }

    stopBackupManager();
    res.status(200).json({
      success: true,
      message: 'Backup manager stopped',
      status: 'stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
      status: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
      report: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  }
  next();
});

async function startServer() {
  try {
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

startServer();

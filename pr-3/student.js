class Student {
  /**
   * @param {string} id
   * @param {stirng} name
   * @param {number} age
   * @param {string} group
   */
  constructor(id, name, age, group) {
    this.id = id;
    this.name = name;
    this.age = age;
    this.group = group;
  }
}

const { EventEmitter } = require("events");
const { saveToJSON, loadJSON } = require("./file-utils");
const { BackupManager } = require("./backup-manager");
const STUDENTS_FILE_PATH = "students.json";

const studentEvents = new EventEmitter();
let students = [];
let backupManager = null;

async function loadStudents() {
  try {
    const studentsData = await loadJSON(STUDENTS_FILE_PATH);
    if (Array.isArray(studentsData)) {
      students = studentsData.map(
        (s) => new Student(s.id, s.name, s.age, s.group)
      );
    } else {
      students = [];
    }
    studentEvents.emit("students:loaded", students);
  } catch (error) {
    if (error.code === "ENOENT") {
      students = [];
      studentEvents.emit("students:loaded", students);
    } else {
      studentEvents.emit("students:load:error", error);
      throw error;
    }
  }
}

async function saveStudents() {
  try {
    await saveToJSON(students, STUDENTS_FILE_PATH);
    studentEvents.emit("students:saved", students);
  } catch (error) {
    studentEvents.emit("students:save:error", error);
    throw error;
  }
}

async function addStudent(name, age, group) {
  const id = (students.length + 1).toString();
  const student = new Student(id, name, age, group);
  students.push(student);
  await saveStudents();
  studentEvents.emit("student:added", student);
  return student;
}

async function removeStudent(id) {
  const index = students.findIndex((s) => s.id === id);
  if (index !== -1) {
    const removed = students.splice(index, 1)[0];
    await saveStudents();
    studentEvents.emit("student:removed", removed);
    return removed;
  }
  studentEvents.emit("student:remove:notfound", id);
  return null;
}

function getStudentById(id) {
  const student = students.find((s) => s.id === id);
  studentEvents.emit("student:retrieved", student, id);
  return student;
}

function getStudentsByGroup(group) {
  const filteredStudents = students.filter((s) => s.group === group);
  studentEvents.emit("students:filtered", filteredStudents, group);
  return filteredStudents;
}

function getAllStudents() {
  studentEvents.emit("students:retrieved", students);
  return students;
}

function startBackupManager(intervalMs = 30000) {
  if (backupManager === null) {
    backupManager = new BackupManager(getAllStudents, intervalMs);
    backupManager.start();
  }
  return backupManager;
}

function getBackupManager() {
  return backupManager;
}

function stopBackupManager() {
  if (backupManager !== null) {
    backupManager.stop();
  }
}

function calculateAverageAge() {
  let averageAge = 0;
  if (students.length > 0) {
    const totalAge = students.reduce((sum, s) => sum + s.age, 0);
    averageAge = totalAge / students.length;
  }
  studentEvents.emit("average:calculated", averageAge);
  return averageAge;
}

async function updateStudent(id, name, age, group) {
  const index = students.findIndex((s) => s.id === id);
  if (index !== -1) {
    const student = students[index];
    student.name = name;
    student.age = age;
    student.group = group;
    await saveStudents();
    studentEvents.emit("student:updated", student);
    return student;
  }
  studentEvents.emit("student:update:notfound", id);
  return null;
}

async function replaceAllStudents(newStudents) {
  if (!Array.isArray(newStudents)) {
    throw new Error("Students must be an array");
  }
  
  // Validate all students have required fields
  for (const student of newStudents) {
    if (!student.id || !student.name || student.age === undefined || student.group === undefined) {
      throw new Error("All students must have id, name, age, and group");
    }
  }
  
  students = newStudents.map((s) => new Student(s.id, s.name, s.age, s.group));
  await saveStudents();
  studentEvents.emit("students:replaced", students);
  return students;
}

loadStudents();

module.exports = {
  Student,
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
  studentEvents,
};


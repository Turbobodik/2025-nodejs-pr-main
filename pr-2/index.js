const {
  Student,
  addStudent,
  removeStudent,
  getStudentById,
  getStudentsByGroup,
  getAllStudents,
  calculateAverageAge,
  loadStudents,
  startBackupManager,
  stopBackupManager,
  getBackupManager,
  studentEvents,
} = require("./student");
const { Logger } = require("./logger");
const { saveToJSON, loadJSON } = require("./file-utils");
const { BackupReporter } = require("./backup-reporter");

async function main() {
  const isVerbose = process.argv.includes("--verbose");
  const isQuiet = process.argv.includes("--quiet");

  const logger = new Logger(isVerbose, isQuiet);

  studentEvents.on("students:loaded", (students) => {
    logger.log(`Event: students:loaded - ${students.length} students loaded`);
  });

  studentEvents.on("students:load:error", (error) => {
    logger.log(`Event: students:load:error - ${error.message}`);
  });

  studentEvents.on("students:saved", (students) => {
    logger.log(`Event: students:saved - ${students.length} students saved`);
  });

  studentEvents.on("students:save:error", (error) => {
    logger.log(`Event: students:save:error - ${error.message}`);
  });

  studentEvents.on("student:added", (student) => {
    logger.log(`Event: student:added - ${student.name} (id: ${student.id})`);
  });

  studentEvents.on("student:removed", (student) => {
    logger.log(`Event: student:removed - ${student.name} (id: ${student.id})`);
  });

  studentEvents.on("student:remove:notfound", (id) => {
    logger.log(`Event: student:remove:notfound - student with id ${id} not found`);
  });

  studentEvents.on("student:retrieved", (student, id) => {
    if (student) {
      logger.log(`Event: student:retrieved - ${student.name} (id: ${id})`);
    } else {
      logger.log(`Event: student:retrieved - no student found with id ${id}`);
    }
  });

  studentEvents.on("students:filtered", (filteredStudents, group) => {
    logger.log(`Event: students:filtered - ${filteredStudents.length} students in group ${group}`);
  });

  studentEvents.on("students:retrieved", (students) => {
    logger.log(`Event: students:retrieved - ${students.length} students`);
  });

  studentEvents.on("average:calculated", (averageAge) => {
    logger.log(`Event: average:calculated - ${averageAge.toFixed(2)}`);
  });

  await loadStudents();
  startBackupManager(30000);
  
  const backupManager = getBackupManager();
  if (backupManager) {
    backupManager.on("backup:started", (intervalSeconds) => {
      logger.log(`Event: backup:started - interval: ${intervalSeconds}s`);
    });

    backupManager.on("backup:already-running", () => {
      logger.log("Event: backup:already-running");
    });

    backupManager.on("backup:completed", (fileName) => {
      logger.log(`Event: backup:completed - ${fileName}`);
    });

    backupManager.on("backup:failed", (error, fileName) => {
      logger.log(`Event: backup:failed - ${error.message} (file: ${fileName || "unknown"})`);
    });

    backupManager.on("backup:error", (error) => {
      logger.log(`Event: backup:error - ${error.message}`);
    });

    backupManager.on("backup:timeout", (error) => {
      logger.log(`Event: backup:timeout - ${error.message}`);
    });

    backupManager.on("backup:stopped", () => {
      logger.log("Event: backup:stopped");
    });

    backupManager.on("backup:not-running", () => {
      logger.log("Event: backup:not-running");
    });
  }

  logger.log("Initial students:", getAllStudents());

  await addStudent("Bahdan", 23, 4);
  logger.log("Students after adding Bahdan:", getAllStudents());

  await removeStudent("4");
  logger.log('Students after removing student with id "4":', getAllStudents());

  logger.log("Average student age:", calculateAverageAge());
  logger.log("Backup manager is running. Press Ctrl+C to stop.");
  
  setTimeout(async () => {
    logger.log("Stopping backup manager...");
    stopBackupManager();
    
    const reporter = new BackupReporter();
    await reporter.generateReport();
    
    logger.log("Backup manager stopped. Exiting in 2 seconds...");
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }, 120000);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

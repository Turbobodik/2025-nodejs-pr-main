const fs = require("fs").promises;
const path = require("path");
const { loadJSON } = require("./file-utils");

class BackupReporter {
  #backupDirectory = "backups";

  async #getBackupFiles() {
    const backupPath = path.resolve(this.#backupDirectory);
    try {
      const files = await fs.readdir(backupPath);
      return files
        .filter((file) => file.endsWith(".backup.json"))
        .map((file) => path.join(backupPath, file));
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  #parseTimestampFromFilename(filename) {
    const basename = path.basename(filename, ".backup.json");
    const timestampStr = basename.replace("backup-", "");
    const [timePart] = timestampStr.split("T");
    if (!timePart) {
      const parts = timestampStr.split("-");
      if (parts.length >= 6) {
        const [year, month, day, hour, minute, second] = parts;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
    }
    return new Date(timestampStr);
  }

  async generateReport() {
    const backupFiles = await this.#getBackupFiles();
    const amountOfBackupFiles = backupFiles.length;

    if (amountOfBackupFiles === 0) {
      return {
        amountOfBackupFiles: 0,
        message: "No backup files found."
      };
    }

    let latestFile = null;
    let latestDate = null;
    const studentIdCounts = {};
    let totalStudents = 0;
    let totalFilesWithStudents = 0;

    for (const filePath of backupFiles) {
      try {
        const students = await loadJSON(filePath);
        if (!Array.isArray(students)) {
          continue;
        }

        const fileDate = this.#parseTimestampFromFilename(filePath);
        if (!latestDate || fileDate > latestDate) {
          latestDate = fileDate;
          latestFile = path.basename(filePath);
        }

        students.forEach((student) => {
          if (student && student.id) {
            studentIdCounts[student.id] = (studentIdCounts[student.id] || 0) + 1;
          }
        });

        totalStudents += students.length;
        if (students.length > 0) {
          totalFilesWithStudents++;
        }
      } catch (error) {
        console.error(`Error reading backup file ${filePath}: ${error.message}`);
      }
    }

    const averageAmount = totalFilesWithStudents > 0 
      ? totalStudents / totalFilesWithStudents 
      : 0;

    const studentsById = Object.entries(studentIdCounts)
      .map(([id, amount]) => ({ id, amount }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      amountOfBackupFiles,
      latestBackupFile: latestFile,
      latestBackupDatetime: latestDate ? latestDate.toISOString() : null,
      studentsGroupedById: studentsById,
      averageAmountOfStudents: parseFloat(averageAmount.toFixed(2))
    };
  }
}

module.exports = { BackupReporter };


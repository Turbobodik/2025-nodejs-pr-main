const { EventEmitter } = require("events");
const fs = require("fs").promises;
const path = require("path");
const { saveToJSON } = require("./file-utils");

class BackupManager extends EventEmitter {
  #intervalId = null;
  #backupDirectory = "backups";
  #backupInterval = null;
  #getStudentsCallback = null;
  #isBackupInProgress = false;
  #pendingIntervalsCount = 0;

  constructor(getStudentsCallback, intervalMs = 30000) {
    super();
    this.#getStudentsCallback = getStudentsCallback;
    this.#backupInterval = intervalMs;
  }

  async #ensureBackupDirectory() {
    const backupPath = path.resolve(this.#backupDirectory);
    try {
      await fs.access(backupPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.mkdir(backupPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  #generateBackupFileName() {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/T/, "-")
      .replace(/:/g, "-")
      .split(".")[0];
    return `backup-${timestamp}.backup.json`;
  }

  async #performBackup() {
    this.#isBackupInProgress = true;
    this.#pendingIntervalsCount = 0;
    let backupFileName = null;

    try {
      await this.#ensureBackupDirectory();

      const students = this.#getStudentsCallback();
      if (!Array.isArray(students)) {
        throw new Error("Students data is not an array");
      }

      backupFileName = this.#generateBackupFileName();
      const backupFilePath = path.join(this.#backupDirectory, backupFileName);

      await saveToJSON(students, backupFilePath);

      this.emit("backup:completed", backupFileName);
    } catch (error) {
      this.emit("backup:failed", error, backupFileName);
      throw error;
    } finally {
      this.#isBackupInProgress = false;
      this.#pendingIntervalsCount = 0;
    }
  }

  start() {
    if (this.#intervalId !== null) {
      this.emit("backup:already-running");
      return;
    }

    this.emit("backup:started", this.#backupInterval / 1000);
    this.#intervalId = setInterval(() => {
      if (this.#isBackupInProgress) {
        this.#pendingIntervalsCount++;
        if (this.#pendingIntervalsCount >= 3) {
          clearInterval(this.#intervalId);
          this.#intervalId = null;
          this.#isBackupInProgress = false;
          const error = new Error("Backup operation has been pending for 3 intervals in a row");
          this.emit("backup:timeout", error);
          setImmediate(() => {
            throw error;
          });
          return;
        }
        return;
      }

      this.#performBackup().catch((error) => {
        this.emit("backup:error", error);
      });
    }, this.#backupInterval);

    this.#performBackup().catch((error) => {
      this.emit("backup:error", error);
    });
  }

  stop() {
    if (this.#intervalId === null) {
      this.emit("backup:not-running");
      return;
    }

    clearInterval(this.#intervalId);
    this.#intervalId = null;
    this.emit("backup:stopped");
    
  }

  isRunning() {
    return this.#intervalId !== null;
  }
}

module.exports = { BackupManager };


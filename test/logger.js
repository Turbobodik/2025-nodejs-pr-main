class Logger {
  #isVerboseModeEnabled = false;
  #isQuietModeEnabled = false;

  constructor(verbose = false, quiet = false) {
    this.#isVerboseModeEnabled = verbose;
    this.#isQuietModeEnabled = quiet;
  }

  log(...data) {
    if (this.#isQuietModeEnabled) {
      return;
    }

    if (this.#isVerboseModeEnabled) {
      const os = require("os");
      const systemData = {
        timestamp: new Date().toISOString(),
        platform: os.platform(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuModel: os.cpus()[0].model,
      };
      console.log(...data, systemData);
    } else {
      console.log(...data);
    }
  }
}

module.exports = { Logger };

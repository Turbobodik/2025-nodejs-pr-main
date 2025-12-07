const fs = require("fs").promises;
const path = require("path");

async function saveToJSON(data, filePath) {
  const absolutePath = path.resolve(filePath);
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(absolutePath, json, "utf-8");
}

async function loadJSON(filePath) {
  const absolutePath = path.resolve(filePath);
  const json = await fs.readFile(absolutePath, "utf-8");
  return JSON.parse(json);
}

module.exports = {
  saveToJSON,
  loadJSON,
};


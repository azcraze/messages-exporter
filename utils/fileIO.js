const fs   = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
}

/**
 * Ensure a directory exists, creating it (and parents) if needed.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write data as formatted JSON to outputDir/filename.
 * Creates outputDir if it does not exist.
 * @param {*}      data
 * @param {string} filename  — basename only, e.g. "simplified_messages.json"
 * @param {string} [outputDir='./output']
 */
function saveJSON(data, filename, outputDir) {
  outputDir = outputDir || './output';
  ensureDir(outputDir);
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

module.exports = { readJsonFile, ensureDir, saveJSON };

// src/utils/fileIO.js
const fs = require('fs');

function readJsonFile(filePath) {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
}

module.exports = {
  readJsonFile
};

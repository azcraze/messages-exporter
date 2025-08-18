// src/utils/countOutputItems.js

const fs = require("fs");
const path = require("path");

/**
 * Counts the number of items in each JSON file inside the output directory.
 * Assumes each file contains an array (or an object with arrays).
 * @param {string} dirPath - Path to the output directory
 * @returns {Object} - { filename: itemCount, ... }
 */
function countItemsInOutputFiles(dirPath) {
  const counts = {};

  if (!fs.existsSync(dirPath)) {
    console.error(`Directory does not exist: ${dirPath}`);
    return counts;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith(".json")) {
      try {
        const rawData = fs.readFileSync(fullPath, "utf-8");
        const data = JSON.parse(rawData);

        // Count items
        if (Array.isArray(data)) {
          counts[file] = data.length;
        } else if (typeof data === "object" && data !== null) {
          // Count number of keys that are arrays or objects
          let totalItems = 0;
          Object.values(data).forEach((val) => {
            if (Array.isArray(val)) totalItems += val.length;
            else if (typeof val === "object" && val !== null)
              totalItems += Object.keys(val).length;
          });
          counts[file] = totalItems;
        } else {
          counts[file] = 0;
        }
      } catch (err) {
        console.error(`Error reading/parsing ${fullPath}:`, err);
        counts[file] = -1; // Indicates error
      }
    }
  });

  return counts;
}

module.exports = { countItemsInOutputFiles };

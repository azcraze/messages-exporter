// utils/csvWriter.js

/**
 * Minimal CSV serialiser and file writer.
 *
 * toCsv(rows, headers?)  → CSV string
 * saveCSV(str, filename, outputDir?)  → writes to outputDir (default ./output/reports)
 *
 * rows may be:
 *   - Array of plain objects  → headers auto-derived from first object's keys
 *   - Array of arrays         → first element used as header row if headers omitted
 *
 * All values are stringified and cells containing commas, double-quotes, or
 * newlines are wrapped in double-quotes with internal quotes escaped as "".
 */

var fs   = require('fs');
var path = require('path');
var { ensureDir } = require('./fileIO');

/**
 * Escape a single cell value for CSV.
 * @param {*} val
 * @returns {string}
 */
function escapeCell(val) {
  if (val == null) return '';
  var str = String(val);
  // Wrap in quotes if it contains comma, double-quote, or newline
  if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Serialise an array of objects or arrays to a CSV string.
 *
 * @param {Array<Object|Array>} rows
 * @param {string[]}            [headers]  Column headers; auto-derived if omitted
 * @returns {string}
 */
function toCsv(rows, headers) {
  if (!Array.isArray(rows) || rows.length === 0) return '';

  var headerRow;
  var dataRows;

  if (Array.isArray(rows[0])) {
    // Array-of-arrays mode
    headerRow = headers || rows[0];
    dataRows  = headers ? rows : rows.slice(1);
  } else {
    // Array-of-objects mode
    headerRow = headers || Object.keys(rows[0]);
    dataRows  = rows;
  }

  var lines = [];
  lines.push(headerRow.map(escapeCell).join(','));

  dataRows.forEach(function(row) {
    if (Array.isArray(row)) {
      lines.push(row.map(escapeCell).join(','));
    } else {
      lines.push(headerRow.map(function(h) { return escapeCell(row[h]); }).join(','));
    }
  });

  return lines.join('\n');
}

/**
 * Write a CSV string to outputDir/filename.
 * Creates outputDir if it does not exist.
 *
 * @param {string} csv
 * @param {string} filename   Basename only, e.g. "question-detection.csv"
 * @param {string} [outputDir='./output/reports']
 */
function saveCSV(csv, filename, outputDir) {
  outputDir = outputDir || './output/reports';
  ensureDir(outputDir);
  fs.writeFileSync(path.join(outputDir, filename), csv, 'utf8');
}

module.exports = { toCsv, saveCSV, escapeCell };

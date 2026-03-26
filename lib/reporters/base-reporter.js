/**
 * lib/reporters/base-reporter.js
 *
 * Shared formatting helpers used by all three reporter implementations.
 * All methods are stateless and exported as plain functions; reporters
 * may also inherit via `new BaseReporter()` if they prefer OOP style.
 */

var { format, parseISO, isValid } = require('../../utils/dateHelpers');

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Format an ISO-8601 date string for human display.
 * @param {string} isoStr
 * @param {string} [fmt]  date-fns format token; default 'MMM d, yyyy'
 * @returns {string}
 */
function formatDate(isoStr, fmt) {
  if (!isoStr) return '—';
  var d = parseISO(isoStr);
  return isValid(d) ? format(d, fmt || 'MMM d, yyyy') : isoStr;
}

/**
 * Format a date range as "Jan 1, 2024 – Jun 30, 2024".
 * @param {string} first
 * @param {string} last
 * @returns {string}
 */
function formatDateRange(first, last) {
  return formatDate(first) + ' \u2013 ' + formatDate(last);
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

/**
 * Format a number with thousands separators.
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

/**
 * Format a float to `decimals` places.
 * @param {number} n
 * @param {number} [decimals]  default 1
 * @returns {string}
 */
function formatFloat(n, decimals) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(decimals !== undefined ? decimals : 1);
}

/**
 * Format minutes as "Xh Ym" or "Ym" depending on magnitude.
 * @param {number} minutes
 * @returns {string}
 */
function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return '—';
  if (minutes >= 60) {
    var h = Math.floor(minutes / 60);
    var m = Math.round(minutes % 60);
    return h + 'h ' + (m > 0 ? m + 'm' : '');
  }
  return Math.round(minutes) + 'm';
}

// ---------------------------------------------------------------------------
// Table helpers (plain text)
// ---------------------------------------------------------------------------

/**
 * Build a fixed-width text table.
 *
 * @param {string[]}   headers   Column header labels.
 * @param {string[][]} rows      Each row is an array of cell strings.
 * @param {object}     [opts]
 * @param {number[]}   [opts.minWidths]  Per-column minimum widths.
 * @param {'left'|'right'|'center'} [opts.align]  Default 'left'.
 * @returns {string}
 */
function textTable(headers, rows, opts) {
  opts = opts || {};
  var allRows = [headers].concat(rows);
  var colCount = headers.length;

  // Compute column widths
  var widths = headers.map(function(h, i) {
    var minW = (opts.minWidths && opts.minWidths[i]) || 0;
    return Math.max(minW, String(h).length, rows.reduce(function(max, row) {
      return Math.max(max, String(row[i] || '').length);
    }, 0));
  });

  function pad(str, w, align) {
    str = String(str || '');
    var space = w - str.length;
    if (space <= 0) return str;
    if (align === 'right')  return ' '.repeat(space) + str;
    if (align === 'center') {
      var l = Math.floor(space / 2);
      return ' '.repeat(l) + str + ' '.repeat(space - l);
    }
    return str + ' '.repeat(space);
  }

  var aligns = opts.aligns || headers.map(function() { return 'left'; });

  var divider = widths.map(function(w) { return '-'.repeat(w + 2); }).join('+');
  var lines = [];
  lines.push(divider);
  lines.push(headers.map(function(h, i) { return ' ' + pad(h, widths[i], aligns[i]) + ' '; }).join('|'));
  lines.push(divider);
  rows.forEach(function(row) {
    lines.push(row.map(function(cell, i) { return ' ' + pad(cell, widths[i], aligns[i]) + ' '; }).join('|'));
  });
  lines.push(divider);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

/**
 * Build a GFM (pipe) table.
 *
 * @param {string[]}   headers
 * @param {string[][]} rows
 * @param {'left'|'right'|'center'} [defaultAlign]
 * @returns {string}
 */
function mdTable(headers, rows, aligns) {
  aligns = aligns || headers.map(function() { return 'left'; });

  function alignSep(a) {
    if (a === 'right')  return '---:';
    if (a === 'center') return ':---:';
    return '----';
  }

  var head = '| ' + headers.join(' | ') + ' |';
  var sep  = '| ' + aligns.map(alignSep).join(' | ') + ' |';
  var body = rows.map(function(r) {
    return '| ' + r.map(function(c) { return String(c == null ? '—' : c).replace(/\|/g, '\\|'); }).join(' | ') + ' |';
  }).join('\n');
  return [head, sep, body].join('\n');
}

/**
 * Render a ranked list as Markdown bullets.
 * Each item should have `{ rank, label, value }`.
 *
 * @param {Array<{rank:number, label:string, value:string|number}>} items
 * @returns {string}
 */
function mdRankedList(items) {
  return items.map(function(it) {
    return it.rank + '. **' + it.label + '** — ' + it.value;
  }).join('\n');
}

/**
 * Render a callout block: `> **Insight:** text`
 * @param {string} text
 * @param {string} [label]  Default 'Insight'
 * @returns {string}
 */
function mdCallout(text, label) {
  return '> **' + (label || 'Insight') + ':** ' + text;
}

/**
 * Build a simple ASCII bar chart line.
 * @param {number} value
 * @param {number} max
 * @param {number} [width]  bar width in chars, default 20
 * @returns {string}
 */
function asciiBar(value, max, width) {
  width = width || 20;
  if (!max || max === 0) return '░'.repeat(width);
  var filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/**
 * Build a sparkline string (▁▂▃▄▅▆▇█) for an array of values.
 * @param {number[]} values
 * @returns {string}
 */
function sparkline(values) {
  var bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  if (!values || values.length === 0) return '';
  var max = Math.max.apply(null, values);
  var min = Math.min.apply(null, values);
  var range = max - min || 1;
  return values.map(function(v) {
    var idx = Math.round(((v - min) / range) * (bars.length - 1));
    return bars[idx];
  }).join('');
}

// ---------------------------------------------------------------------------
// Constructor (optional OOP usage)
// ---------------------------------------------------------------------------
function BaseReporter() {}

BaseReporter.prototype.formatDate      = formatDate;
BaseReporter.prototype.formatDateRange = formatDateRange;
BaseReporter.prototype.formatNumber    = formatNumber;
BaseReporter.prototype.formatFloat     = formatFloat;
BaseReporter.prototype.formatDuration  = formatDuration;
BaseReporter.prototype.textTable       = textTable;
BaseReporter.prototype.mdTable         = mdTable;
BaseReporter.prototype.mdRankedList    = mdRankedList;
BaseReporter.prototype.mdCallout       = mdCallout;
BaseReporter.prototype.asciiBar        = asciiBar;
BaseReporter.prototype.sparkline       = sparkline;

module.exports = {
  BaseReporter,
  formatDate,
  formatDateRange,
  formatNumber,
  formatFloat,
  formatDuration,
  textTable,
  mdTable,
  mdRankedList,
  mdCallout,
  asciiBar,
  sparkline,
};
